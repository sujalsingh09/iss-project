import { initMap, updateMap } from './map.js';

// ─── Map (init after DOM ready) ────────────────────────────
let map = null;
document.addEventListener('DOMContentLoaded', () => {
    map = initMap();
    fetchISSPosition();
});

// ─── Star Canvas ───────────────────────────────────────────
const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');
let stars = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function initStars() {
    stars = [];
    for (let i = 0; i < 220; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.4 + 0.2,
            speed: Math.random() * 0.2 + 0.02,
            opacity: Math.random() * 0.8 + 0.2,
            twinkleSpeed: Math.random() * 0.02 + 0.005
        });
    }
}

function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
        s.opacity += (Math.random() - 0.5) * s.twinkleSpeed;
        s.opacity = Math.max(0.1, Math.min(0.9, s.opacity));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${s.opacity})`;
        ctx.fill();
        s.y += s.speed;
        if (s.y > canvas.height) {
            s.y = 0;
            s.x = Math.random() * canvas.width;
        }
    });
    requestAnimationFrame(drawStars);
}

resizeCanvas();
initStars();
drawStars();
window.addEventListener('resize', () => { resizeCanvas(); initStars(); });

// ─── Local Storage ─────────────────────────────────────────
export function saveToStorage() {
    localStorage.setItem('iss_email', document.getElementById('email').value);
    localStorage.setItem('iss_lat', document.getElementById('lat').value);
    localStorage.setItem('iss_lon', document.getElementById('lon').value);
}

function loadFromStorage() {
    document.getElementById('email').value = localStorage.getItem('iss_email') || '';
    document.getElementById('lat').value   = localStorage.getItem('iss_lat') || '';
    document.getElementById('lon').value   = localStorage.getItem('iss_lon') || '';
}

// ─── History ───────────────────────────────────────────────
function addToHistory(timestamp) {
    let history = JSON.parse(localStorage.getItem('iss_history') || '[]');
    if (!history.includes(timestamp)) {
        history.unshift(timestamp);
        if (history.length > 20) history = history.slice(0, 20);
        localStorage.setItem('iss_history', JSON.stringify(history));
    }
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('iss_history') || '[]');
    const el = document.getElementById('historyList');
    if (history.length === 0) {
        el.innerHTML = '<p class="empty-state">No passes recorded yet.</p>';
        return;
    }
    el.innerHTML = history.map((t, i) =>
        `<div class="history-item">
            <span class="history-num">#${i + 1}</span>
            <span class="history-time">${t}</span>
        </div>`
    ).join('');
}

export function clearHistory() {
    localStorage.removeItem('iss_history');
    renderHistory();
}

// ─── Google SSO ────────────────────────────────────────────
export function handleGoogleLogin(response) {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('googleSignInBtn').style.display = 'none';
    document.getElementById('userAvatar').src = payload.picture;
    document.getElementById('userName').innerText = payload.name;
    document.getElementById('userEmailText').innerText = payload.email;
    document.getElementById('email').value = payload.email;
    saveToStorage();
}

export function logout() {
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('googleSignInBtn').style.display = 'block';
    document.getElementById('email').value = '';
}

// ─── Monitor ───────────────────────────────────────────────
export async function startMonitoring() {
    const email    = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const lat      = document.getElementById('lat').value;
    const lon      = document.getElementById('lon').value;

    if (!email || !password || !lat || !lon) {
        setStatus('⚠️ Please fill in all fields.', false);
        return;
    }

    const res = await fetch('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, lat, lon })
    });
    const data = await res.json();
    setStatus(data.message, true);
}

export async function stopMonitoring() {
    const res = await fetch('/stop', { method: 'POST' });
    const data = await res.json();
    setStatus(data.message, false);
}

async function fetchStatus() {
    try {
        const res  = await fetch('/status');
        const data = await res.json();
        setStatus(data.message, data.running);
        if (data.last_overhead) {
            document.getElementById('lastOverhead').innerText = data.last_overhead;
            addToHistory(data.last_overhead);
        }
        if (data.iss_position) updateISSDisplay(data.iss_position);
    } catch (e) { console.warn('Status fetch failed', e); }
}

async function fetchISSPosition() {
    try {
        const res  = await fetch('/iss-position');
        const data = await res.json();
        updateISSDisplay(data);
    } catch (e) { console.warn('ISS position fetch failed', e); }
}

function updateISSDisplay(data) {
    document.getElementById('issLat').innerText  = data.latitude.toFixed(4) + '°';
    document.getElementById('issLon').innerText  = data.longitude.toFixed(4) + '°';
    document.getElementById('issTime').innerText = data.timestamp.split(' ')[1];
    updateMap(data.latitude, data.longitude);
}

function setStatus(msg, running) {
    document.getElementById('statusText').innerText = msg;
    document.getElementById('statusDot').className  = 'status-dot' + (running ? ' active' : '');
}

// ─── Init ──────────────────────────────────────────────────
loadFromStorage();
renderHistory();
setInterval(fetchISSPosition, 10000);
setInterval(fetchStatus, 15000);