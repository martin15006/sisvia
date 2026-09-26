// Uso del plan de una empresa: "Vehículos: 118 de 120" con su barra
// (pacto para-empresas, HU-01.1 y HU-02.5). Al llegar al limite se marca.
import "./UsoLimite.css";

function UsoLimite({ etiqueta, usados, limite, compacto = false }) {
    const lleno = usados >= limite;
    const cerca = !lleno && limite > 0 && usados / limite >= 0.9;
    const porcentaje = limite > 0 ? Math.min(100, Math.round((usados / limite) * 100)) : 0;
    const estado = lleno ? "lleno" : cerca ? "cerca" : "normal";

    return (
        <div className={`uso-limite uso-limite--${estado} ${compacto ? "uso-limite--compacto" : ""}`}>
            <div className="uso-limite-texto">
                <span className="uso-limite-etiqueta">{etiqueta}:</span>{" "}
                <strong>{usados} de {limite}</strong>
                {lleno && !compacto && <span className="uso-limite-aviso">límite alcanzado</span>}
            </div>
            <div
                className="uso-limite-barra"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={limite}
                aria-valuenow={Math.min(usados, limite)}
                aria-label={`${etiqueta}: ${usados} de ${limite}`}
            >
                <div className="uso-limite-relleno" style={{ width: `${porcentaje}%` }} />
            </div>
        </div>
    );
}

export default UsoLimite;
