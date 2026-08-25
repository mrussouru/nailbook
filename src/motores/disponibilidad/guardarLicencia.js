import { supabase } from "../../supabaseClient";

export async function guardarLicencia(licencia) {

  const { error } = await supabase
    .from("licencias_profesionales")
    .insert(licencia);

  if (error) throw error;

}