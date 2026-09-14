// ===========================================
// Motor Liquidaciones
// Totales generales
// ===========================================

export function calcularTotales(resumen) {

    const facturacion = resumen.reduce(
      (total, item) => total + Number(item.facturacion || 0),
      0
    );

    const profesionales = resumen.reduce(
      (total, item) => total + Number(item.montoProfesional || 0),
      0
    );

    const salon = resumen.reduce(
      (total, item) => total + Number(item.montoSalon || 0),
      0
    );

    return {
      facturacion,
      profesionales,
      salon
    };

}
