import { supabase, crearClienteAuth } from '../config/supabase.js'
import { normalizarTelefono, validarTelefono } from '../utils/telefono.js';
import { normalizarDocumento, validarDocumento } from '../utils/documento.js';
import { generarPasswordTemporal, contarAdminsActivos, registrarAuditoria, } from '../services/usuarios.service.js';
import { obtenerScope, usuarioEnScope } from '../services/scope.service.js';
import { puedeCrearRol, puedeGestionarRol, ETIQUETA_ROL, rolEfectivo as rolEfectivoActor } from '../services/jerarquia.service.js';
import { mapaSuplenciasVigentes, suplenciaVigenteDePool } from '../services/suplencias.service.js';


// Helper: indexa los emails de auth.users por id para hacer merge con la tabla usuarios.
// El email vive en auth.users (no en usuarios) porque Supabase Auth gestiona credenciales.
const obtenerMapaDeEmails = async () => {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
        console.warn('[emails] Error en supabase.auth.admin.listUsers:', error.message);
        return {};
    }
    const mapa = {};
    (data?.users || []).forEach((u) => { mapa[u.id] = u.email; });
    return mapa;
};

// Helper multinivel (#102): verifica que el admin pueda actuar sobre el usuario
// objetivo. Comprueba dos cosas:
//   1) scope territorial: el objetivo esta dentro del area del admin.
//   2) jerarquia (opcional): el objetivo es de rango inferior (para acciones que
//      modifican; en acciones de solo-lectura basta el scope -> exigirRango:false).
// Devuelve { ok:true, usuario } o { ok:false, status, error }. Sobre uno mismo
// siempre permite (el frontend tiene endpoints propios para el perfil propio).
const verificarAccesoUsuarioObjetivo = async (req, idObjetivo, { exigirRango = true } = {}) => {
    if (idObjetivo === req.usuario.id) return { ok: true, usuario: null };

    const { data: objetivo } = await supabase
        .from('usuarios')
        .select('rol, sede_id, ciudad_id, departamento_id, region_id')
        .eq('id', idObjetivo)
        .maybeSingle();

    if (!objetivo) {
        return { ok: false, status: 404, error: 'Usuario no encontrado' };
    }

    const scope = await obtenerScope(req.usuario);
    if (!usuarioEnScope(scope, objetivo)) {
        return { ok: false, status: 403, error: 'Ese usuario no pertenece a tu area.' };
    }
    if (exigirRango && !puedeGestionarRol(rolEfectivoActor(req.usuario), objetivo.rol)) {
        return {
            ok: false,
            status: 403,
            error: `No puedes gestionar a un "${ETIQUETA_ROL[objetivo.rol] || objetivo.rol}". Solo puedes gestionar usuarios de rango inferior al tuyo.`,
        };
    }
    return { ok: true, usuario: objetivo };
};

// Construye un "ambito" legible para mostrar en la tabla (#102 mejora): de donde
// es / que administra cada usuario, segun su rol. Usa los nombres ya unidos por
// el JOIN (sede/ciudad/departamento/region).
//   - conductor / admin_sede / admin con sede -> su sede (+ ciudad)
//   - admin_departamental -> su departamento (Director Regional)
//   - superadmin          -> nacional
// Devuelve { nivel, etiqueta, ciudad } — ciudad sirve tambien para el filtro.
const construirAmbito = (u) => {
    const rol = u.rol;
    if (rol === 'superadmin') return { nivel: 'nacional', etiqueta: 'Nacional', ciudad: null };
    if (rol === 'admin_departamental') return { nivel: 'departamento', etiqueta: u.departamento?.nombre || '—', ciudad: null };
    // conductor / admin_sede / alias 'admin' con sede
    if (u.sede) return { nivel: 'sede', etiqueta: u.sede.nombre, ciudad: u.sede.ciudad?.nombre || null };
    // alias 'admin' sin sede (admin general previo al multinivel)
    if (rol === 'admin') return { nivel: 'nacional', etiqueta: 'General', ciudad: null };
    return { nivel: null, etiqueta: '—', ciudad: null };
};

export const listarUsuarios = async (req, res) => {
    try {
        const { rol, activo } = req.query;

        let query = supabase
            .from('usuarios')
            .select(`
                *,
                sede:sede_id ( nombre, ciudad:ciudad_id ( nombre ) ),
                ciudad:ciudad_id ( nombre ),
                departamento:departamento_id ( nombre ),
                region:region_id ( nombre )
            `)
            .order('created_at', { ascending: false });

        if (rol) query = query.eq('rol', rol);
        if (activo !== undefined) query = query.eq('activo', activo === 'true');

        const [{ data, error }, mapaEmails, scope] = await Promise.all([
            query,
            obtenerMapaDeEmails(),
            obtenerScope(req.usuario),
        ]);

        if (error) throw error;

        // Filtro multinivel (#102): un admin solo ve a los usuarios dentro de su
        // scope territorial. Lo hacemos en JS porque un usuario puede ser otro
        // administrador cuyo territorio es mas amplio que una sede (ciudad,
        // departamento, region), y un simple .in('sede_id', ...) los dejaria
        // fuera. El superadmin (scope global) ve a todos. El admin siempre se ve
        // a si mismo. (A esta escala — decenas de usuarios — filtrar en memoria
        // es simple y suficiente.)
        const visibles = (data || []).filter(
            (u) => u.id === req.usuario.id || usuarioEnScope(scope, u)
        );

        // Mergeamos el email de auth.users y el ambito legible. Quitamos los
        // objetos crudos del JOIN (sede/ciudad/...) para no inflar la respuesta;
        // el frontend usa `ambito` para mostrar y filtrar.
        const usuariosConEmail = visibles.map((u) => {
            const { sede, ciudad, departamento, region, ...resto } = u;
            return {
                ...resto,
                email: mapaEmails[u.id] || null,
                ambito: construirAmbito(u),
            };
        });

        // Pool · Paso 2: marcar quien tiene una suplencia VIGENTE ahora mismo, para
        // mostrar el indicador "Supliendo" en la tabla.
        const poolIds = usuariosConEmail
            .filter((u) => u.rol === 'conductor' && u.es_pool)
            .map((u) => u.id);
        const mapaSup = await mapaSuplenciasVigentes(poolIds);
        const usuariosFinal = usuariosConEmail.map((u) => {
            const sup = mapaSup.get(u.id);
            return {
                ...u,
                supliendo: !!sup,
                suplencia_hasta: sup ? sup.hasta || null : null,
            };
        });

        res.json({ usuarios: usuariosFinal });
    } catch (err) {
        console.error('Error listando usuarios:', err);
        res.status(500).json({ error: 'Error al listar usuarios' });
    }
};


export const obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        // Multinivel (#102): solo se puede ver a usuarios dentro del area propia.
        const acceso = await verificarAccesoUsuarioObjetivo(req, id, { exigirRango: false });
        if (!acceso.ok) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Traer el email de auth.users por separado
        let email = null;
        try {
            const { data: authUser } = await supabase.auth.admin.getUserById(id);
            email = authUser?.user?.email || null;
        } catch (e) {
            console.warn('No se pudo obtener email de auth:', e.message);
        }

        res.json({ usuario: { ...data, email } });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
};


// Roles que requieren tener una sede asignada obligatoriamente.
// Conductor y admin_sede operan a nivel de una sede especifica, asi que sin
// sede asignada quedarian en estado invalido.
const ROLES_REQUIEREN_SEDE = ['conductor', 'admin_sede'];

// Conductor requiere datos adicionales por ley colombiana: licencia vigente
// (legalidad para conducir) y seguridad social (cobertura ante accidente
// conduciendo el vehiculo de la organizacion).
const validarRequisitosConductor = ({
    rol,
    licencia_numero,
    licencia_categoria,
    licencia_vencimiento,
    eps,
    arl,
}) => {
    if (rol !== 'conductor') return null;
    const faltantes = [];
    if (!licencia_numero?.trim()) faltantes.push('numero de licencia');
    if (!licencia_categoria?.trim()) faltantes.push('categoria de licencia');
    if (!licencia_vencimiento) faltantes.push('fecha de vencimiento de licencia');
    if (!eps?.trim()) faltantes.push('EPS');
    if (!arl?.trim()) faltantes.push('ARL');
    if (faltantes.length === 0) return null;
    return `Para registrar un conductor son obligatorios: ${faltantes.join(', ')}.`;
};

export const crearUsuario = async (req, res) => {
    try {
        const {
            cedula,
            nombre_completo,
            email,
            telefono,
            rol = 'conductor',
            sede_id,
            ciudad_id,
            departamento_id,
            region_id,
            licencia_numero,
            licencia_categoria,
            licencia_vencimiento,
            eps,
            arl,
        } = req.body;

        if (!cedula || !nombre_completo || !email) {
            return res
                .status(400)
                .json({ error: 'cedula, nombre_completo y email son obligatorios' });
        }

        const errorDocumento = validarDocumento(cedula);
        if (errorDocumento) return res.status(400).json({ error: errorDocumento });
        const cedulaLimpia = normalizarDocumento(cedula);

        const errorTelefono = validarTelefono(telefono);
        if (errorTelefono) return res.status(400).json({ error: errorTelefono });

        // Jerarquia (#111): solo se pueden crear usuarios de rango ESTRICTAMENTE
        // inferior al propio. Un admin_sede crea conductores; un superadmin
        // crea cualquier admin pero no otro superadmin.
        if (!puedeCrearRol(rolEfectivoActor(req.usuario), rol)) {
            return res.status(403).json({
                error: `No tienes permiso para crear usuarios con el rol "${ETIQUETA_ROL[rol] || rol}". Solo puedes crear roles inferiores al tuyo.`,
            });
        }

        // Scope territorial: el area asignada (sede/ciudad/departamento/region
        // segun el rol) debe estar dentro del area del admin. El superadmin no
        // tiene limite. El frontend ya ofrece solo opciones validas; esto es la
        // verificacion de seguridad en el servidor.
        const scopeActor = await obtenerScope(req.usuario);
        if (scopeActor.tipo !== 'global') {
            const fueraDeArea =
                (sede_id && !scopeActor.sedeIds.includes(sede_id)) ||
                (ciudad_id && !scopeActor.ciudadIds.includes(ciudad_id)) ||
                (departamento_id && !scopeActor.departamentoIds.includes(departamento_id)) ||
                (region_id && !scopeActor.regionIds.includes(region_id));
            if (fueraDeArea) {
                return res.status(403).json({
                    error: 'No puedes asignar un área (territorio) fuera de la tuya.',
                });
            }
        }

        // Para conductor y admin_sede, la sede es obligatorio
        if (ROLES_REQUIEREN_SEDE.includes(rol) && !sede_id) {
            return res.status(400).json({
                error: `La sede es obligatorio para el rol '${rol}'`,
            });
        }

        // Para conductor: licencia + seguridad social obligatorias
        const errorConductor = validarRequisitosConductor({
            rol,
            licencia_numero,
            licencia_categoria,
            licencia_vencimiento,
            eps,
            arl,
        });
        if (errorConductor) {
            return res.status(400).json({ error: errorConductor });
        }

        const { data: existente } = await supabase
            .from('usuarios')
            .select('id')
            .eq('cedula', cedulaLimpia)
            .maybeSingle();

        if (existente) {
            return res
                .status(400)
                .json({ error: 'Ya existe un usuario con esa cedula' });
        }

        const passwordTemporal = generarPasswordTemporal();

        // crear en supabase auth 
        const { data: authData, error: errAuth } =
            await supabase.auth.admin.createUser({
                email,
                password: passwordTemporal,
                email_confirm: true,
            });

        if (errAuth) {
            return res.status(400).json({ error: errAuth.message });
        }

        const { data: nuevoUsuario, error: errInsert } = await supabase
            .from('usuarios')
            .insert({
                id: authData.user.id,
                cedula: cedulaLimpia,
                nombre_completo,
                telefono: normalizarTelefono(telefono),
                rol,
                sede_id: sede_id || null,
                ciudad_id: ciudad_id || null,
                departamento_id: departamento_id || null,
                region_id: region_id || null,
                debe_cambiar_password: true,
                licencia_numero,
                licencia_categoria,
                licencia_vencimiento,
                eps,
                arl,
                // Conductor del pool (ver docs/diseno-pool-vip.md): solo lo marcan
                // los Directores, y solo aplica al rol conductor.
                es_pool:
                    rol === 'conductor' &&
                    ['superadmin', 'admin_departamental'].includes(req.usuario.rol)
                        ? req.body.es_pool === true
                        : false,
            })
            .select()
            .single();

        if (errInsert) {
            await supabase.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({ error: errInsert.message });
        }

        await registrarAuditoria({
            usuarioAfectadoId: nuevoUsuario.id,
            accionPorId: req.usuario.id,
            accion: 'creado',
            detalles: { email, rol },
        });

        res.status(201).json({
            usuario: nuevoUsuario,
            password_temporal: passwordTemporal,
            email,
        });
    } catch (err) {
        console.error('Error creando usuario:', err);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
};

export const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre_completo,
            telefono,
            foto_url,
            rol,
            sede_id,
            ciudad_id,
            departamento_id,
            region_id,
            licencia_numero,
            licencia_categoria,
            licencia_vencimiento,
            eps,
            arl,
        } = req.body;

        // Traemos los datos actuales del usuario para validar contra el rol real
        if (telefono !== undefined) {
            const errorTelefono = validarTelefono(telefono);
            if (errorTelefono) return res.status(400).json({ error: errorTelefono });
        }

        const { data: usuarioActual } = await supabase
            .from('usuarios')
            .select('rol, licencia_numero, licencia_categoria, licencia_vencimiento, eps, arl, sede_id, ciudad_id, departamento_id, region_id')
            .eq('id', id)
            .maybeSingle();

        if (!usuarioActual) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const scopeActor = await obtenerScope(req.usuario);

        // Multinivel (#102 / #112): solo puedes editar a alguien de tu area y de
        // rango inferior. (Editar el propio perfil va por otro endpoint: /mi-perfil.)
        if (id !== req.usuario.id) {
            if (!usuarioEnScope(scopeActor, usuarioActual)) {
                return res
                    .status(403)
                    .json({ error: 'Ese usuario no pertenece a tu area.' });
            }
            if (!puedeGestionarRol(rolEfectivoActor(req.usuario), usuarioActual.rol)) {
                return res.status(403).json({
                    error: `No puedes editar a un "${ETIQUETA_ROL[usuarioActual.rol] || usuarioActual.rol}". Solo puedes gestionar usuarios de rango inferior al tuyo.`,
                });
            }
        }

        // CAMBIO DE ROL (#102/#111 aplicado a edicion): se permite reasignar el rol,
        // pero solo a rangos ESTRICTAMENTE inferiores al del admin que edita (igual
        // que al crear). Nadie se asciende a si mismo ni asciende a otro a su nivel.
        const rolNuevo = rol && rol !== usuarioActual.rol ? rol : null;
        if (rolNuevo && id === req.usuario.id) {
            // Anti-accidente: nadie se cambia su propio rol (evita p.ej. que el
            // unico superadmin se degrade a si mismo y el sistema quede sin nadie
            // por encima).
            return res.status(400).json({ error: 'No puedes cambiar tu propio rol.' });
        }
        if (rolNuevo && !puedeCrearRol(rolEfectivoActor(req.usuario), rolNuevo)) {
            return res.status(403).json({
                error: `No puedes asignar el rol "${ETIQUETA_ROL[rolNuevo] || rolNuevo}". Solo puedes asignar roles inferiores al tuyo.`,
            });
        }
        // Rol con el que el usuario QUEDARA tras este update (para las validaciones)
        const rolEfectivo = rolNuevo || usuarioActual.rol;

        // La sede es obligatorio para los roles que operan a nivel de sede
        // (validado contra el rol con el que queda, no el que tenia).
        if (ROLES_REQUIEREN_SEDE.includes(rolEfectivo)) {
            const sedeFinal = sede_id !== undefined ? sede_id : usuarioActual.sede_id;
            if (!sedeFinal) {
                return res.status(400).json({
                    error: `La sede es obligatorio para el rol '${rolEfectivo}'`,
                });
            }
        }

        // Scope territorial: el area asignada debe estar dentro del area del admin
        // que edita (mismo control que al crear).
        if (scopeActor.tipo !== 'global') {
            const fueraDeArea =
                (sede_id && !scopeActor.sedeIds.includes(sede_id)) ||
                (ciudad_id && !scopeActor.ciudadIds.includes(ciudad_id)) ||
                (departamento_id && !scopeActor.departamentoIds.includes(departamento_id)) ||
                (region_id && !scopeActor.regionIds.includes(region_id));
            if (fueraDeArea) {
                return res.status(403).json({
                    error: 'No puedes asignar un área (territorio) fuera de la tuya.',
                });
            }
        }

        // Validar requisitos del conductor: tomamos los valores que vienen en el body,
        // o si no vienen, los actuales del usuario en BD. Asi cubrimos updates parciales.
        // (Contra el rol con el que queda: si lo degradan a conductor, debe traer licencia.)
        if (rolEfectivo === 'conductor') {
            const errorConductor = validarRequisitosConductor({
                rol: 'conductor',
                licencia_numero: licencia_numero ?? usuarioActual.licencia_numero,
                licencia_categoria: licencia_categoria ?? usuarioActual.licencia_categoria,
                licencia_vencimiento: licencia_vencimiento ?? usuarioActual.licencia_vencimiento,
                eps: eps ?? usuarioActual.eps,
                arl: arl ?? usuarioActual.arl,
            });
            if (errorConductor) {
                return res.status(400).json({ error: errorConductor });
            }
        }

        // Solo incluir cada campo de territorio si vino en el body (puede ser null
        // si explicitamente se quiere quitar, p.ej. al cambiar de nivel).
        const cambios = {
            nombre_completo,
            telefono: telefono === undefined ? undefined : normalizarTelefono(telefono),
            foto_url,
            licencia_numero,
            licencia_categoria,
            licencia_vencimiento,
            eps,
            arl,
        };
        if (rolNuevo) cambios.rol = rolNuevo;
        if (sede_id !== undefined) cambios.sede_id = sede_id || null;
        if (ciudad_id !== undefined) cambios.ciudad_id = ciudad_id || null;
        if (departamento_id !== undefined) cambios.departamento_id = departamento_id || null;
        if (region_id !== undefined) cambios.region_id = region_id || null;

        // Conductor del pool: solo lo cambian los Directores. Si el usuario deja de
        // ser conductor (rolEfectivo distinto), se apaga la marca por coherencia.
        const actorEsDirector = ['superadmin', 'admin_departamental'].includes(req.usuario.rol);
        if (rolEfectivo !== 'conductor') {
            cambios.es_pool = false;
        } else if (req.body.es_pool !== undefined && actorEsDirector) {
            cambios.es_pool = req.body.es_pool === true;
        }

        // Si deja de ser pool, cerrar sus suplencias activas (ya no puede suplir).
        if (cambios.es_pool === false) {
            await supabase
                .from('suplencias')
                .update({
                    activa: false,
                    desactivada_at: new Date().toISOString(),
                    desactivada_por_id: req.usuario.id,
                })
                .eq('pool_id', id)
                .eq('activa', true);
        }

        const { data, error } = await supabase
            .from('usuarios')
            .update(cambios)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'actualizado',
            detalles: req.body,
        });

        res.json({ usuario: data })
    } catch (err) {
        console.error('Error actualizando usuario:', err);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
};


export const desactivarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.usuario.id) {
            return res
                .status(400)
                .json({ error: 'No puedes desactivarte a ti mismo' });
        }

        const { data: usuario } = await supabase
            .from('usuarios')
            .select('rol, sede_id, ciudad_id, departamento_id, region_id')
            .eq('id', id)
            .single();

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Multinivel (#102): solo puedes desactivar a alguien dentro de tu area...
        const scope = await obtenerScope(req.usuario);
        if (!usuarioEnScope(scope, usuario)) {
            return res
                .status(403)
                .json({ error: 'Ese usuario no pertenece a tu area.' });
        }

        // ...y de rango ESTRICTAMENTE inferior al tuyo (#112): nunca a un admin
        // de tu mismo rango ni superior.
        if (!puedeGestionarRol(rolEfectivoActor(req.usuario), usuario.rol)) {
            return res.status(403).json({
                error: `No puedes desactivar a un "${ETIQUETA_ROL[usuario.rol] || usuario.rol}". Solo puedes gestionar usuarios de rango inferior al tuyo.`,
            });
        }

        if (usuario.rol === 'admin') {
            const adminsActivos = await contarAdminsActivos();
            if (adminsActivos <= 1) {
                return res.status(400).json({
                    error: 'No se puede desactivar al ultimo admin activo',
                });
            }
        }

        const { error } = await supabase
            .from('usuarios')
            .update({ activo: false })
            .eq('id', id);

        if (error) throw error;

        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'desactivado',
        });

        res.json({ mensaje: 'Usuario desactivado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al desactivar usuario' });
    }
};


export const reactivarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: usuario } = await supabase
            .from('usuarios')
            .select('rol, sede_id, ciudad_id, departamento_id, region_id')
            .eq('id', id)
            .single();

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Multinivel (#102 / #112): solo sobre usuarios de tu area y de rango inferior.
        const scope = await obtenerScope(req.usuario);
        if (!usuarioEnScope(scope, usuario)) {
            return res
                .status(403)
                .json({ error: 'Ese usuario no pertenece a tu area.' });
        }
        if (!puedeGestionarRol(rolEfectivoActor(req.usuario), usuario.rol)) {
            return res.status(403).json({
                error: `No puedes reactivar a un "${ETIQUETA_ROL[usuario.rol] || usuario.rol}". Solo puedes gestionar usuarios de rango inferior al tuyo.`,
            });
        }

        const { error } = await supabase
            .from('usuarios')
            .update({ activo: true })
            .eq('id', id);

        if (error) throw error;

        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'reactivado',
        });

        res.json({ mensaje: 'Usuario reactivado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al reactivar usuario' });
    }
};


export const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.usuario.id) {
            return res
                .status(400)
                .json({ error: 'No puedes eliminarte a ti mismo' });
        }

        const { data: usuario } = await supabase
            .from('usuarios')
            .select('rol, nombre_completo, sede_id, ciudad_id, departamento_id, region_id')
            .eq('id', id)
            .single();

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Multinivel (#102): solo puedes eliminar a alguien dentro de tu area...
        const scope = await obtenerScope(req.usuario);
        if (!usuarioEnScope(scope, usuario)) {
            return res
                .status(403)
                .json({ error: 'Ese usuario no pertenece a tu area.' });
        }

        // ...y de rango ESTRICTAMENTE inferior (#112): por seguridad, nadie puede
        // eliminar a un admin de su mismo rango ni superior.
        if (!puedeGestionarRol(rolEfectivoActor(req.usuario), usuario.rol)) {
            return res.status(403).json({
                error: `No puedes eliminar a un "${ETIQUETA_ROL[usuario.rol] || usuario.rol}". Solo puedes gestionar usuarios de rango inferior al tuyo.`,
            });
        }

        if (usuario.rol === 'admin') {
            const adminsActivos = await contarAdminsActivos();
            if (adminsActivos <= 1) {
                return res.status(400).json({
                    error: 'No se puede eliminar al ultimo admin activo',
                });
            }
        }

        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'eliminado',
            detalles: { nombre: usuario.nombre_completo, rol: usuario.rol },
        });

        const { error } = await supabase.auth.admin.deleteUser(id);

        if (error) throw error;

        res.json({ mensaje: 'Usuario eliminado permanentemente' });
    } catch (err) {
        console.error('Error eliminando usuario:', err);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
};


export const resetearPassword = async (req, res) => {
    try {
        const { id } = req.params;

        // Seguridad (suplencia): un suplente (pool actuando como Coordinador) NO puede
        // resetear contrasenas — ni la propia ni la de nadie. Es una accion sensible
        // reservada al Coordinador titular y a los niveles superiores.
        if (req.usuario.suplencia) {
            return res.status(403).json({
                error: 'Como suplente no puedes resetear contrasenas. Eso lo hace el Coordinador titular.',
            });
        }

        // Multinivel (#102 / #112): solo sobre usuarios de tu area y rango inferior.
        const acceso = await verificarAccesoUsuarioObjetivo(req, id);
        if (!acceso.ok) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        const passwordTemporal = generarPasswordTemporal();

        const { error: errAuth } = await supabase.auth.admin.updateUserById(id, {
            password: passwordTemporal,
        });

        if (errAuth) {
            return res.status(400).json({ error: errAuth.message });
        }

        await supabase
            .from('usuarios')
            .update({ debe_cambiar_password: true })
            .eq('id', id);

        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'password_reseteado',
        });

        const { data: authData } = await supabase.auth.admin.getUserById(id);

        res.json({
            mensaje: 'password reseteada',
            password_temporal: passwordTemporal,
            email: authData?.user?.email,
        });
    } catch (err) {
        console.error('Error reseteando password:', err);
        res.status(500).json({ error: 'Error al resetear password' });
    }
};

// -- Cambios sensibles con verificacion del admin --

// Verifica la contrasena del admin logueado. Devuelve true si es correcta.
// Para esto creamos un cliente "anon" temporal y hacemos signInWithPassword.
// Si funciona, la password es correcta; en cualquier otro caso, no.
const verificarPasswordAdmin = async (req, passwordRecibida) => {
    if (!passwordRecibida || !passwordRecibida.trim()) {
        return { ok: false, mensaje: 'Debes ingresar tu contrasena de administrador' };
    }

    // Necesitamos el email del admin para hacer signIn
    const { data: authAdmin } = await supabase.auth.admin.getUserById(req.usuario.id);
    const emailAdmin = authAdmin?.user?.email;
    if (!emailAdmin) {
        return { ok: false, mensaje: 'No se pudo identificar al administrador' };
    }

    // signInWithPassword va contra Supabase Auth, en un cliente DESECHABLE: si se
    // corriera sobre el cliente compartido, este quedaria con la sesion del admin
    // y RLS le negaria todas las consultas siguientes.
    const { data, error } = await crearClienteAuth().auth.signInWithPassword({
        email: emailAdmin,
        password: passwordRecibida,
    });

    if (error || !data?.user) {
        return { ok: false, mensaje: 'Contrasena del administrador incorrecta' };
    }
    return { ok: true };
};

// POST /api/usuarios/:id/cambiar-correo
// Body: { password_admin, nuevo_correo }
export const cambiarCorreo = async (req, res) => {
    try {
        const { id } = req.params;
        const { password_admin, nuevo_correo } = req.body;

        if (!nuevo_correo || !nuevo_correo.trim()) {
            return res.status(400).json({ error: 'El nuevo correo es obligatorio' });
        }
        // Validacion basica de formato (Supabase tambien lo valida)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevo_correo.trim())) {
            return res.status(400).json({ error: 'El correo no tiene un formato valido' });
        }

        // Multinivel (#102 / #112): solo sobre usuarios de tu area y rango inferior.
        const acceso = await verificarAccesoUsuarioObjetivo(req, id);
        if (!acceso.ok) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        const verif = await verificarPasswordAdmin(req, password_admin);
        if (!verif.ok) {
            return res.status(403).json({ error: verif.mensaje });
        }

        // Aplicar el cambio en Supabase Auth
        const { data: actualizado, error: errUpdate } = await supabase.auth.admin.updateUserById(
            id,
            { email: nuevo_correo.trim() }
        );

        if (errUpdate) {
            return res.status(400).json({ error: errUpdate.message });
        }

        // Auditar el cambio
        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'cambio_correo',
            detalles: { nuevo_correo: nuevo_correo.trim() },
        });

        res.json({
            mensaje: 'Correo actualizado correctamente',
            email: actualizado?.user?.email,
        });
    } catch (err) {
        console.error('Error cambiando correo:', err);
        res.status(500).json({ error: err.message || 'Error al cambiar el correo' });
    }
};

// POST /api/usuarios/:id/cambiar-cedula
// Body: { password_admin, nueva_cedula }
export const cambiarCedula = async (req, res) => {
    try {
        const { id } = req.params;
        const { password_admin, nueva_cedula } = req.body;

        if (!nueva_cedula || !String(nueva_cedula).trim()) {
            return res.status(400).json({ error: 'La nueva cedula es obligatoria' });
        }
        const errorDocumento = validarDocumento(nueva_cedula);
        if (errorDocumento) return res.status(400).json({ error: errorDocumento });
        const cedulaLimpia = normalizarDocumento(nueva_cedula);

        // Multinivel (#102 / #112): solo sobre usuarios de tu area y rango inferior.
        const acceso = await verificarAccesoUsuarioObjetivo(req, id);
        if (!acceso.ok) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        const verif = await verificarPasswordAdmin(req, password_admin);
        if (!verif.ok) {
            return res.status(403).json({ error: verif.mensaje });
        }

        // Verificar que la nueva cedula no este ya en uso por otro usuario
        const { data: existente } = await supabase
            .from('usuarios')
            .select('id')
            .eq('cedula', cedulaLimpia)
            .neq('id', id)
            .maybeSingle();

        if (existente) {
            return res.status(400).json({
                error: 'Esa cedula ya esta en uso por otro usuario',
            });
        }

        // Aplicar el cambio
        const { data: actualizado, error: errUpdate } = await supabase
            .from('usuarios')
            .update({ cedula: cedulaLimpia })
            .eq('id', id)
            .select()
            .single();

        if (errUpdate) {
            return res.status(500).json({ error: errUpdate.message });
        }

        // Auditar
        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'cambio_cedula',
            detalles: { nueva_cedula: cedulaLimpia },
        });

        res.json({
            mensaje: 'Cedula actualizada correctamente',
            cedula: actualizado.cedula,
        });
    } catch (err) {
        console.error('Error cambiando cedula:', err);
        res.status(500).json({ error: err.message || 'Error al cambiar la cedula' });
    }
};


// =============================================================================
// GET /api/usuarios/:id/perfil-detalle
// =============================================================================
// Vista de "ficha completa" del usuario para el admin (Tarea #46).
// Trae en una sola respuesta todo lo necesario para la pagina de perfil:
//   - Datos personales del usuario (mismo formato que obtenerUsuario)
//   - Nombre de la sede (join con sedes)
//   - Si es conductor: contadores y resumen del ultimo chequeo
//   - Actividad reciente (ultimas 10 entradas de auditoria_usuarios)
//
// Se hace TODO en el backend en lugar de varias llamadas desde el frontend
// para no abrir varios round-trips de red ni filtrar/joinear en el cliente.
export const obtenerPerfilDetalle = async (req, res) => {
    try {
        const { id } = req.params;

        // Multinivel (#102): solo se puede ver la ficha de usuarios del area propia.
        const acceso = await verificarAccesoUsuarioObjetivo(req, id, { exigirRango: false });
        if (!acceso.ok) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        // 1) Datos del usuario + sede (join). Si la sede es null no rompe.
        const { data: usuario, error: errUsuario } = await supabase
            .from('usuarios')
            .select(`
                *,
                sedes:sede_id (
                    id,
                    nombre,
                    ciudad_id
                )
            `)
            .eq('id', id)
            .single();

        if (errUsuario || !usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // 2) Email vive en auth.users (separado de la tabla usuarios)
        let email = null;
        try {
            const { data: authUser } = await supabase.auth.admin.getUserById(id);
            email = authUser?.user?.email || null;
        } catch (e) {
            console.warn('[perfil-detalle] no se pudo leer email:', e.message);
        }

        // 3) Si es conductor, traer contadores y ultimo chequeo en paralelo.
        // Si NO es conductor, dejamos las metricas en null (la UI no las mostrara).
        let chequeosResumen = null;
        if (usuario.rol === 'conductor') {
            const [
                { count: chequeosTotal },
                { count: intentosBloqueados },
                { data: ultimoChequeoArr },
            ] = await Promise.all([
                supabase
                    .from('chequeos_preoperacionales')
                    .select('id', { count: 'exact', head: true })
                    .eq('conductor_id', id)
                    .eq('cerrado', true),
                supabase
                    .from('intentos_chequeo_bloqueado')
                    .select('id', { count: 'exact', head: true })
                    .eq('conductor_id', id),
                supabase
                    .from('chequeos_preoperacionales')
                    .select(`
                        id,
                        fecha,
                        fecha_cierre,
                        resultado_estado,
                        resultado_criticidad,
                        cerrado,
                        vehiculos:vehiculo_id ( placa )
                    `)
                    .eq('conductor_id', id)
                    .order('created_at', { ascending: false })
                    .limit(1),
            ]);

            const ultimo = ultimoChequeoArr?.[0] || null;
            chequeosResumen = {
                total_cerrados: chequeosTotal || 0,
                intentos_bloqueados: intentosBloqueados || 0,
                ultimo: ultimo
                    ? {
                          id: ultimo.id,
                          fecha: ultimo.fecha,
                          fecha_cierre: ultimo.fecha_cierre,
                          resultado_estado: ultimo.resultado_estado,
                          resultado_criticidad: ultimo.resultado_criticidad,
                          cerrado: ultimo.cerrado,
                          placa: ultimo.vehiculos?.placa || null,
                      }
                    : null,
            };
        }

        // 4) Actividad reciente: ultimas 10 entradas de auditoria sobre este usuario.
        // Resolvemos el nombre del admin que ejecuto cada accion mediante un map.
        const { data: auditoriaRaw } = await supabase
            .from('auditoria_usuarios')
            .select('id, accion, detalles, created_at, accion_por_id')
            .eq('usuario_afectado_id', id)
            .order('created_at', { ascending: false })
            .limit(10);

        const auditoria = auditoriaRaw || [];
        const idsAdmins = [
            ...new Set(auditoria.map((a) => a.accion_por_id).filter(Boolean)),
        ];

        let mapaAdmins = {};
        if (idsAdmins.length > 0) {
            const { data: admins } = await supabase
                .from('usuarios')
                .select('id, nombre_completo')
                .in('id', idsAdmins);
            (admins || []).forEach((a) => { mapaAdmins[a.id] = a.nombre_completo; });
        }

        const actividadReciente = auditoria.map((a) => ({
            id: a.id,
            accion: a.accion,
            detalles: a.detalles,
            fecha: a.created_at,
            actor_nombre: mapaAdmins[a.accion_por_id] || 'Sistema',
        }));

        // Pool · suplencia: marcar si este usuario (pool) esta supliendo ahora mismo.
        let supliendo = false;
        if (usuario.rol === 'conductor' && usuario.es_pool && usuario.sede_id) {
            supliendo = !!(await suplenciaVigenteDePool(usuario.id));
        }

        // 5) Respuesta unica con todo lo anterior
        const { sedes, ...usuarioSinJoin } = usuario;
        res.json({
            usuario: {
                ...usuarioSinJoin,
                email,
                sede_nombre: sedes?.nombre || null,
                supliendo,
            },
            chequeos: chequeosResumen,
            actividad_reciente: actividadReciente,
        });
    } catch (err) {
        console.error('Error obteniendo perfil detalle:', err);
        res.status(500).json({ error: 'Error al obtener el perfil detalle' });
    }
};