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
  
  const totales = turnosDelPeriodo.reduce((acumulado, turno) => {

    const precio = Number(turno.precio || 0);
    const tieneMontosCongelados =
      turno.monto_profesional !== null &&
      turno.monto_profesional !== undefined &&
      turno.monto_salon !== null &&
      turno.monto_salon !== undefined;

    let montoProfesional;
    let montoSalon;

    if (tieneMontosCongelados) {
      montoProfesional = Number(turno.monto_profesional);
      montoSalon = Number(turno.monto_salon);
    } else {
      const porcentaje = Number(profesional.porcentaje || 0);
      montoProfesional = precio * porcentaje / 100;
      montoSalon = precio - montoProfesional;
    }

    return {
      facturacion: acumulado.facturacion + precio,
      montoProfesional: acumulado.montoProfesional + montoProfesional,
      montoSalon: acumulado.montoSalon + montoSalon
    };

  }, {
    facturacion: 0,
    montoProfesional: 0,
    montoSalon: 0
  });
  
        return {
  
          profesional,
  
          turnos: turnosDelPeriodo,
  
          cantidadTurnos: turnosDelPeriodo.length,
  
          facturacion: totales.facturacion,

          montoProfesional: totales.montoProfesional,

          montoSalon: totales.montoSalon
  
        };
  
      })
  
      .filter(r => r.cantidadTurnos > 0);
  
  }