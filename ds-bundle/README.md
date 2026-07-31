# Watermark Web — style conventions

This is a **style-only** design system: there are no JS components to import. Build UI as plain HTML/CSS (or JSX with `className`) using the tokens, fonts, and class vocabulary below — all served by `styles.css`.

## Page setup

Every design should sit on the app's canvas: warm off-white background, near-black ink text, Hanken Grotesk as the default face.

```html
<div style="background: var(--bg); color: var(--ink); font-family: 'Hanken Grotesk', sans-serif; min-height: 100vh;">
  <!-- content -->
</div>
```

No provider or wrapper component exists. Fonts (Hanken Grotesk 400–700, Bricolage Grotesque 500–700, JetBrains Mono 400/500) are self-hosted and load automatically via `styles.css` — never link Google Fonts.

## Styling idiom

Colors come **only** from these custom properties (defined in `tokens/tokens.css`): `--bg`, `--panel`, `--ink`, `--muted`, `--faint`, `--border`, `--border-strong`, `--field-bg`, `--field-border`, `--accent`, `--accent-soft`. Don't invent new hex values; `--accent` (#2E5BFF blue) is the single accent — used sparingly for primary actions, focus, links, and small dots/markers.

Type has three strict roles:
- **Bricolage Grotesque** (600–700, tight letter-spacing ≈ -0.02em) — display and headings only.
- **Hanken Grotesk** (400 body · 600 buttons/emphasis) — all UI text, 13–15px.
- **JetBrains Mono** (11–12px) — metadata and micro-labels: uppercase field labels with `letter-spacing: 0.08em`, filenames, dimensions, footer notes.

Surfaces are white `var(--panel)` cards with `1px solid var(--border)`, radius 16px (10px for nested, 8–10px for controls). Shadows are nearly absent — hierarchy comes from borders and background steps, not elevation.

## Class vocabulary (in `app.css`)

Reuse these before writing new CSS: `.panel` / `.panel-body` / `.panel-footer` (control card), `.field` / `.field-head` / `.field-label` / `.field-value` (labeled control row), `.text-input`, `.select`, `.segmented` / `.seg` / `.seg.is-active` (segmented control), `.swatches` / `.swatch` / `.swatch.is-selected`, `.btn-primary` (solid accent, full-width in panel footers), `.btn-secondary` (white outline), `.file-pill` / `.file-dims` (mono metadata chips), `.dropzone` (dashed 2px `var(--border-strong)` upload area), `.site-header` / `.wordmark`, `.site-footer` / `.footer-note`, `.intro`. New layout glue is fine as inline/custom CSS, but style it with the tokens above.

## Where the truth lives

Read `styles.css` and its imports before styling: `tokens/tokens.css` (colors), `app.css` (all component classes), `fonts/fonts.css` (faces and weights).

## Idiomatic example

```html
<div class="panel" style="max-width: 380px;">
  <div class="panel-body">
    <div class="field">
      <div class="field-head">
        <span class="field-label">Opacity</span>
        <span class="field-value">35%</span>
      </div>
      <input type="range" min="0" max="100" value="35">
    </div>
  </div>
  <div class="panel-footer">
    <button class="btn-primary">Download watermarked image</button>
  </div>
</div>
```

---

# Bundle reference (generated 2026-07-31)

Style-only import from the `watermark-web` repo (a client-side image watermarking app). No compiled component bundle is included — this project supplies the visual identity only.

## Files

- `styles.css` — entry stylesheet; designs receive its `@import` closure
- `tokens/tokens.css` — the 11 color custom properties
- `app.css` — the app's full class vocabulary (verbatim from the repo)
- `fonts/fonts.css` + woff2 — Bricolage Grotesque (variable 500–700), Hanken Grotesk (variable 400–700), JetBrains Mono (400, 500)

## Preview cards

- Foundations / Colors — all 11 color tokens
- Foundations / Typography — the three type roles with real sizes
- Elements / Controls — panel, fields, segmented control, swatches, buttons built from the real classes
