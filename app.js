// Watermark — client-side image watermarking. No data ever leaves the browser.

const els = {
  dropzone: document.getElementById('dropzone'),
  imageCard: document.getElementById('imageCard'),
  fileInput: document.getElementById('fileInput'),
  sampleBtn: document.getElementById('sampleBtn'),
  replaceBtn: document.getElementById('replaceBtn'),
  fileName: document.getElementById('fileName'),
  fileDims: document.getElementById('fileDims'),
  canvas: document.getElementById('canvas'),
  textInput: document.getElementById('textInput'),
  swatches: document.getElementById('swatches'),
  colorInput: document.getElementById('colorInput'),
  opacity: document.getElementById('opacity'),
  opacityVal: document.getElementById('opacityVal'),
  size: document.getElementById('size'),
  sizeVal: document.getElementById('sizeVal'),
  styleSeg: document.getElementById('styleSeg'),
  angle: document.getElementById('angle'),
  angleVal: document.getElementById('angleVal'),
  positionField: document.getElementById('positionField'),
  position: document.getElementById('position'),
  downloadBtn: document.getElementById('downloadBtn'),
};

const state = {
  text: 'CONFIDENTIAL',
  color: '#FFFFFF',
  opacity: 35,
  sizePct: 4,
  tiled: true,
  angle: -35,
  position: 'center',
  hasImage: false,
  fileName: '',
};

const img = new Image();
const ctx = els.canvas.getContext('2d');

img.onload = () => {
  state.hasImage = true;
  els.dropzone.hidden = true;
  els.imageCard.hidden = false;
  els.fileName.textContent = state.fileName || 'image.png';
  els.fileDims.textContent = img.naturalWidth + ' × ' + img.naturalHeight;
  els.downloadBtn.disabled = false;
  els.downloadBtn.textContent = 'Download image';
  draw();
};

function hexToRgba(hex, a) {
  let h = (hex || '#ffffff').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function draw() {
  if (!state.hasImage || !img.naturalWidth) return;
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const MAX = 2400;
  const m = Math.max(w, h);
  if (m > MAX) {
    const s = MAX / m;
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  els.canvas.width = w;
  els.canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const text = state.text || '';
  if (!text) return;

  const fontPx = Math.max(8, Math.round((state.sizePct / 100) * w));
  ctx.font = `bold ${fontPx}px "Hanken Grotesk", Arial, sans-serif`;
  ctx.fillStyle = hexToRgba(state.color, state.opacity / 100);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rad = (state.angle * Math.PI) / 180;
  const tw = ctx.measureText(text).width;

  if (state.tiled) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rad);
    ctx.translate(-w / 2, -h / 2);
    const stepX = tw + fontPx * 2.4;
    const stepY = fontPx * 3;
    for (let y = -h; y < h * 2; y += stepY) {
      for (let x = -w; x < w * 2; x += stepX) {
        ctx.fillText(text, x + stepX / 2, y + stepY / 2);
      }
    }
    ctx.restore();
  } else {
    const pad = Math.round(Math.min(w, h) * 0.05);
    const hw = tw / 2;
    const hh = fontPx / 2;
    let x = w / 2;
    let y = h / 2;
    switch (state.position) {
      case 'top-left': x = pad + hw; y = pad + hh; break;
      case 'top-right': x = w - pad - hw; y = pad + hh; break;
      case 'bottom-left': x = pad + hw; y = h - pad - hh; break;
      case 'bottom-right': x = w - pad - hw; y = h - pad - hh; break;
      case 'bottom-center': x = w / 2; y = h - pad - hh; break;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rad);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

function loadFile(file) {
  if (!file || !/^image\//.test(file.type)) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    state.fileName = file.name;
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function loadSample() {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 800;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 1200, 800);
  grad.addColorStop(0, '#cdd7e8');
  grad.addColorStop(0.55, '#dfe3e0');
  grad.addColorStop(1, '#ece4d4');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1200, 800);
  g.strokeStyle = 'rgba(40,44,60,0.05)';
  g.lineWidth = 2;
  for (let i = -800; i < 1200; i += 46) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 800, 800);
    g.stroke();
  }
  g.fillStyle = 'rgba(40,42,52,0.42)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '700 46px "Hanken Grotesk", Arial, sans-serif';
  g.fillText('YOUR PHOTO', 600, 372);
  g.font = '500 20px "JetBrains Mono", monospace';
  g.fillText('1200 × 800  sample image', 600, 420);
  state.fileName = 'sample-image.png';
  img.src = c.toDataURL();
}

function setColor(hex) {
  state.color = hex;
  els.colorInput.value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff';
  [...els.swatches.querySelectorAll('.swatch')].forEach((b) => {
    b.classList.toggle('is-selected', b.dataset.color.toUpperCase() === hex.toUpperCase());
  });
  draw();
}

// --- Events ---
els.dropzone.addEventListener('click', () => els.fileInput.click());
els.replaceBtn.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', (e) => {
  loadFile(e.target.files[0]);
  e.target.value = '';
});
els.sampleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  loadSample();
});

els.dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  els.dropzone.classList.add('is-drag');
});
els.dropzone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  els.dropzone.classList.remove('is-drag');
});
els.dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  els.dropzone.classList.remove('is-drag');
  loadFile(e.dataTransfer.files[0]);
});

els.textInput.addEventListener('input', (e) => { state.text = e.target.value; draw(); });
els.colorInput.addEventListener('input', (e) => setColor(e.target.value));
[...els.swatches.querySelectorAll('.swatch')].forEach((b) => {
  b.addEventListener('click', () => setColor(b.dataset.color));
});

els.opacity.addEventListener('input', (e) => {
  state.opacity = +e.target.value;
  els.opacityVal.textContent = state.opacity + '%';
  draw();
});
els.size.addEventListener('input', (e) => {
  state.sizePct = +e.target.value;
  els.sizeVal.textContent = state.sizePct + '%';
  draw();
});
els.angle.addEventListener('input', (e) => {
  state.angle = +e.target.value;
  els.angleVal.textContent = state.angle + '°';
  draw();
});

[...els.styleSeg.querySelectorAll('.seg')].forEach((b) => {
  b.addEventListener('click', () => {
    state.tiled = b.dataset.style === 'tiled';
    [...els.styleSeg.querySelectorAll('.seg')].forEach((x) => x.classList.toggle('is-active', x === b));
    els.positionField.hidden = state.tiled;
    draw();
  });
});
els.position.addEventListener('change', (e) => { state.position = e.target.value; draw(); });

els.downloadBtn.addEventListener('click', () => {
  if (!state.hasImage) return;
  const base = (state.fileName || 'image').replace(/\.[^.]+$/, '');
  const link = document.createElement('a');
  link.download = base + '-watermarked.png';
  link.href = els.canvas.toDataURL('image/png');
  link.click();
});

// Initial selected swatch
setColor(state.color);
