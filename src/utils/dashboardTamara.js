export const METRICAS = [
  { campo: 'facturacion', titulo: 'Facturación registrada', tipo: 'dinero', detalle: 'Importes registrados en atenciones completadas' },
  { campo: 'gastos_totales', titulo: 'Gastos', tipo: 'dinero', inversa: true, detalle: 'Gastos registrados en el período' },
  { campo: 'ganancia', titulo: 'Ganancia', tipo: 'dinero', detalle: 'Facturación registrada menos gastos' },
  { campo: 'margen_porcentaje', titulo: 'Margen', tipo: 'porcentaje', detalle: 'Ganancia sobre facturación registrada' },
  { campo: 'atenciones', titulo: 'Atenciones', tipo: 'cantidad', detalle: 'Turnos completados' },
  { campo: 'ticket_promedio', titulo: 'Ticket promedio', tipo: 'dinero', detalle: 'Importe registrado por atención' },
  { campo: 'clientas_nuevas', titulo: 'Nuevas', tipo: 'cantidad', detalle: 'Primera visita completada registrada en el período' },
  { campo: 'clientas_recurrentes', titulo: 'Recurrentes', tipo: 'cantidad', detalle: 'Con una visita completada registrada anterior' },
  { campo: 'ausencias', titulo: 'Ausencias', tipo: 'cantidad', inversa: true, detalle: 'Citas marcadas como ausentes' },
  { campo: 'valor_perdido_ausencias', titulo: 'Valor perdido', tipo: 'dinero', inversa: true, detalle: 'Valor potencial según precio estimado de ausencias' }
];
const CAMPOS = [...METRICAS.map(m => m.campo), 'gastos_publicidad'];
const FECHAS_COMPARACION = ['comparacion_actual_desde', 'comparacion_actual_hasta', 'comparacion_desde', 'comparacion_hasta'];

function numeroRequerido(valor, campo) {
  if ((typeof valor !== 'number' && typeof valor !== 'string') ||
      (typeof valor === 'string' && !valor.trim()) || !Number.isFinite(Number(valor))) {
    throw new Error(`Falta un valor numérico válido: ${campo}.`);
  }
  return Number(valor);
}

export function fechaValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function objeto(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new Error('La respuesta no tiene el formato esperado.');
  }
}

export function validarResumen(data) {
  if (!Array.isArray(data) || data.length !== 1) throw new Error('No se recibió el resumen del período.');
  const fila = data[0];
  objeto(fila);
  const resultado = { ...fila };
  for (const campo of CAMPOS) resultado[campo] = numeroRequerido(fila[campo], campo);
  if (typeof fila.comparacion_disponible !== 'boolean') throw new Error('Falta el estado de comparación.');
  for (const campo of FECHAS_COMPARACION) {
    if (fila.comparacion_disponible ? !fechaValida(fila[campo]) : fila[campo] !== null) {
      throw new Error('Las fechas comparativas no tienen el formato esperado.');
    }
  }
  if (fila.comparacion_disponible &&
      (fila.comparacion_actual_desde > fila.comparacion_actual_hasta || fila.comparacion_desde > fila.comparacion_hasta)) {
    throw new Error('El rango comparativo recibido no es válido.');
  }
  for (const campo of CAMPOS) {
    for (const sufijo of ['comparable_actual', 'anterior']) {
      const clave = `${campo}_${sufijo}`;
      if (fila.comparacion_disponible) resultado[clave] = numeroRequerido(fila[clave], clave);
      else if (fila[clave] !== null) throw new Error(`Se esperaba NULL en ${clave}.`);
    }
  }
  return resultado;
}

export function validarEvolucion(data, hasta) {
  if (!Array.isArray(data) || data.length !== 6) throw new Error('No se recibió la serie completa de seis meses.');
  const ultimo = new Date(`${hasta.slice(0, 7)}-01T12:00:00Z`);
  return data.map((fila, indice) => {
    objeto(fila);
    const esperado = new Date(ultimo);
    esperado.setUTCMonth(esperado.getUTCMonth() - 5 + indice);
    if (fila.mes !== esperado.toISOString().slice(0, 10)) throw new Error('La serie mensual está incompleta o desordenada.');
    const resultado = { ...fila };
    for (const campo of ['facturacion', 'gastos_totales', 'ganancia', 'margen_porcentaje', 'atenciones', 'ticket_promedio']) {
      resultado[campo] = numeroRequerido(fila[campo], campo);
    }
    return resultado;
  });
}

export function validarServicios(data) {
  if (!Array.isArray(data)) throw new Error('No se recibió el desglose de servicios.');
  return data.map(fila => {
    objeto(fila);
    if (typeof fila.nombre !== 'string' || !fila.nombre.trim() ||
        !(fila.servicio_id === null || (typeof fila.servicio_id === 'string' && fila.servicio_id)) ||
        !(fila.activo === null || typeof fila.activo === 'boolean')) {
      throw new Error('Un servicio no tiene el formato esperado.');
    }
    const resultado = { ...fila };
    for (const campo of ['cantidad', 'facturacion', 'importe_promedio', 'porcentaje_facturacion']) {
      resultado[campo] = numeroRequerido(fila[campo], campo);
    }
    return resultado;
  });
}

export function calcularVariacion(actual, anterior, metrica) {
  const delta = actual - anterior;
  const favorable = delta === 0 ? null : metrica.inversa ? delta < 0 : delta > 0;
  if (metrica.tipo === 'porcentaje') return { valor: delta, unidad: 'pp', favorable, sinBase: false };
  if (anterior > 0) return { valor: delta / anterior * 100, unidad: '%', favorable, sinBase: false };
  // Con cero o una base negativa se muestra diferencia absoluta, sin porcentaje relativo.
  return { valor: delta, unidad: metrica.tipo, favorable, sinBase: true };
}

// Una sesión por período. Cancelar invalida éxitos y errores de sus tres solicitudes.
export function cargarDashboardTamara(cliente, desde, hasta, publicar) {
  let vigente = true;
  const trabajos = [
    ['resumen', 'dashboard_tamara_v2', { p_desde: desde, p_hasta: hasta, p_comparar: true }, validarResumen],
    ['evolucion', 'evolucion_dashboard_tamara', { p_hasta: hasta, p_meses: 6 }, data => validarEvolucion(data, hasta)],
    ['servicios', 'estadisticas_servicios_tamara_v2', { p_desde: desde, p_hasta: hasta }, validarServicios]
  ];
  const terminado = Promise.all(trabajos.map(async ([seccion, rpc, parametros, validar]) => {
    publicar(seccion, { cargando: true, error: '', datos: null });
    try {
      const { data, error } = await cliente.rpc(rpc, parametros);
      if (!vigente) return;
      if (error) throw new Error('No se pudo consultar esta sección. Intentá nuevamente.');
      const datos = validar(data);
      if (vigente) publicar(seccion, { cargando: false, error: '', datos });
    } catch (error) {
      if (vigente) publicar(seccion, { cargando: false, error: error.message || 'No se pudo cargar esta sección.', datos: null });
    }
  }));
  return { cancelar: () => { vigente = false; }, terminado };
}
