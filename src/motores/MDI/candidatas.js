// ===========================================
// MDI
// Buscar profesionales candidatas
// ===========================================

export function buscarCandidatas(
    servicioId,
    profesionales,
    relaciones,
    profesionalId = ""
) {

    // =====================================
    // Si el usuario eligió una profesional,
    // solo evaluamos esa.
    // =====================================

    if (profesionalId) {

        return profesionales.filter(profesional =>

            profesional.id === profesionalId &&
            profesional.activa &&
            relaciones.some(relacion =>

                relacion.profesional_id === profesional.id &&
                relacion.servicio_id === servicioId

            )

        );

    }

    // =====================================
    // Asignación automática
    // =====================================

    return profesionales.filter(profesional =>

        profesional.activa &&

        relaciones.some(relacion =>

            relacion.profesional_id === profesional.id &&
            relacion.servicio_id === servicioId

        )

    );

}