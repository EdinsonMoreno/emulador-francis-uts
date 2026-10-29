/**
 * controls.js — Interaction logic & scenarios
 * Dependency: config.js, store.js, engine.js, ui.js
 */
(function() {
  'use strict';
  var S = window.FrancisSCADA;
  var ST = S.ST;
  var MODE = S.MODE;
  var CFG = S.CFG;

  var soundCtx = null;
  var scenarioInterval = null;
  var scenarioStep = 0;

  S.Controls = {
    init: function() {
      try {
        bindSliders();
        bindButtons();
        bindKeyboard();
        bindScenarioButtons();
        restorePID();
      } catch (e) {
        console.error('[Controls] Init error:', e);
      }
    },

    setMode: function(m) {
      S.Store.setState('mode', m);
      updateModeButtons(m);
      S.UI.showToast('Modo ' + (m === MODE.AUTO ? 'Automático' : 'Manual'), 'info', 1500);

      // Disable/enable gate slider in AUTO
      var gateSlider = document.getElementById('ctrl-gate');
      if (gateSlider) {
        gateSlider.disabled = (m === MODE.AUTO);
        gateSlider.style.opacity = m === MODE.AUTO ? '0.4' : '1';
      }
    },

    setOpening: function(v) {
      var mode = S.Store.getState('mode');
      if (mode === MODE.AUTO) {
        S.UI.showToast('En modo AUTO, la apertura la controla el gobernador', 'warning');
        return;
      }
      v = parseFloat(v);
      v = Math.max(0, Math.min(100, v));
      S.Store.setState('gateTarget', v);
      updateSliderDisplay('ctrl-gate', v, '%');
    },

    setSpeedRef: function(v) {
      v = parseFloat(v);
      v = Math.max(800, Math.min(1800, v));
      S.Store.setState('nRef', v);
      updateSliderDisplay('ctrl-nref', v, 'RPM');
    },

    setHead: function(v) {
      v = parseFloat(v);
      v = Math.max(1.0, Math.min(10.0, v));
      S.Store.setState('head', v);
      updateSliderDisplay('ctrl-head', v, 'm');
    },

    setPID: function(k, v) {
      var validKeys = ['Kp', 'Ti', 'Td', 'droop'];
      if (validKeys.indexOf(k) === -1) return;
      S.Store.setState(k, parseFloat(v));
      persistPID();
    },

    startPlant: function() {
      var state = S.Store.getState('state');
      if (state === ST.TRIPPED) {
        S.UI.showToast('Rearme requerido antes de arrancar', 'warning');
        return;
      }
      if (state !== ST.STOPPED) {
        S.UI.showToast('La planta ya está en operación', 'info');
        return;
      }
      S.Store.setState('state', ST.STARTING);
      S.UI.showToast('Arrancando turbina...', 'success', 2000);
    },

    stopPlant: function() {
      var state = S.Store.getState('state');
      if (state === ST.STOPPED) return;
      S.Store.setState({
        state: ST.STOPPED,
        gateTarget: 0,
        gateActual: 0,
        rpm: 0,
        flow: 0,
        pHyd: 0,
        pMech: 0,
        pElec: 0,
        eta: 0,
        torque: 0,
        governorOut: 0,
        pTerm: 0,
        iTerm: 0,
        dTerm: 0,
        integral: 0,
      });
      S.UI.showToast('Planta detenida', 'info', 1500);
    },

    toggleTrip: function() {
      var state = S.Store.getState('state');
      if (state !== ST.TRIPPED) {
        S.Store.setState({
          state: ST.TRIPPED,
          gateTarget: 0,
          gateActual: 0,
          rpm: 0,
          flow: 0,
          pHyd: 0,
          pMech: 0,
          pElec: 0,
          eta: 0,
          torque: 0,
          governorOut: 0,
        });
        S.UI.showToast('¡DISPARO DE EMERGENCIA!', 'error', 4000);
      } else {
        S.Store.setState({ state: ST.STOPPED });
        S.UI.showToast('Rearmado. Planta en STOP.', 'success', 2000);
      }
    },

    attemptSync: function() {
      var st = S.Store.getState();
      if (st.state !== ST.ISLANDED) {
        S.UI.showToast('Debe estar en isla para sincronizar', 'warning');
        return;
      }
      if (Math.abs(st.rpm - CFG.n_design) > 40) {
        S.UI.showToast('Velocidad fuera de rango (±40 rpm)', 'warning');
        return;
      }
      // Toggle
      var newSynced = !st.gridSynced;
      S.Store.setState({
        gridSynced: newSynced,
        state: newSynced ? ST.GRID : ST.ISLANDED,
      });
      S.UI.showToast(newSynced ? 'Acoplado a red (50 Hz)' : 'Desacoplado de red — modo isla', 'success');
    },

    loadScenario: function(name) {
      // Clear any running scenario
      if (scenarioInterval) {
        clearInterval(scenarioInterval);
        scenarioInterval = null;
      }
      scenarioStep = 0;

      switch (name) {
        case 'startup':
          runStartupScenario();
          break;
        case 'rejection':
          runRejectionScenario();
          break;
        case 'hill':
          runHillScenario();
          break;
        case 'cavitation':
          runCavitationScenario();
          break;
        default:
          S.UI.showToast('Escenario no reconocido: ' + name, 'error');
      }
    },

    exportCSV: function() {
      try {
        var historian = S.Charts ? S.Charts.getHistorian() : null;
        var rows = [['t', 'rpm', 'n_ref', 'gate', 'flow_Lmin', 'p_hyd_W', 'p_mech_W', 'p_elec_W', 'eta', 'sigma', 'state']];

        var st = S.Store.getState();
        if (historian && historian.t && historian.t.length > 0) {
          for (var i = 0; i < historian.t.length; i++) {
            rows.push([
              (historian.t[i] || 0).toFixed(3),
              (historian.rpm[i] || 0).toFixed(1),
              (historian.nRef[i] || 0).toFixed(1),
              (historian.gate[i] || 0).toFixed(1),
              (historian.flow[i] || 0).toFixed(2),
              (historian.pHyd[i] || 0).toFixed(2),
              (historian.pMech[i] || 0).toFixed(2),
              (historian.pElec[i] || 0).toFixed(2),
              (historian.eta[i] || 0).toFixed(2),
              (st.sigma || 0).toFixed(4),
              st.state || 'unknown',
            ]);
          }
        } else {
          // Fallback: current state only
          var flowLmin = (st.flow || 0) * 60000;
          rows.push([
            (st.t || 0).toFixed(3),
            (st.rpm || 0).toFixed(1),
            (st.nRef || 0).toFixed(1),
            (st.gateActual || 0).toFixed(1),
            flowLmin.toFixed(2),
            (st.pHyd || 0).toFixed(2),
            (st.pMech || 0).toFixed(2),
            (st.pElec || 0).toFixed(2),
            (st.eta || 0).toFixed(2),
            (st.sigma === Infinity ? 999 : st.sigma || 0).toFixed(4),
            st.state || 'unknown',
          ]);
        }

        var csv = rows.map(function(r) { return r.join(','); }).join('\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'francis_scada_' + new Date().toISOString().replace(/[:.]/g, '-') + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        S.UI.showToast('CSV exportado (' + (rows.length - 1) + ' filas)', 'success', 2500);
      } catch (e) {
        console.error('[Controls] CSV export error:', e);
        S.UI.showToast('Error exportando CSV', 'error');
      }
    },

    toggleSound: function() {
      var soundOn = S.Store.getState('soundOn');
      var newVal = !soundOn;
      S.Store.setState('soundOn', newVal);
      var btn = document.getElementById('btn-sound');
      if (btn) {
        btn.innerHTML = newVal ? '<i class="fa-solid fa-volume-low"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
      }
      S.UI.showToast('Sonido ' + (newVal ? 'activado' : 'silenciado'), 'info', 1500);
    },

    acknowledgeAllAlarms: function() {
      var alarms = S.Store.getState('alarms') || [];
      for (var i = 0; i < alarms.length; i++) {
        alarms[i].ack = true;
      }
      S.Store.setState('alarms', alarms);
      S.UI.showToast('Todas las alarmas reconocidas', 'success');
    },

    playAlarmBeep: function() {
      if (!S.Store.getState('soundOn')) return;
      try {
        if (!soundCtx) {
          soundCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (soundCtx.state === 'suspended') soundCtx.resume();
        var osc = soundCtx.createOscillator();
        var gain = soundCtx.createGain();
        osc.connect(gain);
        gain.connect(soundCtx.destination);
        osc.frequency.value = 440;
        osc.type = 'square';
        gain.gain.value = 0.08;
        osc.start();
        osc.stop(soundCtx.currentTime + 0.1);
      } catch (e) {
        // Web Audio not supported
      }
    },
  };

  // ── Internal: slider bindings ───────────────────────────────────

  function bindSliders() {
    bindSlider('ctrl-gate', function(v) { S.Controls.setOpening(v); }, '%');
    bindSlider('ctrl-nref', function(v) { S.Controls.setSpeedRef(v); }, 'RPM');
    bindSlider('ctrl-head', function(v) { S.Controls.setHead(v); }, 'm');
    bindSlider('ctrl-kp', function(v) { S.Controls.setPID('Kp', v); }, '');
    bindSlider('ctrl-ti', function(v) { S.Controls.setPID('Ti', v); }, ' s');
    bindSlider('ctrl-td', function(v) { S.Controls.setPID('Td', v); }, ' s');
    bindSlider('ctrl-droop', function(v) { S.Controls.setPID('droop', v); }, '%');

    // Also bind alternate slider IDs
    bindSlider('hmi-a', function(v) { S.Controls.setOpening(v); }, '%');
    bindSlider('hmi-h', function(v) { S.Controls.setHead(v); }, ' m');
    bindSlider('manual-n', function(v) { S.Controls.setSpeedRef(v); }, ' RPM');
    bindSlider('manual-gate', function(v) { S.Controls.setOpening(v); }, ' %');
    bindSlider('pid-kp', function(v) { S.Controls.setPID('Kp', v); }, '');
    bindSlider('pid-ti', function(v) { S.Controls.setPID('Ti', v); }, ' s');
    bindSlider('pid-td', function(v) { S.Controls.setPID('Td', v); }, ' s');
    bindSlider('pid-droop', function(v) { S.Controls.setPID('droop', v); }, '%');
  }

  function bindSlider(sliderId, onChange, displaySuffix) {
    var slider = document.getElementById(sliderId);
    if (!slider) return;
    slider.addEventListener('input', function() {
      var v = parseFloat(slider.value);
      if (onChange) onChange(v);
      var valId = sliderId + '-val';
      var valEl = document.getElementById(valId);
      if (!valEl) {
        // Try without prefix
        var altId = sliderId.replace('ctrl-', '').replace('hmi-', '').replace('manual-', '').replace('pid-', '');
        valEl = document.getElementById(altId + '-val') || document.getElementById(sliderId + '-val');
      }
      if (valEl) {
        valEl.textContent = v.toFixed(slider.step < 0.1 ? 2 : 1) + displaySuffix;
      }
    });
  }

  function updateSliderDisplay(sliderId, value, suffix) {
    var slider = document.getElementById(sliderId);
    if (slider) slider.value = value;
    var valEl = document.getElementById(sliderId + '-val');
    if (valEl) valEl.textContent = value.toFixed(1) + suffix;
  }

  // ── Internal: button bindings ───────────────────────────────────

  function bindButtons() {
    bind('btn-start', function() { S.Controls.startPlant(); });
    bind('btn-stop', function() { S.Controls.stopPlant(); });
    bind('btn-trip', function() { S.Controls.toggleTrip(); });
    bind('btn-sync', function() { S.Controls.attemptSync(); });
    bind('btn-mode-manual', function() { S.Controls.setMode(MODE.MANUAL); });
    bind('btn-mode-auto', function() { S.Controls.setMode(MODE.AUTO); });
    bind('btn-sound', function() { S.Controls.toggleSound(); });
    bind('btn-ack-all', function() { S.Controls.acknowledgeAllAlarms(); });
    bind('btn-export-csv', function() { S.Controls.exportCSV(); });
    bind('btn-theme', function() { S.UI.toggleTheme(); });
  }

  function bindScenarioButtons() {
    var cards = document.querySelectorAll('.lab-card, [data-scenario]');
    for (var i = 0; i < cards.length; i++) {
      (function(card) {
        card.addEventListener('click', function() {
          var name = card.getAttribute('data-scenario');
          if (!name) {
            // Try to guess from content
            var text = card.textContent || '';
            if (text.indexOf('Arranque') > -1) name = 'startup';
            else if (text.indexOf('Rechazo') > -1) name = 'rejection';
            else if (text.indexOf('Barrido') > -1 || text.indexOf('hill') > -1) name = 'hill';
            else if (text.indexOf('Cavitación') > -1 || text.indexOf('cavitation') > -1) name = 'cavitation';
          }
          if (name) S.Controls.loadScenario(name);
        });
      })(cards[i]);
    }
  }

  function bind(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  // ── Internal: keyboard shortcuts ────────────────────────────────

  function bindKeyboard() {
    document.addEventListener('keydown', function(e) {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      var k = e.key.toLowerCase();
      switch (k) {
        case ' ':
          e.preventDefault();
          var state = S.Store.getState('state');
          if (state === ST.STOPPED || state === ST.TRIPPED) S.Controls.startPlant();
          else S.Controls.stopPlant();
          break;
        case 's':
          S.Controls.attemptSync();
          break;
        case 'p':
          S.Controls.toggleTrip();
          break;
        case 't':
          S.UI.toggleTheme();
          break;
        case 'a':
          S.Controls.setMode(MODE.AUTO);
          break;
        case 'm':
          S.Controls.setMode(MODE.MANUAL);
          break;
        case 'h':
          S.UI.switchView('hill');
          break;
        case 'r':
          S.Engine.init();
          S.UI.showToast('Simulación reiniciada', 'info');
          break;
        case 'escape':
          // Close modals
          var modals = document.querySelectorAll('.modal');
          for (var mi = 0; mi < modals.length; mi++) modals[mi].style.display = 'none';
          break;
        case '1': S.UI.switchView('monitor'); break;
        case '2': S.UI.switchView('3d'); break;
        case '3': S.UI.switchView('pid'); break;
        case '4': S.UI.switchView('hmi'); break;
        case '5': S.UI.switchView('trends'); break;
        case '6': S.UI.switchView('hill'); break;
        case '7': S.UI.switchView('dim'); break;
        case '8': S.UI.switchView('alarms'); break;
        case '9': S.UI.switchView('practices'); break;
      }
    });
  }

  function updateModeButtons(mode) {
    var manualBtn = document.getElementById('btn-mode-manual');
    var autoBtn = document.getElementById('btn-mode-auto');
    if (manualBtn) manualBtn.classList.toggle('active', mode === MODE.MANUAL);
    if (autoBtn) autoBtn.classList.toggle('active', mode === MODE.AUTO);
  }

  // ── PID persistence ─────────────────────────────────────────────

  function persistPID() {
    var st = S.Store.getState();
    try {
      localStorage.setItem('francis-pid', JSON.stringify({
        Kp: st.Kp, Ti: st.Ti, Td: st.Td, droop: st.droop,
      }));
    } catch (e) { /* localStorage may be unavailable */ }
  }

  function restorePID() {
    try {
      var saved = localStorage.getItem('francis-pid');
      if (saved) {
        var pid = JSON.parse(saved);
        S.Store.setState({
          Kp: pid.Kp || CFG.Kp,
          Ti: pid.Ti || CFG.Ti,
          Td: pid.Td || CFG.Td,
          droop: pid.droop || CFG.droop,
        });
      }
    } catch (e) { /* ignore */ }
  }

  // ── Scenarios ───────────────────────────────────────────────────

  function runStartupScenario() {
    S.Engine.init();
    S.UI.showToast('Escenario: Arranque Black-Start', 'info', 2500);
    logScenario('Iniciando arranque Black-Start...');

    // Ramp gate from 0 to 65% over 5 seconds
    S.Store.setState({ state: ST.STARTING, gateTarget: 0 });
    var rampSteps = 150; // 5s * 30Hz
    var step = 0;

    scenarioInterval = setInterval(function() {
      step++;
      if (step <= rampSteps) {
        var gate = (step / rampSteps) * 65;
        S.Store.setState('gateTarget', gate);
      } else if (step === rampSteps + 1) {
        // Switch to AUTO islanded mode
        S.Store.setState({ state: ST.ISLANDED, mode: MODE.AUTO, nRef: CFG.n_design });
        logScenario('Isla estable. Velocidad regulada por PID.');
      } else if (step === rampSteps + 120) {
        // Wait 4s then sync to grid
        S.Store.setState({ gridSynced: true, state: ST.GRID });
        logScenario('Sincronizado a red (50 Hz).');
        clearInterval(scenarioInterval);
        scenarioInterval = null;
        S.UI.showToast('Escenario completado: acoplado a red', 'success', 3000);
      }
    }, 1000 / 30);
  }

  function runRejectionScenario() {
    S.UI.showToast('Escenario: Rechazo de carga 100%', 'info', 2500);
    // Ensure plant is running in GRID
    S.Store.setState({ state: ST.ISLANDED, gateTarget: 65, nRef: CFG.n_design });
    logScenario('Forzando acople a red...');

    setTimeout(function() {
      S.Store.setState({ gridSynced: true, state: ST.GRID });
      logScenario('Red acoplada. Preparando rechazo...');

      setTimeout(function() {
        // Open breaker abruptly → island
        S.Store.setState({ gridSynced: false, state: ST.ISLANDED });
        logScenario('¡BREAKER ABIERTO! Rechazo de carga. Observar sobrevelocidad transitoria.');
        S.UI.showToast('Breaker 52-1 abierto — rechazo de carga', 'warning', 3000);
      }, 3000);
    }, 2000);

    scenarioInterval = setTimeout(function() {
      scenarioInterval = null;
    }, 10000);
  }

  function runHillScenario() {
    S.Engine.init();
    S.UI.showToast('Escenario: Barrido Hill Chart', 'info', 2500);
    logScenario('Barrido de apertura 20→100% en pasos de 10%...');

    S.Store.setState({ state: ST.STARTING, mode: MODE.MANUAL });
    var gates = [20, 30, 40, 50, 60, 70, 80, 90, 100];
    var step = 0;
    var stepDuration = 90; // 3s at 30 Hz

    scenarioInterval = setInterval(function() {
      step++;
      var idx = Math.min(Math.floor(step / stepDuration), gates.length - 1);
      var gateVal = gates[idx];
      S.Store.setState({ gateTarget: gateVal, state: ST.ISLANDED });
      if (step % stepDuration === 0) {
        logScenario('Apertura: ' + gateVal + '%');
      }
      if (idx >= gates.length - 1 && step > gates.length * stepDuration + 30) {
        clearInterval(scenarioInterval);
        scenarioInterval = null;
        logScenario('Barrido completado.');
        S.UI.showToast('Barrido hill completado', 'success', 2500);
      }
    }, 1000 / 30);
  }

  function runCavitationScenario() {
    S.Engine.init();
    S.UI.showToast('Escenario: Prueba límite cavitación', 'info', 2500);
    logScenario('Reduciendo altura neta gradualmente...');

    S.Store.setState({ state: ST.STARTING, gateTarget: 15, mode: MODE.MANUAL });
    var headStart = CFG.H_design;
    var headEnd = 1.0;
    var steps = 300; // 10s at 30Hz
    var step = 0;

    scenarioInterval = setInterval(function() {
      step++;
      var head = headStart - (headStart - headEnd) * (step / steps);
      S.Store.setState({ head: Math.max(head, headEnd), state: ST.ISLANDED });

      var sigma = (CFG.H_atm - CFG.H_v - CFG.H_s) / Math.max(head, 1e-6);
      if (sigma < CFG.sigma_crit) {
        logScenario('¡CAVITACIÓN! σ=' + sigma.toFixed(3) + ' < σ_crit=' + CFG.sigma_crit);
      }

      if (step >= steps) {
        clearInterval(scenarioInterval);
        scenarioInterval = null;
        S.UI.showToast('Prueba de cavitación completada', 'warning', 2500);
      }
    }, 1000 / 30);
  }

  function logScenario(msg) {
    var log = document.getElementById('scenario-log-body');
    if (!log) return;
    var el = document.getElementById('scenario-log');
    if (el) el.classList.remove('hidden');
    var entry = document.createElement('div');
    entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

})();