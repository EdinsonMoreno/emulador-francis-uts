/**
 * config.js — Configuration constants and enums
 * Dependency: none (first to load)
 */
(function() {
  'use strict';
  var S = window.FrancisSCADA = window.FrancisSCADA || {};

  S.CFG = {
    // Física — diseño real del prototipo (escala laboratorio)
    rho: 1000,           // kg/m³
    g: 9.81,             // m/s²
    H_design: 3.058,     // m (altura neta de diseño)
    Q_design: 24.44,     // L/min → se convierte a m³/s internamente
    n_design: 1300,      // rpm (velocidad síncrona de diseño)
    eta_max: 0.62,       // eficiencia máxima (turbina pequeña)

    // Geometría
    gate_opt: 65,        // % apertura óptima
    D_runner: 0.18,      // m diámetro rodete

    // Dinámica
    J: 0.008,            // kg·m² inercia
    bFriction: 0.0006,   // N·m·s fricción viscosa
    genEta: 0.95,        // eficiencia del generador
    tau_servo: 0.8,      // s constante de tiempo servo
    servo_rate: 12.5,    // %/s velocidad máxima del servoactuador

    // Simulación
    dt: 1/30,            // s paso fijo 30 Hz
    rpm_max: 2200,       // rpm máxima
    rpm_min: 0,
    rpm_trip: 1850,      // rpm disparo por sobrevelocidad

    // Cavitación
    npsh_r: 1.5,         // m requerido
    sigma_crit: 0.35,    // Thoma crítico
    H_atm: 10.33,        // m presión atmosférica
    H_v: 0.25,           // m presión de vapor
    H_s: 1.5,            // altura de succión fija

    // PID defaults
    Kp: 2.5,
    Ti: 1.2,             // s
    Td: 0.2,             // s
    droop: 4.0,          // %

    // Grid
    grid_freq: 50.0,     // Hz
  };

  S.ST = {
    STOPPED: 'stopped',
    STARTING: 'starting',
    ISLANDED: 'islanded',
    SYNCING: 'syncing',
    GRID: 'grid',
    TRIPPED: 'tripped',
  };

  S.MODE = {
    MANUAL: 'manual',
    AUTO: 'auto',
  };

  // Helper: L/min ↔ m³/s
  S.Lmin_to_m3s = function(v) { return v / 60000; };
  S.m3s_to_Lmin = function(v) { return v * 60000; };

})();