// Compress — client-side image compression. No data ever leaves the browser.
import { downloadZip } from './vendor/client-zip.js';

const $ = (id) => document.getElementById(id);
const els = {
  queueView: $('queueView'),
  doneView: $('doneView'),
  dropzone: $('dropzone'),
  dropTitle: $('dropTitle'),
  fileInput: $('fileInput'),
  notice: $('notice'),
  queuePill: $('queuePill'),
  clearBtn: $('clearBtn'),
  queueEmpty: $('queueEmpty'),
  queueList: $('queueList'),
  showMoreBtn: $('showMoreBtn'),
  levelVal: $('levelVal'),
  levels: [...document.querySelectorAll('.level')],
  manualBox: $('manualBox'),
  quality: $('quality'),
  qualityVal: $('qualityVal'),
  formatSeg: $('formatSeg'),
  formatHint: $('formatHint'),
  compressBtn: $('compressBtn'),
  progress: $('progress'),
  progressBar: $('progressBar'),
  ctaNote: $('ctaNote'),
  cancelBtn: $('cancelBtn'),
  donePill: $('donePill'),
  doneSettings: $('doneSettings'),
  resultList: $('resultList'),
  sumPct: $('sumPct'),
  sumSub: $('sumSub'),
  sumBefore: $('sumBefore'),
  sumAfter: $('sumAfter'),
  zipBtn: $('zipBtn'),
  zipLabel: $('zipLabel'),
  moreBtn: $('moreBtn'),
};

const JPEG = 'image/jpeg';
const PNG = 'image/png';
const WEBP = 'image/webp';
const TYPE_LABELS = { [JPEG]: 'JPG', [PNG]: 'PNG', [WEBP]: 'WEBP' };
const TYPE_EXTS = { [JPEG]: 'jpg', [PNG]: 'png', [WEBP]: 'webp' };
const EXT_TYPES = { jpg: JPEG, jpeg: JPEG, png: PNG, webp: WEBP };

const LEVEL_QUALITY = { high: 50, medium: 70, low: 85 };
const LEVEL_NAMES = { high: 'High', medium: 'Medium', low: 'Low', manual: 'Manual' };
const FORMATS = {
  keep: { label: 'Keep original format', hint: 'Each image keeps its own file type.' },
  jpg: { label: 'JPG', hint: 'Smallest for photos. Transparent areas become white.' },
  webp: { label: 'WEBP', hint: 'Smaller than JPG and keeps transparency.' },
};

// Size estimates come from encoding a small full-resolution sample of each image.
const SAMPLE_QUALITIES = [10, 30, 50, 70, 85, 95];
const SAMPLE_TILE = 256;
const SAMPLE_GRID = 4;
// Some devices (notably iPhones) refuse very large canvases; retry smaller.
const CANVAS_AREA_LIMITS = [Infinity, 16777216, 4194304];
const COLLAPSED_ROWS = 3;

const state = {
  items: [],
  level: 'medium',
  quality: 60,
  format: 'keep',
  busy: false,
  cancelled: false,
  expanded: false,
  webp: true,
  urls: new Set(),
  results: [],
  zipUrl: null,
};

let nextId = 1;
let analysis = Promise.resolve();
const overheads = {};

function trackEvent(path, title) {
  if (window.goatcounter && window.goatcounter.count) {
    window.goatcounter.count({ path, title, event: true });
  }
}

// --- Formatting ---
function fmtBytes(bytes) {
  const mb = bytes / 1048576;
  if (mb >= 1) return mb.toFixed(1) + ' MB';
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
  return Math.round(bytes) + ' B';
}
const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
const savedPct = (before, after) => (before ? Math.round((1 - after / before) * 100) : 0);

// --- Canvas helpers ---
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

async function encode(canvas, type, quality) {
  const blob = canvas.convertToBlob
    ? await canvas.convertToBlob({ type, quality })
    : await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob || blob.type !== type) throw new Error('Could not encode ' + type);
  return blob;
}

async function decode(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file);
    } catch (err) { /* fall through to <img> */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode image')); };
    img.src = url;
  });
}

const release = (source) => { if (source && source.close) source.close(); };
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

async function canEncode(type) {
  try {
    const c = makeCanvas(1, 1);
    c.getContext('2d');
    await encode(c, type, 0.5);
    return true;
  } catch (err) {
    return false;
  }
}

// --- Estimation ---
function overheadFor(type) {
  if (!overheads[type]) {
    overheads[type] = (async () => {
      const c = makeCanvas(8, 8);
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, 8, 8);
      const sizes = [];
      for (const q of SAMPLE_QUALITIES) sizes.push((await encode(c, type, q / 100)).size);
      return sizes;
    })();
  }
  return overheads[type];
}

async function sampleCurve(canvas, type, scale) {
  const overhead = await overheadFor(type);
  const curve = [];
  for (let i = 0; i < SAMPLE_QUALITIES.length; i++) {
    const blob = await encode(canvas, type, SAMPLE_QUALITIES[i] / 100);
    curve.push(overhead[i] + Math.max(blob.size - overhead[i], 0) * scale);
  }
  return curve;
}

async function analyze(item) {
  let source;
  try {
    source = await decode(item.file);
    const w = source.naturalWidth || source.width;
    const h = source.naturalHeight || source.height;
    item.width = w;
    item.height = h;

    let canvas;
    const span = SAMPLE_TILE * SAMPLE_GRID;
    if (w <= span && h <= span) {
      canvas = makeCanvas(w, h);
      canvas.getContext('2d').drawImage(source, 0, 0);
    } else {
      const tw = Math.min(SAMPLE_TILE, w);
      const th = Math.min(SAMPLE_TILE, h);
      const nx = Math.min(SAMPLE_GRID, Math.floor(w / tw));
      const ny = Math.min(SAMPLE_GRID, Math.floor(h / th));
      canvas = makeCanvas(nx * tw, ny * th);
      const g = canvas.getContext('2d');
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const sx = Math.min(w - tw, Math.max(0, Math.floor(((i + 0.5) / nx) * w - tw / 2)));
          const sy = Math.min(h - th, Math.max(0, Math.floor(((j + 0.5) / ny) * h - th / 2)));
          g.drawImage(source, sx, sy, tw, th, i * tw, j * th, tw, th);
        }
      }
    }
    release(source);
    source = null;

    const scale = (w * h) / (canvas.width * canvas.height);
    const curves = {};
    if (state.webp) curves[WEBP] = await sampleCurve(canvas, WEBP, scale);
    const g = canvas.getContext('2d');
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    curves[JPEG] = await sampleCurve(canvas, JPEG, scale);
    canvas.width = canvas.height = 0;

    item.curves = curves;
    item.status = 'ready';
  } catch (err) {
    item.status = 'error';
  } finally {
    release(source);
  }
}

function runAnalysis() {
  analysis = analysis.then(async () => {
    for (;;) {
      if (state.busy) return;
      const item = state.items.find((it) => it.status === 'pending');
      if (!item) return;
      await analyze(item);
      refresh();
    }
  });
}

function interpolate(curve, quality) {
  const qs = SAMPLE_QUALITIES;
  if (quality <= qs[0]) return curve[0];
  for (let i = 1; i < qs.length; i++) {
    if (quality <= qs[i]) {
      const t = (quality - qs[i - 1]) / (qs[i] - qs[i - 1]);
      return Math.exp(Math.log(curve[i - 1]) * (1 - t) + Math.log(curve[i]) * t);
    }
  }
  return curve[curve.length - 1];
}

function targetType(item, format) {
  if (format === 'jpg') return JPEG;
  if (format === 'webp') return WEBP;
  return item.type;
}

function estimate(item, quality, format) {
  if (item.status !== 'ready') return null;
  const type = targetType(item, format);
  const curve = item.curves[type];
  // PNG is lossless and has no quality setting, so it can't be estimated smaller.
  let est = curve ? interpolate(curve, quality) : item.size;
  if (type === item.type) est = Math.min(est, item.size);
  return est;
}

function totalsFor(quality) {
  let orig = 0;
  let known = 0;
  let est = 0;
  for (const item of state.items) {
    if (item.status === 'error') continue;
    orig += item.size;
    const e = estimate(item, quality, state.format);
    if (e != null) {
      known += item.size;
      est += e;
    }
  }
  if (!known) return { orig, est: null };
  // Images still being measured are assumed to shrink like the measured ones.
  return { orig, est: est + (orig - known) * (est / known) };
}

const currentQuality = () => (state.level === 'manual' ? state.quality : LEVEL_QUALITY[state.level]);

// --- Queue ---
function typeOf(file) {
  if (TYPE_LABELS[file.type]) return file.type;
  const ext = (file.name.match(/\.([^.]+)$/) || [])[1];
  return ext ? EXT_TYPES[ext.toLowerCase()] : undefined;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const ICON_REMOVE = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
const ICON_DOWNLOAD = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path></svg>';

function buildRow(item) {
  const row = el('li', 'file-row queue-row');
  const main = el('div', 'file-main');
  item.dimsEl = el('span', 'file-dims', '…');
  main.append(el('span', 'file-name', item.name), item.dimsEl);

  const sizes = el('div', 'file-sizes');
  item.sizeEl = el('span', 'size-line');
  item.pctEl = el('span', 'file-pct');
  sizes.append(item.sizeEl, item.pctEl);

  const remove = el('button', 'icon-btn');
  remove.type = 'button';
  remove.setAttribute('aria-label', 'Remove ' + item.name);
  remove.innerHTML = ICON_REMOVE;
  remove.addEventListener('click', () => removeItem(item));

  row.append(el('div', 'file-badge', TYPE_LABELS[item.type]), main, sizes, remove);
  item.row = row;
  return row;
}

function addFiles(fileList) {
  if (state.busy) return;
  const files = [...fileList];
  if (!files.length) return;
  const frag = document.createDocumentFragment();
  let skipped = 0;
  for (const file of files) {
    const type = typeOf(file);
    if (!type) {
      skipped++;
      continue;
    }
    const item = {
      id: nextId++,
      file,
      name: file.name,
      size: file.size,
      type,
      status: 'pending',
      width: 0,
      height: 0,
      curves: null,
    };
    state.items.push(item);
    frag.append(buildRow(item));
  }
  els.queueList.append(frag);
  els.notice.hidden = !skipped;
  if (skipped) {
    els.notice.textContent = 'Skipped ' + plural(skipped, 'file') + ' — only PNG, JPG and WEBP images can be compressed.';
  }
  refresh();
  runAnalysis();
}

function removeItem(item) {
  if (state.busy) return;
  state.items = state.items.filter((it) => it !== item);
  item.row.remove();
  refresh();
}

function clearQueue() {
  state.items = [];
  state.expanded = false;
  els.queueList.textContent = '';
  els.notice.hidden = true;
  refresh();
}

function refreshRow(item, quality) {
  item.dimsEl.textContent = item.width ? item.width + ' × ' + item.height : '…';
  const orig = fmtBytes(item.size);
  const note = (text) => {
    item.pctEl.textContent = text;
    item.pctEl.classList.add('is-note');
  };
  if (item.status === 'error') {
    item.sizeEl.textContent = orig;
    note("can't read this image");
    return;
  }
  const est = estimate(item, quality, state.format);
  if (est == null) {
    item.sizeEl.textContent = orig;
    note('estimating…');
    return;
  }
  item.sizeEl.textContent = orig + ' → ';
  item.sizeEl.append(el('strong', '', '~' + fmtBytes(est)));
  const pct = savedPct(item.size, est);
  if (pct > 0) {
    item.pctEl.textContent = pct + '% smaller';
    item.pctEl.classList.remove('is-note');
  } else if (targetType(item, state.format) === PNG) {
    note('PNG is lossless');
  } else if (pct === 0) {
    note('no savings');
  } else {
    note(-pct + '% larger');
  }
}

function refresh() {
  const n = state.items.length;
  const quality = currentQuality();

  for (const item of state.items) refreshRow(item, quality);

  // Queue header, empty state, phone "show more"
  const total = state.items.reduce((sum, it) => sum + it.size, 0);
  els.queuePill.textContent = '';
  if (n) {
    els.queuePill.append(
      el('span', 'only-wide', plural(n, 'image') + ' · ' + fmtBytes(total)),
      el('span', 'only-narrow', n + ' · ' + fmtBytes(total)),
    );
  } else {
    els.queuePill.textContent = '0 images';
  }
  els.queueEmpty.hidden = n > 0;
  els.clearBtn.disabled = n === 0;
  els.dropTitle.textContent = n ? 'Add more images' : 'Add images';
  els.queueList.classList.toggle('is-collapsed', !state.expanded);
  els.showMoreBtn.hidden = n <= COLLAPSED_ROWS;
  els.showMoreBtn.textContent = state.expanded ? 'Show less' : 'Show ' + (n - COLLAPSED_ROWS) + ' more';

  // Level cards
  for (const btn of els.levels) {
    const level = btn.dataset.level;
    const on = state.level === level;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const q = level === 'manual' ? state.quality : LEVEL_QUALITY[level];
    const t = totalsFor(q);
    const sizeEl = btn.querySelector('.level-size');
    const pctEl = btn.querySelector('.level-pct');
    if (t.est == null) {
      sizeEl.textContent = '—';
      pctEl.textContent = '';
    } else {
      const pct = savedPct(t.orig, t.est);
      sizeEl.textContent = '~' + fmtBytes(t.est);
      pctEl.textContent = pct >= 0 ? '−' + pct + '%' : '+' + -pct + '%';
    }
  }
  els.manualBox.classList.toggle('is-active', state.level === 'manual');
  els.levelVal.textContent = state.level === 'manual' ? 'Manual · ' + state.quality + '%' : LEVEL_NAMES[state.level];
  els.quality.value = state.quality;
  els.qualityVal.textContent = state.quality + '%';

  // Format
  for (const seg of els.formatSeg.querySelectorAll('.seg')) {
    const on = seg.dataset.format === state.format;
    seg.classList.toggle('is-active', on);
    seg.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  let hint = FORMATS[state.format].hint;
  if (state.format === 'keep' && state.items.some((it) => it.type === PNG)) {
    hint += state.webp
      ? ' PNG is lossless, so PNGs won’t shrink — choose WEBP for those.'
      : ' PNG is lossless, so PNGs won’t shrink — choose JPG for those.';
  }
  if (!state.webp) hint += ' This browser can’t save WEBP.';
  els.formatHint.textContent = hint;

  // Call to action
  if (!state.busy) {
    const t = totalsFor(quality);
    els.compressBtn.disabled = n === 0;
    els.compressBtn.textContent = n === 0
      ? 'Add images to start'
      : 'Compress ' + plural(n, 'image') + (t.est == null ? '' : ' · ~' + fmtBytes(t.est));
  }
}

// --- Compression ---
async function render(source, w, h, type, quality) {
  const canvas = makeCanvas(w, h);
  try {
    const g = canvas.getContext('2d');
    if (!g) throw new Error('No canvas context');
    if (type === JPEG) {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, w, h);
    }
    g.drawImage(source, 0, 0, w, h);
    return await encode(canvas, type, quality / 100);
  } finally {
    canvas.width = canvas.height = 0;
  }
}

function outputName(item, type) {
  if (type === item.type) return item.name;
  return item.name.replace(/\.[^.]+$/, '') + '.' + TYPE_EXTS[type];
}

async function compressItem(item, quality, format) {
  const type = targetType(item, format);
  const original = { item, blob: item.file, name: item.name, type: item.type, size: item.size, kept: true };
  if (type === WEBP && !state.webp) return original;

  let source;
  try {
    source = await decode(item.file);
    const w = source.naturalWidth || source.width;
    const h = source.naturalHeight || source.height;
    let blob = null;
    let outW = w;
    let outH = h;
    for (const limit of CANVAS_AREA_LIMITS) {
      const scale = Math.min(1, Math.sqrt(limit / (w * h)));
      outW = Math.max(1, Math.floor(w * scale));
      outH = Math.max(1, Math.floor(h * scale));
      try {
        blob = await render(source, outW, outH, type, quality);
        break;
      } catch (err) {
        blob = null;
      }
    }
    if (!blob) return { item, error: true };
    const resized = outW !== w || outH !== h;
    // Never hand back a file bigger than the one we were given.
    if (type === item.type && !resized && blob.size >= item.size) return original;
    return {
      item,
      blob,
      name: outputName(item, type),
      type,
      size: blob.size,
      resized: resized ? outW + ' × ' + outH : '',
    };
  } catch (err) {
    return { item, error: true };
  } finally {
    release(source);
  }
}

function setBusy(busy) {
  state.busy = busy;
  document.body.classList.toggle('is-busy', busy);
  els.compressBtn.disabled = busy;
  els.progress.hidden = !busy;
  els.cancelBtn.hidden = !busy;
  els.ctaNote.hidden = busy;
  if (!busy) els.progressBar.style.width = '0';
}

async function compressAll() {
  if (state.busy || !state.items.length) return;
  const quality = currentQuality();
  const format = state.format;
  const level = state.level;
  const items = state.items.slice();
  state.cancelled = false;
  setBusy(true);
  els.compressBtn.textContent = 'Getting ready…';
  await analysis;

  const results = [];
  for (let i = 0; i < items.length; i++) {
    if (state.cancelled) break;
    els.compressBtn.textContent = 'Compressing ' + (i + 1) + ' of ' + items.length + '…';
    els.progressBar.style.width = (i / items.length) * 100 + '%';
    await pause();
    results.push(await compressItem(items[i], quality, format));
  }

  setBusy(false);
  if (state.cancelled) {
    refresh();
    runAnalysis();
    return;
  }
  showResults(results, level, quality, format);
  trackEvent('images-compressed', 'Images compressed');
}

// --- Results ---
function trackUrl(blob) {
  const url = URL.createObjectURL(blob);
  state.urls.add(url);
  return url;
}

function revokeUrls() {
  for (const url of state.urls) URL.revokeObjectURL(url);
  state.urls.clear();
  state.zipUrl = null;
}

function uniqueNames(results) {
  const used = new Set();
  for (const r of results) {
    let name = r.name;
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    for (let i = 1; used.has(name.toLowerCase()); i++) name = base + '-' + i + ext;
    used.add(name.toLowerCase());
    r.name = name;
  }
}

function buildResultRow(r) {
  const row = el('li', 'file-row result-row');
  const main = el('div', 'file-main');
  const line = el('span', 'size-line');
  if (r.error) {
    main.append(el('span', 'file-name', r.item.name), line);
    line.textContent = "Couldn't compress this image";
    row.append(el('div', 'file-badge', TYPE_LABELS[r.item.type]), main);
    return row;
  }
  main.append(el('span', 'file-name', r.name), line);
  if (r.kept) {
    line.textContent = fmtBytes(r.size) + ' · kept original, already smaller';
  } else {
    line.append(el('s', '', fmtBytes(r.item.size)), ' → ', el('strong', '', fmtBytes(r.size)));
    if (r.resized) line.append(' · resized to ' + r.resized);
  }

  const pct = savedPct(r.item.size, r.size);
  const chip = el('span', 'pct-chip', pct > 0 ? '−' + pct + '%' : pct < 0 ? '+' + -pct + '%' : '0%');
  chip.classList.toggle('is-note', pct <= 0);

  const link = el('a', 'btn-secondary btn-download');
  link.href = trackUrl(r.blob);
  link.download = r.name;
  link.setAttribute('aria-label', 'Download ' + r.name);
  link.innerHTML = ICON_DOWNLOAD;
  link.append(el('span', 'btn-label', 'Download'));
  link.addEventListener('click', () => trackEvent('compressed-downloaded', 'Compressed image downloaded'));

  row.append(el('div', 'file-badge', TYPE_LABELS[r.type]), main, chip, link);
  return row;
}

function showResults(results, level, quality, format) {
  const done = results.filter((r) => !r.error);
  uniqueNames(done);
  state.results = done;

  els.resultList.textContent = '';
  const frag = document.createDocumentFragment();
  for (const r of results) frag.append(buildResultRow(r));
  els.resultList.append(frag);

  const before = done.reduce((sum, r) => sum + r.item.size, 0);
  const after = done.reduce((sum, r) => sum + r.size, 0);
  const pct = savedPct(before, after);
  els.donePill.textContent = done.length + ' of ' + results.length + ' done';
  els.doneSettings.textContent =
    (level === 'manual' ? 'Manual ' + quality + '%' : LEVEL_NAMES[level]) + ' · ' + FORMATS[format].label;
  els.sumPct.textContent = Math.max(pct, 0) + '%';
  if (!done.length) {
    els.sumSub.textContent = 'None of these images could be compressed.';
  } else if (before > after) {
    els.sumSub.textContent = 'smaller overall — you saved ' + fmtBytes(before - after);
  } else {
    els.sumSub.textContent = 'smaller — try a higher compression level or another format.';
  }
  els.sumBefore.textContent = done.length ? fmtBytes(before) : '—';
  els.sumAfter.textContent = done.length ? fmtBytes(after) : '—';
  els.zipBtn.disabled = !done.length;
  els.zipLabel.textContent = 'Download all (.zip)' + (done.length ? ' · ' + fmtBytes(after) : '');

  els.queueView.hidden = true;
  els.doneView.hidden = false;
  window.scrollTo(0, 0);
}

async function downloadAll() {
  if (!state.results.length || els.zipBtn.disabled) return;
  if (!state.zipUrl) {
    const label = els.zipLabel.textContent;
    els.zipBtn.disabled = true;
    els.zipLabel.textContent = 'Preparing .zip…';
    try {
      const files = state.results.map((r) => ({ name: r.name, lastModified: new Date(), input: r.blob }));
      const blob = await downloadZip(files).blob();
      if (els.doneView.hidden) return;
      state.zipUrl = trackUrl(blob);
    } finally {
      els.zipBtn.disabled = false;
      els.zipLabel.textContent = label;
    }
  }
  const link = document.createElement('a');
  link.download = 'watermarkin-compressed.zip';
  link.href = state.zipUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
  trackEvent('zip-downloaded', 'Zip downloaded');
}

function startOver() {
  revokeUrls();
  state.results = [];
  els.resultList.textContent = '';
  clearQueue();
  els.doneView.hidden = true;
  els.queueView.hidden = false;
  window.scrollTo(0, 0);
}

// --- Events ---
els.dropzone.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', (e) => {
  addFiles(e.target.files);
  e.target.value = '';
});

const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
document.addEventListener('dragover', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  els.dropzone.classList.add('is-drag');
});
document.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) els.dropzone.classList.remove('is-drag');
});
document.addEventListener('drop', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  els.dropzone.classList.remove('is-drag');
  if (!els.queueView.hidden) addFiles(e.dataTransfer.files);
});

els.clearBtn.addEventListener('click', () => { if (!state.busy) clearQueue(); });
els.showMoreBtn.addEventListener('click', () => {
  state.expanded = !state.expanded;
  refresh();
});

for (const btn of els.levels) {
  btn.addEventListener('click', () => {
    if (state.busy) return;
    state.level = btn.dataset.level;
    refresh();
  });
}
els.quality.addEventListener('input', (e) => {
  if (state.busy) return;
  state.quality = +e.target.value;
  state.level = 'manual';
  refresh();
});
for (const seg of els.formatSeg.querySelectorAll('.seg')) {
  seg.addEventListener('click', () => {
    if (state.busy) return;
    state.format = seg.dataset.format;
    refresh();
  });
}

els.compressBtn.addEventListener('click', compressAll);
els.cancelBtn.addEventListener('click', () => {
  state.cancelled = true;
  els.compressBtn.textContent = 'Cancelling…';
});
els.zipBtn.addEventListener('click', downloadAll);
els.moreBtn.addEventListener('click', startOver);

// Compressed files live only in this tab: drop them when the user leaves.
window.addEventListener('pagehide', revokeUrls);
window.addEventListener('pageshow', (e) => {
  if (e.persisted && !els.doneView.hidden) startOver();
});

// --- Init ---
canEncode(WEBP).then((ok) => {
  state.webp = ok;
  if (!ok) {
    const seg = els.formatSeg.querySelector('[data-format="webp"]');
    seg.disabled = true;
    if (state.format === 'webp') state.format = 'keep';
  }
  refresh();
});
refresh();
