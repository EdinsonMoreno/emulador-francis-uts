# Francis UTS — SCADA Mockup v3.0

Mockup interactivo modular del emulador SCADA para turbina Francis.
Parte del TG "Emulador Francis UTS" — UTS Barrancabermeja.

## Estructura

```
mockup/
├── index.html              # Punto de entrada (ábrelo en navegador)
├── css/
│   ├── design-system.css   # Tokens, reset, animaciones
│   └── components.css      # Glass, KPIs, switches, sliders, botones
├── js/
│   ├── config.js           # Constantes físicas, estados, enums
│   ├── store.js            # Estado centralizado pub/sub
│   ├── engine.js           # Motor físico (30 Hz, torque fenomenológico)
│   ├── engine-3d.js        # Three.js — turbina Francis procedural
│   ├── api.js              # Mock loop ↔ WebSocket backend
│   ├── charts.js           # uPlot + hill chart Canvas 2D
│   ├── ui.js               # 9 vistas, KPIs, P&ID, synchroscope
│   ├── controls.js         # Sliders, teclado, escenarios, CSV
│   └── app.js              # Orquestador
├── archive/                # Versiones anteriores (v2, V2pro, v5, ultimate)
└── README.md
```

## Cómo ejecutar

```bash
# Opción 1: HTTP local
cd frontend/mockup
python3 -m http.server 8080
# Abre http://localhost:8080

# Opción 2: Doble clic en index.html (funciona desde file://)
```

## Vistas

| Vista | Descripción |
|---|---|
| Monitor | 3D preview + control rápido + mini charts |
| Vista 3D | Escena completa, capas, cámaras, telemetría |
| P&ID | Diagrama ISA-5.1 con instrumentación viva |
| Gobernador HMI | PID, sinconoscopio, servo-actuador |
| Tendencias | 3 gráficas uPlot (rpm, potencia, caudal) |
| Hill Chart | Mapa de eficiencia Canvas 2D (escala viridis) |
| Dimensionamiento | Cálculo de nₛ, diámetros, clasificación |
| Alarmas | Registro ISA 18.2 con filtro por prioridad |
| Prácticas | Escenarios: arranque, rechazo carga, barrido, cavitación |

## Atajos de teclado

| Tecla | Acción |
|---|---|
| `Espacio` | Arrancar / Parar |
| `S` | Sincronizar |
| `P` | Disparo de emergencia |
| `A` | Modo AUTO |
| `M` | Modo MANUAL |
| `T` | Toggle tema claro/oscuro |
| `R` | Reset simulación |
| `1`–`9` | Cambiar vista |
| `Escape` | Cerrar modales |

## API Backend

El mockup funciona 100% autónomo con motor físico local.
Para conectar al backend FastAPI:

```bash
# En la raíz del repo
cd backend
uvicorn app.main:app --reload
```

El mockup detecta automáticamente el WebSocket en `ws://localhost:8000/ws`
y conmuta de mock a datos reales.

## Stack

- Three.js r128 (CDN)
- uPlot 1.6.24 (CDN)
- Tailwind CSS JIT (CDN)
- Font Awesome 6.4 (CDN)
- Google Fonts: Inter + JetBrains Mono
- JavaScript vanilla (IIFE, sin bundler)

## Estado

- [x] 9 vistas funcionales
- [x] Motor físico determinista 30 Hz
- [x] Turbina 3D procedural con voluta espiral
- [x] PID P+I+D+droop con anti-windup
- [x] 4 escenarios de práctica
- [x] Exportación CSV
- [x] Alarmas ISA 18.2 con sonido
- [x] Tema claro/oscuro persistente
- [x] Capa API conmutable mock/backend
- [ ] Tests (pendiente)
- [ ] Conexión backend real (pendiente)