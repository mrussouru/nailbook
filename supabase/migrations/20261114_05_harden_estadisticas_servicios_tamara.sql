BEGIN;

-- El dashboard frontend migró a estadisticas_servicios_tamara_v2;
-- el RPC legacy queda restringido a usuarios autenticados.
REVOKE ALL ON FUNCTION public.estadisticas_servicios_tamara(date, date)
    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.estadisticas_servicios_tamara(date, date)
    FROM anon;
REVOKE ALL ON FUNCTION public.estadisticas_servicios_tamara(date, date)
    FROM authenticated;
REVOKE ALL ON FUNCTION public.estadisticas_servicios_tamara(date, date)
    FROM service_role;
GRANT EXECUTE ON FUNCTION public.estadisticas_servicios_tamara(date, date)
    TO authenticated;

COMMIT;
