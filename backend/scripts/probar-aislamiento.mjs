// Prueba de aislamiento entre empresas (pacto para-empresas, OB-04 · RNF-04 · HU-06.1-2).
//
// Crea dos empresas de prueba ("TST A" y "TST B") con una sede, un usuario de
// cada rol, un vehiculo, un chequeo y un aviso; despues entra como cada usuario
// de A y recorre la API:
//   - en cada LISTADO, la respuesta no puede contener nada de B;
//   - cada DETALLE de algo de B tiene que responder 404 ("No encontrado").
// Al final borra todo lo de prueba, pase lo que pase.
//
// Uso (con el backend corriendo en local y la migracion de empresas aplicada):
//   node scripts/probar-aislamiento.mjs
// Sale con codigo 1 si encuentra alguna filtracion.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const API = process.env.API_PRUEBA || 'http://localhost:3001/api';
const nuevo = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});
const s = nuevo();
const creados = { usuarios: [], empresas: [] };

const sesion = async (email) => {
    const { data } = await nuevo().auth.admin.generateLink({ type: 'magiclink', email });
    const { data: v, error } = await nuevo().auth.verifyOtp({ type: 'magiclink', token_hash: data.properties.hashed_token });
    if (error) throw error;
    return v.session.access_token;
};

const crearUsuario = async (email, perfil) => {
    const { data, error } = await s.auth.admin.createUser({ email, password: crypto.randomUUID() + 'Aa1*', email_confirm: true });
    if (error) throw new Error(`${email}: ${error.message}`);
    creados.usuarios.push(data.user.id);
    const { error: e2 } = await s.from('usuarios').insert({ id: data.user.id, activo: true, ...perfil });
    if (e2) throw new Error(`${email}: ${e2.message}`);
    return data.user.id;
};

const armarEmpresa = async (letra, ciudad, cedulaBase) => {
    const { data: empresa, error } = await s.from('empresas')
        .insert({ nombre: `TST ${letra}`, limite_sedes: 5, limite_vehiculos: 10 }).select('id').single();
    if (error) throw new Error(`empresa ${letra}: ${error.message}`);
    creados.empresas.push(empresa.id);
    const e = empresa.id;
    const { data: sede } = await s.from('sedes').insert({ nombre: `TST Sede ${letra}`, ciudad_id: ciudad.id, empresa_id: e }).select('id').single();
    const u = {};
    u.admin_empresa = await crearUsuario(`prueba.${letra.toLowerCase()}.empresa@sisvia.test`, { nombre_completo: `TST ${letra} Dueño`, cedula: `${cedulaBase}1`, rol: 'admin_empresa', empresa_id: e });
    u.admin_departamental = await crearUsuario(`prueba.${letra.toLowerCase()}.regional@sisvia.test`, { nombre_completo: `TST ${letra} Regional`, cedula: `${cedulaBase}2`, rol: 'admin_departamental', empresa_id: e, departamento_id: ciudad.departamento_id });
    u.admin_sede = await crearUsuario(`prueba.${letra.toLowerCase()}.coordinador@sisvia.test`, { nombre_completo: `TST ${letra} Coordinador`, cedula: `${cedulaBase}3`, rol: 'admin_sede', empresa_id: e, sede_id: sede.id });
    u.conductor = await crearUsuario(`prueba.${letra.toLowerCase()}.conductor@sisvia.test`, { nombre_completo: `TST ${letra} Conductor`, cedula: `${cedulaBase}4`, rol: 'conductor', empresa_id: e, sede_id: sede.id, licencia_numero: 'L-TST', licencia_categoria: 'C2' });
    u.pool = await crearUsuario(`prueba.${letra.toLowerCase()}.pool@sisvia.test`, { nombre_completo: `TST ${letra} Pool`, cedula: `${cedulaBase}5`, rol: 'conductor', es_pool: true, empresa_id: e, sede_id: sede.id, licencia_numero: 'L-TST', licencia_categoria: 'C2' });
    const { data: veh } = await s.from('vehiculos').insert({ placa: `TS${letra}123`, marca: 'Prueba', tipo: 'camion', activo: true, sede_id: sede.id, empresa_id: e }).select('id').single();
    const { data: ch } = await s.from('chequeos_preoperacionales').insert({ vehiculo_id: veh.id, conductor_id: u.conductor, sede_id: sede.id, tipo: 'preoperacional', kilometraje: 1000, empresa_id: e }).select('id').single();
    await s.from('notificaciones').insert({ destinatario_id: u.admin_empresa, tipo: 'prueba', titulo: `TST ${letra} aviso`, mensaje: `aviso de TST ${letra}` });
    return { empresa: e, sede: sede.id, usuarios: u, vehiculo: veh.id, chequeo: ch?.id };
};

const limpiar = async () => {
    for (const e of creados.empresas) {
        const { data: vs } = await s.from('vehiculos').select('id').eq('empresa_id', e);
        const vIds = (vs || []).map((v) => v.id);
        if (vIds.length) {
            await s.from('chequeos_preoperacionales').delete().in('vehiculo_id', vIds);
            await s.from('auditoria_vehiculos').delete().in('vehiculo_id', vIds);
            await s.from('vehiculos').delete().in('id', vIds);
        }
        await s.from('intentos_chequeo_bloqueado').delete().eq('empresa_id', e);
    }
    for (const id of creados.usuarios) {
        await s.from('notificaciones').delete().eq('destinatario_id', id);
        await s.from('auditoria_usuarios').delete().eq('usuario_afectado_id', id);
        await s.from('usuarios').delete().eq('id', id);
        await s.auth.admin.deleteUser(id);
    }
    for (const e of creados.empresas) {
        await s.from('sedes').delete().eq('empresa_id', e);
        await s.from('auditoria_empresas').delete().eq('empresa_id', e);
        await s.from('empresas').delete().eq('id', e);
    }
};

const LISTADOS = [
    '/auth/me', '/usuarios', '/vehiculos', '/chequeos', '/chequeos/intentos-bloqueados', '/chequeos/mios',
    '/chequeos/vehiculos-disponibles', '/dashboard/stats', '/notificaciones', '/geo/sedes', '/suplencias',
    '/catalogo-admin/categorias', '/catalogo-admin/items', '/export/reporte/chequeos',
];

let fallas = 0;
const falla = (msg) => { fallas++; console.log('  FALLA ·', msg); };

try {
    const { data: ciudad } = await s.from('ciudades').select('id, departamento_id').limit(1).single();
    // Las dos empresas en la MISMA ciudad: el Director Regional de A comparte departamento con B (HU-06.3).
    const A = await armarEmpresa('A', ciudad, '7100000');
    const B = await armarEmpresa('B', ciudad, '7200000');
    const huellasB = [B.empresa, B.sede, B.vehiculo, B.chequeo, ...Object.values(B.usuarios), 'TST B', 'TSB123'].filter(Boolean);

    // Cada detalle se pide de A (lo propio) y de B (lo ajeno). Si lo propio ya da
    // 403, la ruta no es para ese rol y el 403 de lo ajeno no dice nada de B.
    const DETALLES = [
        ['/vehiculos/:id', A.vehiculo, B.vehiculo],
        ['/usuarios/:id', A.usuarios.conductor, B.usuarios.conductor],
        ['/usuarios/:id/perfil-detalle', A.usuarios.conductor, B.usuarios.conductor],
        ['/chequeos/:id', A.chequeo, B.chequeo],
        ['/export/vehiculo/:id', A.vehiculo, B.vehiculo],
        ['/export/conductor/:id', A.usuarios.conductor, B.usuarios.conductor],
        ['/export/chequeo/:id', A.chequeo, B.chequeo],
    ];

    for (const [rol, id] of Object.entries(A.usuarios).filter(([r]) => r !== 'pool')) {
        const { data: au } = await s.auth.admin.getUserById(id);
        const token = await sesion(au.user.email);
        const pedir = (ruta) => fetch(API + ruta, { headers: { Authorization: `Bearer ${token}` } });
        console.log(`\n${rol} de A`);
        for (const ruta of LISTADOS) {
            const r = await pedir(ruta);
            if (r.status >= 500) { falla(`${ruta} respondió ${r.status}`); continue; }
            const texto = await r.text();
            const vistas = huellasB.filter((h) => texto.includes(h));
            if (vistas.length) falla(`${ruta} muestra datos de B (${vistas.length} coincidencias)`);
        }
        // El Administrador de empresa tiene que poder abrir lo de SU empresa (si no, la
        // prueba pasaria solo porque todo le responde 403).
        if (rol === 'admin_empresa') {
            for (const ruta of ['/vehiculos', `/vehiculos/${A.vehiculo}`, '/usuarios', `/usuarios/${A.usuarios.conductor}`, '/geo/sedes', '/dashboard/stats']) {
                const r = await pedir(ruta);
                if (r.status !== 200) falla(`el Administrador de empresa no puede abrir ${ruta} de su propia empresa (${r.status})`);
            }
        }
        for (const [patron, propio, ajeno] of DETALLES) {
            const rB = await pedir(patron.replace(':id', ajeno));
            if (rB.status === 404) continue;
            const rA = await pedir(patron.replace(':id', propio));
            if (rB.status === 403 && rA.status === 403) continue; // la ruta no es para este rol
            falla(`${patron} con algo de B respondió ${rB.status} (se esperaba 404)`);
        }
    }

    // HU-06.4 · un pool de A no puede suplir en una sede de B (misma ciudad y departamento)
    const { activarSuplencia } = await import('../src/services/suplencias.service.js');
    const { data: regionalA } = await s.from('usuarios').select('*').eq('id', A.usuarios.admin_departamental).single();
    let suplenciaAceptada = false;
    try {
        await activarSuplencia({ actor: regionalA, poolId: A.usuarios.pool, alcance: 'sede', sedeId: B.sede, motivo: 'prueba de aislamiento' });
        suplenciaAceptada = true;
    } catch (e) {
        console.log('\nHU-06.4 · suplencia de A en una sede de B rechazada:', e.message);
    }
    if (suplenciaAceptada) falla('HU-06.4 · se activó una suplencia de un pool de A en una sede de B');

    // HU-06.5 · un aviso de una sede de B solo les llega a los de B
    const { crearNotificacion } = await import('../src/services/notificaciones.service.js');
    await crearNotificacion({ tipo: 'prueba_aislamiento', titulo: 'TST aviso de sede B', mensaje: 'prueba', sede_id: B.sede });
    const { data: recibidos } = await s.from('notificaciones').select('destinatario_id').eq('titulo', 'TST aviso de sede B');
    const destinos = new Set((recibidos || []).map((r) => r.destinatario_id));
    if (Object.values(A.usuarios).some((id) => destinos.has(id))) falla('HU-06.5 · un aviso de una sede de B le llegó a alguien de A');
    if (!destinos.has(B.usuarios.admin_empresa)) falla('HU-06.5 · el aviso de B no le llegó a su Administrador de empresa');
    else console.log('HU-06.5 · aviso de B: le llegó a', destinos.size, 'usuarios, todos de B');
} catch (e) {
    fallas++;
    console.log('ERROR armando la prueba:', e.message);
} finally {
    await limpiar();
    const { count } = await s.from('empresas').select('id', { count: 'exact', head: true }).like('nombre', 'TST %');
    console.log(`\nLimpieza: quedan ${count} empresas de prueba.`);
}

console.log(fallas ? `\n${fallas} filtraciones o errores.` : '\nSin filtraciones: ninguna empresa ve datos de la otra.');
process.exit(fallas ? 1 : 0);
