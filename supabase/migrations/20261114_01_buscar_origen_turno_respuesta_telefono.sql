CREATE OR REPLACE FUNCTION public.buscar_origen_turno_respuesta(
  p_telefono text,
  p_fecha date
)
RETURNS TABLE(
  tipo text,
  turno_id uuid,
  estado text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH telefono_recibido AS (
    SELECT regexp_replace(p_telefono, '\D', '', 'g') AS numero
  ), candidatos AS (
    SELECT
      'tamara'::text AS tipo,
      t.id AS turno_id,
      t.estado,
      t.hora,
      regexp_replace(c.telefono, '\D', '', 'g') AS numero
    FROM public.turnos_tamara AS t
    JOIN public.clientes AS c ON c.id = t.cliente_id
    WHERE t.fecha = p_fecha
      AND t.estado IN ('pendiente', 'confirmado')
      AND t.recordatorio_enviado = true

    UNION ALL

    SELECT
      'equipo'::text AS tipo,
      t.id AS turno_id,
      t.estado,
      t.hora,
      regexp_replace(t.telefono, '\D', '', 'g') AS numero
    FROM public.turnos AS t
    WHERE t.fecha = p_fecha
      AND t.estado IN ('pendiente', 'confirmado')
      AND t.recordatorio_enviado = true
  )
  SELECT c.tipo, c.turno_id, c.estado
  FROM candidatos AS c
  CROSS JOIN telefono_recibido AS r
  WHERE CASE
    WHEN c.numero LIKE '598%' THEN c.numero
    WHEN c.numero LIKE '0%' THEN '598' || substring(c.numero FROM 2)
    ELSE c.numero
  END = CASE
    WHEN r.numero LIKE '598%' THEN r.numero
    WHEN r.numero LIKE '0%' THEN '598' || substring(r.numero FROM 2)
    ELSE r.numero
  END
  ORDER BY c.hora
  LIMIT 2;
$function$;
