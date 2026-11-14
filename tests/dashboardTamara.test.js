import test from 'node:test';
import assert from 'node:assert/strict';
import { METRICAS, validarResumen, validarEvolucion, validarServicios, calcularVariacion, cargarDashboardTamara, fechaValida } from '../src/utils/dashboardTamara.js';

function resumen(comparar = false) {
  const fila = { comparacion_disponible: comparar,
    comparacion_actual_desde: comparar ? '2027-03-01' : null,
    comparacion_actual_hasta: comparar ? '2027-03-28' : null,
    comparacion_desde: comparar ? '2027-02-01' : null,
    comparacion_hasta: comparar ? '2027-02-28' : null };
  for (const campo of [...METRICAS.map(m => m.campo), 'gastos_publicidad']) {
    fila[campo] = '0';
    fila[`${campo}_comparable_actual`] = comparar ? '0' : null;
    fila[`${campo}_anterior`] = comparar ? '0' : null;
  }
  return fila;
}
function evolucion() {
  return Array.from({ length: 6 }, (_, i) => ({ mes: `2026-${String(i + 6).padStart(2, '0')}-01`, facturacion: 0,
    gastos_totales: 0, ganancia: 0, margen_porcentaje: 0, atenciones: 0, ticket_promedio: 0 }));
}

test('resumen conserva cero y NULL comparativo esperado; convierte numeric strings', () => {
  const datos = validarResumen([resumen()]);
  assert.equal(datos.facturacion, 0);
  assert.equal(datos.facturacion_anterior, null);
  assert.equal(datos.comparacion_desde, null);
});

test('resumen rechaza campos ausentes, nulos inesperados, inválidos y respuesta vacía', () => {
  for (const valor of [undefined, null, '', ' ', NaN, Infinity, 'NaN', true, {}]) {
    assert.throws(() => validarResumen([{ ...resumen(), facturacion: valor }]));
  }
  assert.throws(() => validarResumen([]));
  assert.throws(() => validarResumen(null));
  assert.throws(() => validarResumen([{ ...resumen(), comparacion_disponible: undefined }]));
  assert.throws(() => validarResumen([{ ...resumen(), facturacion_anterior: undefined }]));
  assert.throws(() => validarResumen([{ ...resumen(true), facturacion_anterior: null }]));
});

test('contrato conserva principal completo y tramo comparable truncado por separado', () => {
  const datos = validarResumen([{ ...resumen(true), facturacion: 3100, facturacion_comparable_actual: 2800, facturacion_anterior: 1400 }]);
  assert.equal(datos.facturacion, 3100);
  assert.equal(datos.comparacion_actual_hasta, '2027-03-28');
  assert.equal(calcularVariacion(datos.facturacion_comparable_actual, datos.facturacion_anterior, METRICAS[0]).valor, 100);
});

test('variaciones: porcentaje, cero, negativos y margen en puntos porcentuales', () => {
  const ingreso = METRICAS[0];
  assert.equal(calcularVariacion(150, 100, ingreso).valor, 50);
  assert.deepEqual(calcularVariacion(20, 0, ingreso), { valor: 20, unidad: 'dinero', favorable: true, sinBase: true });
  assert.equal(calcularVariacion(0, 0, ingreso).favorable, null);
  assert.equal(calcularVariacion(20, -10, ingreso).sinBase, true);
  const margen = METRICAS.find(m => m.campo === 'margen_porcentaje');
  assert.deepEqual(calcularVariacion(35, 30, margen), { valor: 5, unidad: 'pp', favorable: true, sinBase: false });
  assert.equal(calcularVariacion(5, 0, margen).unidad, 'pp');
});

test('aumentar gastos, ausencias o valor perdido es desfavorable', () => {
  for (const campo of ['gastos_totales', 'ausencias', 'valor_perdido_ausencias']) {
    const metrica = METRICAS.find(m => m.campo === campo);
    assert.equal(calcularVariacion(12, 10, metrica).favorable, false);
    assert.equal(calcularVariacion(8, 10, metrica).favorable, true);
  }
});

test('serie exige seis meses ordenados y acepta meses sin actividad', () => {
  assert.equal(validarEvolucion(evolucion(), '2026-11-14').length, 6);
  assert.throws(() => validarEvolucion([], '2026-11-14'));
  assert.throws(() => validarEvolucion(evolucion().reverse(), '2026-11-14'));
  const filas = evolucion();
  filas[0].ticket_promedio = null;
  assert.throws(() => validarEvolucion(filas, '2026-11-14'));
});

test('servicios muestra manuales recibidos sin inventar categorías y distingue vacío de error', () => {
  const manual = { servicio_id: null, nombre: 'Otros / manual', activo: null, cantidad: '2', facturacion: '150', importe_promedio: '75', porcentaje_facturacion: '100' };
  assert.equal(validarServicios([manual])[0].cantidad, 2);
  assert.equal(validarServicios([manual])[0].nombre, manual.nombre);
  assert.deepEqual(validarServicios([]), []);
  assert.throws(() => validarServicios(null));
  assert.throws(() => validarServicios([{ ...manual, facturacion: undefined }]));
});

test('valida fechas reales incluyendo años bisiestos', () => {
  assert.equal(fechaValida('2028-02-29'), true);
  assert.equal(fechaValida('2027-02-29'), false);
  assert.equal(fechaValida(''), false);
});

test('cambio de período descarta éxitos y errores antiguos de los tres RPC', async () => {
  const pendientes = [];
  const cliente = { rpc: (rpc, parametros) => new Promise((resolve, reject) => pendientes.push({ rpc, parametros, resolve, reject })) };
  const estado = {};
  const publicar = (seccion, datos) => { estado[seccion] = datos; };
  const vieja = cargarDashboardTamara(cliente, '2026-10-01', '2026-10-14', publicar);
  vieja.cancelar();
  const nueva = cargarDashboardTamara(cliente, '2026-11-01', '2026-11-14', publicar);
  assert.deepEqual(pendientes.slice(3).map(p => p.rpc), ['dashboard_tamara_v2', 'evolucion_dashboard_tamara', 'estadisticas_servicios_tamara_v2']);
  assert.deepEqual(pendientes[4].parametros, { p_hasta: '2026-11-14', p_meses: 6 });
  pendientes[3].resolve({ data: [{ ...resumen(), facturacion: 123 }] });
  pendientes[4].resolve({ data: evolucion() });
  pendientes[5].resolve({ data: [] });
  await nueva.terminado;
  const guardado = JSON.stringify(estado);
  pendientes[0].resolve({ data: [{ ...resumen(), facturacion: 999 }] });
  pendientes[1].reject(new Error('Error viejo'));
  pendientes[2].resolve({ error: { message: 'Error viejo' } });
  await vieja.terminado;
  assert.equal(JSON.stringify(estado), guardado);
  assert.equal(estado.resumen.datos.facturacion, 123);
});

test('errores de una sección no ocultan las otras; cancelación impide publicar después', async () => {
  const estados = {};
  const cliente = { rpc: async rpc => rpc === 'dashboard_tamara_v2'
    ? { data: [] } : rpc === 'evolucion_dashboard_tamara' ? { data: evolucion() } : { data: [] } };
  await cargarDashboardTamara(cliente, '2026-11-01', '2026-11-14', (s, valor) => { estados[s] = valor; }).terminado;
  assert.ok(estados.resumen.error);
  assert.equal(estados.resumen.datos, null);
  assert.equal(estados.evolucion.datos.length, 6);
  assert.deepEqual(estados.servicios.datos, []);
  const eventos = [];
  const solicitud = cargarDashboardTamara(cliente, '2026-11-01', '2026-11-14', (...args) => eventos.push(args));
  solicitud.cancelar();
  await solicitud.terminado;
  assert.equal(eventos.length, 3); // Solo los estados iniciales de carga.
});
