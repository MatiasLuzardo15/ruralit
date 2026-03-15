import { useEffect, useState } from 'react';

interface LoadingScreenProps {
    /** Optional message shown below the brand */
    message?: string;
    /** If true, shows a minimal inline spinner instead of full screen */
    inline?: boolean;
    /** If true, shows the full splash (dark bg, used for initial app load) */
    splash?: boolean;
}

const LOADING_MESSAGES = [
    'Preparando tu campo…',
    'Organizando registros…',
    'Sincronizando datos…',
    'Cargando movimientos…',
    'Procesando información…',
];

export function LoadingScreen({ message, inline = false, splash = false }: LoadingScreenProps) {
    const [dotCount, setDotCount] = useState(1);
    const [randomMsg] = useState(() =>
        message || LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setDotCount(prev => (prev % 3) + 1);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // ── INLINE / PAGE / SPLASH (Simplified to textual minimalism) ──
    const containerClass = splash 
        ? "ruralit-loading-minimal splash" 
        : inline 
            ? "ruralit-loading-minimal inline" 
            : "ruralit-loading-minimal page";

    return (
        <div className={containerClass}>
            <div className="ruralit-loading-minimal-content">
                <div className="ruralit-loader-minimal-wrap">
                    <span className="ruralit-r-text">r</span>
                    <span className="ruralit-dot-spin">.</span>
                </div>
                <p className="ruralit-feedback-text">
                    {randomMsg.replace(/…$/, '')}{'.'.repeat(dotCount)}
                </p>
            </div>
            {splash && <p className="ruralit-version-tag">RURALIT V1 BETA</p>}
        </div>
    );
}
