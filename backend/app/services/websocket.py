"""
WebSocket server — 30 Hz streaming telemetry to the frontend.

Fires the RK4 engine at SIMULATION_RATE_HZ, validates packets with Pydantic
TelemetryPacket, and pushes to all connected clients with a lock.
"""
import asyncio
import json
from datetime import datetime, timezone
from fastapi import WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager
from backend.app.schemas import TelemetryPacket
from backend.app.core import engine
from backend.app import config

app = None  # No app defined here; registered in main.py
ws_lock = asyncio.Lock()
clients = set()
sys_lock = asyncio.Lock()

# --- Engine state ---
sim = engine.RK4State()
sim.kp = config.settings.GOV_KP
sim.ti = config.settings.GOV_TI
sim.td = config.settings.GOV_TD
sim.droop_pct = config.settings.GOV_DROOP_PCT
sim.n_ref = config.settings.N_DESIGN
sim.head_gross = config.settings.H_DESIGN


async def _broadcast(packet):
    """Send packet to all connected clients (fire-and-forget)."""
    payload = packet.model_dump(mode="json")
    payload["t"] = packet.t
    payload["last_update"] = packet.last_update
    payload["running"] = sim.running
    payload["tripped"] = sim.tripped
    payload["grid_synced"] = sim.grid_synced
    text = json.dumps(payload, ensure_ascii=False)
    if clients:
        await asyncio.gather(*(client.send_text(text) for client in clients), return_exceptions=True)


async def _sim_loop():
    """Continuous RK4 integration at 30 Hz."""
    while True:
        try:
            engine.rk4_step(sim)
            engine.compute_metrics(sim)
            packet = TelemetryPacket(
                t=sim.t,
                rpm=sim.n, gate_actual=sim.gate, flow=sim.Q,
                head_net=sim.head_gross, head_gross=sim.head_gross,
                power_mech=sim.p_mech, power_elec=sim.p_elec,
                efficiency=sim.eta, head_loss=sim.h_f, waterhammer=sim.h_wh,
                swirl_vel=0.0, euler_head=0.0, peripheral_vel=0.0,
                torque_hydraulic=sim.torque_h, torque_electrical=sim.torque_e,
                thoma=sim.sigma, critical_thoma=config.settings.SIGMA_CRIT,
                is_cavitating=sim.sigma < config.settings.SIGMA_CRIT,
                governor_out=sim.governor_out,
                kp=sim.kp, ti=sim.ti, td=sim.td, droop_pct=sim.droop_pct,
                running=sim.running, tripped=sim.tripped,
                grid_synced=sim.grid_synced,
                last_update=datetime.now(timezone.utc),
            )
            await _broadcast(packet)
        except Exception as e:
            print(f"[WS] sim-loop error: {e}")
        await asyncio.sleep(1.0 / config.settings.SIMULATION_RATE_HZ)


async def ws_endpoint(websocket: WebSocket):
    """Accept and maintain a WebSocket connection for telemetry."""
    await websocket.accept()
    async with ws_lock:
        clients.add(websocket)
    try:
        await asyncio.sleep(0.3)
        await _broadcast(TelemetryPacket(
            t=sim.t, rpm=sim.n, gate_actual=sim.gate, flow=sim.Q,
            head_net=sim.head_gross, head_gross=sim.head_gross,
            power_mech=sim.p_mech, power_elec=sim.p_elec,
            efficiency=sim.eta, head_loss=sim.h_f, waterhammer=sim.h_wh,
            swirl_vel=0.0, euler_head=0.0, peripheral_vel=0.0,
            torque_hydraulic=sim.torque_h, torque_electrical=sim.torque_e,
            thoma=sim.sigma, critical_thoma=config.settings.SIGMA_CRIT,
            is_cavitating=sim.sigma < config.settings.SIGMA_CRIT,
            governor_out=sim.governor_out, kp=sim.kp, ti=sim.ti,
            td=sim.td, droop_pct=sim.droop_pct, running=sim.running,
            tripped=sim.tripped, grid_synced=sim.grid_synced,
            last_update=datetime.now(timezone.utc),
        ))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        async with ws_lock:
            clients.discard(websocket)
