// Star canvas
const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const stars = Array.from({ length: 250 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5 + 0.2,
    o: Math.random(),
    s: Math.random() * 0.01 + 0.003
}));

(function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
        s.o += (Math.random() - 0.5) * s.s * 10;
        s.o = Math.max(0.05, Math.min(0.9, s.o));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${s.o})`;
        ctx.fill();
    });
    requestAnimationFrame(draw);
})();

// Status messages sequence
const messages = [
    'Initializing systems...',
    'Connecting to ISS telemetry...',
    'Loading orbital data...',
    'Calibrating sensors...',
    'Systems ready.'
];

const statusEl = document.getElementById('splashStatus');
let i = 0;
const interval = setInterval(() => {
    if (i < messages.length) {
        statusEl.textContent = messages[i++];
    } else {
        clearInterval(interval);
    }
}, 500);

// Redirect after loader finishes
setTimeout(() => {
    window.location.href = '/login';
}, 2800);