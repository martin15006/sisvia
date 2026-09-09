import { useEffect, useState, useCallback } from "react";
import "./Lightbox.css";

function Lightbox({ fotos = [], indiceInicial = 0, abierto, onCerrar }) {
    const [indice, setIndice] = useState(indiceInicial);

    useEffect(() => {
        if (abierto) setIndice(indiceInicial);
    }, [abierto, indiceInicial]);

    const anterior = useCallback(() => {
        setIndice((i) => (i === 0 ? fotos.length - 1 : i - 1));
    }, [fotos.length]);

    const siguiente = useCallback(() => {
        setIndice((i) => (i === fotos.length - 1 ? 0 : i + 1));
    }, [fotos.length]);

    useEffect(() => {
        if (!abierto) return;
        const handler = (e) => {
            if (e.key === "Escape") onCerrar();
            else if (e.key === "ArrowLeft") anterior();
            else if (e.key === "ArrowRight") siguiente();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [abierto, onCerrar, anterior, siguiente]);

    useEffect(() => {
        if (abierto) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [abierto]);

    if (!abierto || fotos.length === 0) return null;

    const fotoActual = fotos[indice];

    return (
        <div className="lightbox-overlay" onClick={onCerrar}>
            <button
                type="button"
                className="lightbox-cerrar"
                onClick={onCerrar}
                aria-label="Cerrar galería"
            >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 2 L18 18 M18 2 L2 18" />
                </svg>
            </button>

            {fotos.length > 1 && (
                <>
                    <button
                        type="button"
                        className="lightbox-nav lightbox-nav-anterior"
                        onClick={(e) => { e.stopPropagation(); anterior(); }}
                        aria-label="Foto anterior"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="lightbox-nav lightbox-nav-siguiente"
                        onClick={(e) => { e.stopPropagation(); siguiente(); }}
                        aria-label="Foto siguiente"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </>
            )}

            <div
                className="lightbox-contenedor"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={fotoActual.url}
                    alt={fotoActual.descripcion || `Foto ${indice + 1}`}
                    className="lightbox-imagen"
                />
                {fotoActual.descripcion && (
                    <div className="lightbox-descripcion">{fotoActual.descripcion}</div>
                )}
            </div>

            <div className="lightbox-contador">
                {indice + 1} / {fotos.length}
                {fotoActual.es_principal && (
                    <span className="lightbox-badge-principal">Principal</span>
                )}
            </div>
        </div>
    );
}

export default Lightbox;
