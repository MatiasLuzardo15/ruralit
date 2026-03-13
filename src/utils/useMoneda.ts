import { useState, useEffect, useCallback } from 'react';
import { Moneda } from '../types';
import { dataService } from '../lib/dataService';

export function useMonedas() {
    const [monedasActivas, setMonedasActivas] = useState<Moneda[]>(() => {
        const activeId = localStorage.getItem('activeEstDB_uuid');
        if (activeId) {
            const cached = localStorage.getItem(`ruralit_cache_monedas_${activeId}`);
            if (cached) {
                try {
                    return JSON.parse(cached) as Moneda[];
                } catch (e) {
                    return ['UYU'];
                }
            }
        }
        return ['UYU'];
    });

    const [moneda, setMoneda] = useState<Moneda>(() => {
        return (localStorage.getItem('ruralia_moneda_view') as Moneda) || 'UYU';
    });

    const refreshMonedas = useCallback(async () => {
        const activeId = localStorage.getItem('activeEstDB_uuid');
        if (!activeId) return;
        try {
            const list = await dataService.getMonedasActivas(activeId);
            if (list && list.length > 0) {
                setMonedasActivas(list);
                
                const cur = localStorage.getItem('ruralia_moneda_view') as Moneda;
                if (!list.includes(cur)) {
                    const fallback = list[0];
                    setMoneda(fallback);
                    localStorage.setItem('ruralia_moneda_view', fallback);
                } else if (cur !== moneda) {
                    setMoneda(cur);
                }
            }
        } catch (e) {
            console.error('Error refreshing currencies:', e);
        }
    }, [moneda]);

    useEffect(() => {
        void refreshMonedas();
    }, [refreshMonedas]);

    useEffect(() => {
        const handleT = (e: any) => {
            if (e.detail) setMoneda(e.detail);
        };
        window.addEventListener('moneda_changed', handleT);
        return () => window.removeEventListener('moneda_changed', handleT);
    }, []);

    const changeMoneda = useCallback((m: Moneda) => {
        localStorage.setItem('ruralia_moneda_view', m);
        setMoneda(m);
        window.dispatchEvent(new CustomEvent('moneda_changed', { detail: m }));
    }, []);

    return { moneda, monedasActivas, changeMoneda, refreshMonedas };
}
