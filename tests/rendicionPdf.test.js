import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPdfRendicion, datosRendicionPdf, formatoFecha, formatoImporte } from '../src/utils/rendicionPdf.js';

const rendicion = {
    profesionales: { nombre: 'Dália', porcentaje: 99 },
    fecha_desde: '2026-09-10T00:00:00', fecha_hasta: '2026-09-12',
    facturacion: '1300', monto_profesional: '714.50', monto_salon: '585.50',
    estado: 'pendiente'
};
const turno = {
    fecha: '2026-09-10', cliente: 'Yodainis', servicios: { nombre: 'Perfilado Cejas' },
    precio: 550, monto_profesional: 302.5, monto_salon: 247.5,
    profesionales: { porcentaje: 1 }
};

test('usa repartos registrados y totales históricos aunque no coincidan con las filas', () => {
    const datos = datosRendicionPdf(rendicion, [turno]);
    assert.deepEqual(datos.filas[0], ['10/09/2026', 'Yodainis', 'Perfilado Cejas', '$550', '$302,50', '$247,50']);
    assert.deepEqual(datos.totales, [['Facturación', '$1.300'], ['Total salón', '$585,50'], ['Total profesional', '$714,50']]);
    assert.equal(datos.repartoIncompleto, false);
});

test('no infiere repartos faltantes y conserva ceros registrados', () => {
    const datos = datosRendicionPdf(rendicion, [
        { ...turno, monto_profesional: null, monto_salon: 0 },
        { ...turno, monto_profesional: '0', monto_salon: undefined }
    ]);
    assert.deepEqual(datos.filas.map(f => f.slice(4)), [['No registrado', '$0'], ['$0', 'No registrado']]);
    assert.equal(datos.repartoIncompleto, true);
    assert.equal(formatoImporte(undefined), 'No registrado');
    assert.equal(formatoImporte('3994.50'), '$3.994,50');
    assert.equal(formatoFecha('2026-09-20T00:00:00'), '20/09/2026');
});

test('PDF A4 multipágina incluye todos los turnos y el nombre descriptivo', () => {
    const turnos = Array.from({ length: 120 }, (_, i) => ({ ...turno, cliente: `Cliente-${i}` }));
    const { doc, nombreArchivo } = crearPdfRendicion(rendicion, turnos);
    assert.ok(doc.getNumberOfPages() > 1);
    assert.ok(Math.abs(doc.internal.pageSize.getWidth() - 210) < 0.1);
    assert.ok(Math.abs(doc.internal.pageSize.getHeight() - 297) < 0.1);
    assert.equal(nombreArchivo, 'rendicion-dalia-2026-09-10-a-2026-09-12.pdf');
    const contenido = doc.output();
    for (let i = 0; i < 120; i++) assert.ok(contenido.includes(`(Cliente-${i})`));
    assert.ok(contenido.includes('(Estado: Pendiente)'));
    assert.ok(!contenido.includes('Fecha de pago:'));
    assert.ok(!contenido.includes('2026-09-10T'));
});

test('PDF pagado con faltantes muestra aclaración, fecha de pago y totales guardados', () => {
    const { doc } = crearPdfRendicion({ ...rendicion, estado: 'pagado', fecha_pago: '2026-09-20T00:00:00' }, [{ ...turno, monto_salon: null }]);
    const contenido = doc.output();
    for (const texto of ['Estado: Pagada', 'Fecha de pago: 20/09/2026', 'No registrado', '$714,50', 'Algunas atenciones']) {
        assert.ok(contenido.includes(texto), texto);
    }
});
