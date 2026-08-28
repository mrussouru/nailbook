
import { supabase } from "../../supabaseClient";

export async function eliminarLicencia(id) {

  const { error } = await supabase
    .from("licencias_profesionales")
    .delete()
    .eq("id", id);

  if (error) throw error;

}