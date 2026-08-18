// ===========================================
// MDI
// Buscar profesionales candidatas
// ===========================================

export function buscarCandidatas(
    servicioId,
    profesionales,
    relaciones
) {

    return profesionales.filter(profesional =>

        profesional.activa &&

        relaciones.some(relacion =>

            relacion.profesional_id === profesional.id &&
            relacion.servicio_id === servicioId

        )

    );

}