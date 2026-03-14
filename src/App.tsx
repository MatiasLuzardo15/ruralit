import { useState, useEffect } from 'react';
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
import { dataService } from './lib/dataService';
import { Establecimiento } from './types';

function App() {
    const [tab, setTab] = useState<Tab>('inicio');
    const [collapsed, setCollapsed] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeEstab, setActiveEstab] = useState<Establecimiento | null>(null);
    const [showSetup, setShowSetup] = useState(false);

    // Cargar tema y sesión al iniciar la app
    useEffect(() => {
        const savedTheme = localStorage.getItem('ruralit_theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }

        // Escuchar cambios de sesión
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const refreshData = (force: boolean = false) => {
        if (!user) return;
        
        // Sincronizar tema desde el perfil
        dataService.getProfile(force).then(prof => {
            if (prof?.theme) {
                const currentTheme = localStorage.getItem('ruralit_theme');
                if (currentTheme !== prof.theme) {
                    localStorage.setItem('ruralit_theme', prof.theme);
                    document.documentElement.setAttribute('data-theme', prof.theme);
                }
            }
        });

        dataService.getEstablecimientoActivo(force).then(estab => {
            setActiveEstab(estab);
            if (!estab || !estab.tipo_produccion) {
                setShowSetup(true);
            } else {
                setShowSetup(false);
            }
        });
    };

    useEffect(() => {
        refreshData();
        
        const handleEstabChange = () => refreshData(true);
        window.addEventListener('ruralit_estab_changed', handleEstabChange);
        window.addEventListener('ruralit_profile_updated', () => refreshData(false));
        
        return () => {
            window.removeEventListener('ruralit_estab_changed', handleEstabChange);
            window.removeEventListener('ruralit_profile_updated', () => refreshData(false));
        };
    }, [user]);

    // También refrescar cuando cambie el tab si es necesario
    useEffect(() => {
        if (tab === 'inicio') {
            refreshData();
        }
    }, [tab]);

    if (loading) return null;
    if (!user) return <Login />;

    return (
        <div className={`app-root ${collapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar
                activo={tab}
                onChange={setTab}
                establecimiento={activeEstab?.nombre || 'Mi Establecimiento'}
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
            {showSetup && <ModalSetup onComplete={() => { setShowSetup(false); window.location.reload(); }} initialName={activeEstab?.nombre === 'Mi Establecimiento' ? '' : activeEstab?.nombre} />}
        </div>
    );
}

export default App;
