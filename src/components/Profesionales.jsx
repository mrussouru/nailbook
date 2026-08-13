import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Profesionales() {

  const [profesionales, setProfesionales] = useState([]);

  async function cargarProfesionales() {
    const { data } = await supabase
      .from("manicuras")
      .select("*")
      .order("nombre");

    setProfesionales(data || []);
  }

  useEffect(() => {
    cargarProfesionales();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: "#b05080" }}>
        👩‍🎨 Profesionales
      </h2>

      <p>Total: {profesionales.length}</p>
    </div>
  );
}