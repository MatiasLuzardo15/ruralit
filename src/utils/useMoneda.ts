import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/database';
import { Moneda } from '../types';

export function useMonedas() {
    const monedasConfig = useLiveQuery(() => db.config.get('monedasActivas'), []);
    const monedasActivas = (monedasConfig?.valor as Moneda[]) ?? ['UYU'];

    const [moneda, setMoneda] = useState<Moneda>(() => {
        return (localStorage.getItem('ruralia_moneda_view') as Moneda) || 'UYU';
    });

    useEffect(() => {
        const handleT = (e: any) => {
            if (e.detail) setMoneda(e.detail);
        };

        const cur = localStorage.getItem('ruralia_moneda_view') as Moneda;
        
        // Ensure the current selected currency is actually active
        if (monedasConfig && monedasActivas.length > 0) {
            if (cur && monedasActivas.includes(cur)) {
                if (cur !== moneda) setMoneda(cur);
            } else if (!monedasActivas.includes(moneda)) {
                setMoneda(monedasActivas[0]);
                localStorage.setItem('ruralia_moneda_view', monedasActivas[0]);
            }
        }
        
        window.addEventListener('moneda_changed', handleT);
        return () => window.removeEventListener('moneda_changed', handleT);
    }, [monedasActivas, moneda, monedasConfig]);

    const changeMoneda = useCallback((m: Moneda) => {
        localStorage.setItem('ruralia_moneda_view', m);
        setMoneda(m);
        window.dispatchEvent(new CustomEvent('moneda_changed', { detail: m }));
    }, []);

    return { moneda, monedasActivas, changeMoneda };
}
