/**
 * app.js — Orchestrator: initializes all modules in order
 * Dependency: all preceding modules
 *
 * Load order: config → store → engine → engine-3d → api → charts → ui → controls → app
 */
(function() {
  'use strict';
  var S = window.FrancisSCADA;

  var uptimeInterval = null;
  var uptimeStart = Date.now();

  S.App = {
    init: function() {
      console.log('[App] Francis SCADA UTS Mockup — Initializing...');

      // 1. Restore theme
      try {
        var savedTheme = localStorage.getItem('francis-theme');
        if (savedTheme === 'light') {
          document.documentElement.classList.add('light');
        }
      } catch (e) { /* ignore */ }

      // 2. Initialize engine
      try {
        S.Engine.init();
        console.log('[App] Engine initialized');
      } catch (e) {
        console.error('[App] Engine init failed:', e);
      }

      // 3. Initialize 3D (in monitor-3d container)
      try {
        S.Engine3D.init('monitor-3d');
        console.log('[App] Engine3D initialized');
      } catch (e) {
        console.error('[App] Engine3D init failed:', e);
      }

      // 4. Initialize charts
      try {
        S.Charts.init();
        console.log('[App] Charts initialized');
      } catch (e) {
        console.error('[App] Charts init failed:', e);
      }

      // 5. Initialize UI
      try {
        S.UI.init();
        console.log('[App] UI initialized');
      } catch (e) {
        console.error('[App] UI init failed:', e);
      }

      // 6. Initialize controls
      try {
        S.Controls.init();
        console.log('[App] Controls initialized');
      } catch (e) {
        console.error('[App] Controls init failed:', e);
      }

      // 7. Initialize API (auto-detects mock vs backend)
      try {
        S.API.init();
        console.log('[App] API initialized (mode: ' + S.API.getMode() + ')');
      } catch (e) {
        console.error('[App] API init failed:', e);
      }

      // 8. Register telemetry callback
      S.API.onTelemetry(function(data) {
        try {
          // Update store with telemetry data
          if (S.API.getMode() === 'backend') {
            // Backend: merge incoming data into store
            S.Store.setState(mapBackendData(data));
          }
          // In mock mode, Engine.step() already updates store

          var state = S.Store.getState();

          // Render KPIs
          if (S.UI.renderKPIs) {
            S.UI.renderKPIs(state);
          }

          // Push to charts
          if (S.Charts.push) {
            S.Charts.push(data);
          }

          // Update 3D
          if (S.Engine3D.update) {
            S.Engine3D.update(data);
          }

          // Update alarms table
          if (S.UI.updateAlarms && state.alarms) {
            S.UI.updateAlarms(state.alarms);
          }

          // Check for alarms and beep
          if (state.alarms && state.alarms.length > 0) {
            var hasUnack = false;
            for (var i = 0; i < state.alarms.length; i++) {
              if (!state.alarms[i].ack) { hasUnack = true; break; }
            }
            if (hasUnack && state.soundOn && S.Controls.playAlarmBeep) {
              S.Controls.playAlarmBeep();
            }
          }

          // Update status badge
          updateStatusBadge(state.state);

          // Update grid status
          updateGridStatus(state.gridSynced, state.state);

        } catch (e) {
          console.error('[App] Telemetry callback error:', e);
        }
      });

      // 9. Start API loop
      try {
        S.API.start();
        console.log('[App] API started');
      } catch (e) {
        console.error('[App] API start failed:', e);
      }

      // 10. Start uptime counter
      uptimeStart = Date.now();
      uptimeInterval = setInterval(updateUptime, 1000);

      // 11. Handle window resize
      window.addEventListener('resize', handleResize);

      // 12. Unlock audio on first user interaction
      document.addEventListener('click', unlockAudio, { once: true });
      document.addEventListener('keydown', unlockAudio, { once: true });

      console.log('[App] Francis SCADA UTS v1.0 ready');
      console.log('[App] Mode:', S.API.getMode());
      console.log('[App] Physics: deterministic, dt=' + S.CFG.dt.toFixed(4) + 's (30 Hz)');

      // Show welcome toast
      setTimeout(function() {
        if (S.UI.showToast) {
          S.UI.showToast('Workspace Francis UTS Activo — ' + (S.API.getMode() === 'mock' ? 'Motor físico' : 'Backend WS'), 'info', 3000);
        }
      }, 800);
    },
  };

  // ── Helpers ─────────────────────────────────────────────────────

  function mapBackendData(data) {
    // Map backend WS fields to store keys
    return {
      t: data.t,
      rpm: data.rpm,
      gateActual: data.gate_actual,
      flow: data.flow, // m³/s
      head: data.head_net || data.head_gross,
      pHyd: data.power_mech ? data.power_mech / (S.CFG.genEta || 0.95) : 0,
      pMech: data.power_mech || 0,
      pElec: data.power_elec || 0,
      eta: data.efficiency || 0,
      torque: data.torque_hydraulic || 0,
      sigma: data.thoma || Infinity,
      isCavitating: data.is_cavitating || false,
      governorOut: data.governor_out || 0,
      gridSynced: data.grid_synced || data.synced || false,
      gridFreq: 50.0,
      // Keep current values for non-backend fields
    };
  }

  function updateUptime() {
    var elapsed = Math.floor((Date.now() - uptimeStart) / 1000);
    var h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
    var m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
    var s = (elapsed % 60).toString().padStart(2, '0');
    var el = document.getElementById('uptime-clock');
    if (el) el.textContent = h + ':' + m + ':' + s;
  }

  function updateStatusBadge(state) {
    var badge = document.getElementById('plant-badge');
    if (!badge) return;
    var map = {
      stopped: { cls: 'bg-slate-800 text-slate-400 border-slate-700', dot: 'bg-slate-400', label: 'Detenida' },
      starting: { cls: 'bg-amber-950 text-amber-400 border-amber-800', dot: 'bg-amber-500 pulse-dot', label: 'Arrancando' },
      islanded: { cls: 'bg-emerald-950 text-emerald-400 border-emerald-800', dot: 'bg-emerald-500 pulse-dot', label: 'En Isla' },
      syncing: { cls: 'bg-cyan-950 text-cyan-400 border-cyan-800', dot: 'bg-cyan-500 pulse-dot', label: 'Sincronizando' },
      grid: { cls: 'bg-cyan-950 text-cyan-400 border-cyan-800', dot: 'bg-cyan-500 pulse-dot', label: 'Acoplada a Red' },
      tripped: { cls: 'bg-rose-950 text-rose-400 border-rose-800', dot: 'bg-rose-500 pulse-dot', label: 'DISPARO' },
    };
    var c = map[state] || map.stopped;
    badge.className = 'shrink-0 hidden md:inline-flex items-center gap-1.5 border text-[11px] font-bold px-2.5 py-1 rounded-full ' + c.cls;
    badge.innerHTML = '<span class="w-2 h-2 rounded-full ' + c.dot + '"></span> ' + c.label;
  }

  function updateGridStatus(gridSynced, plantState) {
    var badge = document.getElementById('grid-status-badge');
    var led = document.getElementById('grid-led');
    var txt = document.getElementById('grid-status-txt');
    if (gridSynced && plantState === S.ST.GRID) {
      if (badge) badge.className = 'system-status bg-emerald-950 border border-emerald-800 text-emerald-300';
      if (led) led.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-dot';
      if (txt) txt.textContent = 'ACOPLADA (50 Hz)';
    } else {
      if (badge) badge.className = 'system-status bg-slate-800 border border-slate-700 text-slate-400';
      if (led) led.className = 'w-2.5 h-2.5 rounded-full bg-slate-500';
      if (txt) txt.textContent = 'EN ISLA';
    }
  }

  function handleResize() {
    try {
      if (S.Charts && S.Charts.redraw) {
        S.Charts.redraw();
      }
      // Resize 3D renderer
      var container3D = document.getElementById('full-3d') || document.getElementById('monitor-3d');
      if (container3D && S.Engine3D.switchContainer) {
        var activeId = container3D.id;
        S.Engine3D.switchContainer(activeId);
      }
    } catch (e) {
      // ignore
    }
  }

  function unlockAudio() {
    try {
      // Just create and resume to unlock audio context
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { /* ignore */ }
  }

  // ── Auto-start on DOM ready ─────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      S.App.init();
    });
  } else {
    // DOM already ready
    S.App.init();
  }

})();