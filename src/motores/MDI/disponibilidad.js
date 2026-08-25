import { estaDisponible } from "./estaDisponible";

// ===========================================
// MDI
// Buscar profesionales disponibles
// ===========================================

export function buscarDisponibles(
    candidatas,
    fecha,
    hora,
    turnos,
    servicios,
    servicioId,
    licencias
) {

    const disponibles = [];
    let motivo = "No hay profesionales disponibles.";

    for (const profesional of candidatas) {

        const resultado = estaDisponible({

            profesionalId: profesional.id,

            fecha,

            hora,

            servicioId,

            turnos,

            servicios,

            licencias

        });

        if (resultado.disponible) {

            disponibles.push(profesional);

        } else {

            motivo = resultado.motivo;

        }

    }

    return {

        disponibles,

        motivo

    };

}