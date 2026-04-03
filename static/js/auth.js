// Star canvas (reused on auth pages)
const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const stars = Array.from({ length: 200 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.2 + 0.2,
    o: Math.random() * 0.7 + 0.1,
    s: Math.random() * 0.008 + 0.002
}));

(function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
        s.o += (Math.random() - 0.5) * s.s * 8;
        s.o = Math.max(0.05, Math.min(0.85, s.o));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${s.o})`;
        ctx.fill();
    });
    requestAnimationFrame(draw);
})();

// Google SSO handler — posts token to Flask backend
async function handleGoogleAuth(response) {
    const res = await fetch('/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (data.redirect) window.location.href = data.redirect;
}