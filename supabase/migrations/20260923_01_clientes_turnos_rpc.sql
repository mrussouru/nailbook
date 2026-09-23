-- NailBook: identidad central, RPC internas y reserva publica segura
-- Fuente de las funciones: pg_get_functiondef extraido de DEV y validado manualmente.

BEGIN;

CREATE TABLE public.solicitudes_reserva_publica (
  solicitud_id uuid NOT NULL,
  huella bytea NOT NULL,
  turno_id uuid NOT NULL,
  fecha date NOT NULL,
  hora time without time zone NOT NULL,
  profesional_id uuid NOT NULL,
  estado text NOT NULL,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT solicitudes_reserva_publica_pkey PRIMARY KEY (solicitud_id),
  CONSTRAINT solicitudes_reserva_publica_huella_check CHECK (octet_length(huella) = 32),
  CONSTRAINT solicitudes_reserva_publica_turno_id_key UNIQUE (turno_id),
  CONSTRAINT solicitudes_reserva_publica_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id) ON DELETE CASCADE,
  CONSTRAINT solicitudes_reserva_publica_estado_check CHECK (estado = 'pendiente'::text)
);

ALTER TABLE public.solicitudes_reserva_publica ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.solicitudes_reserva_publica FROM PUBLIC;
REVOKE ALL ON TABLE public.solicitudes_reserva_publica FROM anon;
REVOKE ALL ON TABLE public.solicitudes_reserva_publica FROM authenticated;
REVOKE ALL ON TABLE public.solicitudes_reserva_publica FROM service_role;

CREATE OR REPLACE FUNCTION public.actualizar_cliente(p_cliente_id uuid, p_nombre text, p_telefono text, p_telefono_normalizado text)
 RETURNS TABLE(id uuid, nombre text, telefono text, telefono_normalizado text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_nombre text;
    v_telefono text;
    v_telefono_normalizado text;
begin
    if not public.es_dueno() then
        raise exception 'No autorizado';
    end if;

    v_nombre := trim(p_nombre);
    v_telefono := trim(p_telefono);
    v_telefono_normalizado := trim(p_telefono_normalizado);

    if v_nombre = '' then
        raise exception 'El nombre es obligatorio';
    end if;

    if v_telefono = ''
       or v_telefono_normalizado = ''
       or v_telefono !~ '^\+[0-9]+$'
       or v_telefono_normalizado !~ '^[0-9]+$'
       or substring(v_telefono from 2) <> v_telefono_normalizado
    then
        raise exception 'Teléfono inválido';
    end if;

    if not exists (
        select 1
        from public.clientes c
        where c.id = p_cliente_id
    ) then
        raise exception 'Clienta no encontrada';
    end if;

    if exists (
        select 1
        from public.clientes c
        where c.telefono_normalizado = v_telefono_normalizado
          and c.id <> p_cliente_id
    ) then
        raise exception 'Ese teléfono ya pertenece a otra clienta';
    end if;

    update public.clientes c
    set
        nombre = v_nombre,
        telefono = v_telefono,
        telefono_normalizado = v_telefono_normalizado
    where c.id = p_cliente_id;

    return query
    select
        c.id,
        c.nombre,
        c.telefono,
        c.telefono_normalizado
    from public.clientes c
    where c.id = p_cliente_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.actualizar_cliente(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.actualizar_cliente(uuid, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.actualizar_cliente(uuid, text, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.actualizar_cliente(uuid, text, text, text) FROM service_role;
GRANT EXECUTE ON FUNCTION public.actualizar_cliente(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.crear_turno_interno(p_cliente_id uuid, p_cliente text, p_telefono text, p_telefono_normalizado text, p_servicio text, p_profesional_id uuid, p_fecha date, p_hora time without time zone, p_estado text, p_origen text, p_nota text, p_precio numeric)
 RETURNS TABLE(turno_id uuid, cliente_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_cliente_id uuid;
    v_turno_id uuid;
    v_nombre text;
    v_telefono text;
    v_telefono_normalizado text;
    v_mi_profesional_id uuid;
begin
    -- Esta RPC es exclusivamente para usuarios internos autenticados.
    if auth.uid() is null then
        raise exception 'No autorizado';
    end if;

    -- Reproducimos la autorización actual de turnos:
    -- dueño o profesional creando para sí misma.
    v_mi_profesional_id := public.mi_profesional_id();

    if not public.es_dueno()
       and (
           v_mi_profesional_id is null
           or p_profesional_id is distinct from v_mi_profesional_id
       )
    then
        raise exception 'No autorizado para crear turnos para esta profesional';
    end if;

    v_nombre := trim(p_cliente);
    v_telefono := trim(p_telefono);

    if v_nombre = '' then
        raise exception 'El nombre de la clienta es obligatorio';
    end if;

    if v_telefono = '' then
        raise exception 'El teléfono de la clienta es obligatorio';
    end if;

    if p_servicio is null or trim(p_servicio) = '' then
        raise exception 'El servicio es obligatorio';
    end if;

    if p_profesional_id is null then
        raise exception 'La profesional es obligatoria';
    end if;

    if p_fecha is null or p_hora is null then
        raise exception 'Fecha y hora son obligatorias';
    end if;

    if p_estado not in ('pendiente', 'completado') then
        raise exception 'Estado no permitido para esta operación';
    end if;

    if p_origen not in ('interno', 'espontaneo') then
        raise exception 'Origen no permitido para esta operación';
    end if;

    -- Impedimos combinaciones que no corresponden a estos dos flujos.
    if p_origen = 'interno' and p_estado <> 'pendiente' then
        raise exception 'Un turno interno nuevo debe quedar pendiente';
    end if;

    if p_origen = 'espontaneo' and p_estado <> 'completado' then
        raise exception 'Una atención espontánea debe quedar completada';
    end if;

    if p_precio is null or p_precio < 0 then
        raise exception 'El precio no es válido';
    end if;

    if p_cliente_id is not null then
        -- ID seleccionado = identidad autoritativa.
        select c.id
        into v_cliente_id
        from public.clientes c
        where c.id = p_cliente_id;

        if v_cliente_id is null then
            raise exception 'Clienta seleccionada no encontrada';
        end if;

        -- Para una identidad existente NO reinterpretamos su teléfono
        -- ni resolvemos otra identidad por el número recibido.

    else
        -- Una clienta nueva sí debe llegar ya validada/canonizada
        -- por la capa de aplicación.
        v_telefono_normalizado := trim(p_telefono_normalizado);

        if v_telefono !~ '^\+[0-9]+$'
           or v_telefono_normalizado = ''
           or v_telefono_normalizado !~ '^[0-9]+$'
           or substring(v_telefono from 2) <> v_telefono_normalizado
        then
            raise exception 'Teléfono inválido';
        end if;

        -- Si ya existe exactamente ese canónico, reutilizamos la identidad.
        select c.id
        into v_cliente_id
        from public.clientes c
        where c.telefono_normalizado = v_telefono_normalizado;

        if v_cliente_id is null then
            begin
                insert into public.clientes (
                    nombre,
                    telefono,
                    telefono_normalizado
                )
                values (
                    v_nombre,
                    v_telefono,
                    v_telefono_normalizado
                )
                returning id into v_cliente_id;

            exception
                when unique_violation then
                    -- Carrera concurrente: otra transacción pudo crear
                    -- la misma identidad entre SELECT e INSERT.
                    select c.id
                    into v_cliente_id
                    from public.clientes c
                    where c.telefono_normalizado = v_telefono_normalizado;

                    if v_cliente_id is null then
                        raise;
                    end if;
            end;
        end if;
    end if;

    insert into public.turnos (
        cliente_id,
        cliente,
        telefono,
        servicio,
        profesional_id,
        fecha,
        hora,
        estado,
        origen,
        nota,
        precio
    )
    values (
        v_cliente_id,
        v_nombre,
        v_telefono,
        p_servicio,
        p_profesional_id,
        p_fecha,
        p_hora,
        p_estado,
        p_origen,
        coalesce(p_nota, ''),
        p_precio
    )
    returning id into v_turno_id;

    return query
    select v_turno_id, v_cliente_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.crear_turno_interno(uuid, text, text, text, text, uuid, date, time without time zone, text, text, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crear_turno_interno(uuid, text, text, text, text, uuid, date, time without time zone, text, text, text, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.crear_turno_interno(uuid, text, text, text, text, uuid, date, time without time zone, text, text, text, numeric) FROM authenticated;
REVOKE ALL ON FUNCTION public.crear_turno_interno(uuid, text, text, text, text, uuid, date, time without time zone, text, text, text, numeric) FROM service_role;
GRANT EXECUTE ON FUNCTION public.crear_turno_interno(uuid, text, text, text, text, uuid, date, time without time zone, text, text, text, numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.crear_turno_tamara(text, text, text, date, time without time zone, text, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crear_turno_tamara(text, text, text, date, time without time zone, text, numeric, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.crear_turno_tamara(text, text, text, date, time without time zone, text, numeric, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.crear_turno_tamara(text, text, text, date, time without time zone, text, numeric, text, text) FROM service_role;
DROP FUNCTION public.crear_turno_tamara(text, text, text, date, time without time zone, text, numeric, text, text);

CREATE OR REPLACE FUNCTION public.crear_turno_tamara(p_nombre text, p_telefono text, p_telefono_normalizado text, p_fecha date, p_hora time without time zone, p_trabajo_estimado text DEFAULT NULL::text, p_precio_estimado numeric DEFAULT NULL::numeric, p_origen_cliente text DEFAULT NULL::text, p_notas text DEFAULT NULL::text, p_cliente_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_cliente_id uuid;
    v_turno_id uuid;
    v_origen text;
begin
    if not public.es_dueno() then
        raise exception 'No autorizado';
    end if;

    case p_origen_cliente
        when 'Publicidad' then v_origen := 'Publicidad';
        when 'Instagram' then v_origen := 'Instagram';
        when 'Facebook' then v_origen := 'Facebook';
        when 'Google' then v_origen := 'Google';
        when 'Recomendación' then v_origen := 'Recomendación';
        when 'WhatsApp' then v_origen := 'WhatsApp';
        when 'Orgánico' then v_origen := 'Orgánico';
        when 'Otro' then v_origen := 'Otro';

        when 'Publicidad Instagram' then v_origen := 'Publicidad';
        when 'Publicidad Facebook' then v_origen := 'Publicidad';
        when 'Publicidad Google' then v_origen := 'Publicidad';
        when 'Instagram orgánico' then v_origen := 'Instagram';
        when 'Facebook orgánico' then v_origen := 'Facebook';
        when 'Google orgánico' then v_origen := 'Google';

        else v_origen := null;
    end case;

    if p_cliente_id is not null then
        -- Si se seleccionó una clienta, su ID define la identidad.
        select id
        into v_cliente_id
        from public.clientes
        where id = p_cliente_id;

        if v_cliente_id is null then
            raise exception 'Clienta seleccionada no encontrada';
        end if;

        if v_origen is not null then
            update public.clientes
            set origen = coalesce(origen, v_origen)
            where id = v_cliente_id;
        end if;

    else
        -- Compatibilidad temporal con el flujo actual.
        select id
        into v_cliente_id
        from public.clientes
        where telefono_normalizado = p_telefono_normalizado
        limit 1;

        if v_cliente_id is null then
            insert into public.clientes (
                nombre,
                telefono,
                telefono_normalizado,
                origen
            )
            values (
                trim(p_nombre),
                p_telefono,
                p_telefono_normalizado,
                v_origen
            )
            returning id into v_cliente_id;

        elsif v_origen is not null then
            update public.clientes
            set origen = coalesce(origen, v_origen)
            where id = v_cliente_id;
        end if;
    end if;

    insert into public.turnos_tamara (
        cliente_id,
        fecha,
        hora,
        trabajo_estimado,
        precio_estimado,
        origen_cliente,
        notas,
        estado
    )
    values (
        v_cliente_id,
        p_fecha,
        p_hora,
        nullif(trim(p_trabajo_estimado), ''),
        p_precio_estimado,
        v_origen,
        nullif(trim(p_notas), ''),
        'pendiente'
    )
    returning id into v_turno_id;

    return v_turno_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.crear_turno_tamara(text, text, text, date, time without time zone, text, numeric, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crear_turno_tamara(text, text, text, date, time without time zone, text, numeric, text, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.crear_turno_tamara(text, text, text, date, time without time zone, text, numeric, text, text, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.crear_turno_tamara(text, text, text, date, time without time zone, text, numeric, text, text, uuid) FROM service_role;
GRANT EXECUTE ON FUNCTION public.crear_turno_tamara(text, text, text, date, time without time zone, text, numeric, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.crear_turno_publico(p_solicitud_id uuid, p_cliente text, p_telefono_e164 text, p_servicio text, p_fecha date, p_hora time without time zone, p_profesional_id uuid DEFAULT NULL::uuid, p_nota text DEFAULT ''::text)
 RETURNS TABLE(reserva_id uuid, fecha date, hora time without time zone, profesional_id uuid, estado text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_nombre text;
  v_telefono text;
  v_normalizado text;
  v_nota text;
  v_huella bytea;

  v_solicitud public.solicitudes_reserva_publica%ROWTYPE;

  v_inicio timestamp without time zone;
  v_fin timestamp without time zone;
  v_dia integer;

  v_precio numeric;
  v_duracion integer;
  v_duracion_insertada integer;

  v_candidatas uuid[];
  v_candidata uuid;
  v_profesional uuid;
  v_cliente_id uuid;
  v_turno_id uuid;

  v_lock integer;
BEGIN

  IF pg_catalog.current_setting('transaction_isolation')
       <> 'read committed' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE = 'No se pudo procesar la reserva en esta transacción.';
  END IF;


  -- ==========================================================
  -- Validación de entrada
  -- ==========================================================

  IF p_solicitud_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE = 'Falta el identificador de la solicitud.';
  END IF;

  v_nombre :=
    pg_catalog.btrim(COALESCE(p_cliente, ''));

  v_telefono :=
    pg_catalog.btrim(COALESCE(p_telefono_e164, ''));

  v_nota :=
    pg_catalog.btrim(COALESCE(p_nota, ''));


  IF v_nombre = ''
     OR pg_catalog.char_length(v_nombre) > 120 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE = 'Ingresá un nombre de entre 1 y 120 caracteres.';
  END IF;


  IF v_telefono !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE = 'Ingresá un teléfono internacional válido con + y código de país.';
  END IF;

  v_normalizado :=
    pg_catalog.substr(v_telefono, 2);


  IF pg_catalog.char_length(v_nota) > 1000 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE = 'La nota no puede superar los 1000 caracteres.';
  END IF;


  IF p_servicio IS NULL
     OR pg_catalog.btrim(p_servicio) = ''
     OR pg_catalog.char_length(p_servicio) > 200 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE = 'Seleccioná un servicio válido.';
  END IF;


  IF p_fecha IS NULL
     OR NOT pg_catalog.isfinite(p_fecha)
     OR p_hora IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE = 'Ingresá una fecha y una hora válidas.';
  END IF;


  IF p_hora >= time '24:00:00' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE = 'Ingresá una hora de inicio válida.';
  END IF;


  v_inicio := p_fecha + p_hora;


  -- ==========================================================
  -- Huella idempotente
  -- ==========================================================

  v_huella := pg_catalog.sha256(
    pg_catalog.convert_to(
      pg_catalog.jsonb_build_object(
        'version', 1,
        'cliente', v_nombre,
        'telefono_e164', v_telefono,
        'servicio', p_servicio,
        'fecha',
          pg_catalog.to_char(
            v_inicio,
            'YYYY-MM-DD'
          ),
        'hora',
          pg_catalog.to_char(
            v_inicio,
            'HH24:MI:SS.US'
          ),
        'profesional_id',
          p_profesional_id,
        'nota',
          v_nota
      )::text,
      'UTF8'
    )
  );


  -- ==========================================================
  -- Lock de idempotencia
  -- ==========================================================

  v_lock := (
    (
      'x' ||
      pg_catalog.substr(
        pg_catalog.md5(p_solicitud_id::text),
        1,
        7
      )
    )::bit(28)
  )::integer;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    71001,
    v_lock
  );


  SELECT sr.*
  INTO v_solicitud
  FROM public.solicitudes_reserva_publica AS sr
  WHERE sr.solicitud_id = p_solicitud_id
  FOR SHARE OF sr;


  IF FOUND THEN

    IF v_solicitud.huella
         IS DISTINCT FROM v_huella THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P1001',
        MESSAGE =
          'La solicitud ya fue utilizada con otros datos.';
    END IF;


    RETURN QUERY
    SELECT
      v_solicitud.turno_id,
      v_solicitud.fecha,
      v_solicitud.hora,
      v_solicitud.profesional_id,
      v_solicitud.estado;

    RETURN;

  END IF;


  -- ==========================================================
  -- Fecha futura
  -- ==========================================================

  IF v_inicio <= (
    pg_catalog.clock_timestamp()
      AT TIME ZONE 'America/Montevideo'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE =
        'Seleccioná una fecha y una hora futuras.';
  END IF;


  v_dia :=
    EXTRACT(ISODOW FROM p_fecha)::integer;


  -- Agenda actual: lunes 1 a sábado 6.
  IF v_dia NOT BETWEEN 1 AND 6 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE =
        'El horario ya no está disponible.';
  END IF;


  -- ==========================================================
  -- Servicio: precio y duración siempre server-side
  -- ==========================================================

  SELECT
    s.precio,
    s.duracion
  INTO
    v_precio,
    v_duracion
  FROM public.servicios AS s
  WHERE s.id = p_servicio
    AND COALESCE(s.activo, false)
  FOR SHARE OF s;


  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE =
        'El servicio no está disponible.';
  END IF;


  IF v_duracion IS NULL
     OR v_duracion <= 0
     OR v_precio IS NULL
     OR v_precio < 0
     OR v_precio::text IN (
       'NaN',
       'Infinity',
       '-Infinity'
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE =
        'El servicio no está disponible.';
  END IF;


  v_fin :=
    v_inicio
    + pg_catalog.make_interval(
        mins => v_duracion
      );


  -- ==========================================================
  -- Profesionales candidatas
  -- ==========================================================

  SELECT
    pg_catalog.array_agg(
      p.id
      ORDER BY p.id
    )
  INTO v_candidatas
  FROM public.profesionales AS p
  WHERE COALESCE(p.activa, false)
    AND (
      p_profesional_id IS NULL
      OR p.id = p_profesional_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.profesionales_servicios AS ps
      WHERE ps.profesional_id = p.id
        AND ps.servicio_id = p_servicio
    );


  IF v_candidatas IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE =
        'El horario ya no está disponible.';
  END IF;


  -- ==========================================================
  -- Locks de agenda
  -- ==========================================================

  FOR v_lock IN

    SELECT DISTINCT
      (
        (
          'x' ||
          pg_catalog.substr(
            pg_catalog.md5(
              c.id::text
              || ':'
              || pg_catalog.to_char(
                   v_inicio,
                   'YYYY-MM-DD'
                 )
            ),
            1,
            7
          )
        )::bit(28)
      )::integer AS clave

    FROM pg_catalog.unnest(
      v_candidatas
    ) AS c(id)

    ORDER BY clave

  LOOP

    PERFORM pg_catalog.pg_advisory_xact_lock(
      71002,
      v_lock
    );

  END LOOP;


  -- Revalidar el tiempo después de esperar locks.
  IF v_inicio <= (
    pg_catalog.clock_timestamp()
      AT TIME ZONE 'America/Montevideo'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE =
        'El horario ya no está disponible.';
  END IF;


  -- ==========================================================
  -- Buscar una profesional realmente disponible
  -- ==========================================================

  FOREACH v_candidata IN ARRAY v_candidatas
  LOOP

    IF NOT EXISTS (
      SELECT 1
      FROM public.profesionales AS p
      WHERE p.id = v_candidata
        AND COALESCE(p.activa, false)
        AND EXISTS (
          SELECT 1
          FROM public.profesionales_servicios AS ps
          WHERE ps.profesional_id = p.id
            AND ps.servicio_id = p_servicio
        )
    ) THEN
      CONTINUE;
    END IF;


    -- Jornada completa.
    IF NOT EXISTS (
      SELECT 1
      FROM public.horarios_profesionales AS hp
      WHERE hp.profesional_id = v_candidata
        AND hp.dia_semana = v_dia
        AND COALESCE(hp.activo, false)
        AND hp.hora_inicio IS NOT NULL
        AND hp.hora_fin IS NOT NULL
        AND hp.hora_inicio < hp.hora_fin
        AND v_inicio >=
              p_fecha + hp.hora_inicio
        AND v_fin <=
              p_fecha + hp.hora_fin
    ) THEN
      CONTINUE;
    END IF;


    -- Licencias.
    IF EXISTS (
      SELECT 1
      FROM public.licencias_profesionales AS lp
      WHERE lp.profesional_id = v_candidata
        AND p_fecha BETWEEN
              lp.fecha_desde
              AND lp.fecha_hasta
    ) THEN
      CONTINUE;
    END IF;


    -- Si existen turnos bloqueantes con datos
    -- insuficientes, no declarar libre.
    IF EXISTS (
      SELECT 1
      FROM public.turnos AS t
      LEFT JOIN public.servicios AS se
        ON se.id = t.servicio
      WHERE t.profesional_id = v_candidata
        AND t.fecha = p_fecha
        AND t.estado IN (
          'pendiente',
          'confirmado',
          'completado',
          'ausente'
        )
        AND (
          t.hora IS NULL
          OR COALESCE(
               t.duracion,
               se.duracion
             ) IS NULL
          OR COALESCE(
               t.duracion,
               se.duracion
             ) <= 0
        )
    ) THEN
      CONTINUE;
    END IF;


    -- Solapamiento.
    IF EXISTS (
      SELECT 1
      FROM public.turnos AS t
      LEFT JOIN public.servicios AS se
        ON se.id = t.servicio
      WHERE t.profesional_id = v_candidata
        AND t.fecha <= p_fecha
        AND t.estado IN (
          'pendiente',
          'confirmado',
          'completado',
          'ausente'
        )
        AND v_inicio < (
          t.fecha
          + t.hora
          + pg_catalog.make_interval(
              mins => COALESCE(
                t.duracion,
                se.duracion
              )
            )
        )
        AND (
          t.fecha + t.hora
        ) < v_fin
    ) THEN
      CONTINUE;
    END IF;


    v_profesional := v_candidata;
    EXIT;

  END LOOP;


  IF v_profesional IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE =
        'El horario ya no está disponible.';
  END IF;


  -- ==========================================================
  -- Identidad central
  -- ==========================================================

  SELECT c.id
  INTO v_cliente_id
  FROM public.clientes AS c
  WHERE c.telefono_normalizado =
        v_normalizado;


  IF NOT FOUND THEN

    BEGIN

      INSERT INTO public.clientes AS c (
        nombre,
        telefono,
        telefono_normalizado
      )
      VALUES (
        v_nombre,
        v_telefono,
        v_normalizado
      )
      RETURNING c.id
      INTO v_cliente_id;


    EXCEPTION
      WHEN unique_violation THEN

        SELECT c.id
        INTO v_cliente_id
        FROM public.clientes AS c
        WHERE c.telefono_normalizado =
              v_normalizado;


        IF NOT FOUND THEN
          RAISE EXCEPTION USING
            ERRCODE = 'P1001',
            MESSAGE =
              'No se pudo completar la reserva.';
        END IF;

    END;

  END IF;


  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE =
        'No se pudo completar la reserva.';
  END IF;


  -- ==========================================================
  -- Crear turno
  -- ==========================================================

  INSERT INTO public.turnos AS t (
    cliente_id,
    cliente,
    telefono,
    servicio,
    profesional_id,
    fecha,
    hora,
    estado,
    origen,
    nota,
    precio
  )
  VALUES (
    v_cliente_id,
    v_nombre,
    v_telefono,
    p_servicio,
    v_profesional,
    p_fecha,
    p_hora,
    'pendiente',
    'publico',
    v_nota,
    v_precio
  )
  RETURNING
    t.id,
    t.duracion
  INTO
    v_turno_id,
    v_duracion_insertada;


  IF v_turno_id IS NULL
     OR v_duracion_insertada
          IS DISTINCT FROM v_duracion THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE =
        'No se pudo completar la reserva.';
  END IF;


  -- ==========================================================
  -- Registrar idempotencia
  -- ==========================================================

  INSERT INTO public.solicitudes_reserva_publica (
    solicitud_id,
    huella,
    turno_id,
    fecha,
    hora,
    profesional_id,
    estado
  )
  VALUES (
    p_solicitud_id,
    v_huella,
    v_turno_id,
    p_fecha,
    p_hora,
    v_profesional,
    'pendiente'
  );


  RETURN QUERY
  SELECT
    v_turno_id,
    p_fecha,
    p_hora,
    v_profesional,
    'pendiente'::text;


EXCEPTION

  WHEN SQLSTATE 'P1001' THEN
    RAISE;

  WHEN OTHERS THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE =
        'No se pudo completar la reserva. Conservá la solicitud para reintentar.';

END;
$function$;

REVOKE ALL ON FUNCTION public.crear_turno_publico(uuid, text, text, text, date, time without time zone, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crear_turno_publico(uuid, text, text, text, date, time without time zone, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.crear_turno_publico(uuid, text, text, text, date, time without time zone, uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.crear_turno_publico(uuid, text, text, text, date, time without time zone, uuid, text) FROM service_role;
GRANT EXECUTE ON FUNCTION public.crear_turno_publico(uuid, text, text, text, date, time without time zone, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.crear_turno_publico(uuid, text, text, text, date, time without time zone, uuid, text) TO authenticated;

DROP POLICY IF EXISTS "clientes pueden reservar" ON public.turnos;

REVOKE INSERT ON TABLE public.turnos FROM anon;

COMMIT;
