// Iconos de la portada: SVG propios, un solo trazo de 2 px (como el resto de la app).
const Trazo = ({ children, grosor = 2 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor}
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {children}
    </svg>
);

export const IconoCampana = () => (
    <Trazo><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Trazo>
);

export const IconoAlerta = () => (
    <Trazo><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></Trazo>
);

export const IconoCandado = ({ grosor }) => (
    <Trazo grosor={grosor}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Trazo>
);

export const IconoVisto = () => (
    <Trazo><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16 10" /></Trazo>
);

export const IconoCalendario = () => (
    <Trazo><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Trazo>
);

export const IconoDocumento = () => (
    <Trazo><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></Trazo>
);

export const IconoMensaje = () => (
    <Trazo><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" /></Trazo>
);

export const IconoCorreo = () => (
    <Trazo><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Trazo>
);
