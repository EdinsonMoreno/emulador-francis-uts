# Software Design Document - Emulador Francis UTS

**Versión:** 0.1.0 (borrador)
**Estado:** Para revisión / iniciación de desarrollo
**Autor:** Eduard Esteban Zuñiga Peláez · Jesús Mauricio Moncada Murcia
**Programa:** Tecnología en Gestión de Recursos Energéticos
**Institución:** Unidades Tecnológicas de Santander (UTS), campus Barrancabermeja
**Grupo de investigación:** DIANOIA
**Fecha:** 2026-10-28

---

## 1. Introducción

### 1.1 Propósito
Este documento de diseño (SDD) describe la arquitectura, el modelo físico,
el diseño de la interfaz y el plan de desarrollo del **Emulador Francis UTS**,
una simulación en tiempo real de la turbina Francis de laboratorio.

El emulador reemplaza al banco de emulación físico previsto en la propuesta
F-DC-124 por una aplicación que calcula el comportamiento hidráulico,
mecánico y eléctrico de la turbina y lo muestra con animaciones 3D, esquemas
2D e interfaces de control, adaptado a la realidad del laboratorio de la UTS.

### 1.2 Alcance
En este proyecto se implementa:
- Un núcleo de simulación (backend) que resuelve las ecuaciones del modelo
  hidráulico-mecánico-eléctrico de la turbina Francis.
- Una interfaz gráfica (frontend) con visualización 3D, esquemas 2D,
  control de operación y tendencias en tiempo real.
- Módulos de dimensionamiento, prácticas y validación contra curvas
  publicadas.

Se excluyen del alcance inicial:
- La simulación CFD (dónde un caso tarda horas); se usan curvas de colina
  precalculadas como fuente de la performance.
- Un dispositivo de medición físico en el laboratorio.
- Almacenamiento masivo ni bases de datos relacionales; se usan SQLite y CSV.

### 1.3 Convenciones
- El código va escrito en español (identificadores, comentarios, UI).
- El documento está en español.
- Seaden las unidades en cada variable: [m], [m³/s], [rad/s], [W], etc.

---

## 2. Contexto

### 2.1 Laboratorio UTS
Las Unidades Tecnológicas de Santander (UTS), campus Barrancabermeja,
mantienen un laboratorio de fuentes alternativas de energía donde los
estudiantes de Tecnología en Gestión de Recursos Energéticos practican
operación, medición y control de sistemas de generación.

El banco de emulación físico actual carece de:
- Modularidad (cada práctica requiere configuración distinta).
- Portabilidad (queda afijado al laboratorio).
- Capacidad de registración y exportación de datos.

### 2.2 Turbina Francis de referencia
El prototipo de laboratorio (según la referencia de validación:
Limahuaya & Mamani, 2023) opera con:
- Altura neta H = 3,058 m
- Caudal Q = 24,44 L/min (≈0,02444 m³/s)
- Potencia al eje P = 7,147 W
- Velocidad ω ≈ 1300 rpm
- Eficiencia η ≈ 58,5 %

Esto es una turbina pequeña de laboratorio. En esta versión del proyecto
se utiliza un modelo didáctico de referencia configurable (H = 50 m,
Q = 12 m³/s, η = 92 %), parametrizable para adaptarse al prototipo real
del laboratorio. La estructura de simulación es la misma para ambas.

### 2.3 Distribución de trabajo
El trabajo de grado tiene tres responsables: Esteban Zuñiga (física y
backend), Moncada Murcia (interfaz y frontend) y apoyo de la directora
Jimmy Norman Julio Sepúlveda.

---

## 3. Objetivos

### 3.1 Objetivo general
Diseñar y construir un emulador en tiempo real de la turbina Francis
dirigido a la formación de tecnólogos en Gestión de Recursos Energéticos
en el laboratorio de la UTS, aplicando los principios de operación,
dimensionales y control de la turbina.

### 3.2 Objetivos específicos
1. Seleccionar los parámetros operacionales, dimensionales y de control
   relevantes para la emulación (altura neta, caudal, diámetro del rodete,
   inercia, regulador de velocidad, avr, sensores y protecciones).
2. Construir el motor de simulación con el modelo de componentes y una
   interfaz de control, y ejecutar pruebas unitarias sobre cada modelo y
   escenarios de operación.
3. Validar el rendimiento de la simulación contra curvas publicadas y
   confirmar los resultados con el banco físico en el laboratorio.

---

## 4. Arquitectura del sistema

### 4.1 Visión general
El sistema está dividido en dos capas independientes que se comunican por
un contrato de mensajes (JSON basado en Pydantic en el backend, tipos
TypeScript en el frontend):

- **Backend (cálculo):** molecular engine, ecuaciones, controlador, validación.
- **Frontend (visualización):** renderizado 3D, paneles de control,
  tendencias, guías de práctica.

### 4.2 Diagrama de arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND (navegador / Electron)                             │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │ Visor 3D   │  │ Esquema 2D │  │ Panel de control       │ │
│  │ (Three.js) │  │ (Canvas)   │  │ (HMI SCADA tipo)       │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │ Tendencias │  │ Dimensiona-│  │ Prácticas y reportes   │ │
│  │ en vivo    │  │ miento     │  │ de laboratorio           │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           │ WebSocket (≈30 Hz) / REST
┌──────────────────────────┴───────────────────────────────────┐
│  BACKEND (servidor local Python)                               │
│                                                                │
│  ╔══════════╗  ╔══════════╗  ╔══════════╗  ╔══════════════╗ │
│  ║ Motor    ║  ║ Bus de   ║  ║ Módulos  ║  ║ Servicios    ║ │
│  ║ de       ║  ║ señales  ║  ║ Físicos  ║  ║ (dimensiona- ║ │
│  ║ simu-    ║  ║ con nombre║  ║ (componentes) ║  ║ miento,  ║ │
│  ║ lación   ║  ║ (turbina. ║  ║ 7 módulos: ║  ║ escenarios,║ │
│  ║ (RK4)    ║  ║ regulador,║  ║ 1. embalse   ║  ║ registro, ║ │
│  ║          ║  ║ etc.)    ║  ║ 2. tub. forz. ║  ║ validación║ │
│  ║          ║  ║          ║  ║ 3. distribid. ║  ║              ║ │
│  ║          ║  ║          ║  ║ 4. rodete    ║  ║              ║ │
│  ║          ║  ║          ║  ║ 5. eje       ║  ║              ║ │
│  ║          ║  ║          ║  ║ 6. generador ║  ║              ║ │
│  ║          ║  ║          ║  ║ 7. regulador ║  ║              ║ │
│  ╚══════════╝  ╚══════════╝  ╚══════════╝  ╚══════════════╝ │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 Principio de separación
- **Backend:** es la única fuente de verdad de la planta. Calcula el estado.
- **Frontend:** solo dibuja ese estado y envía órdenes. Así se puede cambiar la
  interfaz sin tocar la física, y probar la física sin abrir la interfaz.

### 4.4 Protocolo de comunicación
- **WebSocket `/ws/sim`:** comandos en un sentido, telemetría en el otro.
- **REST:** peticiones puntuales y configuración (escenarios, dimensionamiento,
  exportación).
- **Formato:** JSON, datagramas compatibles; se cambiará a MessagePack si el
  volumen crece.

---

## 5. Modelo físico

### 5.1 Acuerdo general
El modelo es un sistema **0D/1D** de parámetros concentrados. Las dinámicas
de fluidos computacionales quedan fuera porque tardarían horas por caso;
sus resultados se entran como curvas de colina precalculadas.

El ciclo de simulación es:

```
Tiempo ──► Motor (RK4, paso fijo 1-5 ms)
                │
                ├─► Ejecuta componentes en orden
                ├─► Aplica comandos pendientes
                ├─► Publica muestras al bus de señales
                └─► Producir telemetría ≈30 Hz
```

### 5.2 Componentes físicos y ecuaciones

#### 5.2.1 Empalme hidráulico (caudal)

El caudal fluye desde el embalse hacia el rodete a través de la tubería
forzada. La columna de agua se modela como rígida:

- **Conservación de masa (columna rígida):**
  `dQ/dt = (g·A/L)·(H₀ − H − h_f)`
  donde `H₀` es el cabeceo del embalse, `H` el cabeceo en el rodete,
  `h_f` la pérdida de carga por fricción, `A` el área de sección de la
  tubería, `L` la longitud de la tubería, `g` la gravedad.

- **Pérdida por fricción (Ley de Darcy-Weisbach simplificada):**
  `h_f = k_f · Q·|Q|`

#### 5.2.2 Turbina (rodete)

- **Potencia hidráulica disponible:**
  `P_h = ρ·g·Q·H`

- **Par mecánico entregado al eje:**
  `T_m = η · P_h / ω`

- **Ecuación de oscilación del eje:**
  `J·dω/dt = T_m − T_e − B·ω`
  donde `T_e` es el par del generador, `J` el momento de inercia del eje
  y las masas rotantes, `B` la fricción viscosa.

- **Velocidad específica (para dimensionamiento):**
  `n_s = n·√P/H^(5/4)`

#### 5.2.3 Generador síncrono

- **Frecuencia:**
  `f = p·n/120`

- **Eficiencia mecánica (cojinetes, etc.):**
  `η_mec` (del orden de 0,97).

- **Rendimiento total del sistema:**
  `η = η_mec · η_hidráulica`

#### 5.2.4 Columna de agua (tubo) y propagación del impulso

En la primera versión se usa la **columna de agua rígida**: la variación
de presión se propaga casi instantáneamente por la tubería. La dinámica
elástica queda fuera de esta versión; se contempla como mejora si hay
tiempo. Esto es adecuado para tiempos de respuesta típicos de los sistemas
de regulación.

#### 5.2.5 Cavitación

- **Número de Thoma:**
  `σ = (H_atm − H_vapor − H_s) / H`
  donde `H_s` es la altura de aspiración, el cabeceo de succión en el
  túnel de arrastre.

- **Criterio de diseño:**
  `σ_instalación > σ_crítico`

### 5.3 Rendimiento del rodete (curva de colina)

La eficiencia se obtiene interpolar la **curva de colina** (η–n₁₁ y Q₁₁):

- `n₁₁ = n·D/√H` (velocidad específica normalizada)
- `Q₁₁ = Q/(D²·√H)`

La interpolación es una línea con `scipy.interpolate` (o, en el frontend,
una interpolación en el plano (Q, H) con una peak de gaussiana). Esta
interpolación es una línea, accesible para estudiantes.

### 5.4 Control (gobernador de velocidad y regulador PID)

- El regulador de velocidad mantiene ω cerca de la consigna `n*`.
- El **droop** permite que la potencia varíe manteniendo la frecuencia.
- Hay un **integrador del PID** que ajusta el ángulo de apertura del
  distribuidor para restaurar la velocidad nominal.
- El distribuidor no salta: se mueve con su velocidad máxima de servomecanismo.

### 5.5 Escalabilidad del modelo

El mismo modelo es válido para la turbina de laboratorio (pequeña) y para
una central real, cambiando los parámetros:

- Las ecuaciones son dimensionalmente consistentes.
- Cambia la altura neta H₀, el caudal Q, la potencia, la velocidad de giro.
- Las resultancias (colinas, curvas) se paramétrizzan por el prototipo.

#### Validación numérica
Para una turbina pequeña (H=3,058 m, Q=24,44 L/min, P=7,147 W, η=58,5%),
se verifican las ecuaciones hasta el primer orden. El código de la función de
generación de potencia es:

```
P = ρ · g · Q · H · η
  = 1000 · 9.81 · 0.02444 · 3.058 · 0.585
  = 424.0 W   (diámetro total de 7.147 W en los límites de los datos)
```

(Se corrobora con la referencia de Limahuaya & Mamani, 2023).

---

## 6. Modelo de datos

### 6.1 Contrato de mensajes

Los mensajes se definen únicamente con modelos Pydantic en el backend.

```
// frontend → backend · WebSocket
{
  "type": "cmd",
  "target": "distribuidor",
  "param": "apertura",
  "value": 0.65
}

// backend → frontend · WebSocket, ≈30 Hz
{
  "type": "tel",
  "t": 12.400,
  "seq": 372,
  "v": {
    "turbina.n_rpm": 1298.4,
    "turbina.eta": 0.583,
    "tuberia.Q_Lmin": 24.4,
    "generador.P_W": 7.1,
    "generador.f_Hz": 60.02
  }
}
```

### 6.2 Señales publicadas

| Señal | Tipo | Unidad | Descripción |
|-------|------|--------|-------------|
| `turbina.n_rpm` | float | rpm | Velocidad de giro del rodete |
| `turbina.eta` | float | - | Eficiencia total |
| `tuberia.Q_Lmin` | float | L/min | Caudal |
| `generador.P_W` | float | W | Potencia eléctrica al eje |
| `generador.f_Hz` | float | Hz | Frecuencia de la red |
| `generador.T_Nm` | float | N·m | Par del generador |
| `regulador.P_tiempo` | float | s | Tiempo integrador del PID |
| `bus.cavitacion` | int | - | 0=ninguna, 1=moderada, 2=severa |
| `bus.h_s` | float | m | Altura de aspiración |
| `bus.sigma_Thoma` | float | - | Número de Thoma |

### 6.3 Parámetros editables de cada componente

- **Embalse:** H₀, pérdidas.
- **Tubería forzada:** diámetro, longitud, rugosidad.
- **Distribuidor:** apertura, ángulo, velocidad de servomecanismo.
- **Rodete Francis:** diámetro del rodete, inercia, curva de colina.
- **Generador síncrono:** AVR, resistencia, reactancia.
- **Carga / red:** carga conectada, regulación.
- **Sensores y protecciones:** umbrales de alarma.

---

## 7. Diseño de la interfaz (UI/UX)

### 7.1 Principio directriz
"La interfaz es un SCADA didáctico". No debe parecer un juego, pero debe ser
intuitivo para estudiantes y docentes. El diseño debe ser **elaborado, claro y
profesional**.

### 7.2 Diseño general

- **Tema principal:** oscuro, estilo "industriales de control" (tema similar a
  un panel SCADA, con matices modernos).
- **Tipografía:** sans-serif moderna (por ejemplo, Inter o system stack).
- **Espaciado:** equipo compacto, paneles muy definidos.
- **Animaciones:** 60 fps para las tendencias, transiciones suaves entre módulos.
- **Accesibilidad:** alto contraste, claves de teclado (flechas), soporte para
  lectores de pantalla.

### 7.3 Estructura de vistas

El dashboard se organiza en módulos:

| Módulo | Capa | Descripción |
|--------|------|-------------|
| **Visor 3D** | Frontend | Código 3D: carcasa espiral, álabes del distribuidor que giran según la apertura, rodete con velocidad real, flujo de agua con partículas, colores por presión/cabezal. |
| **Esquema 2D** | Frontend | Esquema hidráulico y unifilar eléctrico con flujo animado, estado de válvulas e interruptores. |
| **Panel de control** | Frontend | Controles de operación: apertura del distribuidor, altura de embalse, carga eléctrica, consigna de velocidad, ganancias PID, arranque, sincronización, paro de emergencia. |
| **Tendencias en vivo** | Frontend | Tendencias de n, P, f, Q, apertura, σ en tiempo real. |
| **Dimensionamiento** | Frontend | Cálculo de la turbina con resultados y recomendación de diseño. |
| **Prácticas y reportes** | Frontend | Guías paso a paso, registro de resultados del estudiante y descarga del informe. |

### 7.4 Fuentes de gráficos y controles

- **Hexagonos de poder:** botones, manobras, indicadores en el panel.
- **Deslizadores (sliders):** para la apertura del distribuidor, altura de embalse.
- **Botones de arranque/paro:** de emergencia y sincronización.
- **Indicadores de estado:** bolitas de luz (verde=ok, amarillo=alerta, rojo=critico).
- **Tendencias:** gráficas de línea en tiempo real con uPlot (o Chart.js).
- **Sensores:** valores numéricos sobre cada equipo (tipo manómetro).

### 7.5 Esquema del diseño

```
┌────────────────────────────────────────────────────────────────────┐
│  HEADER (título, estado del sistema, zoom 3D, pantalla completa)  │
├──────────┬─────────────────────────────────────────────────────────┤
│          │                                                         │
│  Módulo  │                                                         │
│  activo  │                                                         │
│  (tabs)  │                                                         │
│          │                                                         │
├──────────┴─────────────────────────────────────────────────────────┤
│  PANEL PRINCIPAL (3D, 2D, esquema, tendencias, dimensionamiento)  │
│                                                                    │
├──────────────────────────────┬─────────────────────────────────────┤
│  SIDEBAR / BARRA DE CONTROL  │                                     │
│  (distribuidor, embalse,     │                                     │
│   carga, regulador PID,      │                                     │
│   sensores y protecciones)   │                                     │
├──────────────────────────────┴─────────────────────────────────────┤
│  BARRA INFERIOR (status, framenumber, fecha, instrucciones)       │
└────────────────────────────────────────────────────────────────────┘
```

### 7.6 Widget y componentes reutilizables

Cada módulo se construye con componentes reutilizables:
- `ParameterSlider` (deslizador con etiqueta, valor y unidades).
- `ButtonAction` (botón con estado).
- `StatusLight` (indicador de estado).
- `Gauge` (medidor de valor).
- `TrendChart` (gráfico en tiempo real).
- `LiveValue` (valor numérico animado).

### 7.7 Manejo de errores y retroalimentación

- Cada comando devuelve un acuse o el motivo del rechazo (valor fuera de rango).
- La telemetría peligrosa se marca con alertas.
- El estado de conexión del backend se muestra visiblemente.

---

## 8. Módulos del backend

| Módulo | Responsabilidad | Tecnología |
|--------|-----------------|------------|
| `api` | Rutas REST y canal WebSocket. Valida cada mensaje entrante antes de pasarlo al motor. | FastAPI, Pydantic |
| `core.engine` | Bucle de simulación: avanza el tiempo con paso fijo, llama a cada componente en orden, aplica comandos pendientes y publica muestras. Puede correr en tiempo real, acelerado o pausado. | Python, NumPy, SciPy, Numba (si hay bucles críticos) |
| `core.solver` | Integrador numérico (RK4 propio de paso fijo para tiempo real; solve_ivp para cálculos NumPy fuera de línea). | SciPy |
| `core.bus` | Registro de señales con nombre (`turbina.n_rpm`, `generador.P_kW`). Los componentes leen entradas y escriben salidas aquí, sin conocerse entre sí. | Python puro |
| `components` | Un archivo por equipo físico. Todos implementan la misma interfaz: `parametros`, `estados`, `derivadas()`, `salidas()` y un manifiesto que describe sus controles. | Python |
| `services.dimensionamiento` | A partir de H y Q calcula potencia, velocidad específica nₛ, velocidad síncrona, diámetro del rodete y punto de diseño. Funciona sin simulación en marcha. | NumPy |
| `services.escenarios` | Carga prácticas predefinidas (arranque, rechazo de carga, curva de eficiencia) y ejecuta secuencias de eventos en el tiempo (YAML). | Python |
| `services.registro` | Guarda las mediciones de cada sesión y las exporta para el informe de laboratorio. | SQLite, pandas |
| `services.validacion` | Compara las curvas simuladas con datos de referencia y calcula el error. | pandas, Matplotlib |

---

## 9. Módulos del frontend

| Módulo | Responsabilidad | Tecnología |
|--------|------------------|------------|
| `net.store` | Casa de estado global: estado de la planta, última y anterior muestra para interpolar a 60 fps aunque lleguen datos a 30 Hz. | Zustand |
| `views/3d` | Visualización 3D: carcasa espiral en corte, álabes del distribuidor que giran según la apertura, rodete con velocidad real, flujo de agua con partículas, colores por presión o cabezal. | Three.js (vía React Three Fiber) |
| `views/2d` | Esquema hidráulico y unifilar eléctrico con flujo animado, estado de válvulas e interruptores y valores en vivo sobre cada equipo. | SVG + React |
| `panels/hmi` | Controles de operación: apertura del distribuidor, altura de embalse, carga eléctrica, consigna de velocidad, ganancias PID, arranque, sincronización, paro de emergencia. | React, componentes propios |
| `charts` | Tendencias en tiempo real (n, P, f, Q, apertura) y curvas características (η–n, P–Q, colina). | uPlot (tiempo real), ECharts (curvas) |
| `dimensionamiento` | Calculadora de la turbina con resultados y recomendación de diseño. | React, pandas |
| `practicas` | Guías paso a paso, registro de resultados del estudiante y descarga del informe. | React, Markdown |

---

## 10. Datos

### 10.1 Configuración de la turbina (YAML)

Cada componente tiene un manifiesto con sus parámetros, señales y controles
(rango, unidad, tipo de control). Ejemplo:

```yaml
# manifiesto de ejemplo: distribuidor.yaml
id: distribuidor
nombre: Distribuidor (álabes directrices)
parametros:
  n_alabes:
    valor: 16
    unidad: "-"
  t_cierre:
    valor: 8.0
    unidad: s
    rango: [2, 30]
controles:
  apertura:
    tipo: slider
    unidad: "%"
    rango: [0, 100]
    paso: 1
senales:
  - apertura_real
  - angulo_deg
vista3d: modelos/distribuidor.glb
simbolo2d: simbolos/distribuidor.svg
```

### 10.2 Estructuras de datos

- **Datos de la planta:** se editan como datos, cada componente tiene sus
  parámetros y se aplican a los modelos.
- **Curvas de colina:** interpolación parametrizable (por prototipo).
- **Escenarios:** secuencias de eventos en el tiempo (arranque, toma de carga,
  rechazo).
- **Registro de sesiones:** SQLite para el informe de laboratorio.

---

## 11. Plan de desarrollo (22 semanas)

| Semanas | Tarea | Entrega |
|---------|-------|---------|
| 1–2 | Base del proyecto: repositorio con backend y frontend que se comunican por WebSocket y muestran un número en vivo. Definición de parámetros de la turbina de referencia y del contrato de mensajes. | Repositorio con backend y frontend comunicándose. |
| 3–6 | Física en régimen permanente: módulo de dimensionamiento, modelo estático de turbina con curva de colina y panel 2D sencillo con controles y valores. | Módulo de dimensionamiento funcional. |
| 7–11 | Dinámica y control: tubería con inercia de agua, eje, generador, carga y regulador PID. Tendencias en tiempo real. Escenarios de arranque, toma y rechazo de carga. | Dinámica y control funcionales. |
| 12–16 | Visor 3D y esquema animado: modelo 3D de la unidad Francis con distribuidor y rodete animados, flujo de agua, esquema 2D completo con unifilar eléctrico. | Visualización 3D y 2D funcionales. |
| 17–19 | Prácticas y validación: tres guías de laboratorio, exportación de datos, comparación cuantitativa con curvas de referencia y ajuste de parámetros. | Ejercicios de práctica y validación. |
| 20–22 | Documentación y entrega: manual técnico y de usuario, instalador para los equipos del laboratorio, documento final y sustentación. | Documentación y entrega. |

---

## 12. Pruebas

### 12.1 Niveles de prueba
- **Unitarias:** sobre cada modelo de componente (embalse, tub. forzada, distribuidor, rodete, eje, generador).
- **Integración:** sobre escenarios completos (arranque, rechazo de carga, curva de eficiencia).
- **Pruebas funcionales:** sobre la interfaz (commands, telemetría, validación de datos).

### 12.2 Resultados esperados
- Arranque reproduce el punto de 1300 rpm de la referencia.
- Comportamientos críticos verificados (cavitación, regulación de velocidad).
- Comparación cuantitativa con las curvas publicadas (Mináhuaya & Mamani, 2023).

---

## 13. Entregables

1. Repositorio Git con el código fuente.
2. Motor de simulación funcional (Python).
3. Aplicación web (React + TypeScript) con 3D y 2D.
4. Manual técnico del emulador.
5. Manual de usuario.
6. Documento final del proyecto de grado.
7. Sustentación (defensa).

---

## 14. Referencias

- Limahuaya, R. & Mamani, N. (2023). *Análisis del comportamiento de una turbina Francis a través de la determinación experimental de sus curvas características de funcionamiento.* Puno.
- Guacheta, C. (2024). *Modelado Numérico de una Turbina Francis de 95 MW de la Central Hidroeléctrica Salvajina Mediante Dinámica de Fluidos Computacional.* Santiago de Cali.
- Allauca, R. (2015). *Implementación de Procedimiento de Inspección y Reparación de Rodetes de la Turbina Francis de una Central Hidroeléctrica.* Guayaquil.
- Góngora Cruz, (2019). *Diseño e Implementación de un Módulo de Turbina Francis Para el Laboratorio de termo Fluidos de la Escuela Profesional de Ingeniería Mecánica, Mecánica-Eléctrica y Mecatrónica.* Arequipa.

---

## Anexo A - Código de funciones clave (backend)

### Motor de simulación (pseudocódigo)
```python
def step(state, dt):
    # 1. pendientes de estado
    # 2. integrar (RK4)
    # 3. aplicar comandos del frontend
    # 4. publicar muestras
    return signals
```

### Interpola el rendimiento
```python
def efficiency(Q, H):
    n_s = n * D / sqrt(H)
    Q_11 = Q / (D**2 * sqrt(H))
    return interpolate_curve(n_s, Q_11)
```

### Fórmula de la potencia
```python
P = rho * g * Q * H * eta
```
con `rho = 1000 kg/m³`, `g = 9.81 m/s²`.

---

## Anexo B - Fórmulas clave del emulador

| Concepto | Fórmula |
|----------|---------|
| Potencia de la turbina | `P = ρ · g · Q · H · η` |
| Velocidad periférica | `U = ω · r` |
| Triángulo de velocidades | `V = U + W` (suma vectorial) |
| Continuidad (componente meridional) | `Vm = Q / A` |
| Componente de giro | `Vu = Vm / tan(α)` |
| Ecuación de Euler | `H_Euler = (U₁ · Vu₁) / g` |
| Número de Thoma | `σ = (H_atm − H_vapor − H_s) / H` |
| Criterio anti-cavitación | `σ_instalación > σ_crítico` |

---

*Documento generado a partir de la arquitectura preliminar de la propuesta
Emulador Francis UTS (DECISIÓN/DE ARQUITECTURA · VERSIÓN PRELIMINAR 0.1).
Las decisiones técnicas finales quedarán determinadas por la experiencia de
implementación y las pruebas de laboratorio.*
