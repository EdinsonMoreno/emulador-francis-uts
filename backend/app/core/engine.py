"""Physics engine — RK4 integrator for Francis turbine hydromechanical model.

Model: static performance curves + dynamic hydraulic mass/flow balance +
mechanical/electrical rigid-body transient + simplified PID governor.
Uses Pydantic-validated parameters from backend.app.config.
"""
import math
from backend.app.config import settings

# Convenience params
rho = settings.RHO_WATER
g = settings.G_ACCEL
H0 = settings.H_DESIGN
Q0 = settings.Q_DESIGN
N0 = settings.N_DESIGN
ETA_MAX = settings.ETA_MAX
GATE_OPT = settings.GATE_OPT
J = settings.J_INERTIA
TAU_SERVO = settings.TAU_SERVO
L_PEN = settings.PENSTOCK_L
D_PEN = settings.PENSTOCK_D
A_PEN = settings.PENSTOCK_A
F_FRIC = settings.FRICTION_F
WATER_HAMMER = settings.WATER_HAMMER_A
H_ATM = settings.H_ATM
H_V = settings.H_V
H_S = settings.H_S
SIGMA_CRIT = settings.SIGMA_CRIT
RPM_TRIP = settings.RPM_TRIP
DT = settings.DT_SEC

# Derived geometry at design point
D1 = 84.5 * math.sqrt(H0) / N0
D2 = D1 * 0.82
U1 = (math.pi * D1 * N0) / 60.0


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def hill_efficiency(q_ratio, n_ratio):
    """Francis hill-chart efficiency: quadratic response around design point."""
    dq = q_ratio - 1.0
    dn = n_ratio - 1.0
    return _clamp(ETA_MAX * (1.0 - 0.45 * dq * dq - 0.30 * dn * dn - 0.15 * dq * dn),
                  0.10, ETA_MAX)


def thoma_number(head_net):
    """Cavitation number sigma = (Patm - Pv - hs) / Hnet"""
    return _clamp((H_ATM - H_V - H_S) / max(head_net, 1e-6), 0.01, 2.0)


class RK4State:
    """Dynamic state vector for RK4 integration.

    y = [Q, rpm, gate_actual]
    """
    def __init__(self):
        self.Q = Q0
        self.n = N0
        self.gate = 0.0
        self.head_gross = H0
        self.flow_prev = Q0
        self.h_f = 0.0
        self.h_wh = 0.0
        self.p_hyd = 0.0
        self.p_mech = 0.0
        self.p_elec = 0.0
        self.eta = 0.0
        self.sigma = thoma_number(H0)
        self.torque_h = 0.0
        self.torque_e = 0.0
        self.governor_out = 0.0
        self.running = True
        self.tripped = False
        self.grid_synced = False
        self.integral_err = 0.0
        self.last_err = 0.0
        self.t = 0.0
        self.kp = 3.5
        self.ti = 1.8
        self.td = 0.2
        self.droop_pct = 4.0
        self.n_ref = 1300.0
        self.head_gross = 35.0


def derivatives(y, s):
    """Compute time-derivatives (dy/dt) for RK4 step.

    y = [Q, rpm, gate_actual]
    Returns: [dQ/dt, dn/dt, dgatedt]
    """
    Q, rpm, gate_act = y

    if s["tripped"]:
        return [-Q * 2.0, -150.0, (0.0 - gate_act) / max(TAU_SERVO, 1e-6)]

    if not s["running"]:
        return [-Q * 1.5, -50.0, (0.0 - gate_act) / max(TAU_SERVO, 1e-6)]

    # ---- Governor PID ----
    err = s["n_ref"] - rpm
    kp = s["kp"]
    ti = s["ti"]
    td = s["td"]
    droop = s["droop_pct"]
    p_term = kp * err
    s["integral_err"] = s["integral_err"] + err * DT
    i_term = (kp / max(ti, 1e-6)) * s["integral_err"]
    d_term = kp * td * ((err - s["last_err"]) / max(DT, 1e-6))
    s["last_err"] = err
    droop_feed = (droop / 100.0) * (s["n_ref"] - N0)
    gov_out = _clamp(p_term + i_term + d_term - droop_feed, -100.0, 100.0)
    s["governor_out"] = gov_out
    gate_cmd = _clamp(GATE_OPT + gov_out * 0.5, 0.0, 100.0)

    # ---- Gate actual dynamics (first-order servo valve) ----
    d_gate = (gate_cmd - gate_act) / max(TAU_SERVO, 1e-6)

    # ---- Flow target from gate curve + head ----
    q_target = Q0 * (gate_act / GATE_OPT) * math.sqrt(max(s["head_gross"], 2.0) / H0)
    dy_q = (q_target - Q) * min(1.0, DT * 5.0)

    # ---- Hydraulic losses ----
    v = Q / max(A_PEN, 1e-9)
    h_f = F_FRIC * (L_PEN / max(D_PEN, 1e-9)) * (v * v / (2.0 * g))
    # Water hammer due to flow change
    dv = (Q - s["flow_prev"]) / max(A_PEN, 1e-9)
    h_wh = -(WATER_HAMMER / g) * (dv / max(DT, 1e-6)) * 0.05
    s["h_f"] = h_f
    s["h_wh"] = h_wh

    head_net = max(2.0, s["head_gross"] - h_f + h_wh)

    # ---- Performance ----
    p_hyd = (rho * g * Q * head_net) / 1000.0
    q_ratio = max(0.1, Q / Q0)
    n_ratio = max(0.2, rpm / N0)
    eta = hill_efficiency(q_ratio, n_ratio) * 100.0
    p_mech = p_hyd * (eta / 100.0)

    # ---- Mechanical / Electrical ----
    omega = (rpm * 2.0 * math.pi) / 60.0
    torque_h = (p_mech * 1000.0) / omega if omega > 0.1 else 0.0
    torque_e = 0.0
    if s["grid_synced"]:
        p_elec = p_mech * 0.97
        torque_e = (p_elec * 1000.0) / omega if omega > 0.1 else 0.0
    else:
        # Open shaft: mechanical power = rotor inertia rate of change
        p_elec = 0.0
        friction = 0.8 * omega
        d_omega = (torque_h - friction) / J
        rpm = _clamp(rpm + d_omega * (60.0 / (2.0 * math.pi)) * DT, 0.0, RPM_TRIP + 100.0)

    sigma = thoma_number(head_net)

    s["Q"] = Q
    s["n"] = rpm
    s["gate"] = gate_act
    s["p_hyd"] = p_hyd
    s["p_mech"] = p_mech
    s["p_elec"] = p_elec
    s["eta"] = eta
    s["sigma"] = sigma
    s["torque_h"] = torque_h
    s["torque_e"] = torque_e

    # Return d/dt of each state variable:
    # y = [Q, rpm, gate_actual]
    # d(rpm)/dt = (60/(2*pi)) * d(omega)/dt
    # d_omega/dt = (torque_h - friction) / J
    d_omega_dt = (torque_h - friction) / J
    d_n_dt = (d_omega_dt * 60.0) / (2.0 * math.pi)

    return [dy_q, d_n_dt, d_gate]


def rk4_step(state, dt=DT):
    """Advance RK4 integrator by one step (dt)."""
    y = [state.Q, state.n, state.gate]
    s = {
        "kp": state.kp, "ti": state.ti, "td": state.td, "droop_pct": state.droop_pct,
        "n_ref": state.n_ref, "head_gross": state.head_gross, "running": state.running,
        "tripped": state.tripped, "grid_synced": state.grid_synced,
        "integral_err": state.integral_err, "last_err": state.last_err,
        "flow_prev": state.flow_prev,
    }
    k1 = derivatives(y, s)
    k2 = derivatives([y[0] + 0.5*dt*k1[0], y[1] + 0.5*dt*k1[1], y[2] + 0.5*dt*k1[2]], s)
    k3 = derivatives([y[0] + 0.5*dt*k2[0], y[1] + 0.5*dt*k2[1], y[2] + 0.5*dt*k2[2]], s)
    k4 = derivatives([y[0] + dt*k3[0], y[1] + dt*k3[1], y[2] + dt*k3[2]], s)
    y_new = [y[i] + (dt/6.0)*(k1[i] + 2*k2[i] + 2*k3[i] + k4[i]) for i in range(3)]
    state.Q = _clamp(y_new[0], 0.0, 2.0)
    state.n = _clamp(y_new[1], 0.0, RPM_TRIP + 100.0)
    state.gate = _clamp(y_new[2], 0.0, 100.0)
    state.t += dt
    state.flow_prev = state.Q


def compute_metrics(state):
    """Post-integrate derived metrics for telemetry."""
    state.sigma = thoma_number(state.head_gross)
    state.eta = hill_efficiency(max(state.Q, 0.01) / Q0, max(state.n, 0.01) / N0) * 100.0
    omega = (state.n * 2.0 * math.pi) / 60.0
    state.torque_h = (state.p_mech * 1000.0) / omega if omega > 0.1 else 0.0
    state.torque_e = (state.p_elec * 1000.0) / omega if (omega > 0.1 and state.grid_synced) else 0.0


# Global simulation state instance
sim = RK4State()
sim.kp = settings.GOV_KP
sim.ti = settings.GOV_TI
sim.td = settings.GOV_TD
sim.droop_pct = settings.GOV_DROOP_PCT
sim.n_ref = settings.N_DESIGN
sim.head_gross = settings.H_DESIGN
