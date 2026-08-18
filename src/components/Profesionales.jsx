import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Profesionales() {
  const [profesionales, setProfesionales] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idEditando, setIdEditando] = useState(null)

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    porcentaje: 40,
    email: "",
    color: "#b05080",
    slug: ""
  });

  async function cargarProfesionales() {
    const { data, error } = await supabase
      .from("profesionales")
      .select("*")
      .order("nombre");

    if (error) {
      console.error(error);
      return;
    }

    setProfesionales(data || []);
  }

  useEffect(() => {
    cargarProfesionales();
    cargarServicios();
  }, []);

  async function cargarServicios() {

    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .eq("activo", true)
      .order("orden");
  
    if (error) {
      console.error(error);
      return;
    }
  
    setServicios(data || []);
  
  }

  async function guardarProfesional() {

    let error;
    let profesionalId = idEditando;
  
    if (modoEdicion) {
  
      const { error: updateError } = await supabase
        .from("profesionales")
        .update({
          nombre: form.nombre,
          telefono: form.telefono,
          porcentaje: Number(form.porcentaje),
          email: form.email,
          color: form.color,
          slug: form.nombre
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
        })
        .eq("id", idEditando);
  
      error = updateError;
  
    } else {
  
      const { data, error: insertError } = await supabase
        .from("profesionales")
        .insert({
          nombre: form.nombre,
          telefono: form.telefono,
          porcentaje: Number(form.porcentaje),
          email: form.email,
          color: form.color,
          slug: form.nombre
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""),
          activa: true
        })
        .select()
        .single();
  
      error = insertError;
  
      if (data) {
        profesionalId = data.id;
      }
  
    }
  
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
  
    // ============================
    // Guardar servicios
    // ============================
  
    await supabase
      .from("profesionales_servicios")
      .delete()
      .eq("profesional_id", profesionalId);
  
    if (serviciosSeleccionados.length > 0) {
  
      const relaciones = serviciosSeleccionados.map(servicioId => ({
        profesional_id: profesionalId,
        servicio_id: servicioId
      }));
  
      const { error: errorServicios } = await supabase
        .from("profesionales_servicios")
        .insert(relaciones);
  
      if (errorServicios) {
        console.error(errorServicios);
        alert(errorServicios.message);
        return;
      }
  
    }
  
    // ============================
    // Limpiar formulario
    // ============================
  
    setForm({
      nombre: "",
      telefono: "",
      porcentaje: 40,
      email: "",
      color: "#b05080",
      slug: ""
    });
  
    setServiciosSeleccionados([]);
  
    setMostrarFormulario(false);
    setModoEdicion(false);
    setIdEditando(null);
  
    await cargarProfesionales();
  
  }

  async function editarProfesional(p) {

    setModoEdicion(true)
  
    setIdEditando(p.id)
  
    setForm({
      nombre: p.nombre,
      telefono: p.telefono || "",
      porcentaje: p.porcentaje,
      email: p.email || "",
      color: p.color,
      slug: p.slug || ""
    })
  
    await cargarServiciosProfesional(p.id)

setMostrarFormulario(true)
  
  }

  async function cargarServiciosProfesional(profesionalId) {

    const { data, error } = await supabase
      .from("profesionales_servicios")
      .select("servicio_id")
      .eq("profesional_id", profesionalId);
  
    if (error) {
      console.error(error);
      return;
    }
  
    setServiciosSeleccionados(
      data.map(x => x.servicio_id)
    );
  
  }

  async function cambiarEstado(p) {

    const { error } = await supabase
      .from("profesionales")
      .update({
        activa: !p.activa
      })
      .eq("id", p.id);
  
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
  
    await cargarProfesionales();
  
  }

  return (
    <div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#b05080"
          }}
        >
          👩‍🎨 Profesionales
        </h2>

        <button
          onClick={() => setMostrarFormulario(true)}
          style={{
            background: "#b05080",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "10px 18px",
            cursor: "pointer",
            fontWeight: 700
          }}
        >
          + Nueva
        </button>
      </div>

      {mostrarFormulario && (

        <div
          style={{
            background: "#fff",
            border: "2px solid #f0d9e8",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20
          }}
        >

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14
            }}
          >

            <input
              placeholder="Nombre"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
            />

            <input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={e => setForm({ ...form, telefono: e.target.value })}
            />

            <input
              placeholder="Email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />

            <input
              type="number"
              placeholder="Porcentaje"
              value={form.porcentaje}
              onChange={e =>
                setForm({
                  ...form,
                  porcentaje: e.target.value
                })
              }
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <span>Color</span>

              <input
                type="color"
                value={form.color}
                onChange={e =>
                  setForm({
                    ...form,
                    color: e.target.value
                  })
                }
              />
            </div>

          </div>

          <div style={{ marginTop: 20 }}>

<strong>Servicios que realiza</strong>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(2,1fr)",
    gap: 10,
    marginTop: 10
  }}
>

  {servicios.map(servicio => (

    <label
      key={servicio.id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer"
      }}
    >

      <input
        type="checkbox"
        checked={serviciosSeleccionados.includes(servicio.id)}
        onChange={(e) => {

          if (e.target.checked) {

            setServiciosSeleccionados([
              ...serviciosSeleccionados,
              servicio.id
            ])

          } else {

            setServiciosSeleccionados(
              serviciosSeleccionados.filter(id => id !== servicio.id)
            )

          }

        }}
      />

      {servicio.nombre}

    </label>

  ))}

</div>

</div>
          <div
  style={{
    marginTop: 20,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10
  }}
>

  <button
    onClick={() => {
      setMostrarFormulario(false)
      setModoEdicion(false)
      setIdEditando(null)

      setForm({
        nombre: "",
        telefono: "",
        porcentaje: 40,
        email: "",
        color: "#b05080",
        slug: ""
      })
    }}
    style={{
      background: "#eee",
      color: "#555",
      border: "none",
      borderRadius: 10,
      padding: "10px 18px",
      cursor: "pointer"
    }}
  >
    Cancelar
  </button>
            <button
              onClick={guardarProfesional}
              style={{
                background: "#b05080",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 18px",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
             {modoEdicion ? "Guardar cambios" : "Guardar profesional"}
            </button>

          </div>

        </div>

      )}

      {profesionales.map((p) => (

        <div
          key={p.id}
          style={{
            background: "#fff",
            border: "2px solid #f0d9e8",
            borderRadius: 16,
            padding: 20,
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >

          <div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >

              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: p.color
                }}
              />

              <strong>{p.nombre}</strong>

            </div>

            <div
              style={{
                fontSize: 13,
                color: "#777",
                marginTop: 6
              }}
            >
              📱 {p.telefono || "-"}
            </div>

          </div>

          <div style={{ textAlign: "right" }}>

  <div
    style={{
      fontWeight: 700
    }}
  >
    {p.porcentaje}%
  </div>

  <div
    style={{
      color: p.activa ? "green" : "#999",
      fontSize: 13,
      marginBottom: 10
    }}
  >
    {p.activa ? "🟢 Activa" : "⚪ Inactiva"}
  </div>

  <div
    style={{
      display: "flex",
      gap: 8,
      justifyContent: "flex-end"
    }}
  >

    <button
    onClick={() => editarProfesional(p)}
      style={{
        border: "none",
        background: "#fce8f3",
        color: "#b05080",
        borderRadius: 8,
        padding: "6px 10px",
        cursor: "pointer"
      }}
    >
      ✏️ Editar
    </button>

    <button
    onClick={() => cambiarEstado(p)}
      style={{
        border: "none",
        background: "#f5f5f5",
        color: "#666",
        borderRadius: 8,
        padding: "6px 10px",
        cursor: "pointer"
      }}
    >
      {p.activa ? "⏸ Desactivar" : "▶ Activar"}
    </button>

  </div>

</div>

        </div>

      ))}

    </div>
  );
}