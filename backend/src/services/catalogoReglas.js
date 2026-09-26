// Reglas PURAS del catalogo del chequeo por empresa (pacto para-empresas,
// HU-12 a HU-15 · RN-07 · RN-08). Sin base de datos, para probarlas con node --test.
//
// Cada categoria, item y pregunta de aptitud es "base" (empresa_id vacio: lo
// maneja el superadmin y lo ven todas las empresas) o "propio" de una empresa.
// El superadmin puede bloquearle a una empresa elementos base.

// Textos exactos (HU-12.3 y CB-08).
export const MENSAJES_CATALOGO = {
    baseSinPermiso: 'No tienes permiso para cambiar el catálogo base',
    soloLectura: 'No tienes permiso para cambiar el catálogo',
    baseDesdeAdentro: 'Para cambiar el catálogo base, sal de la empresa.',
    nombreRepetido: 'Ya existe una categoría con ese nombre',
    categoriaNoValida: 'Esa categoría no existe en el catálogo de la empresa.',
};

export const TIPOS_BLOQUEO = ['categoria', 'item', 'pregunta'];

export const origenDe = (elemento) => (elemento?.empresa_id ? 'propio' : 'base');

// { categoria: Set, item: Set, pregunta: Set } con los ids base bloqueados.
export const setsDeBloqueos = (bloqueos = []) => {
    const sets = { categoria: new Set(), item: new Set(), pregunta: new Set() };
    for (const b of bloqueos) sets[b.tipo]?.add(Number(b.elemento_id));
    return sets;
};

// ¿El item sirve para este tipo de vehiculo? Vacio = para todos (HU-15.3).
export const aplicaAlVehiculo = (item, tipoVehiculo) =>
    !tipoVehiculo || !item.aplica_a_tipos || item.aplica_a_tipos.length === 0
    || item.aplica_a_tipos.includes(tipoVehiculo);

// RN-07: lo que ve un chequeo = base activo − lo bloqueado para esa empresa +
// lo propio activo de esa empresa, filtrado por el tipo de vehiculo y las
// excepciones del vehiculo. Con una categoria base bloqueada desaparecen sus
// items base, pero no los propios que la empresa haya puesto en ella (HU-14.2).
// Devuelve las categorias con items (ordenadas), las preguntas y los ids.
export const catalogoEfectivo = ({
    categorias = [],
    items = [],
    preguntas = [],
    bloqueos = [],
    empresaId = null,
    tipoVehiculo = null,
    excluidos = [],
}) => {
    const bloq = setsDeBloqueos(bloqueos);
    const fuera = new Set(excluidos.map(Number));
    const esDeLaEmpresa = (e) => !!empresaId && e.empresa_id === empresaId;
    const visible = (e, tipo) => e.activo !== false && (e.empresa_id ? esDeLaEmpresa(e) : !bloq[tipo].has(e.id));

    const cats = new Map(
        categorias.filter((c) => c.activo !== false && (c.empresa_id ? esDeLaEmpresa(c) : true)).map((c) => [c.id, c])
    );

    const itemsVisibles = items.filter((it) => {
        const cat = cats.get(it.categoria_id);
        if (!cat || !visible(it, 'item') || fuera.has(it.id) || !aplicaAlVehiculo(it, tipoVehiculo)) return false;
        // Categoria base bloqueada: sus items base no; los propios, si.
        return it.empresa_id ? true : !bloq.categoria.has(cat.id);
    });

    const porCategoria = new Map();
    for (const it of itemsVisibles) {
        if (!porCategoria.has(it.categoria_id)) porCategoria.set(it.categoria_id, []);
        porCategoria.get(it.categoria_id).push(it);
    }
    const porOrden = (a, b) => (a.orden ?? 999) - (b.orden ?? 999) || a.id - b.id;

    return {
        categorias: [...porCategoria.keys()]
            .map((id) => ({ ...cats.get(id), items: porCategoria.get(id).sort(porOrden) }))
            .sort(porOrden),
        preguntas: preguntas.filter((p) => visible(p, 'pregunta')).sort(porOrden),
        itemIds: itemsVisibles.map((it) => it.id),
    };
};

// Aptitud (HU-15.1): el conductor responde TODAS las preguntas de su empresa,
// ni una de mas ni una de menos. Devuelve null si estan todas, o el error.
export const faltanPreguntas = (preguntasEfectivas, respuestas) => {
    const esperadas = new Set(preguntasEfectivas.map((p) => p.id));
    const dadas = new Set(respuestas.map((r) => Number(r.pregunta_id)));
    const completas = esperadas.size === dadas.size && [...esperadas].every((id) => dadas.has(id));
    return completas ? null : `Se requieren las ${esperadas.size} respuestas de aptitud`;
};

// ¿Quien puede cambiar un elemento? (HU-12.3, HU-13, HU-13.5)
//   - lo base: solo el superadmin, desde afuera de las empresas;
//   - lo propio: el Administrador de empresa de esa empresa, o el superadmin
//     dentro de ella; los demas roles solo miran.
// Devuelve null si puede, o { status, mensaje }.
export const permisoCatalogo = ({ rol, empresaActiva = null, empresaUsuario = null, elemento = null }) => {
    const esSuperadmin = rol === 'superadmin';
    const empresaDelActor = esSuperadmin ? empresaActiva : empresaUsuario;
    const origen = elemento ? origenDe(elemento) : (esSuperadmin && !empresaActiva ? 'base' : 'propio');

    if (origen === 'base') {
        if (!esSuperadmin) return { status: 403, mensaje: MENSAJES_CATALOGO.baseSinPermiso };
        if (empresaActiva) return { status: 403, mensaje: MENSAJES_CATALOGO.baseDesdeAdentro };
        return null;
    }
    if (!(esSuperadmin || rol === 'admin_empresa')) return { status: 403, mensaje: MENSAJES_CATALOGO.soloLectura };
    if (!empresaDelActor) return { status: 403, mensaje: MENSAJES_CATALOGO.soloLectura };
    // Lo propio de otra empresa no existe para el (RN-01).
    if (elemento && elemento.empresa_id !== empresaDelActor) return { status: 404, mensaje: 'Elemento no encontrado' };
    return null;
};
