/**
 * UI Module - Component Rendering (Single Responsibility)
 * Renders visual components based on store state.
 * Dependency: Store (state management)
 */
const UI = (() => {
  const $ = (id) => document.getElementById(id);
  const state = Store.getState;

  // --- Three.js 3D Renderer ---
  let scene, camera, renderer, controls, mesh;
  let is3DRunning = false;
  let turbinaSpeed = 0;
  const TURBINA_SPEED_MAX = 20; // max rotation speed in rad/s

  function initThree() {
    const container = document.getElementById('turbina-canvas');
    if (!container) return;

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A0B12);

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 2.5, 10);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x00D4FF, 0.4);
    fillLight.position.set(-5, -5, 5);
    scene.add(fillLight);

    // Grid
    const gridHelper = new THREE.GridHelper(10, 20, 0x00D4FF, 0x0A0B12);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Load 3D model
    const loader = new THREE.GLTFLoader();
    loader.load(
      '/turbina.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.4, 0.4, 0.4);
        model.position.y = 0;
        model.castShadow = true;
        model.receiveShadow = true;
        scene.add(model);
        mesh = model;
        console.log('[3D] Modelo cargado:', model);
      },
      undefined,
      (error) => {
        console.error('[3D] Error cargando modelo:', error);
        createFallbackTurbine();
      }
    );

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    is3DRunning = true;
  }

  function createFallbackTurbine() {
    const group = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 24, 12);
    const mat = new THREE.MeshPhongMaterial({ color: 0x00D4FF, emissive: 0x00D4FF, emissiveIntensity: 0.2, shininess: 50 });
    const runner = new THREE.Mesh(geo, mat);
    runner.position.y = 0.15;
    runner.castShadow = true;
    group.add(runner);
    for (let i = 0; i < 12; i++) {
      const bladeGeo = new THREE.BoxGeometry(0.08, 0.35, 0.04);
      const bladeMat = new THREE.MeshPhongMaterial({ color: 0x00D4FF, shininess: 30 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      const angle = (i / 12) * Math.PI * 2;
      blade.position.set(Math.cos(angle) * 0.55, Math.sin(angle) * 0.55, 0);
      blade.rotation.x = Math.PI / 2;
      blade.rotation.z = angle;
      group.add(blade);
    }
    group.scale.set(0.5, 0.5, 0.5);
    scene.add(group);
    mesh = group;
  }

  function renderTurbina3D() {
    const container = document.getElementById('turbina-canvas');
    if (!container) return;

    if (!is3DRunning) {
      initThree();
    }

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    if (controls) controls.update();

    // Rotate turbine based on received rpm
    if (mesh) {
      const speed = Math.min(turbinaSpeed / TURBINA_SPEED_MAX, 1);
      mesh.rotation.y += speed * 0.8;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(renderTurbina3D);
  }

  // --- Volumetric flow and cavitation visualization ---
  function renderFlowParticles() {
    const canvas = document.getElementById('turbina-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth || 800;
    const h = canvas.height = canvas.clientHeight || 600;
    ctx.clearRect(0, 0, w, h);

    const nParticles = 200;
    const s = state();
    const flow = s['flow'] || 0.5;
    const speed = Math.min(flow * 20, 1);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < nParticles; i++) {
      const angle = i / nParticles * Math.PI * 2 + Date.now() * 0.001 * speed;
      const dist = 1.2 + Math.random() * 0.8;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist * 0.5;

      const alpha = 0.2 + (flow / 1.5) * 0.3;
      ctx.beginPath();
      ctx.arc(x * 40, y * 40, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 212, 255, ${alpha})`;
      ctx.fill();
    }

    ctx.restore();

    requestAnimationFrame(renderFlowParticles);
  }

  function renderKPIs() {
    const grid = document.getElementById('kpi-grid');
    if (!grid) return;
    const s = state();
    const kpis = [
      { label: 'Velocidad Rodete', value: s['rpm'] ?? 0, fmt: v => v.toFixed(1), accent: 'accent-cyan' },
      { label: 'Potencia Eléctrica', value: s['pElec'] ?? 0, fmt: v => (v / 1000).toFixed(2), accent: 'accent-amber' },
      { label: 'Caudal Descarga (Q)', value: s['flow'] ?? 0, fmt: v => v.toFixed(3), accent: 'accent-cyan' },
      { label: 'Caída Neta (H)', value: s['headNet'] ?? 0, fmt: v => v.toFixed(2), accent: 'accent-indigo' },
      { label: 'Eficiencia Total', value: s['eta'] ?? 0, fmt: v => v.toFixed(1), accent: 'accent-emerald' },
      { label: 'Cavitación (σ)', value: s['sigma'] ?? 0, fmt: v => v.toFixed(3), accent: 'accent-violet' },
    ];
    grid.innerHTML = kpis.map(kpi => `
      <div class="kpi-card">
        <div class="flex items-center justify-between">
          <span class="kpi-label">${kpi.label}</span>
          <span class="text-[10px] text-ink-muted font-mono">${kpi.unit || ''}</span>
        </div>
        <div class="flex items-baseline gap-1 mt-1">
          <span class="kpi-value ${kpi.accent}">${typeof kpi.fmt === 'function' ? kpi.fmt(s[kpi.id]) : s[kpi.id]}</span>
        </div>
      </div>
    `).join('');
  }

  function renderAlarms() {
    const body = document.getElementById('alarm-table-body');
    if (!body) return;
    const alarms = state('alarms') || [];
    const unack = alarms.filter(a => !a.ack).length;
    body.innerHTML = alarms.slice(0, 20).map(a => {
      const sev = a.severity === 'CRITICAL' ? 'critical' : a.severity === 'WARNING' ? 'warning' : 'info';
      return `
        <div class="alarm-item ${sev}">
          <div class="alarm-severity ${sev}">${a.severity}</div>
          <div class="flex-1">
            <div class="alarm-code">${a.code}</div>
            <div class="alarm-message">${a.message}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-ink-muted">${a.time}</span>
            <span class="text-[10px] text-ink-muted">${a.ack ? '✓ ACK' : '⏳ PENDIENTE'}</span>
          </div>
        </div>
      `;
    }).join('') || '<div class="text-sm text-ink-muted">Sin alarmas</div>';
    const el = document.getElementById('alarm-count');
    if (el) el.textContent = unack;
  }

  function renderGridStatus() {
    const s = state();
    const badge = document.getElementById('grid-status-badge');
    const led = document.getElementById('grid-led');
    const txt = document.getElementById('grid-status-txt');
    if (s.gridSynced) {
      if (badge) badge.className = 'bg-emerald-950 border border-emerald-800 text-emerald-300';
      if (led) led.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-dot';
      if (txt) txt.textContent = 'ACOPLADA A RED (60Hz)';
    } else {
      if (badge) badge.className = 'bg-slate-800 border border-slate-700 text-slate-400';
      if (led) led.className = 'w-2.5 h-2.5 rounded-full bg-slate-500';
      if (txt) txt.textContent = 'EN ISLA';
    }
  }

  function renderLabs() {
    const container = document.getElementById('labs-container');
    if (!container) return;
    container.innerHTML = `
      <div class="lab-scenario">
        <div class="lab-card" onclick="runLabScenario('startup')">
          <div class="icon" style="background:rgba(0,212,255,0.15);color:var(--accent)"><i class="fa-solid fa-play"></i></div>
          <div class="title">Arranque Black-Start &amp; Sincronización</div>
          <div class="description">Guía el proceso desde 0 RPM, rampa de apertura y gobernador PID hasta acople a red en 60 Hz.</div>
        </div>
        <div class="lab-card" onclick="runLabScenario('rejection')">
          <div class="icon" style="background:rgba(239,68,68,0.15);color:var(--status-error)"><i class="fa-solid fa-bolt"></i></div>
          <div class="title">Rechazo de Carga 100%</div>
          <div class="description">Simula la apertura súbita del interruptor 52-1, observando sobrevelocidad transitoria y onda de golpe de ariete.</div>
        </div>
        <div class="lab-card" onclick="runLabScenario('cavitation')">
          <div class="icon" style="background:rgba(245,158,11,0.15);color:var(--status-warning)"><i class="fa-solid fa-water"></i></div>
          <div class="title">Prueba Límite Cavitación</div>
          <div class="description">Operación a baja caída y apertura reducida para detonar caída de sigma Thoma por debajo del valor crítico.</div>
        </div>
      </div>
    `;
  }

  function runLabScenario(type) {
    const s = state();
    if (type === 'startup') { startPlant(); setTimeout(() => { if (s('state') === 'islanded') window.toggleGridSync(); }, 3000); }
    else if (type === 'rejection') { toggleTrip(); setTimeout(() => { if (s('state') === 'tripped') stopPlant(); }, 2000); }
    else if (type === 'cavitation') {
      const h = parseFloat(document.getElementById('size-h')?.value) || 35;
      document.getElementById('size-h').value = 12;
      window.calculateSizing();
      startPlant();
    }
    toast(`Escenario "${type}" ejecutado`, 'info', 2000);
  }

  // --- Status badge ---
  function renderStatusBadge() {
    const map = {
      stopped: { cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600', html: '<span class="status-dot bg-slate-400"></span> Detenida' },
      starting: { cls: 'bg-amber-50 dark:bg-amber-950 text-amber-700', html: '<span class="status-dot bg-amber-500 pulse-dot"></span> Arrancando' },
      islanded: { cls: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700', html: '<span class="status-dot bg-emerald-500 pulse-dot"></span> En isla' },
      syncing: { cls: 'bg-brand-50 dark:bg-brand-950 text-brand-700', html: '<span class="status-dot bg-brand-500 pulse-dot"></span> Sincronizando' },
      grid: { cls: 'bg-brand-50 dark:bg-brand-950 text-brand-700', html: '<span class="status-dot bg-brand-500 pulse-dot"></span> Acoplada a red' },
      tripped: { cls: 'bg-rose-50 dark:bg-rose-950 text-rose-700', html: '<span class="status-dot bg-rose-500 pulse-dot"></span> Disparo' },
    };
    const c = map[state('state')] || map.stopped;
    const badge = document.getElementById('plant-badge');
    if (badge) {
      badge.className = `shrink-0 hidden md:inline-flex items-center gap-1.5 border text-[11px] font-bold px-2.5 py-1 rounded-full ${c.cls}`;
      badge.innerHTML = c.html;
    }
  }

  // --- Controls panel ---
  function renderControls() {
    const panel = document.getElementById('control-panel');
    if (!panel) return;
    const s = state();
    panel.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-sm font-bold text-ink"><i class="fa-solid fa-sliders text-brand-400 mr-2"></i>Controles de Mando</h3>
        <div class="flex gap-2">
          <button class="btn btn-sm" onclick="setMode('manual')" id="btn-mode-manual"><i class="fa-solid fa-hand text-[10px]"></i> MANUAL</button>
          <button class="btn btn-sm" onclick="setMode('auto')" id="btn-mode-auto"><i class="fa-solid fa-robot text-[10px]"></i> AUTO</button>
        </div>
      </div>
      <div class="control-group">
        <div class="control-group-title"><i class="fa-solid fa-cog text-brand-400 mr-1"></i>Parámetros de Gobernador PID</div>
        <div class="control-row">
          <div class="control-label">Ganancia (Kp)</div>
          <div style="flex:1"><input type="range" id="pid-kp" min="0" max="20" step="0.1" value="${s('Kp')}" class="control-slider"></div>
          <div class="control-value" id="pid-kp-val">${s('Kp')}</div>
        </div>
        <div class="control-row">
          <div class="control-label">Tiempo Integral (Ti)</div>
          <div style="flex:1"><input type="range" id="pid-ti" min="0.1" max="10" step="0.1" value="${s('Ti')}" class="control-slider"></div>
          <div class="control-value" id="pid-ti-val">${s('Ti')} s</div>
        </div>
        <div class="control-row">
          <div class="control-label">Tiempo Derivativo (Td)</div>
          <div style="flex:1"><input type="range" id="pid-td" min="0" max="2" step="0.05" value="${s('Td')}" class="control-slider"></div>
          <div class="control-value" id="pid-td-val">${s('Td')} s</div>
        </div>
        <div class="control-row">
          <div class="control-label">Droop (%)</div>
          <div style="flex:1"><input type="range" id="pid-droop" min="0.5" max="15" step="0.5" value="${s('droop')}" class="control-slider"></div>
          <div class="control-value" id="pid-droop-val">${s('droop')} %</div>
        </div>
      </div>
      <div class="control-group">
        <div class="control-group-title"><i class="fa-solid fa-sliders text-brand-400 mr-1"></i>Control Manual de Velocidad</div>
        <div class="control-row">
          <div class="control-label">Consigna Velocidad (n*)</div>
          <div style="flex:1"><input type="range" id="manual-n" min="800" max="1800" step="10" value="${s('nDesign')}" class="control-slider"></div>
          <div class="control-value" id="manual-n-val">${s('nDesign')} RPM</div>
        </div>
        <div class="control-row">
          <div class="control-label">Consigna Caída Neta (H₀)</div>
          <div style="flex:1"><input type="range" id="manual-h" min="5" max="60" step="0.5" value="${s('headGross')}" class="control-slider"></div>
          <div class="control-value" id="manual-h-val">${s('headGross')} m</div>
        </div>
        <div class="control-row">
          <div class="control-label">Apertura Distribuidor (a)</div>
          <div style="flex:1"><input type="range" id="manual-gate" min="0" max="100" step="0.5" value="0" class="control-slider"></div>
          <div class="control-value" id="manual-gate-val">0 %</div>
        </div>
      </div>
      <div class="control-group">
        <div class="flex justify-between items-center">
          <h4 class="text-sm font-bold text-ink"><i class="fa-solid fa-play text-emerald-400 mr-2"></i>Control</h4>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary" onclick="startPlant()"><i class="fa-solid fa-play"></i> Arrancar</button>
          <button class="btn btn-warning" onclick="stopPlant()"><i class="fa-solid fa-stop"></i> Parar</button>
          <button class="btn btn-danger" onclick="toggleTrip()"><i class="fa-solid fa-triangle-exclamation"></i> Trip</button>
        </div>
      </div>
      <div class="control-group">
        <div class="flex justify-between items-center">
          <h4 class="text-sm font-bold text-ink"><i class="fa-solid fa-plug text-brand-400 mr-2"></i>Red Eléctrica</h4>
        </div>
        <div class="flex gap-2">
          <button class="btn" onclick="toggleGridSync()" id="btn-sync"><i class="fa-solid fa-plug"></i> Acoplar a Red</button>
        </div>
      </div>
    `;
  }

  // --- Register listeners ---
  function registerListeners() {
    const unsub = Store.subscribe(() => {
      renderStatusBadge();
      renderControls();
      renderKPIs();
      renderGridStatus();
      renderAlarms();
    });
  }

  // --- Public API ---
  return {
    init() {
      renderStatusBadge();
      renderControls();
      renderKPIs();
      renderGridStatus();
      renderAlarms();
      renderTurbina3D();
      renderFlowParticles();
      renderLabs();
      registerListeners();
    },
  };
})();

window.UI = UI;
