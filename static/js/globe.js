// Globe.js — Realistic Earth, ISS on globe surface, proper theme support
// THREE is loaded as UMD global from dashboard.html

let scene, camera, renderer;
let earthGroup, earthMesh, cloudMesh;
let issSprite, issTrailGroup;
let trailPoints = [];
let isDragging = false, prevMouse = { x: 0, y: 0 };
let rotVelX = 0, rotVelY = 0;
let currentISSLat = 0, currentISSLon = 0;
let isRelocating = false;
let section;

export function initGlobe() {
    const canvas = document.getElementById('globeCanvas');
    section = canvas.parentElement;

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(section.clientWidth, section.clientHeight);
    renderer.setClearColor(0x000000, 0);

    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, section.clientWidth / section.clientHeight, 0.1, 2000);
    camera.position.z = 2.8;

    buildScene();
    bindEvents(canvas);
    buildRelocateBtn();
    animate();
}

function buildScene() {
    buildLighting();
    buildStarField();
    buildNebulae();
    buildSolarSystem();
    buildEarth();
    buildISSMarker();
}

// ── Lighting ──────────────────────────────────────────────
function buildLighting() {
    // Ambient
    scene.add(new THREE.AmbientLight(0x112244, 0.6));

    // Sun light — warm directional
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.0);
    sun.position.set(8, 4, 6);
    scene.add(sun);

    // Rim light — subtle blue from opposite side
    const rim = new THREE.DirectionalLight(0x224488, 0.4);
    rim.position.set(-6, -2, -4);
    scene.add(rim);
}

// ── Realistic Star Field ──────────────────────────────────
function buildStarField() {
    // Layer 1: distant tiny stars
    const geo1 = new THREE.BufferGeometry();
    const pos1 = [];
    for (let i = 0; i < 12000; i++) {
        const r   = 300 + Math.random() * 700;
        const phi = Math.acos(2 * Math.random() - 1);
        const th  = Math.random() * Math.PI * 2;
        pos1.push(
            r * Math.sin(phi) * Math.cos(th),
            r * Math.sin(phi) * Math.sin(th),
            r * Math.cos(phi)
        );
    }
    geo1.setAttribute('position', new THREE.Float32BufferAttribute(pos1, 3));
    scene.add(new THREE.Points(geo1, new THREE.PointsMaterial({
        color: 0xffffff, size: 0.4, transparent: true, opacity: 0.6, sizeAttenuation: true
    })));

    // Layer 2: mid-distance brighter stars
    const geo2 = new THREE.BufferGeometry();
    const pos2 = [], colors2 = [];
    const starColors = [
        [1.0, 0.9, 0.8],   // warm white
        [0.8, 0.9, 1.0],   // cool blue
        [1.0, 1.0, 1.0],   // pure white
        [1.0, 0.8, 0.6],   // orange giant
        [0.9, 0.8, 1.0],   // purple
    ];
    for (let i = 0; i < 2000; i++) {
        const r   = 150 + Math.random() * 200;
        const phi = Math.acos(2 * Math.random() - 1);
        const th  = Math.random() * Math.PI * 2;
        pos2.push(
            r * Math.sin(phi) * Math.cos(th),
            r * Math.sin(phi) * Math.sin(th),
            r * Math.cos(phi)
        );
        const c = starColors[Math.floor(Math.random() * starColors.length)];
        colors2.push(...c);
    }
    geo2.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3));
    geo2.setAttribute('color', new THREE.Float32BufferAttribute(colors2, 3));
    scene.add(new THREE.Points(geo2, new THREE.PointsMaterial({
        size: 0.8, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true
    })));

    // Layer 3: Milky Way band
    const geo3 = new THREE.BufferGeometry();
    const pos3 = [], colors3 = [];
    for (let i = 0; i < 5000; i++) {
        const theta   = Math.random() * Math.PI * 2;
        const bandPhi = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        const r       = 200 + Math.random() * 100;
        pos3.push(
            r * Math.sin(bandPhi) * Math.cos(theta),
            r * Math.sin(bandPhi) * Math.sin(theta),
            r * Math.cos(bandPhi)
        );
        const brightness = 0.3 + Math.random() * 0.5;
        colors3.push(brightness * 0.7, brightness * 0.8, brightness * 1.0);
    }
    geo3.setAttribute('position', new THREE.Float32BufferAttribute(pos3, 3));
    geo3.setAttribute('color', new THREE.Float32BufferAttribute(colors3, 3));
    scene.add(new THREE.Points(geo3, new THREE.PointsMaterial({
        size: 0.25, vertexColors: true, transparent: true, opacity: 0.5, sizeAttenuation: true
    })));
}

// ── Nebulae (volumetric-feel using large transparent spheres) ──
function buildNebulae() {
    const nebulae = [
        { color: 0x1a0533, pos: [-120, 60, -200],  r: 80  },
        { color: 0x001a33, pos: [150, -40, -180],   r: 70  },
        { color: 0x0d1a00, pos: [-80, -100, -150],  r: 60  },
        { color: 0x1a0a00, pos: [200, 80, -120],    r: 50  },
    ];
    nebulae.forEach(n => {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(n.r, 16, 16),
            new THREE.MeshBasicMaterial({ color: n.color, transparent: true, opacity: 0.18, side: THREE.BackSide })
        );
        mesh.position.set(...n.pos);
        scene.add(mesh);
    });
}

// ── Solar System ──────────────────────────────────────────
function buildSolarSystem() {
    // Sun
    const sunMesh = new THREE.Mesh(
        new THREE.SphereGeometry(4, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xfff0a0 })
    );
    sunMesh.position.set(80, 25, -120);
    scene.add(sunMesh);

    // Sun glow layers
    [6, 8, 11].forEach((r, i) => {
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(r, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.06 - i * 0.015, side: THREE.BackSide })
        );
        glow.position.copy(sunMesh.position);
        scene.add(glow);
    });

    // Planets
    window._solarPlanets = [
        { r: 0.35, color: 0xaa7755, dist: 18, speed: 0.00035, incline: 0.1,  ring: false }, // Mars
        { r: 0.85, color: 0xddbb88, dist: 30, speed: 0.00018, incline: 0.05, ring: true  }, // Saturn-ish
        { r: 0.45, color: 0x88bbff, dist: 42, speed: 0.00010, incline: 0.2,  ring: false }, // Neptune-ish
        { r: 0.25, color: 0xffcc44, dist: 12, speed: 0.00060, incline: 0.08, ring: false }, // Venus-ish
    ].map(p => {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(p.r, 24, 24),
            new THREE.MeshPhongMaterial({ color: p.color, shininess: 8 })
        );
        mesh._angle  = Math.random() * Math.PI * 2;
        mesh._dist   = p.dist;
        mesh._speed  = p.speed;
        mesh._incline = p.incline;

        if (p.ring) {
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(p.r * 1.5, p.r * 2.4, 64),
                new THREE.MeshBasicMaterial({
                    color: 0xccaa66, transparent: true, opacity: 0.45, side: THREE.DoubleSide
                })
            );
            ring.rotation.x = Math.PI / 3;
            mesh.add(ring);
        }
        scene.add(mesh);
        return mesh;
    });
}

// ── Earth ─────────────────────────────────────────────────
function buildEarth() {
    earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const loader = new THREE.TextureLoader();

    // Earth sphere
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
        color:    0x1a4a7a,
        specular: new THREE.Color(0x112233),
        shininess: 25,
    });

    // Load real Earth texture
    loader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
        tex => { earthMat.map = tex; earthMat.needsUpdate = true; }
    );

    // Specular/bump maps from NASA
    loader.load('https://unpkg.com/three-globe/example/img/earth-water.png',
        tex => { earthMat.specularMap = tex; earthMat.needsUpdate = true; }
    );

    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // Clouds
    const cloudMat = new THREE.MeshPhongMaterial({
        transparent: true, opacity: 0.35, depthWrite: false
    });
    loader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png',
        tex => { cloudMat.map = tex; cloudMat.needsUpdate = true; }
    );
    cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 64), cloudMat);
    earthGroup.add(cloudMesh);

    // Atmosphere glow
    const atmMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.06, 64, 64),
        new THREE.MeshPhongMaterial({
            color: 0x3388ff, transparent: true, opacity: 0.08, side: THREE.FrontSide
        })
    );
    scene.add(atmMesh); // not parented to group so it doesn't rotate

    // Outer atmosphere halo
    const haloMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.12, 64, 64),
        new THREE.MeshPhongMaterial({
            color: 0x1166ff, transparent: true, opacity: 0.03, side: THREE.BackSide
        })
    );
    scene.add(haloMesh);

    // Lat/lon grid lines (subtle)
    const gridMat = new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.2 });
    for (let lat = -80; lat <= 80; lat += 20) {
        const pts = [];
        for (let lon = 0; lon <= 361; lon += 3) pts.push(latLonToVec3(lat, lon, 1.003));
        earthGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lon = 0; lon < 360; lon += 30) {
        const pts = [];
        for (let lat = -90; lat <= 90; lat += 3) pts.push(latLonToVec3(lat, lon, 1.003));
        earthGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
}

// ── ISS Marker (child of earthGroup so it rotates with Earth) ──
function buildISSMarker() {
    issTrailGroup = new THREE.Group();
    earthGroup.add(issTrailGroup);

    // Create ISS sprite using canvas texture
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width  = 128;
    spriteCanvas.height = 128;
    const sCtx = spriteCanvas.getContext('2d');

    // Draw UFO/satellite emoji on canvas
    sCtx.font = '80px serif';
    sCtx.textAlign    = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('🛸', 64, 64);

    const spriteTex = new THREE.CanvasTexture(spriteCanvas);
    const spriteMat = new THREE.SpriteMaterial({ map: spriteTex, depthTest: false });
    issSprite = new THREE.Sprite(spriteMat);
    issSprite.scale.set(0.12, 0.12, 0.12);
    issSprite.renderOrder = 999;

    // Glow ring under ISS
    const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.03, 0.06, 32),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthTest: false })
    );

    // Group ISS sprite + ring
    const issGroup = new THREE.Group();
    issGroup.add(issSprite);
    issGroup.add(ringMesh);
    issGroup.renderOrder = 999;

    window._issGroup = issGroup;
    earthGroup.add(issGroup);

    // Position at default
    positionISSOnGlobe(0, 0);
}

function positionISSOnGlobe(lat, lon) {
    if (!window._issGroup) return;
    const pos = latLonToVec3(lat, lon, 1.09);
    window._issGroup.position.copy(pos);

    // Make it face outward from globe center
    window._issGroup.lookAt(new THREE.Vector3(0, 0, 0));
    window._issGroup.rotateX(Math.PI); // flip to face outward
}

// ── Relocate Button ───────────────────────────────────────
function buildRelocateBtn() {
    const btn = document.createElement('button');
    btn.id        = 'relocateBtn';
    btn.innerHTML = '⊙ Locate ISS';
    btn.style.cssText = `
        position: absolute;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        padding: 9px 22px;
        background: rgba(0,255,255,0.08);
        border: 1px solid rgba(0,255,255,0.35);
        border-radius: 999px;
        color: #00ffff;
        font-family: 'Space Mono', monospace;
        font-size: 0.72rem;
        letter-spacing: 0.12em;
        cursor: pointer;
        backdrop-filter: blur(12px);
        transition: all 0.25s;
        z-index: 10;
        white-space: nowrap;
    `;
    btn.onmouseenter = () => {
        btn.style.background = 'rgba(0,255,255,0.18)';
        btn.style.boxShadow  = '0 0 20px rgba(0,255,255,0.2)';
    };
    btn.onmouseleave = () => {
        btn.style.background = 'rgba(0,255,255,0.08)';
        btn.style.boxShadow  = 'none';
    };
    btn.onclick = relocateToISS;
    section.appendChild(btn);
}

function relocateToISS() {
    isRelocating = true;

    // Calculate target rotation so ISS faces camera
    const issVec  = latLonToVec3(currentISSLat, currentISSLon, 1).normalize();
    const camVec  = new THREE.Vector3(0, 0, 1);
    const cross   = new THREE.Vector3().crossVectors(issVec, camVec).normalize();
    const angle   = issVec.angleTo(camVec);

    const targetQ = new THREE.Quaternion().setFromAxisAngle(cross, angle);
    window._relocateTarget = targetQ;
}

// ── Helpers ───────────────────────────────────────────────
function latLonToVec3(lat, lon, r = 1.0) {
    const phi   = (90 - lat)  * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
         r * Math.cos(phi),
         r * Math.sin(phi) * Math.sin(theta)
    );
}

// ── Public: update ISS position ───────────────────────────
export function updateGlobe(lat, lon) {
    currentISSLat = lat;
    currentISSLon = lon;

    positionISSOnGlobe(lat, lon);

    // Trail (in earth-local space)
    trailPoints.push(latLonToVec3(lat, lon, 1.04));
    if (trailPoints.length > 80) trailPoints.shift();

    // Rebuild trail
    while (issTrailGroup.children.length) issTrailGroup.remove(issTrailGroup.children[0]);
    if (trailPoints.length >= 2) {
        const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
        const trailMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });
        issTrailGroup.add(new THREE.Line(trailGeo, trailMat));
    }
}

// ── Events ────────────────────────────────────────────────
function bindEvents(canvas) {
    canvas.addEventListener('mousedown', e => {
        isDragging   = true;
        isRelocating = false;
        prevMouse    = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        rotVelY += (e.clientX - prevMouse.x) * 0.0006;
        rotVelX += (e.clientY - prevMouse.y) * 0.0006;
        prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });

    canvas.style.cursor = 'grab';

    // Scroll zoom
    canvas.addEventListener('wheel', e => {
        camera.position.z = Math.max(1.6, Math.min(6, camera.position.z + e.deltaY * 0.003));
        e.preventDefault();
    }, { passive: false });

    // Touch
    let lastTouch = null;
    canvas.addEventListener('touchstart', e => {
        isDragging = true;
        lastTouch  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });
    canvas.addEventListener('touchmove', e => {
        if (!isDragging || !lastTouch) return;
        rotVelY += (e.touches[0].clientX - lastTouch.x) * 0.0006;
        rotVelX += (e.touches[0].clientY - lastTouch.y) * 0.0006;
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', () => { isDragging = false; });

    // Resize
    window.addEventListener('resize', () => {
        const w = section.clientWidth, h = section.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    });
}

// ── Animation Loop ────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);

    const t = Date.now() * 0.001;

    // Auto-rotate
    if (!isDragging) earthGroup.rotation.y += 0.0005;

    // Drag rotation with damping
    earthGroup.rotation.x += rotVelX;
    earthGroup.rotation.y += rotVelY;
    rotVelX *= 0.90;
    rotVelY *= 0.90;

    // Clamp X tilt
    earthGroup.rotation.x = Math.max(-1.2, Math.min(1.2, earthGroup.rotation.x));

    // Smooth relocate
    if (isRelocating && window._relocateTarget) {
        earthGroup.quaternion.slerp(window._relocateTarget, 0.04);
        if (earthGroup.quaternion.angleTo(window._relocateTarget) < 0.01) isRelocating = false;
    }

    // Clouds rotate slightly faster
    if (cloudMesh) cloudMesh.rotation.y += 0.0003;

    // ISS sprite always faces camera (billboard)
    if (issSprite) issSprite.material.rotation = 0;

    // Pulse ISS glow ring
    if (window._issGroup) {
        const pulse = 0.8 + Math.sin(t * 4) * 0.2;
        window._issGroup.scale.setScalar(pulse);
    }

    // Animate planets
    if (window._solarPlanets) {
        window._solarPlanets.forEach(p => {
            p._angle += p._speed;
            p.position.x = Math.cos(p._angle) * p._dist;
            p.position.z = Math.sin(p._angle) * p._dist;
            p.position.y = Math.sin(p._angle * 0.5) * p._dist * (p._incline || 0.1);
            p.rotation.y += 0.003;
        });
    }

    renderer.render(scene, camera);
}