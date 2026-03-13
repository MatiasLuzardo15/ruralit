import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Home, BookOpen, BarChart2, Settings2, MoreVertical, ChevronDown, Check, ChevronLeft, ChevronRight, LayoutPanelLeft } from 'lucide-react';

export type Tab = 'inicio' | 'libreta' | 'balance' | 'ajustes';

interface NavItem { id: Tab; label: string; Icon: typeof Home; }
import logo from '../ruralit.png';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon } from 'lucide-react';
import { db } from '../db/database';

interface EstItem { id: string; nombre: string; }

const NAV_ITEMS: NavItem[] = [{ id: 'inicio', label: 'Dashboard', Icon: Home }];
const DATA_ITEMS: NavItem[] = [
    { id: 'libreta', label: 'Libreta', Icon: BookOpen },
    { id: 'balance', label: 'Balance', Icon: BarChart2 },
];

interface Props { 
    activo: Tab; 
    onChange: (t: Tab) => void; 
    establecimiento?: string; 
    collapsed?: boolean; 
    setCollapsed?: (v: boolean) => void;
    user?: User | null;
}

export function Sidebar({ activo, onChange, establecimiento, collapsed, setCollapsed, user }: Props) {
    const [showSelector, setShowSelector] = useState(false);
    const [estabs, setEstabs] = useState<EstItem[]>([]);
    const selectorRef = useRef<HTMLDivElement>(null);
    
    // Configuración de perfil reactiva
    const avatar = useLiveQuery(async () => {
        const row = await db.config.get('avatarUsuario');
        return (row?.valor as string) || '👨‍🌾';
    }, []);

    const nombreUsuario = useLiveQuery(async () => {
        const row = await db.config.get('nombreUsuario');
        return row?.valor as string;
    }, []);

    useEffect(() => {
        try {
            const list = JSON.parse(localStorage.getItem('ruralit_establecimientos') || '[]');
            setEstabs(list);
        } catch (e) {
            console.error('Error loading establishments', e);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setShowSelector(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const switchEstab = (e: EstItem) => {
        localStorage.setItem('activeEstDB', e.id);
        window.location.reload();
    };

    return (
        <aside className="app-sidebar">
            <div className="sidebar-brand">
                <img src={logo} alt="Ruralit" className="sidebar-logo-img" />
                {!collapsed && <span className="sidebar-brand-name">ruralit<span className="dot">.</span></span>}
                <button className="sidebar-toggle-btn" onClick={() => setCollapsed?.(!collapsed)} title={collapsed ? "Expandir" : "Contraer"}>
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
            
            {!collapsed && (
                <div className="sidebar-context" ref={selectorRef}>
                    <button className={`sidebar-selector ${showSelector ? 'open' : ''}`} onClick={() => setShowSelector(!showSelector)}>
                        <Home size={16} strokeWidth={2} />
                        <span className="selector-label">{establecimiento || 'Mi Establecimiento'}</span>
                        <ChevronDown size={14} strokeWidth={2} className={`selector-arrow ${showSelector ? 'up' : ''}`} />
                    </button>
                    
                    {showSelector && (
                        <div className="sidebar-selector-dropdown">
                            <div className="dropdown-label">Cambiar Establecimiento</div>
                            {estabs.map(e => (
                                <button key={e.id} className={`dropdown-item ${e.nombre === establecimiento ? 'current' : ''}`} onClick={() => switchEstab(e)}>
                                    <span className="dropdown-item-name">{e.nombre}</span>
                                    {e.nombre === establecimiento && <Check size={14} strokeWidth={3} className="current-check" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="sidebar-scrollable">
                <div className="sidebar-group">
                    {!collapsed && <span className="sidebar-group-label">Navegación</span>}
                    {NAV_ITEMS.map(({ id, label, Icon }) => (
                        <button key={id} className={`sidebar-item ${activo === id ? 'active' : ''}`} onClick={() => onChange(id)} title={collapsed ? label : undefined}>
                            <Icon className="sidebar-item-icon" size={18} strokeWidth={1.5} />
                            {!collapsed && label}
                        </button>
                    ))}
                </div>

                <div className="sidebar-group">
                    {!collapsed && <span className="sidebar-group-label">Gestión de datos</span>}
                    {DATA_ITEMS.map(({ id, label, Icon }) => (
                        <button key={id} className={`sidebar-item ${activo === id ? 'active' : ''}`} onClick={() => onChange(id)} title={collapsed ? label : undefined}>
                            <Icon className="sidebar-item-icon" size={18} strokeWidth={1.5} />
                            {!collapsed && label}
                        </button>
                    ))}
                </div>

                <div className="sidebar-footer-nav">
                    <button className={`sidebar-item ${activo === 'ajustes' ? 'active' : ''}`} onClick={() => onChange('ajustes')} title={collapsed ? "Ajustes" : undefined}>
                        <Settings2 className="sidebar-item-icon" size={18} strokeWidth={1.5} />
                        {!collapsed && "Ajustes"}
                    </button>
                    <div style={{ marginTop: '12px' }}>
                        {user && (
                            <div style={{ 
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', 
                                background: 'rgba(0,0,0,0.03)', borderRadius: '12px', overflow: 'hidden',
                                border: '1px solid var(--border-rgba)'
                            }}>
                                <div style={{ 
                                    minWidth: '32px', height: '32px', borderRadius: '50%', 
                                    background: 'var(--bg)', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', color: 'var(--t2)', 
                                    border: '1px solid var(--border-sm)' 
                                }}>
                                    {avatar}
                                </div>
                                {!collapsed && (
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>
                                            {nombreUsuario || user.email?.split('@')[0]}
                                        </p>
                                        <p style={{ fontSize: '9px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Cuenta Ruralit</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}

const ALL_ITEMS: NavItem[] = [...NAV_ITEMS, ...DATA_ITEMS, { id: 'ajustes', label: 'Ajustes', Icon: Settings2 }];

export function BottomNav({ activo, onChange }: Props) {
    return (
        <nav className="bottom-nav">
            {ALL_ITEMS.map(({ id, label, Icon }) => (
                <button key={id} className={`bnav-btn ${activo === id ? 'active' : ''}`} onClick={() => onChange(id)}>
                    <Icon size={21} strokeWidth={activo === id ? 2.5 : 2} />
                    <span>{label}</span>
                </button>
            ))}
        </nav>
    );
}
