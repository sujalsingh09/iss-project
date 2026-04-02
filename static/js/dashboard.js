import { initGlobe, updateGlobe } from './globe.js';

// ── Init globe after DOM ready ────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    initGlobe();
    loadPrefs();
    fetchISSPosition();
    setInterval(fetchISSPosition, 10000);
    setInterval(fetchStatus, 15000);
    initTheme();
});

// ── Theme ─────────────────────────────────────────────────
function initTheme() {
    const saved = localStorage.getItem('iss_theme') || 'dark';
    applyTheme(saved);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('iss_theme', theme);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.innerText = theme === 'dark' ? '☀ Light' : '☾ Dark';
}

window.toggleTheme = function() {
    const current = localStorage.getItem('iss_theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
};

// ── Prefs ─────────────────────────────────────────────────
function loadPrefs() {
    const email = localStorage.getItem('iss_email');
    const lat   = localStorage.getItem('iss_lat');
    const lon   = localStorage.getItem('iss_lon');
    if (email) document.getElementById('email').value = email;
    if (lat)   document.getElementById('lat').value   = lat;
    if (lon)   document.getElementById('lon').value   = lon;
}

window.savePrefs = function() {
    localStorage.setItem('iss_email', document.getElementById('email').value);
    localStorage.setItem('iss_lat',   document.getElementById('lat').value);
    localStorage.setItem('iss_lon',   document.getElementById('lon').value);
};

// ── Monitor ───────────────────────────────────────────────
window.startMonitoring = async function() {
    const email    = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const lat      = document.getElementById('lat').value;
    const lon      = document.getElementById('lon').value;
    if (!email || !password || !lat || !lon) {
        setStatus('⚠️ Fill in all config fields.', false); return;
    }
    const res  = await fetch('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, lat, lon })
    });
    const data = await res.json();
    setStatus(data.message, true);
};

window.stopMonitoring = async function() {
    const res  = await fetch('/stop', { method: 'POST' });
    const data = await res.json();
    setStatus(data.message, false);
};

// ── Polling ───────────────────────────────────────────────
async function fetchISSPosition() {
    try {
        const res  = await fetch('/iss-position');
        const data = await res.json();
        updateDisplay(data);
    } catch (e) { console.warn('ISS fetch failed', e); }
}

async function fetchStatus() {
    try {
        const res  = await fetch('/status');
        const data = await res.json();
        setStatus(data.message, data.running);
        if (data.iss_position) updateDisplay(data.iss_position);
        if (data.last_overhead) {
            const el = document.getElementById('overheadStatus');
            if (el) el.innerText = data.last_overhead;
        }
    } catch (e) { console.warn('Status fetch failed', e); }
}

function updateDisplay(data) {
    document.getElementById('issLat').innerText  = data.latitude.toFixed(4) + '°';
    document.getElementById('issLon').innerText  = data.longitude.toFixed(4) + '°';
    document.getElementById('issTime').innerText = data.timestamp.split(' ')[1];
    updateGlobe(data.latitude, data.longitude);
}

function setStatus(msg, running) {
    document.getElementById('statusText').innerText = msg;
    document.getElementById('statusDot').className  = 'status-dot' + (running ? ' active' : '');
}