// ===========================================
// MDI
// Buscar profesionales disponibles
// ===========================================

export function buscarDisponibles(
  candidatas,
  fecha,
  hora,
  turnos
){

  return candidatas.filter(profesional =>

      !turnos.some(turno =>

          turno.profesional_id === profesional.id &&
          turno.fecha === fecha &&
          turno.hora === hora &&
          turno.estado !== "cancelado"

      )

  );

}