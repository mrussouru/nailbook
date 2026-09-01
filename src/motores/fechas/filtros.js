// ===========================================
// Filtros de fechas
// ===========================================

export function filtrarTurnosPorPeriodo(
    turnos,
    fecha,
    periodo,
    fechaDesde = null,
    fechaHasta = null
) {

    // ==========================
    // Hoy
    // ==========================

    if (periodo === "hoy") {

        return turnos.filter(
            t => t.fecha === fecha
        );

    }

    // ==========================
    // Semana
    // ==========================

    // ==========================
// Semana
// ==========================

if (periodo === "semana") {

    const seleccionada = new Date(fecha + "T12:00:00");

    const dia = seleccionada.getDay();

    const diferencia = dia === 0 ? -6 : 1 - dia;

    const lunes = new Date(seleccionada);

    lunes.setDate(seleccionada.getDate() + diferencia);

    const domingo = new Date(lunes);

    domingo.setDate(lunes.getDate() + 6);

    const formato = (d) => d.toISOString().slice(0, 10);

    const desde = formato(lunes);

    const hasta = formato(domingo);

    return turnos.filter(turno =>

        turno.fecha >= desde &&
        turno.fecha <= hasta

    );

}

// ==========================
// Mes
// ==========================

if (periodo === "mes") {

    const seleccionada = new Date(fecha + "T12:00:00");

    const año = seleccionada.getFullYear();
    const mes = seleccionada.getMonth();

    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);

    const formato = (d) => d.toISOString().slice(0, 10);

    const desde = formato(primerDia);
    const hasta = formato(ultimoDia);

    return turnos.filter(turno =>
        turno.fecha >= desde &&
        turno.fecha <= hasta
    );

}

// ==========================
// Período personalizado
// ==========================

if (periodo === "personalizado") {

    if (!fechaDesde || !fechaHasta) {
        return [];
    }

    const resultado = turnos.filter(turno =>
        turno.fecha >= fechaDesde &&
        turno.fecha <= fechaHasta
    );

    return resultado;
}

    return turnos;

}