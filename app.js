const imageInput = document.getElementById('imageInput');
const watermarkText = document.getElementById('watermarkText');
const addWatermarkButton = document.getElementById('addWatermark');
const downloadButton = document.getElementById('downloadImage');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let image = new Image();

imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

image.onload = () => {
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
};

addWatermarkButton.addEventListener('click', () => {
    const text = watermarkText.value;
    if (!text) {
        alert('Please enter watermark text');
        return;
    }

    ctx.drawImage(image, 0, 0);
    ctx.font = '30px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(text, canvas.width - 20, canvas.height - 20);
});

downloadButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'watermarked-image.png';
    link.href = canvas.toDataURL();
    link.click();
});