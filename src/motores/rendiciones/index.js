import { supabase } from "../../supabaseClient";
import { cargarUsuario } from "../auth";


// ==========================================
// GUARDAR RENDICIÓN
// ==========================================

export async function guardarRendicion(datos) {

    const { data, error } = await supabase
        .from("rendiciones")
        .insert(datos)
        .select()
        .single();

    if (error) throw error;

    return data;

}


// ==========================================
// CARGAR RENDICIONES
// ==========================================

export async function cargarRendiciones() {

    const usuario = await cargarUsuario();

    let consulta = supabase
        .from("rendiciones")
        .select(`
            *,
            profesionales (
                nombre,
                color
            )
        `);

    // Si es profesional, solamente ve sus rendiciones
    if (usuario?.rol === "profesional") {

        consulta = consulta.eq(
            "profesional_id",
            usuario.profesional_id
        );

    }

    const { data, error } = await consulta.order(
        "created_at",
        { ascending: false }
    );

    if (error) throw error;

    return data || [];

}


// ==========================================
// MARCAR RENDICIÓN COMO PAGADA
// ==========================================

export async function marcarComoPagada(id) {

    const hoy = new Date()
        .toISOString()
        .slice(0, 10);

    const { error } = await supabase
        .from("rendiciones")
        .update({
            estado: "pagado",
            fecha_pago: hoy
        })
        .eq("id", id);

    if (error) throw error;

}


// ==========================================
// CARGAR DETALLE DE UNA RENDICIÓN
// ==========================================

export async function cargarDetalleRendicion(rendicion) {

    const { data, error } = await supabase
        .from("turnos")
        .select(`
            *,
            servicios(*),
            profesionales(*)
        `)
        .eq("rendicion_id", rendicion.id)
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true });

    if (error) throw error;

    return data || [];

}


// ==========================================
// ASIGNAR TURNOS EXACTOS A UNA RENDICIÓN
// ==========================================

export async function asignarTurnosARendicion(
    turnos,
    rendicionId
) {

    const ids = turnos.map(t => t.id);

    if (ids.length === 0) return;

    const { error } = await supabase
        .from("turnos")
        .update({
            rendicion_id: rendicionId
        })
        .in("id", ids);

    if (error) throw error;

}


// ==========================================
// COMPROBAR SI QUEDAN TURNOS SIN RENDIR
// ==========================================

export async function hayTurnosSinRendicion() {

    const { data, error } = await supabase
        .from("turnos")
        .select("id")
        .is("rendicion_id", null)
        .eq("estado", "completado") 
        .limit(1);

    if (error) throw error;

    return data.length > 0;

}