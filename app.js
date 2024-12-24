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
    ctx.font = '20px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'center';

    const textWidth = ctx.measureText(text).width;
    const stepX = textWidth + 50;
    const stepY = 50;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((45 * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
        for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
            ctx.fillText(text, x + stepX / 2, y + stepY / 2);
        }
    }

    ctx.restore();
});

downloadButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'watermarked-image.png';
    link.href = canvas.toDataURL();
    link.click();
});
