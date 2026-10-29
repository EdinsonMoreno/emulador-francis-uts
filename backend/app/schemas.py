"""Pydantic v2 schemas — request/response validation for the SCADA backend.

All numeric fields carry physical bounds to reject impossible values before
they reach the RK4 integrator.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional
from datetime import datetime


# ---------------------------------------------------------------- GPU / Hydraulic
class GateCommand(BaseModel):
    opening: float = Field(65.0, ge=0.0, le=100.0, description="Distribuidor opening %")
    target_head: float = Field(35.0, ge=2.0, le=80.0, description="Gross head H0 (m)")

    @field_validator("opening")
    @classmethod
    def _clamp_opening(cls, v):
        return max(0.0, min(100.0, v))


class RunnerSpeedRef(BaseModel):
    rpm: float = Field(1300.0, ge=100.0, le=1850.0, description="Speed reference n* (rpm)")


class TurbineCommands(BaseModel):
    """All control inputs sent by the client at any time."""
    gate: Optional[GateCommand] = None
    speed_ref: Optional[RunnerSpeedRef] = None
    head: Optional[float] = Field(None, ge=2.0, le=80.0, description="Gross head setpoint (m)")
    governor: Optional[dict] = None  # PID coefficients override


class GovernorParams(BaseModel):
    kp: float = Field(3.5, ge=0.1, le=20.0, description="Proportional gain")
    ti: float = Field(1.8, ge=0.1, le=10.0, description="Integral time constant (s)")
    td: float = Field(0.2, ge=0.0, le=2.0, description="Derivative time constant (s)")
    droop_pct: float = Field(4.0, ge=0.5, le=15.0, description="Speed droop (%)")


# ---------------------------------------------------------------- Online telemetry
class HydraulicState(BaseModel):
    head_net: float = Field(..., ge=2.0, description="Net head after losses (m)")
    head_waterhammer: float = Field(..., ge=-8.0, le=8.0, description="Water hammer head (m)")
    v_penstock: float = Field(..., ge=0.0, description="Penstock flow velocity (m/s)")
    friction_head_loss: float = Field(..., ge=0.0, description="Friction loss (m)")


class RunnerState(BaseModel):
    rpm: float = Field(..., ge=0.0, le=2000.0, description="Runner rotational speed (rpm)")
    gate_actual: float = Field(..., ge=0.0, le=100.0, description="Actual gate opening (%)")
    torque_hydraulic: float = Field(..., ge=0.0, description="Hydraulic torque (N·m)")
    torque_electrical: float = Field(..., ge=0.0, description="Electrical torque (N·m)")


class PerformanceParams(BaseModel):
    flow: float = Field(..., ge=0.0, description="Volumetric flow (m³/s)")
    head: float = Field(..., ge=2.0, description="Net head (m)")
    efficiency: float = Field(..., ge=0.0, le=100.0, description="Total efficiency (%)")
    eta_hydraulic: float = Field(..., ge=0.0, le=100.0, description="H dye-line efficiency (%)")
    swirl_velocity: float = Field(..., ge=0.0, description="Whirl velocity at runner inlet (m/s)")
    euler_head: float = Field(..., ge=0.0, description="Euler head (m)")
    runner_diameter: float = Field(..., ge=0.1, description="Runner inlet diameter (m)")
    peripheral_velocity: float = Field(..., ge=0.0, description="Periferal blade velocity U1 (m/s)")


class CavitationState(BaseModel):
    thoma: float = Field(..., ge=0.0, le=1.0, description="Thoma sigma number")
    critical_thoma: float = Field(..., ge=0.0, le=1.0, description="Critical sigma (threshold)")
    is_cavitating: bool = Field(False, description="Cavitation active flag")


class SystemState(BaseModel):
    running: bool = True
    tripped: bool = Field(False, description="Emergency trip state")
    grid_synced: bool = Field(False, description="Grid coupler state")
    last_update: datetime = None
    t: float = Field(0.0, ge=0.0, description="Simulation time (s)")


# ---------------------------------------------------------------- Telemetry packet
class TelemetryPacket(BaseModel):
    """Single 30 Hz telemetry frame emitted over the WebSocket."""
    t: float
    rpm: float
    gate_actual: float
    flow: float
    head_net: float
    head_gross: float
    power_mech: float
    power_elec: float
    efficiency: float
    head_loss: float
    waterhammer: float
    swirl_vel: float
    euler_head: float
    peripheral_vel: float
    torque_hydraulic: float
    torque_electrical: float
    thoma: float
    critical_thoma: float
    is_cavitating: bool
    governor_out: float
    kp: float
    ti: float
    td: float
    droop_pct: float
    running: bool
    tripped: bool
    grid_synced: bool
    last_update: datetime

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# ---------------------------------------------------------------- API
class HealthResponse(BaseModel):
    status: str = "ok"
    app: str
    timestamp: datetime


class SystemSummary(BaseModel):
    rpm: float
    gate_actual: float
    flow: float
    head_net: float
    power_mech: float
    power_elec: float
    efficiency: float
    thoma: float
    is_cavitating: bool
    tripped: bool
    grid_synced: bool
    t: float
    last_update: datetime


class DimensioningRequest(BaseModel):
    head_design: float = Field(..., ge=2.0, le=100.0, description="Design head (m)")
    flow_design: float = Field(..., ge=0.05, le=5.0, description="Design flow (m³/s)")
    speed_sync: float = Field(..., ge=100.0, le=3000.0, description="Synchronous speed (rpm)")
    target_eta: float = Field(..., ge=0.0, le=100.0, description="Target efficiency (%)")


class DimensioningResponse(BaseModel):
    specific_speed: float
    runner_d1: float
    runner_d2: float
    peripheral_vel: float
    whirl_vel: float
    euler_head: float
    classification: str


class LabScenarioRequest(BaseModel):
    scenario: Literal["startup", "load_rejection", "cavitation", "trip"]


class AlarmRecord(BaseModel):
    time: str
    severity: Literal["CRITICAL", "WARNING", "INFO"]
    code: str
    message: str
    acknowledged: bool = False
