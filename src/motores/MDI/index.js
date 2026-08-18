import { buscarCandidatas } from "./candidatas";
import { buscarDisponibles } from "./disponibilidad";
import { calcularCarga } from "./carga";
import { calcularHistorial } from "./historial";
import { decidirProfesional } from "./decision";

export function ejecutarMDI(datos){

    const candidatas = buscarCandidatas(

        datos.servicioId,

        datos.profesionales,

        datos.relaciones

    );

    const disponibles = buscarDisponibles(

        candidatas,

        datos.fecha,

        datos.hora,

        datos.turnos

    );

    const carga = calcularCarga(

        disponibles,

        datos.fecha,

        datos.turnos,

        datos.servicios

    );

    const historial = calcularHistorial(

        carga,
    
        datos.turnos
    
    );

    const decision = decidirProfesional(

        historial
    
    );


    return {

        candidatas,
    
        disponibles,
    
        carga,
    
        historial,
    
        ...decision
    
    };

}