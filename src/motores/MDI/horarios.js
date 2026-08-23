import { ejecutarMDI } from "./index";

export function obtenerHorariosDisponibles({

    fecha,

    servicioId,

    profesionalId,

    horarios,

    profesionales,

    relaciones,

    turnos,

    servicios

}) {

    const disponibles = [];

    for (const hora of horarios) {

        const resultado = ejecutarMDI({

            fecha,

            hora,

            servicioId,

            profesionalId,

            profesionales,

            relaciones,

            turnos,

            servicios

        });

        if (resultado.disponible) {

            disponibles.push(hora);

        }

    }

    return disponibles;

}