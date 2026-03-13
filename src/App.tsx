import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from './db/database';
import { Sidebar, BottomNav, type Tab } from './components/BottomNav';
import { Toast } from './components/Toast';
import { Inicio } from './pages/Inicio';
import { Libreta } from './pages/Libreta';
import { Balance } from './pages/Balance';
import { Ajustes } from './pages/Ajustes';
import { ModalSetup } from './components/ModalSetup';

function App() {
    const [tab, setTab] = useState<Tab>('inicio');
    const [collapsed, setCollapsed] = useState(false);

    // Cargar tema al iniciar la app
    useEffect(() => {
        db.config.get('tema').then(t => {
            if (t?.valor === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
            }
        });
    }, []);

    // Verificar si falta configuración inicial
    const tipoProduccion = useLiveQuery(() => db.config.get('tipoProduccion'), []);
    const [showSetup, setShowSetup] = useState(false);

    useEffect(() => {
        if (tipoProduccion !== undefined && !tipoProduccion) {
            setShowSetup(true);
        }
    }, [tipoProduccion]);

    const establecimiento = useLiveQuery(
        () => db.config.get('nombreEstablecimiento').then(r => r?.valor ?? 'Mi Establecimiento'),
        []
    );

    return (
        <div className={`app-root ${collapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar activo={tab} onChange={setTab} establecimiento={establecimiento} collapsed={collapsed} setCollapsed={setCollapsed} />
            <main className="app-main">
                {tab === 'inicio' && <Inicio />}
                {tab === 'libreta' && <Libreta />}
                {tab === 'balance' && <Balance />}
                {tab === 'ajustes' && <Ajustes />}
            </main>
            <BottomNav activo={tab} onChange={setTab} />
            <Toast />
            {showSetup && <ModalSetup onComplete={() => setShowSetup(false)} initialName={establecimiento === 'Mi Establecimiento' ? '' : establecimiento} />}
        </div>
    );
}

export default App;
