# Watermark

A simple, privacy-first web app for adding a text watermark to any image — right in your browser. **Nothing is ever uploaded.** Every pixel is processed locally using the Canvas API, so your images never leave your device.

🔗 **Live app:** [elizajasin.github.io/watermark-web](https://elizajasin.github.io/watermark-web/)

## Features

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

## Privacy

This app does not store, transmit, or upload any user data. All image processing happens locally in your browser via the HTML5 Canvas API. You can use it with sensitive images with confidence.

## Technologies Used

- HTML
- CSS
- JavaScript (Canvas API)
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
│-- index.html       # Main HTML structure
│-- styles.css       # Styling for the app
│-- app.js           # Watermarking logic (Canvas API)
│-- favicon.svg      # App icon
│-- package.json     # Project dependencies and scripts
│-- README.md        # Project documentation
```

## Links

- Live App: [Watermark Web App](https://elizajasin.github.io/watermark-web/)
- Repository: [GitHub — watermark-web](https://github.com/elizajasin/watermark-web)

## License

This project is open-source and free to use.
