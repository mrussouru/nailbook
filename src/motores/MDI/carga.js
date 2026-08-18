// ===========================================
// MDI
// Calcular carga horaria del día
// ===========================================

export function calcularCarga(
    disponibles,
    fecha,
    turnos,
    servicios
) {

    return disponibles.map(profesional => {

        const turnosDelDia = turnos.filter(turno =>

            turno.profesional_id === profesional.id &&
            turno.fecha === fecha &&
            turno.estado !== "cancelado"

        );

        const minutos = turnosDelDia.reduce((total, turno) => {

            const servicio = servicios.find(

                s => s.id === turno.servicio

            );

            return total + (servicio?.duracion || 0);

        }, 0);

        return {

            profesional,

            minutos

        };

    });

}