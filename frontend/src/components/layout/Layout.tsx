import { useEffect, useState } from 'react';
import type { SceneIndex } from '../../types';
import { ThreeDView } from '../../views/ThreeDView';
import { Schematic2DView } from '../../views/Schematic2DView';
import { ControlPanelView } from '../../views/ControlPanelView';
import { TelemetryView } from '../../views/TelemetryView';
import { DimensioningView } from '../../views/DimensioningView';
import { PracticesView } from '../../views/PracticesView';

export function Layout() {
  const [activeView, setActiveView] = useState<SceneIndex>(0);
  const [simTime, setSimTime] = useState<number>(0);
  const [connectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'running'>('connecting');

  // Navegación por fichas del panel
  const handleTabClick = (id: SceneIndex) => {
    setActiveView(id);
  };

  // Simular estado del sistema (el estado real vendrá del backend)
  useEffect(() => {
    const timer = setInterval(() => {
      setSimTime((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app">
      {/* ----- HEADER ----- */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">⚙</div>
            <div>
              <div className="header-title">Emulador Francis UTS</div>
              <div className="header-subtitle">Laboratorio de Mecánica de Fluidos · UTS Barrancabermeja</div>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="system-status">
            <span className={`status-dot ${connectionStatus}`} />
            <span>{connectionStatus === 'connected' ? 'Sistema conectado y operativo' : connectionStatus === 'connecting' ? 'Conectando al motor...' : connectionStatus === 'running' ? 'Simulación en marcha' : 'Desconectado'}</span>
          </div>

          <div className="view-controls">
            <button
              className="view-btn"
              onClick={() => setActiveView(0)}
              title="Visor 3D (Tecla 1)"
            >
              <span className="text-sm">▲ 3D</span>
            </button>
            <button
              className="view-btn"
              onClick={() => setActiveView(1)}
              title="Esquema 2D (Tecla 2)"
            >
              <span className="text-sm">◇ 2D</span>
            </button>
            <button
              className="view-btn"
              onClick={() => setActiveView(2)}
              title="Panel de Control (Tecla 3)"
            >
              <span className="text-sm">◆ Control</span>
            </button>
            <button
              className="view-btn"
              onClick={() => setActiveView(3)}
              title="Tendencias y Datos (Tecla 4)"
            >
              <span className="text-sm">⎔ Datos</span>
            </button>
            <button
              className="view-btn"
              onClick={() => setActiveView(4)}
              title="Dimensionamiento (Tecla 5)"
            >
              <span className="text-sm">◈ Dim.</span>
            </button>
            <button
              className="view-btn"
              onClick={() => setActiveView(5)}
              title="Prácticas (Tecla 6)"
            >
              <span className="text-sm">▣ Práct.</span>
            </button>
          </div>
        </div>
      </header>

      {/* ----- SIDEBAR DE MÓDULOS ----- */}
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">Módulos del Emulador</div>
          <nav className="module-list">
            <button
              className={`module-item ${activeView === 0 ? 'active' : ''}`}
              onClick={() => handleTabClick(0)}
            >
              <span className="module-icon">▲</span>
              <span>Visor 3D</span>
            </button>
            <button
              className={`module-item ${activeView === 1 ? 'active' : ''}`}
              onClick={() => handleTabClick(1)}
            >
              <span className="module-icon">◇</span>
              <span>Esquema 2D</span>
            </button>
            <button
              className={`module-item ${activeView === 2 ? 'active' : ''}`}
              onClick={() => handleTabClick(2)}
            >
              <span className="module-icon">◆</span>
              <span>Panel de Control</span>
            </button>
            <button
              className={`module-item ${activeView === 3 ? 'active' : ''}`}
              onClick={() => handleTabClick(3)}
            >
              <span className="module-icon">⎔</span>
              <span>Tendencias en Vivo</span>
            </button>
            <button
              className={`module-item ${activeView === 4 ? 'active' : ''}`}
              onClick={() => handleTabClick(4)}
            >
              <span className="module-icon">◈</span>
              <span>Dimensionamiento</span>
            </button>
            <button
              className={`module-item ${activeView === 5 ? 'active' : ''}`}
              onClick={() => handleTabClick(5)}
            >
              <span className="module-icon">▣</span>
              <span>Prácticas y Reportes</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-title">Estado del Sistema</div>
          <div className="card" style={{ padding: 'var(--space-3)' }}>
            <div className="status-light ok">
              <span className="text-sm">✓</span>
              <span>Motor de física operativo</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-title">Control Rápido</div>
          <div className="card" style={{ padding: 'var(--space-3)' }}>
            <div className="space-y-2">
              <button className="btn btn-sm btn-primary w-full">Arranque</button>
              <button className="btn btn-sm btn-amber w-full">Sincronización</button>
              <button className="btn btn-sm btn-danger w-full">Paro de Emergencia</button>
            </div>
          </div>
        </div>
      </aside>

      {/* ----- MAIN WORKSPACE ----- */}
      <main className="main">
        {/* Vista 3D */}
        {activeView === 0 && <ThreeDView />}

        {/* Vista 2D */}
        {activeView === 1 && <Schematic2DView />}

        {/* Panel de Control */}
        {activeView === 2 && <ControlPanelView />}

        {/* Tendencias */}
        {activeView === 3 && <TelemetryView />}

        {/* Dimensionamiento */}
        {activeView === 4 && <DimensioningView />}

        {/* Prácticas */}
        {activeView === 5 && <PracticesView />}
      </main>

      {/* ----- CONTROL BAR ----- */}
      <footer className="control-bar">
        <div className="control-left">
          <div className="status-light ok">
            <span className="text-sm">✓</span>
            <span>Sistema operativo · <span className="font-mono">t = {simTime.toFixed(1)} s</span></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn btn-sm btn-amber">Registro CSV</button>
          <button className="btn btn-sm btn-secondary">Ayuda</button>
          <button className="btn btn-sm btn-primary">Reiniciar Simulación</button>
        </div>
      </footer>
    </div>
  );
}
