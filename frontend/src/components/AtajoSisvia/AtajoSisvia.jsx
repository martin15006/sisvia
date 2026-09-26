// HU-18.9: junto al aviso de limite del plan (HU-02) o de placa ya registrada
// (HU-17.1), el Administrador de empresa llega a "Escribir a SISVIA" con el tipo
// ya elegido. `codigo` es el que manda el backend con el error.
import { useAuth } from "../../hooks/useAuth.js";
import { abrirEscribirSisvia } from "../../lib/buzon.js";
import "./AtajoSisvia.css";

const atajoDe = (codigo, placa) => {
    if (codigo === "limite_plan") {
        return { tipo: "cupo", mensaje: "Llegamos al límite de nuestro plan y necesitamos más cupo." };
    }
    if (codigo === "placa_en_sisvia") {
        return { tipo: "traspaso", mensaje: `La placa ${placa || ""} ya está registrada en SISVIA y el vehículo ahora es de nuestra empresa.` };
    }
    return null;
};

function AtajoSisvia({ codigo, placa }) {
    const { usuario } = useAuth();
    const atajo = atajoDe(codigo, placa?.trim().toUpperCase());
    if (usuario?.rol !== "admin_empresa" || !atajo) return null;
    return (
        <button type="button" className="atajo-sisvia" onClick={() => abrirEscribirSisvia(atajo)}>
            Escribir a SISVIA
        </button>
    );
}

export default AtajoSisvia;
