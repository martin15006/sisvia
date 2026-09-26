// Reglas PURAS de a quien le llega un aviso (pacto para-empresas, OB-06 · HU-06.5 · CB-15).
// Sin base de datos, para probarlas con node --test.

// De la lista de administradores activos, quienes reciben un aviso.
//   admins: [{ id, sede_id, empresa_id }]
//   sedeId: la sede del evento (o null)
//   empresaId: la empresa del evento (de su sede, o dada a mano)
//   soloSede: solo los admins asignados a esa sede (Coordinador de sede)
// Reglas:
//   - Sin empresa en el evento, no le llega a nadie: sin saber de que empresa
//     es, mandarlo seria arriesgarse a avisarle a otra.
//   - Solo reciben los admins de ESA empresa. El superadmin (equipo SISVIA) no
//     tiene empresa, asi que no recibe los avisos del dia a dia de las empresas.
//   - Con sede: los de esa sede y los de la empresa sin sede (Administrador de
//     empresa, Director Regional); con soloSede, unicamente los de esa sede.
export const elegirDestinatarios = (admins, { sedeId = null, empresaId = null, soloSede = false } = {}) => {
    if (!empresaId) return [];
    return (admins || [])
        .filter((a) => a.empresa_id === empresaId)
        .filter((a) => {
            if (!sedeId) return true;
            if (soloSede) return a.sede_id === sedeId;
            return !a.sede_id || a.sede_id === sedeId;
        })
        .map((a) => a.id);
};
