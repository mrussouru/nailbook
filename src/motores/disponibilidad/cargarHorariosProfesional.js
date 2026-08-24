import { supabase } from "../../supabaseClient";

export async function cargarHorariosProfesional(profesionalId) {

  const { data, error } = await supabase

    .from("horarios_profesionales")

    .select("*")

    .eq("profesional_id", profesionalId);

  if (error) throw error;

  return data;

}