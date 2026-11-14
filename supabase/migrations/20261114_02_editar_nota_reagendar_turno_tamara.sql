BEGIN;

CREATE TABLE IF NOT EXISTS public.historial_reagendamientos_tamara (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id uuid NOT NULL REFERENCES public.turnos_tamara(id) ON DELETE RESTRICT,
  fecha_anterior date NOT NULL,
  hora_anterior time NOT NULL,
  fecha_nueva date NOT NULL,
  hora_nueva time NOT NULL,
  estado_al_reagendar text NOT NULL,
  recordatorio_enviado_anterior boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor uuid
);

ALTER TABLE public.historial_reagendamientos_tamara ENABLE ROW LEVEL SECURITY;
-- Sin acceso directo: el historial se escribe únicamente desde el RPC.
REVOKE ALL ON TABLE public.historial_reagendamientos_tamara
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.actualizar_nota_turno_tamara(
  p_turno_id uuid,
  p_notas text
)
RETURNS SETOF public.turnos_tamara
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_turno public.turnos_tamara%ROWTYPE;
BEGIN
  IF public.es_dueno() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO v_turno FROM public.turnos_tamara
  WHERE id = p_turno_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La cita no existe';
  END IF;
  IF v_turno.estado IS NULL OR v_turno.estado NOT IN ('pendiente', 'confirmado') THEN
    RAISE EXCEPTION 'Solo se puede editar la nota de una cita pendiente o confirmada';
  END IF;

  RETURN QUERY UPDATE public.turnos_tamara
  SET notas = nullif(trim(p_notas), '')
  WHERE id = p_turno_id RETURNING *;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reagendar_turno_tamara(
  p_turno_id uuid,
  p_fecha date,
  p_hora time
)
RETURNS SETOF public.turnos_tamara
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_turno public.turnos_tamara%ROWTYPE;
BEGIN
  IF public.es_dueno() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_fecha IS NULL OR NOT isfinite(p_fecha) OR p_hora IS NULL
     OR p_hora >= time '24:00:00' THEN
    RAISE EXCEPTION 'Ingresá una fecha y una hora válidas';
  END IF;

  SELECT * INTO v_turno FROM public.turnos_tamara
  WHERE id = p_turno_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La cita no existe';
  END IF;
  IF v_turno.estado IS NULL OR v_turno.estado NOT IN ('pendiente', 'confirmado') THEN
    RAISE EXCEPTION 'Solo se puede reagendar una cita pendiente o confirmada';
  END IF;
  IF v_turno.fecha IS NOT DISTINCT FROM p_fecha
     AND v_turno.hora IS NOT DISTINCT FROM p_hora THEN
    RETURN NEXT v_turno;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.turnos_tamara
    WHERE id <> p_turno_id AND fecha = p_fecha AND hora = p_hora
      AND estado IN ('pendiente', 'confirmado')
  ) THEN
    RAISE EXCEPTION 'Ese horario exacto ya está ocupado por otra cita de Tamara';
  END IF;

  INSERT INTO public.historial_reagendamientos_tamara (
    turno_id, fecha_anterior, hora_anterior, fecha_nueva, hora_nueva,
    estado_al_reagendar, recordatorio_enviado_anterior, actor
  ) VALUES (
    v_turno.id, v_turno.fecha, v_turno.hora, p_fecha, p_hora,
    v_turno.estado, v_turno.recordatorio_enviado, auth.uid()
  );

  RETURN QUERY UPDATE public.turnos_tamara
  SET fecha = p_fecha, hora = p_hora, recordatorio_enviado = false
  WHERE id = p_turno_id RETURNING *;
END;
$function$;

REVOKE ALL ON FUNCTION public.actualizar_nota_turno_tamara(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.actualizar_nota_turno_tamara(uuid, text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.reagendar_turno_tamara(uuid, date, time)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reagendar_turno_tamara(uuid, date, time)
  TO authenticated;

COMMIT;
