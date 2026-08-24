// ===========================================
// Motor Liquidaciones
// Totales generales
// ===========================================

export function calcularTotales(resumen) {

    const facturacion = resumen.reduce(
  
      (t, r) => t + r.facturacion,
  
      0
  
    );
  
    const profesionales = resumen.reduce(
  
      (t, r) =>
  
        t +
  
        r.facturacion *
  
        (Number(r.profesional.porcentaje || 0) / 100),
  
      0
  
    );
  
    const salon = facturacion - profesionales;
  
    return {
  
      facturacion,
  
      profesionales,
  
      salon
  
    };
  
  }