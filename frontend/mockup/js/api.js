/**
 * api.js — Backend abstraction layer (mock ↔ WebSocket)
 * Dependency: config.js, store.js, engine.js
 */
(function() {
  'use strict';
  var S = window.FrancisSCADA;

  var _mode = 'mock'; // 'mock' | 'backend'
  var _ws = null;
  var _intervalId = null;
  var _callbacks = [];
  var _reconnectTimeout = null;
  var _reconnectAttempts = 0;
  var MAX_RECONNECTS = 10;

  function notifyCallbacks(data) {
    for (var i = 0; i < _callbacks.length; i++) {
      try {
        _callbacks[i](data);
      } catch (e) {
        console.error('[API] Callback error:', e);
      }
    }
  }

  S.API = {
    init: function() {
      // Detect if backend WebSocket is reachable
      tryBackendDetection();
    },

    start: function() {
      if (_mode === 'mock') {
        startMockLoop();
      } else {
        connectWebSocket();
      }
    },

    stop: function() {
      if (_intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
      }
      if (_ws) {
        _ws.close();
        _ws = null;
      }
      if (_reconnectTimeout) {
        clearTimeout(_reconnectTimeout);
        _reconnectTimeout = null;
      }
    },

    onTelemetry: function(fn) {
      _callbacks.push(fn);
    },

    setMode: function(mode) {
      S.API.stop();
      _mode = mode;
      S.API.start();
    },

    getMode: function() {
      return _mode;
    },
  };

  function tryBackendDetection() {
    // Fast check: try to connect and immediately disconnect
    try {
      var proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      var host = window.location.hostname || 'localhost';
      var testWs = new WebSocket(proto + '//' + host + ':8000/ws');
      var resolved = false;

      testWs.onopen = function() {
        if (!resolved) {
          resolved = true;
          _mode = 'backend';
          console.log('[API] Backend detected, using WebSocket mode');
          testWs.close();
        }
      };

      testWs.onerror = function() {
        if (!resolved) {
          resolved = true;
          _mode = 'mock';
          console.log('[API] No backend, using mock engine mode');
        }
      };

      // Timeout fallback
      setTimeout(function() {
        if (!resolved) {
          resolved = true;
          _mode = 'mock';
          try { testWs.close(); } catch(e) {}
          console.log('[API] Detection timeout, using mock mode');
        }
      }, 2000);

    } catch (e) {
      _mode = 'mock';
      console.log('[API] Detection error, using mock mode:', e);
    }
  }

  function startMockLoop() {
    S.Engine.init();
    var dt = S.CFG.dt;
    var intervalMs = dt * 1000; // ~33ms for 30 Hz

    _intervalId = setInterval(function() {
      try {
        S.Engine.step();
        var telemetry = S.Engine.getTelemetry();
        notifyCallbacks(telemetry);
      } catch (e) {
        console.error('[API] Mock loop error:', e);
      }
    }, intervalMs);
  }

  function connectWebSocket() {
    try {
      var proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      var host = window.location.hostname || 'localhost';
      var wsUrl = proto + '//' + host + ':8000/ws';

      _ws = new WebSocket(wsUrl);

      _ws.onopen = function() {
        _reconnectAttempts = 0;
        console.log('[API] WebSocket connected');
      };

      _ws.onmessage = function(event) {
        try {
          var data = JSON.parse(event.data);
          notifyCallbacks(data);
        } catch (e) {
          console.error('[API] Parse error:', e);
        }
      };

      _ws.onclose = function() {
        console.log('[API] WebSocket closed');
        if (_reconnectAttempts < MAX_RECONNECTS) {
          var delay = Math.min(1000 * Math.pow(2, _reconnectAttempts), 10000);
          _reconnectTimeout = setTimeout(function() {
            _reconnectAttempts++;
            connectWebSocket();
          }, delay);
        }
      };

      _ws.onerror = function(err) {
        console.error('[API] WebSocket error:', err);
      };

    } catch (e) {
      console.error('[API] WebSocket connection error:', e);
      // Fallback to mock
      _mode = 'mock';
      startMockLoop();
    }
  }

})();