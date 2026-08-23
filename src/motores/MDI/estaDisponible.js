import { horaAMinutos } from "../../helpers";

// ===========================================
// MDI
// Disponibilidad real de una profesional
// ===========================================

export function estaDisponible({

    profesionalId,

    fecha,

    hora,

    servicioId,

    turnos,

    servicios,

    ignorarId = null

}) {

    const servicioNuevo = servicios.find(s => s.id === servicioId);

    if (!servicioNuevo) {

        return {

            disponible: false,

            motivo: "Servicio inexistente"

        };

    }

    const inicioNuevo = horaAMinutos(hora);

    const finNuevo = inicioNuevo + servicioNuevo.duracion;

    const choque = turnos.find(turno => {

        if (turno.id === ignorarId) return false;

        if (turno.estado === "cancelado") return false;

        if (turno.fecha !== fecha) return false;

        // 👇 ESTE ES EL CAMBIO MÁS IMPORTANTE
        if (turno.profesional_id !== profesionalId) return false;

        const servicioExistente = servicios.find(

            s => s.id === turno.servicio

        );

        if (!servicioExistente) return false;

        const inicioExistente = horaAMinutos(turno.hora);

        const finExistente =

            inicioExistente + servicioExistente.duracion;

        return (

            inicioNuevo < finExistente &&

            inicioExistente < finNuevo

        );

    });

    if (choque) {

        return {

            disponible: false,

            motivo: `Se superpone con ${choque.cliente}`

        };

    }

    return {

        disponible: true,

        motivo: ""

    };

}