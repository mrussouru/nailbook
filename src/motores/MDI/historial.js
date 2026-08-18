// ===========================================
// MDI
// Historial de asignaciones
// ===========================================

export function calcularHistorial(
    carga,
    turnos
) {

    return carga.map(item => {

        const ultimoTurno = turnos
            .filter(t =>
                t.profesional_id === item.profesional.id &&
                t.estado !== "cancelado"
            )
            .sort((a, b) => {

                const fechaA = `${a.fecha} ${a.hora}`;
                const fechaB = `${b.fecha} ${b.hora}`;

                return fechaB.localeCompare(fechaA);

            })[0];

        return {

            ...item,

            ultimoTurno

        };

    });

}