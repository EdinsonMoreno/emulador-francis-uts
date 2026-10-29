/**
 * charts.js — uPlot charts + hill chart canvas
 * Dependency: config.js, store.js (uPlot global)
 */
(function() {
  'use strict';
  var S = window.FrancisSCADA;
  var CFG = S.CFG;

  // ── Data buffers (historian) ────────────────────────────────────
  var HIST_MAX = 2000;
  var buffers = {
    t: [],
    rpm: [],
    flow: [],
    pElec: [],
    gate: [],
    eta: [],
    head: [],
    pHyd: [],
    pMech: [],
    nRef: [],
  };

  // uPlot instances
  var miniRpmPlot = null;
  var miniPowerPlot = null;
  var mainRpmPlot = null;
  var mainPowerPlot = null;
  var mainFlowPlot = null;

  // Hill chart
  var hillCtx = null;
  var hillOpX = 0, hillOpY = 0;
  var hillDirty = true;

  // Viridis colormap (simplified 5-stop LUT)
  function viridisColor(t) {
    t = Math.max(0, Math.min(1, t));
    var stops = [
      [0.267, 0.004, 0.329],  // 0.0 dark purple
      [0.127, 0.566, 0.550],  // 0.25 teal
      [0.369, 0.789, 0.383],  // 0.5 green
      [0.830, 0.726, 0.151],  // 0.75 yellow-green
      [0.993, 0.906, 0.144],  // 1.0 yellow
    ];
    var seg = t * (stops.length - 1);
    var i = Math.min(Math.floor(seg), stops.length - 2);
    var f = seg - i;
    var a = stops[i], b = stops[i + 1];
    return [
      Math.round((a[0] + (b[0] - a[0]) * f) * 255),
      Math.round((a[1] + (b[1] - a[1]) * f) * 255),
      Math.round((a[2] + (b[2] - a[2]) * f) * 255),
    ];
  }

  // Hill efficiency (same as engine)
  function hillEfficiency(qr, nr) {
    var dq = qr - 1, dn = nr - 1;
    var e = 1 - 0.35 * dq * dq - 0.20 * dn * dn - 0.08 * dq * dn;
    return Math.max(0.05, Math.min(1, e));
  }

  S.Charts = {
    /**
     * Initialize all charts.
     */
    init: function() {
      try {
        initMiniRpm();
        initMiniPower();
        initMainRpm();
        initMainPower();
        initMainFlow();
        drawHillChart();
      } catch (e) {
        console.error('[Charts] Init error:', e);
      }
    },

    /**
     * Push a telemetry data point into buffers.
     */
    push: function(telemetry) {
      try {
        var t = telemetry.t || 0;
        var rpm = telemetry.rpm || 0;
        var flow = telemetry.flow || 0; // m³/s from telemetry, convert to L/min
        var flowLmin = flow * 60000;
        var pElec = telemetry.power_elec || 0;
        var pMech = telemetry.power_mech || 0;
        var pHyd = (telemetry.head_net || 0) * (flow || 0) * CFG.rho * CFG.g;
        var eta = telemetry.efficiency || 0;
        var gate = telemetry.gate_actual || 0;
        var head = telemetry.head_net || 0;
        var nRef = S.Store.getState('nRef') || CFG.n_design;

        pushBuf('t', t);
        pushBuf('rpm', rpm);
        pushBuf('flow', flowLmin);
        pushBuf('pElec', pElec);
        pushBuf('gate', gate);
        pushBuf('eta', eta);
        pushBuf('head', head);
        pushBuf('pHyd', pHyd);
        pushBuf('pMech', pMech);
        pushBuf('nRef', nRef);

        // Update hill chart operating point
        hillOpX = flowLmin / CFG.Q_design;
        hillOpY = rpm / CFG.n_design;

      } catch (e) {
        console.error('[Charts] push error:', e);
      }
    },

    /**
     * Render hill chart canvas.
     */
    render: function() {
      drawHillChart();
    },

    /**
     * Get historian data for CSV export.
     */
    getHistorian: function() {
      return buffers;
    },

    /**
     * Redraw all uPlot charts (called on resize).
     */
    redraw: function() {
      try {
        if (miniRpmPlot && miniRpmPlot.root) {
          var container = miniRpmPlot.root.parentElement;
          if (container) {
            var w = container.clientWidth || 320;
            miniRpmPlot.setSize({ width: w, height: 128 });
          }
        }
        if (miniPowerPlot && miniPowerPlot.root) {
          var c2 = miniPowerPlot.root.parentElement;
          if (c2) miniPowerPlot.setSize({ width: c2.clientWidth || 320, height: 128 });
        }
        if (mainRpmPlot && mainRpmPlot.root) {
          var c3 = mainRpmPlot.root.parentElement;
          if (c3) mainRpmPlot.setSize({ width: c3.clientWidth || 500, height: 256 });
        }
        if (mainPowerPlot && mainPowerPlot.root) {
          var c4 = mainPowerPlot.root.parentElement;
          if (c4) mainPowerPlot.setSize({ width: c4.clientWidth || 500, height: 256 });
        }
        if (mainFlowPlot && mainFlowPlot.root) {
          var c5 = mainFlowPlot.root.parentElement;
          if (c5) mainFlowPlot.setSize({ width: c5.clientWidth || 500, height: 256 });
        }
      } catch (e) {
        // ignore resize errors
      }
    },
  };

  // ── Buffer helpers ──────────────────────────────────────────────

  function pushBuf(key, val) {
    var arr = buffers[key];
    if (!arr) return;
    arr.push(val);
    if (arr.length > HIST_MAX) arr.shift();
  }

  function getBuf(key, windowSec) {
    var arr = buffers[key] || [];
    var ts = buffers.t;
    if (!windowSec || !ts.length) return arr;
    var cutoff = (ts[ts.length - 1] || 0) - windowSec;
    var start = 0;
    for (var i = 0; i < ts.length; i++) {
      if (ts[i] >= cutoff) { start = i; break; }
    }
    return arr.slice(start);
  }

  // ── uPlot helpers ───────────────────────────────────────────────

  function uplotOpts(title, series, width, height) {
    return {
      title: title || '',
      width: width || 400,
      height: height || 128,
      cursor: { show: true, drag: { x: true, y: false } },
      select: { show: false },
      legend: { show: false },
      axes: [
        {
          stroke: '#64748b',
          grid: { stroke: 'rgba(100,116,139,0.15)', width: 1 },
          ticks: { stroke: 'rgba(100,116,139,0.2)', width: 1 },
          font: '10px JetBrains Mono',
          values: function(self, ticks) {
            return ticks.map(function(v) { return v.toFixed(1); });
          },
        },
        {
          stroke: '#64748b',
          grid: { stroke: 'rgba(100,116,139,0.15)', width: 1 },
          font: '10px JetBrains Mono',
          values: function(self, ticks) {
            return ticks.map(function(v) { return v.toFixed(1); });
          },
        },
      ],
      series: series || [],
    };
  }

  function initMiniRpm() {
    var el = document.getElementById('mini-rpm');
    if (!el || typeof uPlot === 'undefined') return;
    el.innerHTML = '';
    var opts = uplotOpts('', [
      { stroke: 'rgba(0,212,255,0.8)', width: 1.5, fill: 'rgba(0,212,255,0.08)' },
    ], el.clientWidth || 320, 128);
    miniRpmPlot = new uPlot(opts, [[], []], el);

    // Periodic update
    setInterval(function() {
      if (!miniRpmPlot) return;
      var tData = getBuf('t', 30);
      var rpmData = getBuf('rpm', 30);
      if (tData.length > 1) {
        miniRpmPlot.setData([tData, rpmData]);
      }
    }, 500);
  }

  function initMiniPower() {
    var el = document.getElementById('mini-power');
    if (!el || typeof uPlot === 'undefined') return;
    el.innerHTML = '';
    var opts = uplotOpts('', [
      { stroke: 'rgba(245,158,11,0.8)', width: 1.5, fill: 'rgba(245,158,11,0.06)', label: 'P_hyd' },
      { stroke: 'rgba(0,212,255,0.8)', width: 1.5, fill: 'rgba(0,212,255,0.06)', label: 'P_elec' },
    ], el.clientWidth || 320, 128);
    miniPowerPlot = new uPlot(opts, [[], [], []], el);

    setInterval(function() {
      if (!miniPowerPlot) return;
      var tData = getBuf('t', 30);
      var pHydData = getBuf('pHyd', 30);
      var pElecData = getBuf('pElec', 30);
      if (tData.length > 1) {
        miniPowerPlot.setData([tData, pHydData, pElecData]);
      }
    }, 500);
  }

  function initMainRpm() {
    var el = document.getElementById('main-rpm');
    if (!el || typeof uPlot === 'undefined') return;
    el.innerHTML = '';
    var opts = uplotOpts('', [
      { stroke: 'rgba(0,212,255,0.9)', width: 1.5, fill: 'rgba(0,212,255,0.06)', label: 'RPM' },
      {
        stroke: 'rgba(245,158,11,0.6)',
        width: 1,
        fill: undefined,
        label: 'n_ref',
        dash: [4, 4],
      },
    ], el.clientWidth || 500, 256);
    opts.cursor.show = true;
    opts.legend.show = true;
    mainRpmPlot = new uPlot(opts, [[], [], []], el);

    setInterval(function() {
      if (!mainRpmPlot) return;
      var tData = getBuf('t', 60);
      var rpmData = getBuf('rpm', 60);
      var nRefData = getBuf('nRef', 60);
      if (tData.length > 1) {
        mainRpmPlot.setData([tData, rpmData, nRefData]);
      }
    }, 500);
  }

  function initMainPower() {
    var el = document.getElementById('main-power');
    if (!el || typeof uPlot === 'undefined') return;
    el.innerHTML = '';
    var opts = uplotOpts('', [
      { stroke: 'rgba(245,158,11,0.9)', width: 1.5, fill: 'rgba(245,158,11,0.06)', label: 'P_mech' },
      { stroke: 'rgba(16,185,129,0.9)', width: 1.5, fill: 'rgba(16,185,129,0.06)', label: 'P_elec' },
    ], el.clientWidth || 500, 256);
    opts.cursor.show = true;
    opts.legend.show = true;
    mainPowerPlot = new uPlot(opts, [[], [], []], el);

    setInterval(function() {
      if (!mainPowerPlot) return;
      var tData = getBuf('t', 60);
      var pMechData = getBuf('pMech', 60);
      var pElecData = getBuf('pElec', 60);
      if (tData.length > 1) {
        mainPowerPlot.setData([tData, pMechData, pElecData]);
      }
    }, 500);
  }

  function initMainFlow() {
    var el = document.getElementById('main-flow');
    if (!el || typeof uPlot === 'undefined') return;
    el.innerHTML = '';
    var opts = uplotOpts('', [
      { stroke: 'rgba(0,212,255,0.9)', width: 1.5, fill: 'rgba(0,212,255,0.06)', label: 'Flow L/min' },
      { stroke: 'rgba(148,163,184,0.7)', width: 1.5, fill: undefined, label: 'Gate %' },
    ], el.clientWidth || 500, 256);
    opts.cursor.show = true;
    opts.legend.show = true;
    mainFlowPlot = new uPlot(opts, [[], [], []], el);

    setInterval(function() {
      if (!mainFlowPlot) return;
      var tData = getBuf('t', 60);
      var flowData = getBuf('flow', 60);
      var gateData = getBuf('gate', 60);
      if (tData.length > 1) {
        mainFlowPlot.setData([tData, flowData, gateData]);
      }
    }, 500);
  }

  // ── Hill Chart ──────────────────────────────────────────────────

  function drawHillChart() {
    var canvas = document.getElementById('hill-canvas');
    if (!canvas) return;
    hillCtx = canvas.getContext('2d');
    var w = canvas.width = canvas.clientWidth || 640;
    var h = canvas.height = canvas.clientHeight || 480;

    var ctx = hillCtx;
    var xMin = 0.0, xMax = 2.0;
    var yMin = 0.0, yMax = 2.0;
    var img = ctx.createImageData(w, h);

    for (var py = 0; py < h; py++) {
      for (var px = 0; px < w; px++) {
        var qr = xMin + (px / w) * (xMax - xMin);
        var nr = yMax - (py / h) * (yMax - yMin);
        var nrEff = Math.max(0.1, nr);
        var eta = hillEfficiency(Math.max(0.05, qr), nrEff);
        if (nrEff < 0.3) eta *= (nrEff / 0.3);
        var rgb = viridisColor(eta);
        var idx = (py * w + px) * 4;
        img.data[idx] = rgb[0];
        img.data[idx + 1] = rgb[1];
        img.data[idx + 2] = rgb[2];
        img.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);

    // Draw efficiency contour lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    for (var etaLevel = 0.1; etaLevel <= 0.9; etaLevel += 0.1) {
      ctx.beginPath();
      var first = true;
      for (var qi = 0; qi <= 40; qi++) {
        var qTest = xMin + (qi / 40) * (xMax - xMin);
        // Find nr where eta ≈ etaLevel
        var found = false;
        var nrBest = 0;
        var bestDiff = 999;
        for (var nj = 0; nj <= 60; nj++) {
          var nrTest = yMin + (nj / 60) * (yMax - yMin);
          var e = hillEfficiency(Math.max(0.05, qTest), Math.max(0.1, nrTest));
          if (nrTest < 0.3) e *= (nrTest / 0.3);
          var diff = Math.abs(e - etaLevel);
          if (diff < bestDiff && diff < 0.02) {
            bestDiff = diff;
            nrBest = nrTest;
            found = true;
          }
        }
        if (found) {
          var sx = ((qTest - xMin) / (xMax - xMin)) * w;
          var sy = ((yMax - nrBest) / (yMax - yMin)) * h;
          if (first) { ctx.moveTo(sx, sy); first = false; }
          else ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();
    }

    // Operating point (white dot)
    if (hillOpX > 0 && hillOpY > 0) {
      var ox = ((hillOpX - xMin) / (xMax - xMin)) * w;
      var oy = ((yMax - hillOpY) / (yMax - yMin)) * h;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ox, oy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText('Q/Q_d', w / 2 - 15, h - 5);
    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('n/n_d', -15, 0);
    ctx.restore();

    // Color bar
    var barW = 20, barH = h - 60, barX = w - 30, barY = 20;
    for (var by = 0; by < barH; by++) {
      var tH = 1 - by / barH;
      var rgb2 = viridisColor(tH);
      ctx.fillStyle = 'rgb(' + rgb2[0] + ',' + rgb2[1] + ',' + rgb2[2] + ')';
      ctx.fillRect(barX, barY + by, barW, 1);
    }
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText('1.0', barX + barW + 4, barY + 6);
    ctx.fillText('0.0', barX + barW + 4, barY + barH);
  }

})();