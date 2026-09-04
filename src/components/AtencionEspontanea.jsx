import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AtencionEspontanea({
  servicios,
  profesionales,
  relacionesServicios,
  usuario,
  onAtencionRegistrada
}) {

  const [form, setForm] = useState({
    cliente: "",
    telefono: "",
    servicio: "",
    profesional_id: "",
    precio: ""
  });

  const [guardando, setGuardando] = useState(false);

  const esProfesional = usuario?.rol === "profesional";

  const profesionalActual = esProfesional
    ? profesionales.find(
        p => p.id === usuario?.profesional_id
      )
    : null;

    const serviciosDisponibles = servicios.filter(servicio => {
      if (!servicio.activo) return false;
    
      // El dueño puede ver todos los servicios activos.
      // Después se filtran las profesionales que pueden realizarlos.
      if (!esProfesional) return true;
    
      // Una profesional solo puede elegir servicios
      // que tenga asignados.
      return relacionesServicios.some(
        relacion =>
          relacion.profesional_id === usuario?.profesional_id &&
          relacion.servicio_id === servicio.id
      );
    });

  const profesionalesDisponibles = form.servicio
    ? profesionales.filter(profesional =>
        relacionesServicios.some(
          relacion =>
            relacion.profesional_id === profesional.id &&
            relacion.servicio_id === form.servicio
        )
      )
    : profesionales;


  function seleccionarServicio(servicioId) {

    const servicio = servicios.find(
      s => s.id === servicioId
    );

    setForm({
      ...form,
      servicio: servicioId,
      profesional_id: "",
      precio: servicio?.precio ?? ""
    });
  }


  async function registrarAtencion() {

    if (!form.cliente.trim()) {
      alert("Ingresá el nombre de la clienta.");
      return;
    }

    if (!form.servicio) {
      alert("Seleccioná un servicio.");
      return;
    }

    const profesionalIdFinal = esProfesional
      ? usuario?.profesional_id
      : form.profesional_id;

    if (!profesionalIdFinal) {
      alert("No se pudo identificar la profesional.");
      return;
    }

    if (form.precio === "") {
      alert("Ingresá el precio cobrado.");
      return;
    }

    const ahora = new Date();

    const fecha =
      `${ahora.getFullYear()}-` +
      `${String(ahora.getMonth() + 1).padStart(2, "0")}-` +
      `${String(ahora.getDate()).padStart(2, "0")}`;

    const hora =
      `${String(ahora.getHours()).padStart(2, "0")}:` +
      `${String(ahora.getMinutes()).padStart(2, "0")}`;

    setGuardando(true);

    const { error } = await supabase
      .from("turnos")
      .insert({
        cliente: form.cliente.trim(),
        telefono: form.telefono.trim(),
        servicio: form.servicio,
        profesional_id: profesionalIdFinal,
        fecha,
        hora,
        estado: "completado",
        origen: "espontaneo",
        precio: Number(form.precio),
        nota: "Atención espontánea"
      });

    setGuardando(false);

    if (error) {
      console.error(error);
      alert("No se pudo registrar la atención.");
      return;
    }

    setForm({
      cliente: "",
      telefono: "",
      servicio: "",
      profesional_id: "",
      precio: ""
    });

    await onAtencionRegistrada?.();

    alert("✅ Atención registrada correctamente");
  }


  return (
    <div>

      <h2
        style={{
          margin: "0 0 20px",
          color: "#b05080",
          fontWeight: 800
        }}
      >
        🚶 Atención espontánea
      </h2>

      <div
        style={{
          background: "#fff",
          border: "2px solid #f0d9e8",
          borderRadius: 18,
          padding: 28
        }}
      >

        {/* CLIENTE */}

        <div style={{ marginBottom: 16 }}>

          <label style={labelStyle}>
            Cliente *
          </label>

          <input
            type="text"
            placeholder="Nombre de la clienta"
            value={form.cliente}
            onChange={e =>
              setForm({
                ...form,
                cliente: e.target.value
              })
            }
            style={inputStyle}
          />

        </div>


        {/* WHATSAPP */}

        <div style={{ marginBottom: 16 }}>

          <label style={labelStyle}>
            WhatsApp
          </label>

          <input
            type="text"
            placeholder="Teléfono (opcional)"
            value={form.telefono}
            onChange={e =>
              setForm({
                ...form,
                telefono: e.target.value
              })
            }
            style={inputStyle}
          />

        </div>


        {/* SERVICIO */}

        <div style={{ marginBottom: 16 }}>

          <label style={labelStyle}>
            Servicio *
          </label>

          <select
            value={form.servicio}
            onChange={e =>
              seleccionarServicio(e.target.value)
            }
            style={inputStyle}
          >

            <option value="">
              Seleccionar servicio
            </option>

            {serviciosDisponibles.map(servicio => (

              <option
                key={servicio.id}
                value={servicio.id}
              >
                {servicio.nombre} · {servicio.duracion} min
              </option>

            ))}

          </select>

        </div>


        {/* PROFESIONAL */}

        <div style={{ marginBottom: 16 }}>

          <label style={labelStyle}>
            Profesional *
          </label>

          {esProfesional ? (

            /* Si inició sesión una profesional,
               mostramos solamente su propio nombre */

            <input
              type="text"
              value={profesionalActual?.nombre || "Profesional"}
              disabled
              style={{
                ...inputStyle,
                background: "#f5f5f5",
                color: "#666",
                cursor: "not-allowed"
              }}
            />

          ) : (

            /* Si inició sesión el dueño,
               puede seleccionar la profesional */

            <select
              value={form.profesional_id}
              onChange={e =>
                setForm({
                  ...form,
                  profesional_id: e.target.value
                })
              }
              style={inputStyle}
              disabled={!form.servicio}
            >

              <option value="">
                Seleccionar profesional
              </option>

              {profesionalesDisponibles.map(profesional => (

                <option
                  key={profesional.id}
                  value={profesional.id}
                >
                  {profesional.nombre}
                </option>

              ))}

            </select>

          )}

        </div>


        {/* PRECIO */}

        <div style={{ marginBottom: 20 }}>

          <label style={labelStyle}>
            Precio cobrado *
          </label>

          <input
            type="number"
            min="0"
            value={form.precio}
            onChange={e =>
              setForm({
                ...form,
                precio: e.target.value
              })
            }
            style={inputStyle}
          />

        </div>


        {/* REGISTRAR */}

        <button
          onClick={registrarAtencion}
          disabled={guardando}
          style={{
            width: "100%",
            padding: 13,
            border: "none",
            borderRadius: 12,
            background: "#b05080",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: guardando ? "default" : "pointer",
            opacity: guardando ? 0.7 : 1
          }}
        >
          {guardando
            ? "Registrando..."
            : "✅ Registrar atención"}
        </button>

      </div>

    </div>
  );
}


const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#b05080",
  marginBottom: 5
};


const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "2px solid #f0d9e8",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff"
};