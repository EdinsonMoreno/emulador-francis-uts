"""
FastAPI + WebSocket main entry point for Francis UTS emulator backend.
Runs on 127.0.0.1:8000 with a 30 Hz WebSocket telemetry stream.
"""
import math
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from backend.app.services import websocket as ws
from backend.app import config
from backend.app.core import engine

app = FastAPI(
    title=config.settings.APP_NAME,
    version="2.0.0",
    docs_url=config.settings.DOCS_URL,
    redoc_url=config.settings.REDOC_URL,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register WebSocket endpoint
app.websocket("/ws")(ws.ws_endpoint)

@app.on_event("startup")
async def startup_event():
    print(f"=== {config.settings.APP_NAME} v2.0.0 ===")
    print(f"  Rate: {config.settings.SIMULATION_RATE_HZ} Hz (dt={config.settings.DT_SEC}s)")
    print(f"  Design: H0={config.settings.H_DESIGN}m, Q0={config.settings.Q_DESIGN}m³/s, N0={config.settings.N_DESIGN}rpm")
    print(f"  Runner: D1={engine.D1:.3f}m, D2={engine.D2:.3f}m, U1={engine.U1:.2f}m/s")
    print(f"  Governor: Kp={config.settings.GOV_KP}, Ti={config.settings.GOV_TI}s, Td={config.settings.GOV_TD}s, Droop={config.settings.GOV_DROOP_PCT}%")
    print(f"  Sigma critical: {config.settings.SIGMA_CRIT}")
    print("  WebSocket  ws://127.0.0.1:8000/ws")
    print("  REST       GET /health, /api/v1/summary, /api/v1/dimensioning")
    for _ in range(5):
        engine.rk4_step(engine.sim)
    engine.compute_metrics(engine.sim)
    print(f"  Initial state: rpm={engine.sim.n:.1f}, Q={engine.sim.Q:.4f} m³/s, "
          f"eta={engine.sim.eta:.1f}%, sigma={engine.sim.sigma:.4f}")

@app.get("/health", response_model=dict)
async def health():
    return {
        "status": "ok",
        "app": config.settings.APP_NAME,
        "rate_hz": config.settings.SIMULATION_RATE_HZ,
        "timestamp": engine.sim.t if engine.sim else "n/a",
    }

@app.get("/api/v1/summary")
async def summary():
    engine.compute_metrics(engine.sim)
    return {
        "rpm": round(engine.sim.n, 1),
        "gate_actual": round(engine.sim.gate, 1),
        "flow": round(engine.sim.Q, 4),
        "head_net": round(engine.sim.head_gross, 2),
        "power_mech": round(engine.sim.p_mech, 2),
        "power_elec": round(engine.sim.p_elec, 2),
        "efficiency": round(engine.sim.eta, 1),
        "thoma": round(engine.sim.sigma, 4),
        "is_cavitating": engine.sim.sigma < config.settings.SIGMA_CRIT,
        "tripped": engine.sim.tripped,
        "grid_synced": engine.sim.grid_synced,
        "t": round(engine.sim.t, 2),
    }

@app.get("/api/v1/dimensioning")
async def dimensioning(head_design: float = 35.0, flow_design: float = 0.85,
                         speed_sync: float = 1300.0, target_eta: float = 92.0):
    eta = target_eta / 100.0
    ns = speed_sync * (flow_design ** 0.5) / (head_design ** 1.25)
    D1 = 84.5 * (head_design ** 0.5) / speed_sync
    D2 = D1 * 0.82
    V1 = (math.pi * D1 * speed_sync) / 60.0
    Vw1 = (9.81 * head_design * eta) / V1
    He = (V1 * Vw1) / 9.81
    cls = "Francis normal"
    if ns > 250: cls = "Radial / mixed (low ns)"
    elif ns < 100: cls = "Pelton / high ns"
    return {
        "specific_speed": round(ns, 1),
        "runner_d1": round(D1, 3),
        "runner_d2": round(D2, 3),
        "peripheral_velocity": round(V1, 2),
        "whirl_velocity": round(Vw1, 2),
        "euler_head": round(He, 2),
        "classification": cls,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=config.settings.HOST,
                port=config.settings.PORT, reload=config.settings.DEBUG)
