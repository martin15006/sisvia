// La marca "Dueño de SISVIA" (pacto para-empresas, HU-20.3): en Mi perfil, en
// el perfil de la cuenta y en la lista del equipo SISVIA.
import "./MarcaDueno.css";

function MarcaDueno({ className = "" }) {
    return (
        <span className={`marca-dueno ${className}`.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="8" cy="15" r="4" />
                <path d="M11 12l9-9" />
                <path d="M17 6l3 3" />
                <path d="M15 8l2 2" />
            </svg>
            Dueño de SISVIA
        </span>
    );
}

export default MarcaDueno;
