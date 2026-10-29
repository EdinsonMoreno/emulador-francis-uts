/**
 * Store - State Management (Single Responsibility)
 * Manages application state, connects to WebSocket backend.
 * Dependency: none (pure JS module)
 */
const Store = (() => {
  const state = {
    state: 'stopped',
    mode: 'manual',
    rpm: 0, gateTarget: 0, gateActual: 0,
    head: 35.0, headNet: 35.0, flow: 0, pHyd: 0, pMech: 0, pElec: 0, eta: 0, sigma: 0.245,
    torqueHyd: 0, torqueElec: 0, governorOut: 0,
    Kp: 3.5, Ti: 1.8, Td: 0.2, droop: 4.0, integral: 0, pTerm: 0, iTerm: 0, dTerm: 0,
    gridFreq: 50.0, gridPhase: 0,
    alarmCount: 0, uptime: 0, simTime: 0,
    nDesign: 1300, rpmMax: 1850, rpmMin: 0,
    sigmaCrit: 0.115, headGross: 35.0,
    flowDesign: 0.85, rpmDesign: 1300, etaMax: 0.92,
  };

  let listeners = [];
  let ws = null;
  let reconnectTimeout = null;
  let connected = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECTS = 10;

  function setState(key, value) {
    state[key] = value;
    notifyListeners();
  }

  function getState(key) {
    return state[key];
  }

  function connectWebSocket() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const port = 8000;
    const wsUrl = `${proto}//${host}:${port}/ws`;
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      connected = true; reconnectAttempts = 0;
      console.log('[Store] Connected to backend WebSocket');
      notifyListeners();
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      Object.assign(state, data);
      notifyListeners();
    };
    ws.onclose = () => {
      connected = false;
      console.log('[Store] WebSocket closed, reconnecting...');
      notifyListeners();
      if (reconnectAttempts < MAX_RECONNECTS) {
        reconnectTimeout = setTimeout(connectWebSocket, Math.min(1000 * Math.pow(2, reconnectAttempts), 10000));
        reconnectAttempts++;
      }
    };
    ws.onerror = (err) => { console.error('[Store] WebSocket error:', err); };
  }

  function disconnect() {
    if (ws) { ws.close(); ws = null; }
    connected = false;
    if (reconnectTimeout) { clearTimeout(reconnectTimeout); reconnectTimeout = null; }
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }

  return {
    getState, setState, connectWebSocket, disconnect, subscribe,
    isConnected: () => connected,
  };
})();

window.Store = Store;
