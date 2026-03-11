import { useEffect, useState } from 'react';

// ─── Sistema de toast global ─────────────────────────────────────────────────

type ToastCallback = (mensaje: string) => void;
let toastCallback: ToastCallback | null = null;

export const showToast = (mensaje: string): void => {
    toastCallback?.(mensaje);
};

export function Toast() {
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [saliendo, setSaliendo] = useState(false);

    useEffect(() => {
        toastCallback = (msg: string) => {
            setMensaje(msg);
            setSaliendo(false);
            setTimeout(() => {
                setSaliendo(true);
                setTimeout(() => setMensaje(null), 300);
            }, 2200);
        };
        return () => { toastCallback = null; };
    }, []);

    if (!mensaje) return null;

    return (
        <div className={`toast ${saliendo ? 'saliendo' : ''}`}>
            ✅ {mensaje}
        </div>
    );
}
