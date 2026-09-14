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

        const totales = grupo.turnos.reduce(

            (acumulado, turno) => {
                const precio = Number(turno.precio || 0);
                const tieneMontosCongelados =
                    turno.monto_profesional !== null &&
                    turno.monto_profesional !== undefined &&
                    turno.monto_salon !== null &&
                    turno.monto_salon !== undefined;

                let montoProfesionalTurno;
                let montoSalonTurno;

                if (tieneMontosCongelados) {
                    montoProfesionalTurno = Number(turno.monto_profesional);
                    montoSalonTurno = Number(turno.monto_salon);
                } else {
                    const porcentaje = Number(
                        grupo.profesional.porcentaje || 0
                    );
                    montoProfesionalTurno =
                        precio * porcentaje / 100;
                    montoSalonTurno =
                        precio - montoProfesionalTurno;
                }

                return {
                    facturacion: acumulado.facturacion + precio,
                    montoProfesional:
                        acumulado.montoProfesional + montoProfesionalTurno,
                    montoSalon:
                        acumulado.montoSalon + montoSalonTurno
                };
            },

            {
                facturacion: 0,
                montoProfesional: 0,
                montoSalon: 0
            }

        );

        const {
            facturacion,
            montoProfesional,
            montoSalon
        } = totales;


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