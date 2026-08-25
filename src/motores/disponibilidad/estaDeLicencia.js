import { supabase } from "../../supabaseClient";

export async function estaDeLicencia(profesionalId, fecha) {

  const { data, error } = await supabase
    .from("licencias_profesionales")
    .select("*")
    .eq("profesional_id", profesionalId)
    .lte("fecha_desde", fecha)
    .gte("fecha_hasta", fecha)
    .limit(1);

  if (error) throw error;

  return data.length > 0;

}