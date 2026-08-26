// ===========================================
// Obtener período de trabajo
// ===========================================

export function obtenerPeriodo(

    periodo,

    fechaBase,

    fechaDesde,

    fechaHasta

) {

    // ======================================
    // Hoy
    // ======================================

    if (periodo === "hoy") {

        return {

            desde: fechaBase,

            hasta: fechaBase

        };

    }

    // ======================================
    // Semana
    // ======================================

    if (periodo === "semana") {

        const fecha = new Date(fechaBase + "T12:00:00");

        const dia = fecha.getDay();

        const diferencia = dia === 0 ? -6 : 1 - dia;

        const lunes = new Date(fecha);

        lunes.setDate(fecha.getDate() + diferencia);

        const domingo = new Date(lunes);

        domingo.setDate(lunes.getDate() + 6);

        const formato = d => d.toISOString().slice(0, 10);

        return {

            desde: formato(lunes),

            hasta: formato(domingo)

        };

    }

    // ======================================
    // Mes
    // ======================================

    if (periodo === "mes") {

        const fecha = new Date(fechaBase + "T12:00:00");

        const primerDia = new Date(

            fecha.getFullYear(),

            fecha.getMonth(),

            1

        );

        const ultimoDia = new Date(

            fecha.getFullYear(),

            fecha.getMonth() + 1,

            0

        );

        const formato = d => d.toISOString().slice(0, 10);

        return {

            desde: formato(primerDia),

            hasta: formato(ultimoDia)

        };

    }

    // ======================================
    // Personalizado
    // ======================================

    return {

        desde: fechaDesde,

        hasta: fechaHasta

    };

}