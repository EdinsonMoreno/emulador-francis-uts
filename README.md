# Emulador Francis UTS

Simulador en tiempo real de la turbina Francis para el laboratorio de la
Unidades Tecnológicas de Santander (UTS), campus Barrancabermeja.

Replica el comportamiento hidráulico, mecánico y eléctrico de una turbina
Francis de laboratorio: caudal, velocidad, potencia, eficiencia, frecuencia
de la red, régimen de cavitación y diagrama de colina, con control por
distribuidor y regulador de velocidad.

La aplicación nace de la presentación interactiva de la Turbina Francis
(Mecánica de Fluidos, UTS). Ese proyecto aportó el modelo de física, los
motores gráficos (2D y 3D) y los modelos 3D/Sketchfab; este repositorio
los reúne bajo una arquitectura de simulación, con backend en Python (cálculo)
y frontend en TypeScript/React/Vite (interfaz), conectados por WebSocket.

## Estructura del repositorio

    Emulador Francis UTS/
    ├── docs/
    │   ├── documentation/   # Documentos originales (propuesta, guion, ficha técnica)
    │   └── SDD/             # Software Design Document
    ├── backend/             # Motor de simulación (Python: FastAPI, NumPy, SciPy)
    ├── frontend/            # Interfaz de usuario (TypeScript, React, Vite, Three.js)
    ├── shared/              # Contratos de mensajes (Pydantic ↔ TypeScript)
    ├── scripts/             # Scripts de build, utilidades y validación
    └── assets/              # Modelos 3D, gráficos, mediciones referenciales

## Requisitos

- Python 3.12+ (backend)
- Node.js 20+ / npm 10+ (frontend)
- GPU con WebGL2 (visualización 3D)

## Desarrollo

### Backend

    cd backend
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload

### Frontend

    cd frontend
    npm install
    npm run dev

## Publicación (Electron)

    npm run electron      # build + electron
    npm run dist:win      # instalador Windows portable

## División de trabajo

- **Diseño de la arquitectura:** Esteban Zuñiga
- **Física y validación:** Moncada Murcia

## Licitud

Este trabajo de grado está desarrollado por Eduard Esteban Zuñiga Peláez y
Jesús Mauricio Moncada Murcia (Tecnología en Gestión de Recursos Energéticos,
UTS campus Barrancabermeja). Este repositorio es el respaldo del emulador.

## Licencia

Licencia UTS / trabajo de grado.
