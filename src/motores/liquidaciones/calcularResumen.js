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
  
      if (turno.estado === "cancelado") return false;
  
      // Si el filtro ya hizo su trabajo,
      // no hace falta volver a comparar la fecha.
  
      return true;
  
  });
  
        const facturacion = turnosDelPeriodo.reduce((total, turno) => {
  
          const servicio = servicios.find(
            s => s.id === turno.servicio
          );
  
          return total + Number(servicio?.precio || 0);
  
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