import { supabase } from "../../supabaseClient";

import {
    guardarRendicion,
    asignarTurnosARendicion
} from "./index";


export async function generarRendicionesPendientes() {

    // ==========================================
    // CARGAR ÚNICAMENTE TURNOS COMPLETADOS
    // QUE TODAVÍA NO FUERON RENDIDOS
    // ==========================================

    const { data: turnos, error } = await supabase
        .from("turnos")
        .select(`
            *,
            profesionales(*),
            servicios(*)
        `)
        .is("rendicion_id", null)
        .eq("estado", "completado")
        .order("profesional_id")
        .order("fecha")
        .order("hora");

    if (error) throw error;


    // ==========================================
    // AGRUPAR TURNOS POR PROFESIONAL
    // ==========================================

    const grupos = {};

    for (const turno of turnos || []) {

        const id = turno.profesional_id;

        if (!grupos[id]) {

            grupos[id] = {
                profesional: turno.profesionales,
                turnos: []
            };

        }

        grupos[id].turnos.push(turno);

    }


    // ==========================================
    // GENERAR UNA RENDICIÓN POR PROFESIONAL
    // ==========================================

    for (const grupo of Object.values(grupos)) {

        const facturacion = grupo.turnos.reduce(

            (total, turno) =>
                total + Number(
                    turno.servicios?.precio || 0
                ),

            0

        );


        const porcentaje = Number(
            grupo.profesional.porcentaje || 0
        );


        const montoProfesional =
            facturacion * porcentaje / 100;


        const montoSalon =
            facturacion - montoProfesional;


        const primeraFecha =
            grupo.turnos[0].fecha;


        const ultimaFecha =
            grupo.turnos[
                grupo.turnos.length - 1
            ].fecha;


        // Crear rendición

        const rendicion = await guardarRendicion({

            profesional_id:
                grupo.profesional.id,

            fecha_desde:
                primeraFecha,

            fecha_hasta:
                ultimaFecha,

            facturacion,

            monto_salon:
                montoSalon,

            monto_profesional:
                montoProfesional,

            estado:
                "pendiente"

        });


        // Vincular únicamente estos turnos
        // con la rendición recién creada

        await asignarTurnosARendicion(

            grupo.turnos,

            rendicion.id

        );

    }

}