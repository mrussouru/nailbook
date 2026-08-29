// ===========================================
// Motor Liquidaciones
// Resumen por profesional
// ===========================================

import { filtrarTurnosPorPeriodo } from "../fechas/filtros";

export function calcularResumen(
  turnos,
  servicios,
  profesionales,
  fecha,
  periodo = "hoy",
  fechaDesde = null,
  fechaHasta = null
) {
  
    return profesionales
      .map(profesional => {


        const turnosFiltrados =
    filtrarTurnosPorPeriodo(
        turnos,
        fecha,
        periodo,
        fechaDesde,
        fechaHasta
    );

    const turnosDelPeriodo = turnosFiltrados.filter(turno => {

      if (turno.profesional_id !== profesional.id) return false;

      // Producción solamente contempla turnos realizados
      if (turno.estado !== "completado") return false;

      return true;
  
  });
  
  const facturacion = turnosDelPeriodo.reduce((total, turno) => {

    return total + Number(turno.precio || 0);
  
  }, 0);
  
        return {
  
          profesional,
  
          turnos: turnosDelPeriodo,
  
          cantidadTurnos: turnosDelPeriodo.length,
  
          facturacion
  
        };
  
      })
  
      .filter(r => r.cantidadTurnos > 0);
  
  }