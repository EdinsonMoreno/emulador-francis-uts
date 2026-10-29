"""Configuration Settings — Francis UTS Emulator Backend.

Disclosure: all credentials/secrets redacted. No secrets are stored.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Francis UTS SCADA"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WS_PORT: int = 8001

    # Simulation
    SIMULATION_RATE_HZ: int = 30   # telemetry rate
    DT_SEC: float = 1.0 / 30.0     # RK4 step

    # Hydraulic model coefficients (Francis turbine F-DC-124 family)
    RHO_WATER: float = 998.2         # kg/m³ @ 20 °C
    G_ACCEL: float = 9.81            # m/s²
    H_DESIGN: float = 35.0           # m design head
    Q_DESIGN: float = 0.85           # m³/s design flow
    N_DESIGN: float = 1300.0         # rpm synchronous speed
    ETA_MAX: float = 0.92            # max total efficiency
    GATE_OPT: float = 65.0           # optimum gate opening (%)
    J_INERTIA: float = 42.5          # turbine runner inertia (kg·m²)
    TAU_SERVO: float = 0.8           # servo valve time constant (s)
    PENSTOCK_L: float = 120.0        # penstock length (m)
    PENSTOCK_D: float = 0.75         # penstock diameter (m)
    PENSTOCK_A: float = 0.4418       # penstock flow area (m²)
    FRICTION_F: float = 0.018        # Darcy–Weisbach friction factor
    WATER_HAMMER_A: float = 1100.0   # water hammer wave speed (m/s)
    H_ATM: float = 10.33             # atmospheric pressure head (m)
    H_V: float = 0.25                # vapor pressure head (m)
    H_S: float = 1.5                 # saturation/cavitation head (m)
    SIGMA_CRIT: float = 0.115        # critical Thoma number
    RPM_TRIP: float = 1850.0         # emergency overspeed trip threshold (rpm)

    # Governor PID
    GOV_KP: float = 3.5
    GOV_TI: float = 1.8
    GOV_TD: float = 0.2
    GOV_DROOP_PCT: float = 4.0

    # Alarm (ISA-18.2) thresholds and constraints
    MIN_SIGMA_ALARM: float = 0.15    # sigma below this => cavitation warning
    N_TOO_HIGH: float = 1350.0       # rpm above this => warning
    H_TOO_LOW: float = 12.0          # head below this => warning
    Q_TOO_HIGH: float = 1.10         # flow above this => warning

    # Pydantic / OpenAPI
    API_V1_STR: str = "/api/v1"
    DOCS_URL: str = "/docs"
    REDOC_URL: str = "/redoc"

    @field_validator("PENSTOCK_A", mode="before")
    @classmethod
    def _penstock_area(cls, v):
        # A = pi * D^2 / 4
        if v is None or v <= 0:
            return 3.141592653589793 * (0.75 ** 2) / 4.0
        return v


settings = Settings()
