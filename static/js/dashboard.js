import { initGlobe, updateGlobe } from './globe.js';

let watchId = null; // geolocation watch ID

window.addEventListener('DOMContentLoaded', () => {
    initGlobe();
    loadPrefs();
    fetchISSPosition();
    setInterval(fetchISSPosition, 10000);
    setInterval(fetchStatus, 15000);
    initTheme();
    initLocationToggle();
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

window.toggleTheme = function () {
    const current = localStorage.getItem('iss_theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
};

// ── Prefs — NEVER override server-provided email ──────────
function loadPrefs() {
    // Email comes from server (Jinja), never from localStorage
    const lat = localStorage.getItem('iss_lat');
    const lon = localStorage.getItem('iss_lon');
    if (lat) document.getElementById('lat').value = lat;
    if (lon) document.getElementById('lon').value = lon;
}

window.savePrefs = function () {
    // Never save email to localStorage
    localStorage.setItem('iss_lat', document.getElementById('lat').value);
    localStorage.setItem('iss_lon', document.getElementById('lon').value);
};

// ── Live Location Toggle ───────────────────────────────────
function initLocationToggle() {
    const toggle = document.getElementById('locationToggle');
    if (!toggle) return;

    const saved = localStorage.getItem('iss_location_enabled') === 'true';
    toggle.checked = saved;
    if (saved) startWatchingLocation();

    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            requestLocationPermission();
        } else {
            stopWatchingLocation();
            localStorage.setItem('iss_location_enabled', 'false');
        }
    });
}

function requestLocationPermission() {
    showLocationPopup();
}

function showLocationPopup() {
    const overlay = document.getElementById('locationOverlay');
    if (overlay) overlay.classList.add('active');
}

window.allowLocation = function () {
    hideLocationPopup();
    startWatchingLocation();
    localStorage.setItem('iss_location_enabled', 'true');
};

window.skipLocation = function () {
    hideLocationPopup();
    const toggle = document.getElementById('locationToggle');
    if (toggle) toggle.checked = false;
    localStorage.setItem('iss_location_enabled', 'false');
};

function hideLocationPopup() {
    const overlay = document.getElementById('locationOverlay');
    if (overlay) overlay.classList.remove('active');
}

function startWatchingLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }
    watchId = navigator.geolocation.watchPosition(
        pos => {
            const lat = pos.coords.latitude.toFixed(6);
            const lon = pos.coords.longitude.toFixed(6);
            document.getElementById('lat').value = lat;
            document.getElementById('lon').value = lon;
            localStorage.setItem('iss_lat', lat);
            localStorage.setItem('iss_lon', lon);

            // Update location indicator
            const indicator = document.getElementById('locationIndicator');
            if (indicator) {
                indicator.textContent = `📍 ${lat}, ${lon}`;
                indicator.style.color = 'var(--green)';
            }
        },
        err => {
            console.warn('Location error:', err.message);
            const toggle = document.getElementById('locationToggle');
            if (toggle) toggle.checked = false;
            localStorage.setItem('iss_location_enabled', 'false');
        },
        { enableHighAccuracy: true, maximumAge: 30000 }
    );
}

function stopWatchingLocation() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    const indicator = document.getElementById('locationIndicator');
    if (indicator) {
        indicator.textContent = 'Manual';
        indicator.style.color = 'var(--muted)';
    }
}

// ── Monitor ───────────────────────────────────────────────
window.startMonitoring = async function () {
    const email    = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const lat      = document.getElementById('lat').value;
    const lon      = document.getElementById('lon').value;

    if (!email || !password || !lat || !lon) {
        setStatus('⚠️ Fill in all config fields.', false);
        return;
    }

    const res  = await fetch('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, lat, lon })
    });
    const data = await res.json();
    setStatus(data.message, true);
};

window.stopMonitoring = async function () {
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