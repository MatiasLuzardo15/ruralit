import { createPortal } from 'react-dom';
import { X, AlertTriangle, Info, Trash2, LogOut, CheckCircle2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
}

export function ConfirmModal({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    confirmText = 'Confirmar', 
    cancelText = 'Cancelar',
    type = 'info'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <Trash2 size={24} color="var(--red-soft)" />;
            case 'warning': return <AlertTriangle size={24} color="#F57C00" />;
            case 'success': return <CheckCircle2 size={24} color="var(--green-main)" />;
            default: return <Info size={24} color="var(--blue-main)" />;
        }
    };

    const getButtonClass = () => {
        switch (type) {
            case 'danger': return { background: 'var(--red-soft)', color: 'white' };
            case 'warning': return { background: '#F57C00', color: 'white' };
            default: return { background: 'var(--green-main)', color: 'white' };
        }
    };

    return createPortal(
        <div className="modal-backdrop" style={{ zIndex: 10000 }} onClick={e => e.target === e.currentTarget && onCancel()}>
            <div className="modal-panel" style={{ 
                borderRadius: '28px', 
                padding: '32px', 
                width: '100%', 
                maxWidth: '400px',
                background: 'var(--white)',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ 
                        width: '48px', height: '48px', borderRadius: '14px', 
                        background: 'var(--gray-50)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                    }}>
                        {getIcon()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                            {title}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.5, fontWeight: 500 }}>
                            {message}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={onCancel}
                        style={{ 
                            flex: 1, padding: '14px', borderRadius: '14px', 
                            background: 'var(--gray-100)', color: 'var(--t2)', 
                            fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer' 
                        }}
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        style={{ 
                            flex: 1, padding: '14px', borderRadius: '14px', 
                            ...getButtonClass(),
                            fontSize: '14px', fontWeight: 800, border: 'none', cursor: 'pointer' 
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
