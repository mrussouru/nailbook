import { supabase } from "../../supabaseClient";

export async function cargarLicencias(profesionalId) {

  const { data, error } = await supabase
    .from("licencias_profesionales")
    .select("*")
    .eq("profesional_id", profesionalId)
    .order("fecha_desde");

  if (error) throw error;

  return data ?? [];

}