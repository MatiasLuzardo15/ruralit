import type { ReactNode } from 'react';
import { Calendar, ChevronDown, Search } from 'lucide-react';
import { useMonedas } from '../utils/useMoneda';
import { MONEDAS } from '../utils/helpers';

interface Props {
    title: string;
    heading?: string;
    badge?: string;
    subtitle?: string;
    actions?: ReactNode;
    hideCurrencyToggle?: boolean;
}

export function TopBar({ title, heading, badge, subtitle, actions, hideCurrencyToggle }: Props) {
    const { moneda, monedasActivas, changeMoneda } = useMonedas();

    const currencyToggle = (!hideCurrencyToggle && monedasActivas.length > 1) ? (
        <div style={{ background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', padding: '4px', height: '42px', alignItems: 'center' }}>
            {monedasActivas.map(m => (
                <button 
                    key={m} 
                    onClick={() => changeMoneda(m)} 
                    style={{ 
                        padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        background: m === moneda ? 'var(--white)' : 'transparent',
                        color: m === moneda ? 'var(--t1)' : 'var(--t3)',
                        boxShadow: m === moneda ? 'var(--shadow-sm)' : 'none',
                        display: 'flex', alignItems: 'center', gap: '6px', height: '100%'
                    }}>
                    <span>{MONEDAS[m].flag}</span> <span className="desktop-only">{m}</span>
                </button>
            ))}
        </div>
    ) : null;
    return (
        <header className="topbar">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 'var(--max-content)', margin: '0 auto' }}>
                
                {/* Lado Izquierdo: Jerarquía de Textos */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '0', flex: '1 1 auto' }}>
                    <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        color: 'var(--t3)', 
                        letterSpacing: '1px', 
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                        WebkitFontSmoothing: 'antialiased'
                    }}>
                        {title}
                    </span>

                    {heading && (
                        <h1 style={{ 
                            fontSize: '28px', 
                            fontWeight: 800, 
                            color: 'var(--charcoal)',
                            letterSpacing: '-1px', 
                            margin: 0,
                            lineHeight: 1.1,
                            WebkitFontSmoothing: 'antialiased',
                            marginBottom: subtitle ? '4px' : '0'
                        }}>
                            {heading}
                        </h1>
                    )}
                    
                    {subtitle && (
                        <p style={{ 
                            fontSize: '13px', 
                            color: 'var(--gray-500)', 
                            fontWeight: 500,
                            margin: 0,
                            WebkitFontSmoothing: 'auto'
                        }}>
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Lado Derecho: Controles e Interactivos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
                    {currencyToggle}
                    {actions}
                    
                    {badge && (
                        <button style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            fontSize: '13px', 
                            fontWeight: 700, 
                            color: 'var(--t1)', 
                            background: 'var(--white)', 
                            padding: '10px 16px', 
                            borderRadius: '12px', 
                            border: '1px solid var(--border-sm)', 
                            boxShadow: 'var(--shadow-xs)', 
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            height: '42px'
                        }} onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'} onMouseOut={e => e.currentTarget.style.background = 'var(--white)'}>
                            <Calendar size={15} color="var(--t2)" />
                            {badge}
                            <ChevronDown size={15} color="var(--t2)" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
