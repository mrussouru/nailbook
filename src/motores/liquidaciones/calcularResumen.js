// ===========================================
// Motor Liquidaciones
// Resumen por profesional
// ===========================================

export function calcularResumen(
    turnos,
    servicios,
    profesionales,
    fecha
  ) {
  
    return profesionales
      .map(profesional => {
  
        const turnosDelDia = turnos.filter(turno =>
  
          turno.profesional_id === profesional.id &&
          turno.fecha === fecha &&
          turno.estado !== "cancelado"
  
        );
  
        const facturacion = turnosDelDia.reduce((total, turno) => {
  
          const servicio = servicios.find(
            s => s.id === turno.servicio
          );
  
          return total + Number(servicio?.precio || 0);
  
        }, 0);
  
        return {
  
          profesional,
  
          turnos: turnosDelDia,
  
          cantidadTurnos: turnosDelDia.length,
  
          facturacion
  
        };
  
      })
  
      .filter(r => r.cantidadTurnos > 0);
  
  }