import { supabase } from "../../supabaseClient";

export async function guardarHorarios(profesionalId, horarios) {

  await supabase
    .from("horarios_profesionales")
    .delete()
    .eq("profesional_id", profesionalId);

  if (horarios.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("horarios_profesionales")
    .insert(horarios);

  if (error) {
    throw error;
  }

}