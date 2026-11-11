# Watermarkin

A simple, privacy-first web app for adding a text watermark to any image, and for compressing images in bulk — right in your browser. **Nothing is ever uploaded.** Every pixel is processed locally using the Canvas API, so your images never leave your device.

🔗 **Live app:** [watermarkin.my.id](https://watermarkin.my.id/)

## Features

### Watermark

- **Drag-and-drop or click to upload** an image (PNG, JPG, WEBP)
- **Live preview** — the watermark updates instantly as you adjust any setting
- **Custom watermark text**
- **Color** — quick swatches plus a full custom color picker
- **Opacity** control (0–100%)
- **Size** control (relative to the image, so it scales to any resolution)
- **Two styles:**
  - **Tiled** — text repeated across the whole image at an angle
  - **Single** — one watermark, with selectable position (center, corners, bottom-center)
- **Rotation** control (−90° to 90°)
- **One-click download** of the watermarked image as a PNG
- **100% client-side** — no uploads, no servers, no tracking
- **Responsive** — works on desktop, tablet, and mobile

### Compress

- **Batch upload** — drag-and-drop or pick as many PNG, JPG, and WEBP images as you like
- **Live size estimates** — every file shows its original size and estimated compressed size before you start
- **Compression levels** — High, Medium, Low, or a Manual quality slider, each with its estimated total and % saved
- **Output format** — keep each image's original format, or convert everything to JPG or WEBP
- **Results screen** — per-file download, **Download all (.zip)**, and a before/after summary
- **Never bigger** — if re-encoding in the same format wouldn't help, the original file is passed through untouched
- **Nothing stored** — compressed images live only in the open tab and are cleared when you leave

> PNG is a lossless format, so PNGs only shrink when converted to JPG or WEBP. Re-encoding also strips metadata such as EXIF and GPS location.

## Privacy

This app does not store, transmit, or upload any user data — all image processing happens locally in your browser via the HTML5 Canvas API. You can use it with sensitive images with confidence.

The site uses [GoatCounter](https://www.goatcounter.com/) for privacy-friendly analytics (cookieless, no personal data collected) to measure basic usage like pageviews and downloads — it never has access to your images.

## Technologies Used

- HTML
- CSS
- JavaScript (Canvas API)
- [client-zip](https://github.com/Touffy/client-zip) (MIT) — vendored in `vendor/` for building the .zip download in the browser
- Vite (development and build)
- Google Fonts (Bricolage Grotesque, Hanken Grotesk, JetBrains Mono)

## How to Run the Project

1. Clone this repository or download the files.
2. Open a terminal and navigate to the project folder.
3. Install dependencies:
   ```sh
   npm install
   ```
4. Start the development server:
   ```sh
   npm run dev
   ```
5. Open the provided localhost URL in your browser.
6. To build for production:
   ```sh
   npm run build
   ```
7. To preview the production build:
   ```sh
   npm run preview
   ```

## File Structure

```
watermark-web/
│-- index.html       # Watermark tool
│-- compress.html    # Compress tool
│-- styles.css       # Styling for both tools
│-- app.js           # Watermarking logic (Canvas API)
│-- compress.js      # Compression logic (Canvas API)
│-- vendor/          # Third-party code (client-zip)
│-- favicon.svg      # App icon
│-- og-image.png     # Social share preview image (Watermark)
│-- og-compress.png  # Social share preview image (Compress)
│-- CNAME            # Custom domain for GitHub Pages
│-- package.json     # Project dependencies and scripts
│-- README.md        # Project documentation
```

## Links

- Live App: [Watermarkin](https://watermarkin.my.id/)
- Repository: [GitHub — watermark-web](https://github.com/elizajasin/watermark-web)

## License

This project is open-source and free to use.
