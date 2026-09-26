import { useEffect, useRef } from "react";
import './Modal.css';

// Modales abiertos, de abajo hacia arriba. Con uno encima de otro (por ejemplo,
// la contraseña del superadmin sobre el formulario de un vehículo), Esc cierra
// solo el de arriba y el scroll de la pagina sigue trabado hasta cerrar el ultimo.
const pila = [];

function Modal({ abierto, onCerrar, titulo, children, ancho = 'mediano', encima = false }) {
    // onCerrar suele llegar como funcion nueva en cada render: se guarda en una
    // ref para que el modal no cambie de lugar en la pila al re-renderizar.
    const cerrarRef = useRef(onCerrar);
    useEffect(() => { cerrarRef.current = onCerrar; });

    // Cerrar con la tecla Esc (solo el modal de arriba)
    useEffect(() => {
        if (!abierto) return;
        const yo = {};
        pila.push(yo);
        const handler = (e) => {
            if (e.key === 'Escape' && pila[pila.length - 1] === yo) cerrarRef.current();
        };
        window.addEventListener('keydown', handler);
        return () => {
            window.removeEventListener('keydown', handler);
            pila.splice(pila.indexOf(yo), 1);
        };
    }, [abierto]);

    // Bloquear el scroll del body mientras haya algun modal abierto
    useEffect(() => {
        if (!abierto) return;
        document.body.style.overflow = 'hidden';
        return () => {
            if (pila.length === 0) document.body.style.overflow = '';
        };
    }, [abierto]);

    if (!abierto) return null;

    return (
        <div className={`modal-overlay${encima ? " modal-overlay--encima" : ""}`}>
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