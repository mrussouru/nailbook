import { supabase } from "../../supabaseClient";

export async function cargarUsuario() {

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("auth_id", user.id)
        .single();

    if (error) throw error;

    return data;

}