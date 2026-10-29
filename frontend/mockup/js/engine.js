/**
 * engine.js — Physics engine (deterministic, fixed dt = 1/30 s)
 * Dependency: config.js, store.js
 *
 * Based on v2.html + V2pro.html verified formulas.
 */
(function() {
  'use strict';
  var S = window.FrancisSCADA;
  var CFG = S.CFG;
  var ST = S.ST;
  var MODE = S.MODE;

  // Engine-private state (not in store)
  var _integral = 0;
  var _lastError = 0;
  var _startingTimer = 0;

  // Clamp helper
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /**
   * Hill efficiency model (from v2 — superior to V2pro)
   * qr = flow ratio, nr = rpm ratio
   */
  function hillEfficiency(qr, nr) {
    var dq = qr - 1;
    var dn = nr - 1;
    var e = 1 - 0.35 * dq * dq - 0.20 * dn * dn - 0.08 * dq * dn;
    return clamp(e, 0.05, 1.0);
  }

  S.Engine = {
    /**
     * Reset to initial conditions.
     */
    init: function() {
      _integral = 0;
      _lastError = 0;
      _startingTimer = 0;

      S.Store.reset();
      S.Store.setState({
        head: CFG.H_design,
        nRef: CFG.n_design,
        sigma: Infinity,
        isCavitating: false,
        gridFreq: CFG.grid_freq,
        t: 0,
      });
    },

    /**
     * Advance simulation by one dt step. Updates store.
     */
    step: function() {
      try {
        var st = S.Store.getState();
        var state = st.state;
        var mode = st.mode;
        var gateTarget = st.gateTarget;
        var gateActual = st.gateActual;
        var head = st.head;
        var rpm = st.rpm;
        var flow = st.flow;
        var nRef = st.nRef;
        var gridSynced = st.gridSynced;
        var gridFreq = st.gridFreq;
        var t = st.t;
        var dt = CFG.dt;

        // ── Guard: stopped or tripped ─────────────────────────────
        if (state === ST.STOPPED || state === ST.TRIPPED) {
          if (state === ST.TRIPPED) {
            S.Store.setState({ gateActual: 0, rpm: 0, flow: 0, pHyd: 0, pMech: 0, pElec: 0, eta: 0, torque: 0, t: t + dt });
          }
          return;
        }

        // ── 1. Caudal objetivo por apertura ───────────────────────
        var qTarget = CFG.Q_design * (gateTarget / CFG.gate_opt) * Math.sqrt(head / CFG.H_design);
        // Smooth flow transition
        flow += (qTarget - flow) * Math.min(1, dt * 3);
        flow = Math.max(0, flow);

        // ── 2. Efficiency (hill model from v2) ────────────────────
        var qr = Math.max(0.05, flow / CFG.Q_design);
        var nr_eta = Math.max(0.1, rpm / CFG.n_design);
        var etaFactor = hillEfficiency(qr, nr_eta);
        if (nr_eta < 0.3) etaFactor *= (nr_eta / 0.3); // low-speed derating (v2 L759-765)
        var etaTarget = CFG.eta_max * etaFactor;
        var eta = st.eta + (etaTarget - st.eta) * Math.min(1, dt * 4);
        if (rpm < 30) eta = 0;

        // ── 3. Power ──────────────────────────────────────────────
        var Q_m3s = flow / 60000; // L/min → m³/s
        var pHyd = CFG.rho * CFG.g * Q_m3s * head;
        var pMech = pHyd * eta;

        // ── 4. Torque hidráulico — FÓRMULA FENOMENOLÓGICA de v2 ──
        // v2 L773-778: T_nom = P_nom / ω_nom, then T_hyd = T_nom * (gate/opt) * sqrt(H/Hd) * (1.5 - rpm/n_design)
        var P_nom = CFG.rho * CFG.g * (CFG.Q_design / 60000) * CFG.H_design * CFG.eta_max;
        var omega_nom = CFG.n_design * 2 * Math.PI / 60;
        var T_nom = P_nom / omega_nom;
        var torque_h = T_nom * (gateActual / CFG.gate_opt) * Math.sqrt(head / CFG.H_design) * Math.max(0, 1.5 - (rpm / CFG.n_design));

        // ── 5. Equation of motion ─────────────────────────────────
        var omega = rpm * 2 * Math.PI / 60;
        var new_rpm = rpm;
        var pElec = 0;

        if (state === ST.GRID && gridSynced) {
          // Grid-connected: generator imposes synchronous speed
          var syncRpm = CFG.n_design * (gridFreq / CFG.grid_freq);
          new_rpm = rpm + (syncRpm - rpm) * Math.min(1, dt * 15) + (Math.random() - 0.5) * 0.15;
          pElec = pMech * CFG.genEta;
        } else {
          var T_load = CFG.bFriction * omega;
          if (state === ST.ISLANDED && rpm > 50) {
            pElec = pMech * CFG.genEta;
            T_load += pElec / Math.max(omega, 1e-6);
          }
          var dOmega = (torque_h - T_load) / CFG.J;
          new_rpm = clamp(rpm + dOmega * 60 / (2 * Math.PI) * dt, CFG.rpm_min, CFG.rpm_max);
        }

        // ── 6. Governor PID (v2 P+I+droop + V2pro D-term) ────────
        var error = nRef - new_rpm;
        var droop_correction = (CFG.droop / 100) * (nRef - CFG.n_design) * 0.5; // v2 scaling
        _integral += error * dt;
        // Anti-windup: clamp integral
        var iMax = 20 / Math.max(CFG.Kp, 0.1);
        _integral = clamp(_integral, -iMax, iMax);
        var dTerm = (dt > 0.001) ? (error - _lastError) / dt : 0;
        var pTerm = CFG.Kp * error;
        var iTerm = (CFG.Kp / Math.max(0.05, CFG.Ti)) * _integral;
        var dTermVal = CFG.Kp * CFG.Td * dTerm;
        var govOut = pTerm + iTerm + dTermVal - droop_correction;
        govOut = clamp(govOut, -50, 50); // v2 range

        _lastError = error;

        // Apply governor only in AUTO + islanded/starting
        var gateCmd = gateTarget;
        if (mode === MODE.AUTO && (state === ST.ISLANDED || state === ST.STARTING)) {
          gateCmd = CFG.gate_opt + govOut;
          gateCmd = clamp(gateCmd, 0, 100);
        }

        // ── 7. Servo dynamics (rate limiter) ──────────────────────
        var maxStep = CFG.servo_rate * dt;
        var delta = gateCmd - gateActual;
        var new_gateActual;
        if (Math.abs(delta) <= maxStep) {
          new_gateActual = gateCmd;
        } else {
          new_gateActual = gateActual + Math.sign(delta) * maxStep;
        }
        new_gateActual = clamp(new_gateActual, 0, 100);

        // ── 8. Thoma number (cavitation) ──────────────────────────
        var H_atm_m = CFG.H_atm;
        var H_v_m = CFG.H_v;
        var H_s = CFG.H_s;
        var sigma = (H_atm_m - H_v_m - H_s) / Math.max(head, 1e-6);
        var isCavitating = sigma < CFG.sigma_crit;

        // ── 9. Trip detection (overspeed) ─────────────────────────
        if (new_rpm > CFG.rpm_trip && state !== ST.GRID) {
          // Raise alarm
          var alarms = S.Store.getState('alarms') || [];
          alarms.push({
            t: t + dt,
            prio: 1,
            code: 'OS-101',
            desc: 'Sobrevelocidad: ' + new_rpm.toFixed(0) + ' rpm (trip > ' + CFG.rpm_trip + ')',
            ack: false,
            time: new Date().toLocaleTimeString(),
            severity: 'CRITICAL',
            message: 'Disparo por sobrevelocidad a ' + new_rpm.toFixed(0) + ' rpm',
          });
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
            governorOut: govOut,
            pTerm: pTerm,
            iTerm: iTerm,
            dTerm: dTermVal,
            sigma: sigma,
            isCavitating: isCavitating,
            alarms: alarms,
            t: t + dt,
            integral: _integral,
          });
          return;
        }

        // ── 10. Cavitation alarm ──────────────────────────────────
        if (isCavitating && rpm > 30) {
          var alarms2 = S.Store.getState('alarms') || [];
          // Check if already raised
          var already = false;
          for (var ai = 0; ai < alarms2.length; ai++) {
            if (alarms2[ai].code === 'CAV-201') { already = true; break; }
          }
          if (!already) {
            alarms2.push({
              t: t + dt,
              prio: 2,
              code: 'CAV-201',
              desc: 'Cavitación probable (σ=' + sigma.toFixed(2) + ' < σ_crit=' + CFG.sigma_crit + ')',
              ack: false,
              time: new Date().toLocaleTimeString(),
              severity: 'WARNING',
              message: 'Número de Thoma bajo: ' + sigma.toFixed(3),
            });
          }
        }

        // ── 11. Update store ──────────────────────────────────────
        S.Store.setState({
          gateActual: new_gateActual,
          gateTarget: gateCmd, // reflect governor override in UI
          rpm: new_rpm,
          flow: flow,
          pHyd: pHyd,
          pMech: pMech,
          pElec: pElec,
          eta: eta * 100, // store as percentage
          torque: torque_h,
          sigma: sigma,
          isCavitating: isCavitating,
          governorOut: govOut,
          pTerm: pTerm,
          iTerm: iTerm,
          dTerm: dTermVal,
          integral: _integral,
          t: t + dt,
        });

      } catch (e) {
        console.error('[Engine] Step error:', e);
      }
    },

    /**
     * Set an input parameter.
     */
    setInput: function(key, val) {
      var map = {
        gateTarget: 'gateTarget',
        head: 'head',
        nRef: 'nRef',
        gridFreq: 'gridFreq',
      };
      var mapped = map[key] || key;
      S.Store.setState(mapped, val);
    },

    /**
     * Return a telemetry packet matching backend contract.
     */
    getTelemetry: function() {
      var st = S.Store.getState();
      return {
        t: st.t,
        rpm: st.rpm,
        gate_actual: st.gateActual,
        flow: st.flow / 60000, // m³/s for backend compat
        head_net: st.head,
        head_gross: st.head, // same in mock
        power_mech: st.pMech,
        power_elec: st.pElec,
        efficiency: st.eta,
        head_loss: 0,
        waterhammer: 0,
        swirl_vel: 0,
        euler_head: 0,
        peripheral_vel: 0,
        torque_hydraulic: st.torque,
        torque_electrical: st.rpm > 0 ? st.pElec / (st.rpm * Math.PI / 30) : 0,
        thoma: st.sigma,
        critical_thoma: CFG.sigma_crit,
        is_cavitating: st.isCavitating,
        governor_out: st.governorOut,
        kp: st.Kp,
        ti: st.Ti,
        td: st.Td,
        droop_pct: st.droop,
        running: st.state !== ST.STOPPED && st.state !== ST.TRIPPED,
        tripped: st.state === ST.TRIPPED,
        grid_synced: st.gridSynced,
        synced: st.gridSynced,
        last_update: new Date().toISOString(),
      };
    },
  };

})();