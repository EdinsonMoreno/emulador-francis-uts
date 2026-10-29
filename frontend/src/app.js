/**
 * App Entry Point (Single Responsibility)
 * Initializes the application, connects to backend, renders UI.
 * Dependency: Store (state management), UI (component rendering)
 */
(function() {
  'use strict';

  // Initialize store connection to backend WebSocket
  Store.connectWebSocket();

  // Initialize UI
  UI.init();

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); toggleTrip(); }
    else if (k === 's') startPlant();
    else if (k === 'p') stopPlant();
    else if (k === 't') toggleTheme();
    else if (k === '1') switchView('monitor');
    else if (k === '2') switchView('3d');
    else if (k === '3') switchView('hmi');
    else if (k === '4') switchView('hmi');
    else if (k === '5') switchView('trends');
    else if (k === '6') switchView('sizing');
    else if (k === '7') switchView('alarms');
    else if (k === '8') switchView('labs');
  });

  // DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] Francis UTS Master v5.0 loaded');
    console.log('[App] Backend WebSocket: ws://localhost:8000/ws');
    console.log('[App] Physics engine: RK4 (30 Hz)');
    console.log('[App] SOLID Principles Applied');
    setTimeout(() => {
      toast('Workspace Francis UTS Master v5.0 Activo', 'info', 2000);
    }, 500);
  });

  // Watch time updates
  setInterval(() => {
    updateTime();
  }, 1000);

  // Toast system
  const toastContainer = document.getElementById('toast-container');
  let toastId = 0;

  window.toast = function(msg, type = 'info', duration = 2500) {
    if (!toastContainer) return;
    const ids = ['info', 'success', 'warning', 'error'];
    const classes = ['bg-slate-900/80', 'bg-emerald-900/80', 'bg-amber-900/80', 'bg-rose-900/80'];
    const icons = ['fa-circle-info', 'fa-check-circle', 'fa-exclamation-triangle', 'fa-exclamation-circle'];
    const ic = document.createElement('span');
    ic.className = 'icon';
    ic.innerHTML = `<i class="fa-solid ${icons[ids.indexOf(type)]}" style="color:${type==='success'?'#10B981':type==='warning'?'#F59E0B':type==='error'?'#EF4444':'#64748B'}"></i>`;
    const txt = document.createElement('span');
    txt.className = 'message';
    txt.textContent = msg;
    const dismiss = document.createElement('span');
    dismiss.className = 'text-white/60 hover:text-white cursor-pointer';
    dismiss.innerHTML = '<i class="fa-solid fa-times"></i>';
    dismiss.onclick = () => { toastContainer.removeChild(txt.parentElement); };
    const el = document.createElement('div');
    el.className = 'toast flex items-center gap-3';
    el.style.borderColor = type === 'success' ? 'rgba(16,185,129,0.4)' : type === 'warning' ? 'rgba(245,158,11,0.4)' : type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(0,212,255,0.3)';
    el.appendChild(ic);
    el.appendChild(txt);
    el.appendChild(dismiss);
    toastContainer.appendChild(el);
    const timer = setTimeout(() => {
      if (el.parentElement) toastContainer.removeChild(el);
    }, duration);
    el.onclick = () => clearTimeout(timer);
  };

  // Time
  function updateTime() {
    const d = new Date();
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    const el = document.getElementById('uptime-clock');
    if (el) el.textContent = `${h}:${m}:${s}`;
  }

  // View switching
  function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navTarget = document.querySelector(`.nav-item[data-nav="${view}"]`);
    if (navTarget) navTarget.classList.add('active');
  }

  // Plant control
  window.startPlant = function() {
    if (Store.getState('state') === 'tripped') { toast('Rearme requerido', 'warning'); return; }
    if (Store.getState('state') !== 'stopped') { toast('Ya está en marcha'); return; }
    Store.setState('state', 'starting');
    UI.renderStatusBadge();
    setTimeout(() => {
      if (Store.getState('state') === 'starting') {
        Store.setState('state', 'islanded');
        UI.renderStatusBadge();
      }
    }, 3000);
    toast('Arrancando...', 'success');
  };

  window.stopPlant = function() {
    if (Store.getState('state') === 'stopped') return;
    Store.setState('state', 'stopped');
    Store.setState('gateTarget', 0);
    Store.setState('integral', 0);
    Store.setState('iTerm', 0);
    UI.renderStatusBadge();
    toast('Detenida', 'info');
  };

  window.toggleTrip = function() {
    if (Store.getState('state') !== 'tripped') {
      Store.setState('state', 'tripped');
      Store.setState('gateTarget', 0);
      Store.setState('integral', 0);
      Store.setState('iTerm', 0);
      UI.renderStatusBadge();
      toast('¡DISPARO!', 'error', 4000);
    } else {
      Store.setState('state', 'stopped');
      Store.setState('gateTarget', 0);
      Store.setState('gateActual', 0);
      Store.setState('integral', 0);
      Store.setState('iTerm', 0);
      UI.renderStatusBadge();
      toast('Rearmado', 'success');
    }
  };

  window.toggleGridSync = function() {
    const s = Store.getState();
    if (s.state !== 'islanded' && s.state !== 'tripped') { toast('Debe estar en isla', 'warning'); return; }
    if (Math.abs(s.rpm - s.nDesign) > 40) { toast('Velocidad fuera de rango (±40 rpm)', 'warning'); return; }
    Store.setState('state', s.gridSynced ? 'islanded' : 'grid');
    UI.renderGridStatus();
    toast(s.gridSynced ? 'Desacoplado' : 'Acoplado', s.gridSynced ? 'warning' : 'success');
  };

  window.setMode = function(mode) {
    Store.setState('mode', mode);
    const el = document.getElementById('btn-mode-manual');
    if (el) el.className = mode === 'manual' ? 'btn btn-sm active' : 'btn btn-sm';
    el = document.getElementById('btn-mode-auto');
    if (el) el.className = mode === 'auto' ? 'btn btn-sm active' : 'btn btn-sm';
    toast('Modo ' + (mode === 'auto' ? 'automático' : 'manual'), 'info', 1500);
  };

  // UI render functions
  window.UI = UI;

  // Sizing
  window.calculateSizing = function() {
    const H = parseFloat(document.getElementById('size-h')?.value) || 35.0;
    const Q = parseFloat(document.getElementById('size-q')?.value) || 0.85;
    const n = parseFloat(document.getElementById('size-n')?.value) || 1300;
    const eta = (parseFloat(document.getElementById('size-eta')?.value) || 91.5) / 100;
    const rho = 998; const g = 9.81;
    const P = rho * g * Q * H * eta;
    const ns = n * Math.sqrt(P) / Math.pow(H, 1.25);
    const D1 = 84.5 * Math.sqrt(H) / n;
    const D2 = D1 * 0.82;
    const U1 = (Math.PI * D1 * n) / 60;
    const Vw1 = (9.81 * H * eta) / U1;
    const He = (U1 * Vw1) / 9.81;
    document.getElementById('res-ns').textContent = ns.toFixed(1) + ' rpm';
    document.getElementById('res-d1').textContent = D1.toFixed(3) + ' m';
    document.getElementById('res-d2').textContent = D2.toFixed(3) + ' m';
    document.getElementById('res-u1').textContent = U1.toFixed(2) + ' m/s';
    document.getElementById('res-vw1').textContent = Vw1.toFixed(2) + ' m/s';
    document.getElementById('res-he').textContent = He.toFixed(2) + ' m';
    const cls = ns > 250 ? 'Radial/mixed (low ns)' : ns < 100 ? 'Pelton/high ns' : 'Francis normal';
    document.getElementById('res-type').textContent = cls;
  };

  document.getElementById('size-h')?.addEventListener('input', window.calculateSizing);
  document.getElementById('size-q')?.addEventListener('input', window.calculateSizing);
  document.getElementById('size-n')?.addEventListener('input', window.calculateSizing);
  document.getElementById('size-eta')?.addEventListener('input', window.calculateSizing);

  // Callback from UI for sizing manual control
  window.onSizingChange = window.calculateSizing;

  // Clear alarms
  window.clearAlarms = function() {
    Store.setState('alarms', []);
    UI.renderAlarms();
  };

  // Lab scenarios
  window.runLabScenario = function(type) {
    const s = Store.getState();
    if (type === 'startup') {
      startPlant();
      setTimeout(() => { if (s('state') === 'islanded') window.toggleGridSync(); }, 3000);
    } else if (type === 'rejection') {
      toggleTrip();
      setTimeout(() => { if (s('state') === 'tripped') stopPlant(); }, 2000);
    } else if (type === 'cavitation') {
      const h = document.getElementById('size-h')?.value || 35;
      document.getElementById('size-h').value = 12;
      window.calculateSizing();
      startPlant();
    }
    toast(`Escenario "${type}" ejecutado`, 'info', 2000);
  };

  // Render alarms from store
  window.renderAlarms = function() {
    UI.renderAlarms();
  };

  // Export CSV
  window.exportCSV = function() {
    const s = Store.getState();
    const rows = [['t_s','rpm','flow_Lmin','p_elec_W','eta_pct','gate_pct','head_m']];
    rows.push([s.t ?? 0, s.rpm ?? 0, s.flow ?? 0, s.pElec ?? 0, s.eta ?? 0, s.gateActual ?? 0, s.head ?? 0]);
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `francis_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exportado', 'success');
  };

  // Sound toggle
  window.toggleSound = function() {
    toast('Sonido toggle (demo)', 'info');
  };

  // Theme toggle
  window.toggleTheme = function() {
    document.documentElement.classList.toggle('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = document.documentElement.classList.contains('dark') ? 'fa-solid fa-moon text-amber-400' : 'fa-solid fa-sun text-amber-400';
    toast('Tema ' + (document.documentElement.classList.contains('dark') ? 'oscuro' : 'claro'), 'info');
  };

})();
