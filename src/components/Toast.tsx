import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';

// ─── Sistema de toast global ─────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastCallback = (mensaje: string, tipo?: ToastType) => void;
let toastCallback: ToastCallback | null = null;

export const showToast = (mensaje: string, tipo: ToastType = 'success'): void => {
    toastCallback?.(mensaje, tipo);
};

export function Toast() {
    const [data, setData] = useState<{ mensaje: string; tipo: ToastType } | null>(null);
    const [saliendo, setSaliendo] = useState(false);

    useEffect(() => {
        toastCallback = (msg: string, type: ToastType = 'success') => {
            setData({ mensaje: msg, tipo: type });
            setSaliendo(false);
            
            // Auto-hide despues de 2.5s
            const timer = setTimeout(() => {
                setSaliendo(true);
                setTimeout(() => setData(null), 300);
            }, 2500);

            return () => clearTimeout(timer);
        };
        return () => { toastCallback = null; };
    }, []);

    if (!data) return null;

    const getIcon = () => {
        switch (data.tipo) {
            case 'success': return <CheckCircle2 size={16} color="#CCFF00" />;
            case 'error': return <XCircle size={16} color="#FF4D4D" />;
            case 'warning': return <AlertCircle size={16} color="#FFB800" />;
            default: return <Info size={16} color="#00A3FF" />;
        }
    };

    return (
        <div className={`ruralit-toast-wrapper ${saliendo ? 'saliendo' : ''} type-${data.tipo}`}>
            <div className="ruralit-toast-icon">
                {getIcon()}
            </div>
            <span className="ruralit-toast-message">
                {data.mensaje}
            </span>
        </div>
    );
}
