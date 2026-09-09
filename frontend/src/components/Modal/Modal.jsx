import { useEffect } from "react";
import './Modal.css';

function Modal({ abierto, onCerrar, titulo, children, ancho = 'mediano' }) {
    // Cerrar con la tecla Esc 
    useEffect(() => {
        if (!abierto) return;
        const handler = (e) => {
            if (e.key === 'Escape') onCerrar();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [abierto, onCerrar]);

    // Bloquear el scroll del body cuando el modal permanece abierto 
    useEffect(() => {
        if (abierto) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [abierto]);

    if (!abierto) return null;

    return (
        <div className="modal-overlay">
            <div className={`modal-contenedor modal-ancho-${ancho}`}>
                <div className="modal-cabecera">
                    <h2 className="modal-titulo">{titulo}</h2>
                    <button
                        className="modal-cerrar"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            aria-hidden="true"
                        >
                            <path d="M1 1 L13 13 M13 1 L1 13" />
                        </svg>
                    </button>
                </div>
                <div className="modal-cuerpo">{children}</div>
            </div>
        </div>
    );
}

export default Modal;