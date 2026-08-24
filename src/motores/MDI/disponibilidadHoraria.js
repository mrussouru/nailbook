import { buscarCandidatas } from "./candidatas";
import { estaDisponible } from "./estaDisponible";

export function obtenerDisponibilidadHoraria({

    fecha,
    servicioId,
    profesionalId,

    horarios,

    profesionales,
    relaciones,
    turnos,
    servicios

}) {

    return horarios.map(hora => {

        // Si la recepcionista eligió una profesional,
        // solamente evaluamos esa.
        const candidatas = buscarCandidatas(

            servicioId,
            profesionales,
            relaciones,
            profesionalId

        );

        let disponible = false;
        let motivo = "No hay profesionales disponibles";
        let profesionalAsignada = null;

        for (const profesional of candidatas) {

            const resultado = estaDisponible({

                profesionalId: profesional.id,

                fecha,

                hora,

                servicioId,

                turnos,

                servicios

            });

            if (resultado.disponible) {

                disponible = true;
                motivo = "";
            
                profesionalAsignada = profesional;
            
                break;
            
            }

        }

        return {

            hora,
        
            disponible,
        
            motivo,
        
            profesional: profesionalAsignada
        
        };

    });

}