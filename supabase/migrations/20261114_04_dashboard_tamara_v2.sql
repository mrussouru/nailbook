-- Dashboard Tamara V2. Fuente de métricas: baseline 20261114_03.
-- Facturación registrada: importes de detalles; no acredita pagos efectivos.
BEGIN;

CREATE OR REPLACE FUNCTION public.dashboard_tamara_v2(
    p_desde date,
    p_hasta date,
    p_comparar boolean DEFAULT true
)
RETURNS TABLE(
    facturacion numeric,
    gastos_totales numeric,
    gastos_publicidad numeric,
    ganancia numeric,
    margen_porcentaje numeric,
    atenciones bigint,
    ticket_promedio numeric,
    clientas_nuevas bigint,
    clientas_recurrentes bigint,
    ausencias bigint,
    valor_perdido_ausencias numeric,
    comparacion_disponible boolean,
    comparacion_actual_desde date,
    comparacion_actual_hasta date,
    comparacion_desde date,
    comparacion_hasta date,
    facturacion_comparable_actual numeric,
    gastos_totales_comparable_actual numeric,
    gastos_publicidad_comparable_actual numeric,
    ganancia_comparable_actual numeric,
    margen_porcentaje_comparable_actual numeric,
    atenciones_comparable_actual bigint,
    ticket_promedio_comparable_actual numeric,
    clientas_nuevas_comparable_actual bigint,
    clientas_recurrentes_comparable_actual bigint,
    ausencias_comparable_actual bigint,
    valor_perdido_ausencias_comparable_actual numeric,
    facturacion_anterior numeric,
    gastos_totales_anterior numeric,
    gastos_publicidad_anterior numeric,
    ganancia_anterior numeric,
    margen_porcentaje_anterior numeric,
    atenciones_anterior bigint,
    ticket_promedio_anterior numeric,
    clientas_nuevas_anterior bigint,
    clientas_recurrentes_anterior bigint,
    ausencias_anterior bigint,
    valor_perdido_ausencias_anterior numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_mes date;
    v_fin_mes date;
    v_desde_actual date;
    v_hasta_actual date;
    v_desde_anterior date;
    v_hasta_anterior date;
BEGIN
    IF p_desde IS NULL OR p_hasta IS NULL
       OR NOT isfinite(p_desde) OR NOT isfinite(p_hasta)
       OR p_desde > p_hasta THEN
        RAISE EXCEPTION 'Ingresá un período válido: desde y hasta son obligatorios y desde no puede superar hasta';
    END IF;

    v_mes := date_trunc('month', p_desde)::date;
    v_fin_mes := (v_mes + interval '1 month' - interval '1 day')::date;

    IF p_comparar IS TRUE AND p_desde = v_mes THEN
        -- A: MTD con igual cantidad de días en ambos tramos comparables.
        -- El resumen principal siempre conserva p_desde/p_hasta completos.
        IF p_desde = date_trunc('month', CURRENT_DATE)::date
           AND p_hasta = CURRENT_DATE THEN
            v_desde_anterior := (v_mes - interval '1 month')::date;
            v_hasta_anterior := LEAST(
                v_desde_anterior + (p_hasta - p_desde),
                v_mes - 1
            );
            v_desde_actual := p_desde;
            v_hasta_actual := p_desde + (v_hasta_anterior - v_desde_anterior);
        -- B: mes calendario completo estrictamente anterior al mes en curso.
        ELSIF p_hasta = v_fin_mes
              AND v_mes < date_trunc('month', CURRENT_DATE)::date THEN
            v_desde_anterior := (v_mes - interval '1 month')::date;
            v_hasta_anterior := v_mes - 1;
            v_desde_actual := p_desde;
            v_hasta_actual := p_hasta;
        END IF;
    END IF;

    RETURN QUERY
    WITH periodos AS (
        SELECT 'principal'::text AS tramo, p_desde AS desde, p_hasta AS hasta
        UNION ALL
        SELECT 'comparable_actual', v_desde_actual, v_hasta_actual
        WHERE v_desde_actual IS NOT NULL
        UNION ALL
        SELECT 'anterior', v_desde_anterior, v_hasta_anterior
        WHERE v_desde_anterior IS NOT NULL
    ), turnos_periodos AS (
        -- Una fila por turno y período, incluso cuando no tiene detalles.
        SELECT r.tramo, t.id, t.cliente_id, t.fecha, t.estado,
               t.precio_estimado, COALESCE(SUM(d.importe), 0) AS importe_registrado
        FROM periodos r
        JOIN public.turnos_tamara t ON t.fecha BETWEEN r.desde AND r.hasta
        LEFT JOIN public.detalles_turnos_tamara d ON d.turno_id = t.id
        GROUP BY r.tramo, t.id, t.cliente_id, t.fecha, t.estado, t.precio_estimado
    ), totales AS (
        SELECT t.tramo,
               COALESCE(SUM(t.importe_registrado) FILTER (WHERE t.estado = 'completado'), 0) AS facturacion,
               COUNT(*) FILTER (WHERE t.estado = 'completado') AS atenciones,
               COUNT(*) FILTER (WHERE t.estado = 'ausente') AS ausencias,
               COALESCE(SUM(t.precio_estimado) FILTER (WHERE t.estado = 'ausente'), 0) AS valor_perdido_ausencias
        FROM turnos_periodos t
        GROUP BY t.tramo
    ), primera_visita AS (
        -- Primera visita completada registrada, no primera visita real fuera del sistema.
        SELECT t.cliente_id, MIN(t.fecha) AS fecha_primera_visita
        FROM public.turnos_tamara t
        WHERE t.estado = 'completado'
        GROUP BY t.cliente_id
    ), clientes_periodos AS (
        SELECT t.tramo, t.cliente_id, MIN(t.fecha) AS primera_visita_periodo,
               pv.fecha_primera_visita
        FROM turnos_periodos t
        JOIN primera_visita pv ON pv.cliente_id = t.cliente_id
        WHERE t.estado = 'completado'
        GROUP BY t.tramo, t.cliente_id, pv.fecha_primera_visita
    ), clientas AS (
        SELECT c.tramo,
               COUNT(*) FILTER (WHERE c.fecha_primera_visita = c.primera_visita_periodo) AS nuevas,
               COUNT(*) FILTER (WHERE c.fecha_primera_visita < c.primera_visita_periodo) AS recurrentes
        FROM clientes_periodos c
        GROUP BY c.tramo
    ), gastos AS (
        -- Independientes de turnos y detalles para no multiplicar importes.
        SELECT r.tramo, COALESCE(SUM(g.importe), 0) AS total,
               COALESCE(SUM(g.importe) FILTER (
                   WHERE lower(trim(g.categoria)) = 'publicidad'
               ), 0) AS publicidad
        FROM periodos r
        LEFT JOIN public.gastos_tamara g ON g.fecha BETWEEN r.desde AND r.hasta
        GROUP BY r.tramo
    ), base AS (
        SELECT r.tramo,
               COALESCE(t.facturacion, 0) AS facturacion,
               g.total AS gastos_totales, g.publicidad AS gastos_publicidad,
               COALESCE(t.atenciones, 0::bigint) AS atenciones,
               COALESCE(c.nuevas, 0::bigint) AS clientas_nuevas,
               COALESCE(c.recurrentes, 0::bigint) AS clientas_recurrentes,
               COALESCE(t.ausencias, 0::bigint) AS ausencias,
               COALESCE(t.valor_perdido_ausencias, 0) AS valor_perdido_ausencias
        FROM periodos r
        LEFT JOIN totales t ON t.tramo = r.tramo
        LEFT JOIN clientas c ON c.tramo = r.tramo
        JOIN gastos g ON g.tramo = r.tramo
    ), metricas AS (
        SELECT b.*,
               b.facturacion - b.gastos_totales AS ganancia,
               CASE WHEN b.facturacion = 0 THEN 0
                    ELSE ROUND((b.facturacion - b.gastos_totales) / b.facturacion * 100, 2)
               END AS margen_porcentaje,
               CASE WHEN b.atenciones = 0 THEN 0
                    ELSE b.facturacion / b.atenciones
               END AS ticket_promedio
        FROM base b
    )
    SELECT
        a.facturacion,
        a.gastos_totales,
        a.gastos_publicidad,
        a.ganancia,
        a.margen_porcentaje,
        a.atenciones,
        a.ticket_promedio,
        a.clientas_nuevas,
        a.clientas_recurrentes,
        a.ausencias,
        a.valor_perdido_ausencias,
        v_desde_anterior IS NOT NULL,
        v_desde_actual,
        v_hasta_actual,
        v_desde_anterior,
        v_hasta_anterior,
        comp.facturacion,
        comp.gastos_totales,
        comp.gastos_publicidad,
        comp.ganancia,
        comp.margen_porcentaje,
        comp.atenciones,
        comp.ticket_promedio,
        comp.clientas_nuevas,
        comp.clientas_recurrentes,
        comp.ausencias,
        comp.valor_perdido_ausencias,
        ant.facturacion,
        ant.gastos_totales,
        ant.gastos_publicidad,
        ant.ganancia,
        ant.margen_porcentaje,
        ant.atenciones,
        ant.ticket_promedio,
        ant.clientas_nuevas,
        ant.clientas_recurrentes,
        ant.ausencias,
        ant.valor_perdido_ausencias
    FROM metricas a
    LEFT JOIN metricas comp ON comp.tramo = 'comparable_actual'
    LEFT JOIN metricas ant ON ant.tramo = 'anterior'
    WHERE a.tramo = 'principal';
END;
$function$;

REVOKE ALL ON FUNCTION public.dashboard_tamara_v2(date, date, boolean)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dashboard_tamara_v2(date, date, boolean)
    TO authenticated;

CREATE OR REPLACE FUNCTION public.evolucion_dashboard_tamara(
    p_hasta date,
    p_meses integer DEFAULT 6
)
RETURNS TABLE(
    mes date,
    facturacion numeric,
    gastos_totales numeric,
    ganancia numeric,
    margen_porcentaje numeric,
    atenciones bigint,
    ticket_promedio numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF p_hasta IS NULL OR NOT isfinite(p_hasta) THEN
        RAISE EXCEPTION 'Ingresá una fecha hasta válida';
    END IF;
    IF p_meses IS NULL OR p_meses < 1 OR p_meses > 24 THEN
        RAISE EXCEPTION 'La cantidad de meses debe estar entre 1 y 24';
    END IF;

    RETURN QUERY
    WITH meses AS (
        SELECT (date_trunc('month', p_hasta)
                - make_interval(months => n.numero))::date AS inicio
        FROM generate_series(0, p_meses - 1) AS n(numero)
    ), periodos AS (
        SELECT m.inicio,
               LEAST((m.inicio + interval '1 month' - interval '1 day')::date, p_hasta) AS fin
        FROM meses m
    ), turnos_completados AS (
        -- El conteo de atenciones se hace antes de unir los detalles.
        SELECT r.inicio, t.id
        FROM periodos r
        JOIN public.turnos_tamara t ON t.fecha BETWEEN r.inicio AND r.fin
        WHERE t.estado = 'completado'
    ), atenciones_mes AS (
        SELECT t.inicio, COUNT(*) AS cantidad
        FROM turnos_completados t
        GROUP BY t.inicio
    ), facturacion_mes AS (
        -- Misma base monetaria del resumen: detalles de turnos completados.
        SELECT t.inicio, COALESCE(SUM(d.importe), 0) AS total
        FROM turnos_completados t
        LEFT JOIN public.detalles_turnos_tamara d ON d.turno_id = t.id
        GROUP BY t.inicio
    ), gastos_mes AS (
        SELECT r.inicio, COALESCE(SUM(g.importe), 0) AS total
        FROM periodos r
        LEFT JOIN public.gastos_tamara g ON g.fecha BETWEEN r.inicio AND r.fin
        GROUP BY r.inicio
    ), base AS (
        SELECT r.inicio, COALESCE(f.total, 0) AS facturacion,
               g.total AS gastos_totales,
               COALESCE(a.cantidad, 0::bigint) AS atenciones
        FROM periodos r
        LEFT JOIN facturacion_mes f ON f.inicio = r.inicio
        LEFT JOIN atenciones_mes a ON a.inicio = r.inicio
        JOIN gastos_mes g ON g.inicio = r.inicio
    )
    SELECT b.inicio, b.facturacion, b.gastos_totales,
           b.facturacion - b.gastos_totales,
           CASE WHEN b.facturacion = 0 THEN 0
                ELSE ROUND((b.facturacion - b.gastos_totales) / b.facturacion * 100, 2)
           END,
           b.atenciones,
           CASE WHEN b.atenciones = 0 THEN 0 ELSE b.facturacion / b.atenciones END
    FROM base b
    ORDER BY b.inicio ASC;
END;
$function$;

REVOKE ALL ON FUNCTION public.evolucion_dashboard_tamara(date, integer)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evolucion_dashboard_tamara(date, integer)
    TO authenticated;

CREATE OR REPLACE FUNCTION public.estadisticas_servicios_tamara_v2(
    p_desde date,
    p_hasta date
)
RETURNS TABLE(
    servicio_id uuid,
    nombre text,
    activo boolean,
    cantidad bigint,
    facturacion numeric,
    importe_promedio numeric,
    porcentaje_facturacion numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF p_desde IS NULL OR p_hasta IS NULL
       OR NOT isfinite(p_desde) OR NOT isfinite(p_hasta)
       OR p_desde > p_hasta THEN
        RAISE EXCEPTION 'Ingresá un período válido: desde y hasta son obligatorios y desde no puede superar hasta';
    END IF;

    RETURN QUERY
    WITH detalles_completados AS (
        SELECT d.servicio_id, d.importe
        FROM public.detalles_turnos_tamara d
        JOIN public.turnos_tamara t ON t.id = d.turno_id
        WHERE t.estado = 'completado'
          AND t.fecha BETWEEN p_desde AND p_hasta
    ), total_periodo AS (
        -- Incluye todos los detalles, también manuales y referencias huérfanas.
        SELECT COALESCE(SUM(d.importe), 0) AS total
        FROM detalles_completados d
    ), agrupados AS (
        SELECT s.id AS servicio_id, s.nombre, s.activo,
               COUNT(d.servicio_id) AS cantidad,
               COALESCE(SUM(d.importe), 0) AS facturacion,
               COALESCE(AVG(d.importe), 0) AS importe_promedio
        FROM detalles_completados d
        JOIN public.servicios_tamara s ON s.id = d.servicio_id
        GROUP BY s.id, s.nombre, s.activo

        UNION ALL

        SELECT NULL::uuid, 'Otros / manual'::text, NULL::boolean,
               COUNT(*), COALESCE(SUM(d.importe), 0), COALESCE(AVG(d.importe), 0)
        FROM detalles_completados d
        WHERE d.servicio_id IS NULL
           OR NOT EXISTS (
               SELECT 1
               FROM public.servicios_tamara s
               WHERE s.id = d.servicio_id
           )
        HAVING COUNT(*) > 0
    )
    SELECT a.servicio_id, a.nombre, a.activo, a.cantidad,
           a.facturacion, a.importe_promedio,
           CASE WHEN tp.total > 0 THEN a.facturacion / tp.total * 100 ELSE 0 END
    FROM agrupados a
    CROSS JOIN total_periodo tp
    ORDER BY a.facturacion DESC, a.nombre;
END;
$function$;

REVOKE ALL ON FUNCTION public.estadisticas_servicios_tamara_v2(date, date)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.estadisticas_servicios_tamara_v2(date, date)
    TO authenticated;

COMMIT;
