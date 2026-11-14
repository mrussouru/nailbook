-- Baseline SQL verificado previo a Dashboard Tamara V2, sin cambios funcionales.

CREATE OR REPLACE FUNCTION public.dashboard_tamara(p_desde date, p_hasta date)
RETURNS TABLE(
    facturacion numeric,
    atenciones bigint,
    ticket_promedio numeric,
    clientas_nuevas bigint,
    clientas_recurrentes bigint,
    ausencias bigint,
    valor_perdido_ausencias numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH turnos_periodo AS (
    SELECT
        t.id,
        t.cliente_id,
        t.fecha,
        t.estado,
        t.precio_estimado
    FROM public.turnos_tamara t
    WHERE t.fecha BETWEEN p_desde AND p_hasta
),

totales_turnos AS (
    SELECT
        tp.id,
        tp.cliente_id,
        tp.fecha,
        tp.estado,
        tp.precio_estimado,
        COALESCE(SUM(d.importe), 0) AS total_cobrado
    FROM turnos_periodo tp
    LEFT JOIN public.detalles_turnos_tamara d
        ON d.turno_id = tp.id
    GROUP BY
        tp.id,
        tp.cliente_id,
        tp.fecha,
        tp.estado,
        tp.precio_estimado
),

completados AS (
    SELECT *
    FROM totales_turnos
    WHERE estado = 'completado'
),

primera_visita AS (
    SELECT
        cliente_id,
        MIN(fecha) AS fecha_primera_visita
    FROM public.turnos_tamara
    WHERE estado = 'completado'
    GROUP BY cliente_id
),

clientes_periodo AS (
    SELECT
        c.cliente_id,
        MIN(c.fecha) AS primera_visita_periodo,
        pv.fecha_primera_visita
    FROM completados c
    INNER JOIN primera_visita pv
        ON pv.cliente_id = c.cliente_id
    GROUP BY
        c.cliente_id,
        pv.fecha_primera_visita
)

SELECT
    COALESCE(
        (SELECT SUM(total_cobrado) FROM completados),
        0
    ) AS facturacion,

    (SELECT COUNT(*) FROM completados) AS atenciones,

    CASE
        WHEN (SELECT COUNT(*) FROM completados) = 0
        THEN 0
        ELSE
            COALESCE(
                (SELECT SUM(total_cobrado) FROM completados),
                0
            )
            /
            (SELECT COUNT(*) FROM completados)
    END AS ticket_promedio,

    (
        SELECT COUNT(*)
        FROM clientes_periodo
        WHERE fecha_primera_visita = primera_visita_periodo
    ) AS clientas_nuevas,

    (
        SELECT COUNT(*)
        FROM clientes_periodo
        WHERE fecha_primera_visita < primera_visita_periodo
    ) AS clientas_recurrentes,

    (
        SELECT COUNT(*)
        FROM totales_turnos
        WHERE estado = 'ausente'
    ) AS ausencias,

    COALESCE(
        (
            SELECT SUM(precio_estimado)
            FROM totales_turnos
            WHERE estado = 'ausente'
        ),
        0
    ) AS valor_perdido_ausencias;
$function$;

REVOKE ALL ON FUNCTION public.dashboard_tamara(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dashboard_tamara(date, date) FROM anon;
REVOKE ALL ON FUNCTION public.dashboard_tamara(date, date) FROM authenticated;
REVOKE ALL ON FUNCTION public.dashboard_tamara(date, date) FROM service_role;
GRANT EXECUTE ON FUNCTION public.dashboard_tamara(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.rentabilidad_tamara(p_desde date, p_hasta date)
RETURNS TABLE(
    facturacion numeric,
    gastos_totales numeric,
    gastos_publicidad numeric,
    ganancia numeric,
    margen_porcentaje numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH facturacion_periodo AS (
    SELECT
        COALESCE(SUM(d.importe), 0) AS total
    FROM public.turnos_tamara t
    LEFT JOIN public.detalles_turnos_tamara d
        ON d.turno_id = t.id
    WHERE
        t.fecha BETWEEN p_desde AND p_hasta
        AND t.estado = 'completado'
),
gastos_periodo AS (
    SELECT
        COALESCE(SUM(g.importe), 0) AS total,
        COALESCE(
            SUM(g.importe) FILTER (
                WHERE lower(trim(g.categoria)) = 'publicidad'
            ),
            0
        ) AS publicidad
    FROM public.gastos_tamara g
    WHERE g.fecha BETWEEN p_desde AND p_hasta
)
SELECT
    f.total AS facturacion,
    g.total AS gastos_totales,
    g.publicidad AS gastos_publicidad,
    f.total - g.total AS ganancia,
    CASE
        WHEN f.total = 0 THEN 0
        ELSE ROUND(
            ((f.total - g.total) / f.total) * 100,
            2
        )
    END AS margen_porcentaje
FROM facturacion_periodo f
CROSS JOIN gastos_periodo g;
$function$;

REVOKE ALL ON FUNCTION public.rentabilidad_tamara(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rentabilidad_tamara(date, date) FROM anon;
REVOKE ALL ON FUNCTION public.rentabilidad_tamara(date, date) FROM authenticated;
REVOKE ALL ON FUNCTION public.rentabilidad_tamara(date, date) FROM service_role;
GRANT EXECUTE ON FUNCTION public.rentabilidad_tamara(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.estadisticas_servicios_tamara(p_desde date, p_hasta date)
RETURNS TABLE(
    servicio_id uuid,
    nombre text,
    activo boolean,
    cantidad bigint,
    facturacion numeric,
    importe_promedio numeric,
    porcentaje_facturacion numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH detalles_completados AS (
    SELECT
        d.servicio_id,
        d.importe
    FROM public.detalles_turnos_tamara d
    INNER JOIN public.turnos_tamara t
        ON t.id = d.turno_id
    WHERE t.estado = 'completado'
      AND t.fecha >= p_desde
      AND t.fecha <= p_hasta
),
total_periodo AS (
    SELECT
        COALESCE(SUM(importe), 0) AS total
    FROM detalles_completados
)
SELECT
    s.id AS servicio_id,
    s.nombre,
    s.activo,
    COUNT(d.servicio_id) AS cantidad,
    COALESCE(SUM(d.importe), 0) AS facturacion,
    COALESCE(AVG(d.importe), 0) AS importe_promedio,
    CASE
        WHEN tp.total > 0
        THEN (COALESCE(SUM(d.importe), 0) / tp.total) * 100
        ELSE 0
    END AS porcentaje_facturacion
FROM detalles_completados d
INNER JOIN public.servicios_tamara s
    ON s.id = d.servicio_id
CROSS JOIN total_periodo tp
GROUP BY
    s.id,
    s.nombre,
    s.activo,
    tp.total
ORDER BY facturacion DESC;
$function$;

-- Estos accesos reproducen el baseline existente mediante grants explícitos.
-- Cualquier endurecimiento debe hacerse deliberadamente en una migración posterior.
REVOKE ALL ON FUNCTION public.estadisticas_servicios_tamara(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.estadisticas_servicios_tamara(date, date) FROM anon;
REVOKE ALL ON FUNCTION public.estadisticas_servicios_tamara(date, date) FROM authenticated;
REVOKE ALL ON FUNCTION public.estadisticas_servicios_tamara(date, date) FROM service_role;
GRANT EXECUTE ON FUNCTION public.estadisticas_servicios_tamara(date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.estadisticas_servicios_tamara(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estadisticas_servicios_tamara(date, date) TO service_role;
