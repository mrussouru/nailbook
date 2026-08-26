import { supabase } from "../../supabaseClient";

export async function guardarRendicion(datos) {

    const { error } = await supabase
        .from("rendiciones")
        .insert(datos);

    if (error) throw error;

}

export async function generarRendiciones(resumen, fechaDesde, fechaHasta) {

    for (const item of resumen) {

        const porcentaje =
            Number(item.profesional.porcentaje || 0);

        const montoProfesional =
            item.facturacion * porcentaje / 100;

        const montoSalon =
            item.facturacion - montoProfesional;

            const yaExiste = await existeRendicion(

                item.profesional.id,
            
                fechaDesde,
            
                fechaHasta
            
            );
            
            if (yaExiste) {
            
                continue;
            
            }    

        await guardarRendicion({

            profesional_id: item.profesional.id,

            fecha_desde: fechaDesde,

            fecha_hasta: fechaHasta,

            facturacion: item.facturacion,

            monto_salon: montoSalon,

            monto_profesional: montoProfesional,

            estado: "pendiente"

        });

    }

}

export async function cargarRendiciones() {

    const { data, error } = await supabase
        .from("rendiciones")
        .select(`
            *,
            profesionales (
                nombre,
                color
            )
        `)
        .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];

}

export async function existeRendicion(

    profesionalId,

    fechaDesde,

    fechaHasta

) {

    const { data, error } = await supabase

        .from("rendiciones")

        .select("id")

        .eq("profesional_id", profesionalId)

        .eq("fecha_desde", fechaDesde)

        .eq("fecha_hasta", fechaHasta)

        .limit(1);

    if (error) throw error;

    return data.length > 0;

}

export async function marcarComoPagada(id) {

    const hoy = new Date().toISOString().slice(0,10);

    const { error } = await supabase

        .from("rendiciones")

        .update({

            estado: "pagado",

            fecha_pago: hoy

        })

        .eq("id", id);

    if (error) throw error;

}

export async function cargarDetalleRendicion(rendicion) {

    const { data, error } = await supabase

        .from("turnos")

        .select(`
            *,
            servicios(*),
            profesionales(*)
        `)

        .eq("profesional_id", rendicion.profesional_id)

        .gte("fecha", rendicion.fecha_desde)

        .lte("fecha", rendicion.fecha_hasta)

        .neq("estado", "cancelado")

        .order("fecha")

        .order("hora");

    if (error) throw error;

    return data;

}