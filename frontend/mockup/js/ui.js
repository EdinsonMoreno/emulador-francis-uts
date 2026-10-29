/**
 * ui.js — DOM rendering & view management
 * Dependency: config.js, store.js, engine-3d.js, charts.js
 *
 * Manages views: monitor, 3d, pid, hmi, trends, hill, dim, alarms, practices
 */
(function() {
  'use strict';
  var S = window.FrancisSCADA;
  var ST = S.ST;
  var MODE = S.MODE;
  var CFG = S.CFG;

  var currentView = 'monitor';
  var VIEWS = ['monitor', '3d', 'pid', 'hmi', 'trends', 'hill', 'dim', 'alarms', 'practices'];
  var TITLES = {
    monitor: 'Monitor General',
    '3d': 'Gemelo Digital 3D',
    pid: 'P&ID ISA',
    hmi: 'Gobernador / HMI',
    trends: 'Tendencias',
    hill: 'Hill Chart',
    dim: 'Dimensionamiento',
    alarms: 'Alarmas',
    practices: 'Prácticas',
  };

  S.UI = {
    init: function() {
      try {
        bindNavEvents();
        // Theme from localStorage
        var savedTheme = localStorage.getItem('francis-theme');
        if (savedTheme === 'light') {
          document.documentElement.classList.add('light');
        }
        updateThemeIcon();
        switchView('monitor');
        renderPIDControls();
      } catch (e) {
        console.error('[UI] Init error:', e);
      }
    },

    renderKPIs: function(state) {
      try {
        renderKpiCards(state);
        updateTopTelemetry(state);
        updatePIDTags(state);
      } catch (e) {
        console.error('[UI] renderKPIs error:', e);
      }
    },

    switchView: function(name) {
      switchView(name);
    },

    toggleTheme: function() {
      var html = document.documentElement;
      html.classList.toggle('light');
      var isLight = html.classList.contains('light');
      localStorage.setItem('francis-theme', isLight ? 'light' : 'dark');
      updateThemeIcon();
      S.UI.showToast('Tema ' + (isLight ? 'claro' : 'oscuro'), 'info');
    },

    showToast: function(msg, type) {
      showToast(msg, type);
    },

    updateAlarms: function(alarms) {
      renderAlarmTable(alarms);
    },
  };

  // ── Nav events ──────────────────────────────────────────────────

  function bindNavEvents() {
    var navItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < navItems.length; i++) {
      (function(nav) {
        nav.addEventListener('click', function(e) {
          e.preventDefault();
          var viewName = nav.getAttribute('data-nav');
          if (viewName) switchView(viewName);
        });
      })(navItems[i]);
    }
  }

  function switchView(name) {
    if (VIEWS.indexOf(name) === -1) return;

    // Hide all views
    var panels = document.querySelectorAll('.view-panel');
    for (var i = 0; i < panels.length; i++) {
      panels[i].style.display = 'none';
    }

    // Show active
    var target = document.getElementById('view-' + name);
    if (target) target.style.display = 'block';

    // Update nav
    var navItems = document.querySelectorAll('.nav-item');
    for (var j = 0; j < navItems.length; j++) {
      navItems[j].classList.toggle('active', navItems[j].getAttribute('data-nav') === name);
    }

    // Update title
    var titleEl = document.getElementById('view-title');
    if (titleEl) titleEl.textContent = TITLES[name] || name;

    currentView = name;

    // View-specific init
    if (name === '3d' && S.Engine3D) {
      try {
        S.Engine3D.switchContainer('full-3d');
      } catch (e) { /* container may not exist yet */ }
    }
    if (name === 'hill' && S.Charts) {
      S.Charts.render();
    }
  }

  // ── KPI Cards ───────────────────────────────────────────────────

  function renderKpiCards(state) {
    var grid = document.getElementById('kpi-grid');
    if (!grid) return;

    var rpm = state.rpm || 0;
    var pElec = state.pElec || 0;
    var flow = state.flow || 0;
    var head = state.head || 0;
    var eta = state.eta || 0;
    var sigma = state.sigma || 0;

    var flowLmin = flow * 60000; // m³/s → L/min

    var cards = [
      { label: 'Velocidad Rodete', value: rpm.toFixed(1), unit: 'RPM', accent: 'cyan' },
      { label: 'Potencia Eléctrica', value: (pElec / 1000).toFixed(3), unit: 'kW', accent: 'amber' },
      { label: 'Caudal (Q)', value: flowLmin.toFixed(1), unit: 'L/min', accent: 'cyan' },
      { label: 'Altura Neta (H)', value: head.toFixed(2), unit: 'm', accent: 'indigo' },
      { label: 'Eficiencia (η)', value: eta.toFixed(1), unit: '%', accent: 'emerald' },
      { label: 'Sigma Thoma (σ)', value: sigma === Infinity || isNaN(sigma) ? '∞' : sigma.toFixed(3), unit: '', accent: 'violet' },
    ];

    grid.innerHTML = '';
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var card = document.createElement('div');
      card.className = 'kpi-card';
      card.innerHTML =
        '<div class="flex items-center justify-between">' +
          '<span class="kpi-label">' + c.label + '</span>' +
          '<span class="text-[10px] text-slate-500 font-mono">' + c.unit + '</span>' +
        '</div>' +
        '<div class="flex items-baseline gap-1 mt-1">' +
          '<span class="kpi-value text-' + c.accent + '-400">' + c.value + '</span>' +
        '</div>';
      grid.appendChild(card);
    }
  }

  function updateTopTelemetry(state) {
    var el = document.getElementById('top-telemetry');
    if (!el) return;
    el.textContent =
      'RPM: ' + (state.rpm || 0).toFixed(0) +
      ' | Q: ' + ((state.flow || 0) * 60000).toFixed(1) + ' L/min' +
      ' | P: ' + ((state.pElec || 0) / 1000).toFixed(2) + ' kW' +
      ' | η: ' + (state.eta || 0).toFixed(1) + '%' +
      ' | σ: ' + ((state.sigma === Infinity || state.sigma === undefined || isNaN(state.sigma)) ? '∞' : state.sigma.toFixed(3));
  }

  function updatePIDTags(state) {
    // Update P&ID SVG live tags
    var flowLmin = ((state.flow || 0) * 60000);
    setTextSvg('tag-ft', flowLmin.toFixed(1) + ' L/m');
    setTextSvg('tag-pt', ((state.head || 0) * 9.81 / 100).toFixed(2) + ' bar');
    setTextSvg('tag-pi', '0 bar'); // placeholder
    setTextSvg('tag-jt', (state.torque || 0).toFixed(2) + ' N\u00b7m');
    setTextSvg('tag-vt', (state.rpm || 0).toFixed(0) + ' rpm');
    setTextSvg('tag-kw', ((state.pElec || 0) / 1000).toFixed(2) + ' kW');

    // Rotate runner in SVG
    var runner = document.getElementById('svg-runner');
    if (runner) {
      var angle = ((state.rpm || 0) / 60) * (Date.now() / 1000) * 360;
      runner.setAttribute('transform', 'rotate(' + angle + ' 440 295)');
    }

    // Flow line opacity
    var flowLine = document.getElementById('flow-line-1');
    if (flowLine) {
      flowLine.style.opacity = Math.max(0.1, Math.min(1, (state.flow || 0) * 60000 / 30));
    }

    // MIV status
    setTextSvg('pid-miv', state.state === ST.STOPPED ? 'CLOSED' : 'OPEN');
    setTextSvg('pid-breaker', state.state === ST.GRID ? 'CLOSED' : 'OPEN');
  }

  function setTextSvg(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ── PID Controls ────────────────────────────────────────────────

  function renderPIDControls() {
    var panel = document.getElementById('pid-controls');
    if (!panel) return;

    var st = S.Store.getState();

    panel.innerHTML =
      '<div class="space-y-4">' +
        '<div class="control-group">' +
          '<div class="text-xs font-bold text-slate-300 mb-2">Gobernador PID</div>' +
          '<div class="control-row">' +
            '<span class="text-xs text-slate-400 w-16">Kp</span>' +
            '<input type="range" id="ctrl-kp" min="0" max="20" step="0.1" value="' + st.Kp + '" class="flex-1">' +
            '<span class="text-xs font-mono text-cyan-400 w-12" id="ctrl-kp-val">' + st.Kp.toFixed(1) + '</span>' +
          '</div>' +
          '<div class="control-row">' +
            '<span class="text-xs text-slate-400 w-16">Ti</span>' +
            '<input type="range" id="ctrl-ti" min="0.1" max="10" step="0.1" value="' + st.Ti + '" class="flex-1">' +
            '<span class="text-xs font-mono text-cyan-400 w-12" id="ctrl-ti-val">' + st.Ti.toFixed(1) + '</span>' +
          '</div>' +
          '<div class="control-row">' +
            '<span class="text-xs text-slate-400 w-16">Td</span>' +
            '<input type="range" id="ctrl-td" min="0" max="2" step="0.05" value="' + st.Td + '" class="flex-1">' +
            '<span class="text-xs font-mono text-cyan-400 w-12" id="ctrl-td-val">' + st.Td.toFixed(2) + '</span>' +
          '</div>' +
          '<div class="control-row">' +
            '<span class="text-xs text-slate-400 w-16">Droop</span>' +
            '<input type="range" id="ctrl-droop" min="0.5" max="15" step="0.5" value="' + st.droop + '" class="flex-1">' +
            '<span class="text-xs font-mono text-cyan-400 w-12" id="ctrl-droop-val">' + st.droop.toFixed(1) + '%</span>' +
          '</div>' +
        '</div>' +
        '<div class="control-group">' +
          '<div class="text-xs font-bold text-slate-300 mb-2">Servo-actuador</div>' +
          '<div class="relative h-6 bg-slate-800 rounded overflow-hidden mb-1">' +
            '<div class="h-full bg-cyan-600 rounded transition-all" style="width:' + st.gateActual + '%" id="servo-bar"></div>' +
          '</div>' +
          '<div class="flex justify-between text-[10px] text-slate-500 font-mono">' +
            '<span>0%</span><span id="servo-val">' + st.gateActual.toFixed(1) + '%</span><span>100%</span>' +
          '</div>' +
          '<div class="text-[10px] text-slate-500 mt-1">Presión aceite: 40 bar | Histéresis: ±0.15%</div>' +
        '</div>' +
      '</div>';

    // Bind PID sliders
    bindControlSlider('ctrl-kp', 'ctrl-kp-val', function(v) {
      S.Store.setState('Kp', parseFloat(v));
      localStorage.setItem('francis-pid', JSON.stringify({
        Kp: parseFloat(v),
        Ti: S.Store.getState('Ti'),
        Td: S.Store.getState('Td'),
        droop: S.Store.getState('droop'),
      }));
    }, '');
    bindControlSlider('ctrl-ti', 'ctrl-ti-val', function(v) {
      S.Store.setState('Ti', parseFloat(v));
    }, ' s');
    bindControlSlider('ctrl-td', 'ctrl-td-val', function(v) {
      S.Store.setState('Td', parseFloat(v));
    }, ' s');
    bindControlSlider('ctrl-droop', 'ctrl-droop-val', function(v) {
      S.Store.setState('droop', parseFloat(v));
    }, '%');
  }

  function bindControlSlider(sliderId, valId, onChange, suffix) {
    var slider = document.getElementById(sliderId);
    var valEl = document.getElementById(valId);
    if (!slider || !valEl) return;
    slider.addEventListener('input', function() {
      valEl.textContent = parseFloat(slider.value).toFixed(slider.step < 0.1 ? 2 : 1) + suffix;
      if (onChange) onChange(slider.value);
    });
  }

  // ── Alarm Table ─────────────────────────────────────────────────

  function renderAlarmTable(alarms) {
    var body = document.getElementById('alarm-table-body');
    if (!body) return;

    alarms = alarms || [];
    var filterEl = document.getElementById('alarm-filter');
    var filter = filterEl ? filterEl.value : 'all';

    var filtered = alarms;
    if (filter === 'critical') {
      filtered = alarms.filter(function(a) { return a.prio <= 1 || a.severity === 'CRITICAL'; });
    } else if (filter === 'warning') {
      filtered = alarms.filter(function(a) { return a.prio === 2 || a.severity === 'WARNING'; });
    } else if (filter === 'info') {
      filtered = alarms.filter(function(a) { return a.prio >= 3 || a.severity === 'INFO'; });
    }

    var unack = alarms.filter(function(a) { return !a.ack; }).length;
    var countEl = document.getElementById('alarm-count');
    if (countEl) countEl.textContent = unack;

    if (filtered.length === 0) {
      body.innerHTML = '<div class="text-sm text-slate-500 p-4">Sin alarmas</div>';
      return;
    }

    body.innerHTML = filtered.slice(0, 20).map(function(a) {
      var sev = a.severity === 'CRITICAL' || a.prio <= 1 ? 'critical' :
                a.severity === 'WARNING' || a.prio === 2 ? 'warning' : 'info';
      return '<div class="alarm-item ' + sev + ' flex items-center gap-3 p-3 border-b border-slate-800">' +
        '<span class="text-xs font-bold ' +
          (sev === 'critical' ? 'text-rose-400' : sev === 'warning' ? 'text-amber-400' : 'text-slate-400') +
        '">' + (a.code || 'ALARM') + '</span>' +
        '<span class="text-xs text-slate-300 flex-1">' + (a.desc || a.message || '') + '</span>' +
        '<span class="text-[10px] text-slate-500">' + (a.time || '') + '</span>' +
        '<span class="text-[10px] ' + (a.ack ? 'text-emerald-400' : 'text-amber-400') + '">' +
          (a.ack ? '✓ ACK' : '⏳ PENDIENTE') +
        '</span>' +
      '</div>';
    }).join('');
  }

  // ── Toast ───────────────────────────────────────────────────────

  function showToast(msg, type, duration) {
    type = type || 'info';
    duration = duration || 2500;
    var container = document.getElementById('toast-container');
    if (!container) return;

    var colors = { info: '#0ea5e9', success: '#10b981', warning: '#f59e0b', error: '#ef4444' };
    var icons = { info: 'fa-circle-info', success: 'fa-check-circle', warning: 'fa-exclamation-triangle', error: 'fa-circle-xmark' };

    var toast = document.createElement('div');
    toast.className = 'toast flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-lg pointer-events-auto';
    toast.style.cssText =
      'background:rgba(15,23,42,0.95);' +
      'border:1px solid ' + (colors[type] || colors.info) + ';' +
      'color:#e2e8f0;' +
      'animation:slideIn 0.3s ease;';

    toast.innerHTML =
      '<i class="fa-solid ' + (icons[type] || icons.info) + '" style="color:' + (colors[type] || colors.info) + '"></i>' +
      '<span class="text-sm">' + msg + '</span>';

    container.appendChild(toast);

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      setTimeout(function() {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 300);
    }, duration);
  }

  // ── Theme ───────────────────────────────────────────────────────

  function updateThemeIcon() {
    var icon = document.getElementById('theme-icon');
    if (!icon) return;
    var isLight = document.documentElement.classList.contains('light');
    icon.className = isLight ? 'fa-solid fa-sun text-amber-400' : 'fa-solid fa-moon text-amber-400';
  }

  // ── Simulador: Synchroscope ─────────────────────────────────────

  function drawSynchroscope(canvasId, state) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 10;

    ctx.clearRect(0, 0, w, h);

    // Circle
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Tick marks
    for (var i = 0; i < 36; i++) {
      var angle = (i / 36) * Math.PI * 2 - Math.PI / 2;
      var inner = r - 8, outer = r - 2;
      ctx.strokeStyle = i === 0 ? '#10b981' : '#475569';
      ctx.lineWidth = i % 6 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }

    // Needle (phase difference)
    var phase = (state.gridFreq || 50) === 50 ? 0 : ((state.gridFreq || 50) - 50) * 0.1;
    var needleAngle = phase - Math.PI / 2;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (r - 15), cy + Math.sin(needleAngle) * (r - 15));
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

})();