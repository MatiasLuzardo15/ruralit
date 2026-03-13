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
import { Login } from './pages/Login';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { syncService } from './lib/sync';

function App() {
    const [tab, setTab] = useState<Tab>('inicio');
    const [collapsed, setCollapsed] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Cargar tema y sesión al iniciar la app
    useEffect(() => {
        // Primero intentamos leer de localStorage para consistencia entre establecimientos
        const savedTheme = localStorage.getItem('ruralit_theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            // Si no hay en localStorage, probamos con IndexedDB (fallback legacy)
            db.config.get('tema').then(t => {
                if (t?.valor === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    localStorage.setItem('ruralit_theme', 'dark');
                }
            });
        }

        // Escuchar cambios de sesión
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const newUser = session?.user ?? null;
            setUser(newUser);
            if (newUser) {
                // PRIMERO: Bajar configuración (para evitar el popup de bienvenida)
                await syncService.syncConfigOnly();
                // SEGUNDO: El resto en segundo plano
                syncService.syncEverything();
            }
            // Pequeño delay para que useLiveQuery se entere de los cambios en DB
            setTimeout(() => setLoading(false), 300);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const newUser = session?.user ?? null;
            setUser(newUser);
            if (newUser) {
                await syncService.syncConfigOnly();
                syncService.syncEverything();
            }
            setTimeout(() => setLoading(false), 300);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Verificar si falta configuración inicial
    const tipoProduccion = useLiveQuery(() => db.config.get('tipoProduccion'), []);
    const [showSetup, setShowSetup] = useState(false);

    useEffect(() => {
        if (user && tipoProduccion === null) {
            setShowSetup(true);
        } else if (tipoProduccion) {
            setShowSetup(false);
        }
    }, [tipoProduccion, user]);

    const establecimiento = useLiveQuery(
        () => db.config.get('nombreEstablecimiento').then(r => r?.valor ?? 'Mi Establecimiento'),
        []
    );

    if (loading) return null;
    if (!user) return <Login />;

    return (
        <div className={`app-root ${collapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar 
                activo={tab} 
                onChange={setTab} 
                establecimiento={establecimiento} 
                collapsed={collapsed} 
                setCollapsed={setCollapsed}
                user={user}
            />
            <main className="app-main">
                {tab === 'inicio' && <Inicio />}
                {tab === 'libreta' && <Libreta />}
                {tab === 'balance' && <Balance />}
                {tab === 'ajustes' && <Ajustes user={user} />}
            </main>
            <BottomNav activo={tab} onChange={setTab} />
            <Toast />
            {showSetup && <ModalSetup onComplete={() => setShowSetup(false)} initialName={establecimiento === 'Mi Establecimiento' ? '' : establecimiento} />}
        </div>
    );
}

export default App;
