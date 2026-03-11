import { useState, useEffect, useRef } from 'react';
import { Home, BookOpen, BarChart2, Settings2, MoreVertical, ChevronDown, Check } from 'lucide-react';

export type Tab = 'inicio' | 'libreta' | 'balance' | 'ajustes';

interface NavItem { id: Tab; label: string; Icon: typeof Home; }
interface Props { activo: Tab; onChange: (t: Tab) => void; establecimiento?: string; }
interface EstItem { id: string; nombre: string; }

const NAV_ITEMS: NavItem[] = [{ id: 'inicio', label: 'Dashboard', Icon: Home }];
const DATA_ITEMS: NavItem[] = [
    { id: 'libreta', label: 'Libreta', Icon: BookOpen },
    { id: 'balance', label: 'Balance', Icon: BarChart2 },
];

import logo from '../ruralit.png';

export function Sidebar({ activo, onChange, establecimiento }: Props) {
    const [showSelector, setShowSelector] = useState(false);
    const [estabs, setEstabs] = useState<EstItem[]>([]);
    const selectorRef = useRef<HTMLDivElement>(null);

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
                <span className="sidebar-brand-name">ruralit<span className="dot">.</span></span>
            </div>
            
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

            <div className="sidebar-scrollable">
                <div className="sidebar-group">
                    <span className="sidebar-group-label">Navegación</span>
                    {NAV_ITEMS.map(({ id, label, Icon }) => (
                        <button key={id} className={`sidebar-item ${activo === id ? 'active' : ''}`} onClick={() => onChange(id)}>
                            <Icon className="sidebar-item-icon" size={18} strokeWidth={1.5} />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="sidebar-group">
                    <span className="sidebar-group-label">Gestión de datos</span>
                    {DATA_ITEMS.map(({ id, label, Icon }) => (
                        <button key={id} className={`sidebar-item ${activo === id ? 'active' : ''}`} onClick={() => onChange(id)}>
                            <Icon className="sidebar-item-icon" size={18} strokeWidth={1.5} />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="sidebar-footer-nav">
                    <button className={`sidebar-item ${activo === 'ajustes' ? 'active' : ''}`} onClick={() => onChange('ajustes')}>
                        <Settings2 className="sidebar-item-icon" size={18} strokeWidth={1.5} />
                        Ajustes
                    </button>
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
