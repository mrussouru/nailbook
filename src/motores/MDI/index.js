import { buscarCandidatas } from "./candidatas";
import { buscarDisponibles } from "./disponibilidad";
import { calcularCarga } from "./carga";
import { calcularHistorial } from "./historial";
import { decidirProfesional } from "./decision";

export function ejecutarMDI(datos) {

    const candidatas = buscarCandidatas(

        datos.servicioId,

        datos.profesionales,

        datos.relaciones,

        datos.profesionalId

    );

    // ======================================
    // Buscar profesionales disponibles
    // ======================================

    const resultadoDisponibilidad = buscarDisponibles(

        candidatas,

        datos.fecha,

        datos.hora,

        datos.turnos,

        datos.servicios,

        datos.servicioId,

        datos.licencias || []

    );

    const disponibles = resultadoDisponibilidad.disponibles;

    // ======================================
    // Calcular carga
    // ======================================

    const carga = calcularCarga(

        disponibles,

        datos.fecha,

        datos.turnos,

        datos.servicios

    );

    // ======================================
    // Calcular historial
    // ======================================

    const historial = calcularHistorial(

        carga,

        datos.turnos

    );

    // ======================================
    // Decidir profesional
    // ======================================

    const decision = decidirProfesional(

        historial

    );

    return {

        candidatas,

        disponibles,

        carga,

        historial,

        motivoDisponibilidad: resultadoDisponibilidad.motivo,

        ...decision

    };

}