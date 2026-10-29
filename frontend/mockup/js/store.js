/**
 * store.js — Simple pub/sub state store
 * Dependency: config.js (for initial state values)
 */
(function() {
  'use strict';
  var S = window.FrancisSCADA;

  // ── Internal state ──────────────────────────────────────────────
  var _state = {
    state: S.ST.STOPPED,
    mode: S.MODE.MANUAL,
    gateTarget: 0,
    gateActual: 0,
    head: S.CFG.H_design,
    nRef: S.CFG.n_design,
    rpm: 0,
    flow: 0,
    pHyd: 0,
    pMech: 0,
    pElec: 0,
    eta: 0,
    torque: 0,
    sigma: Infinity,
    isCavitating: false,
    gridFreq: S.CFG.grid_freq,
    gridSynced: false,
    governorOut: 0,
    Kp: S.CFG.Kp,
    Ti: S.CFG.Ti,
    Td: S.CFG.Td,
    droop: S.CFG.droop,
    integral: 0,
    pTerm: 0,
    iTerm: 0,
    dTerm: 0,
    t: 0,
    alarms: [],
    soundOn: true,
  };

  var _listeners = [];

  // ── Public API ──────────────────────────────────────────────────
  S.Store = {
    /**
     * Get state. Without arguments returns a shallow copy of the full state.
     * With a key argument returns only that field.
     */
    getState: function(key) {
      if (key === undefined) {
        var copy = {};
        for (var k in _state) {
          if (_state.hasOwnProperty(k)) copy[k] = _state[k];
        }
        return copy;
      }
      return _state[key];
    },

    /**
     * Merge a partial state patch and notify subscribers.
     * Accepts either an object or a single key + value pair.
     */
    setState: function(patch, value) {
      if (typeof patch === 'string') {
        var k = patch;
        _state[k] = value;
      } else if (typeof patch === 'object' && patch !== null) {
        for (var key in patch) {
          if (patch.hasOwnProperty(key)) {
            _state[key] = patch[key];
          }
        }
      }
      S.Store.emit();
    },

    /**
     * Register a listener. Returns an unsubscribe function.
     */
    subscribe: function(fn) {
      _listeners.push(fn);
      return function() {
        var idx = _listeners.indexOf(fn);
        if (idx > -1) _listeners.splice(idx, 1);
      };
    },

    /**
     * Notify all subscribers.
     */
    emit: function() {
      var snapshot = S.Store.getState();
      for (var i = 0; i < _listeners.length; i++) {
        try {
          _listeners[i](snapshot);
        } catch (e) {
          console.error('[Store] Listener error:', e);
        }
      }
    },

    /**
     * Reset store to initial values (for engine reset).
     */
    reset: function() {
      _state.state = S.ST.STOPPED;
      _state.mode = S.MODE.MANUAL;
      _state.gateTarget = 0;
      _state.gateActual = 0;
      _state.head = S.CFG.H_design;
      _state.nRef = S.CFG.n_design;
      _state.rpm = 0;
      _state.flow = 0;
      _state.pHyd = 0;
      _state.pMech = 0;
      _state.pElec = 0;
      _state.eta = 0;
      _state.torque = 0;
      _state.sigma = Infinity;
      _state.isCavitating = false;
      _state.gridFreq = S.CFG.grid_freq;
      _state.gridSynced = false;
      _state.governorOut = 0;
      _state.Kp = S.CFG.Kp;
      _state.Ti = S.CFG.Ti;
      _state.Td = S.CFG.Td;
      _state.droop = S.CFG.droop;
      _state.integral = 0;
      _state.pTerm = 0;
      _state.iTerm = 0;
      _state.dTerm = 0;
      _state.t = 0;
      _state.alarms = [];
      S.Store.emit();
    },
  };

})();