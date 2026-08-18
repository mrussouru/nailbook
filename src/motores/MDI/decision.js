// ===========================================
// MDI
// Decidir qué profesional recibe el turno
// ===========================================

export function decidirProfesional(historial) {

    // No hay candidatas
    if (historial.length === 0) {

        return {
            disponible: false,
            motivo: "No hay profesionales disponibles."
        };

    }

    // ======================================
    // 1 - Buscar la menor carga horaria
    // ======================================

    const menorCarga = Math.min(

        ...historial.map(item => item.minutos)

    );

    const empatadas = historial.filter(

        item => item.minutos === menorCarga

    );

    // ======================================
    // 2 - Si hay una sola, ya terminó
    // ======================================

    if (empatadas.length === 1) {

        return {
            disponible: true,
            profesional: empatadas[0].profesional,
            motivo: "Menor carga horaria."
        };

    }

    // ======================================
    // 3 - Buscar quienes nunca tuvieron turno
    // ======================================

    const sinHistorial = empatadas.filter(

        item => !item.ultimoTurno

    );

    if (sinHistorial.length === 1) {

        return {
            disponible: true,
            profesional: sinHistorial[0].profesional,
            motivo: "Profesional sin asignaciones previas."
        };

    }

    if (sinHistorial.length > 1) {

        const elegida = sinHistorial[
            Math.floor(Math.random() * sinHistorial.length)
        ];

        return {
            disponible: true,
            profesional: elegida.profesional,
            motivo: "Empate entre profesionales nuevas."
        };

    }

    // ======================================
    // 4 - Todas tienen historial
    // Elegimos la que hace más tiempo
    // que no recibe un turno.
    // ======================================

    empatadas.sort((a, b) => {

        const fechaA =
            `${a.ultimoTurno.fecha} ${a.ultimoTurno.hora}`;

        const fechaB =
            `${b.ultimoTurno.fecha} ${b.ultimoTurno.hora}`;

        return fechaA.localeCompare(fechaB);

    });

    return {

        disponible: true,

        profesional: empatadas[0].profesional,

        motivo: "Desempate por historial."

    };

}