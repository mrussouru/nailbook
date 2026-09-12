import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const formularioVacio = {
  nombre: "", categoria: "", precio_referencia: "", activo: true,
  seguimiento_activo: false, dias_seguimiento: "", orden: 0
};

export default function ServiciosTamara() {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(formularioVacio);

  useEffect(() => { cargarServicios(); }, []);

  async function cargarServicios() {
    setCargando(true);
    setError("");
    try {
      const { data, error } = await supabase.from("servicios_tamara")
        .select("id,nombre,categoria,precio_referencia,activo,seguimiento_activo,dias_seguimiento,orden")
        .order("orden", { ascending: true }).order("nombre", { ascending: true });
      if (error) throw error;
      setServicios(data || []);
    } catch (err) {
      setError("No se pudieron cargar los servicios: " + err.message);
    } finally {
      setCargando(false);
    }
  }

  function abrirFormulario(servicio = null) {
    setError("");
    setMensaje("");
    setEditandoId(servicio?.id || null);
    setForm(servicio ? {
      nombre: servicio.nombre || "",
      categoria: servicio.categoria || "",
      precio_referencia: servicio.precio_referencia ?? "",
      activo: Boolean(servicio.activo),
      seguimiento_activo: Boolean(servicio.seguimiento_activo),
      dias_seguimiento: servicio.dias_seguimiento ?? "",
      orden: servicio.orden ?? 0
    } : {
      ...formularioVacio,
      orden: servicios.length ? Math.max(...servicios.map(s => Number(s.orden || 0))) + 1 : 1
    });
    setMostrarFormulario(true);
  }

  async function guardar(e) {
    e.preventDefault();
    if (guardando) return;
    setError("");
    setMensaje("");
    const precio = form.precio_referencia === "" ? null : Number(form.precio_referencia);
    const dias = form.dias_seguimiento === "" ? null : Number(form.dias_seguimiento);
    const orden = Number(form.orden);
    if (!form.nombre.trim()) return setError("Ingresá el nombre del servicio.");
    if (precio !== null && (!Number.isFinite(precio) || precio < 0)) {
      return setError("Ingresá un precio de referencia válido, mayor o igual a cero.");
    }
    if (form.orden === "" || !Number.isInteger(orden) || orden < -2147483648 || orden > 2147483647) {
      return setError("Ingresá un orden entero válido.");
    }
    if ((form.seguimiento_activo && dias === null) ||
        (dias !== null && (!Number.isInteger(dias) || dias <= 0 || dias > 2147483647))) {
      return setError("Ingresá una cantidad entera de días mayor a cero para el seguimiento.");
    }
    const payload = {
      nombre: form.nombre.trim(), categoria: form.categoria.trim() || null,
      precio_referencia: precio, activo: form.activo,
      seguimiento_activo: form.seguimiento_activo, dias_seguimiento: dias, orden
    };
    setGuardando(true);
    try {
      const consulta = editandoId
        ? supabase.from("servicios_tamara").update(payload).eq("id", editandoId)
        : supabase.from("servicios_tamara").insert(payload);
      const { error } = await consulta.select("id").single();
      if (error) throw error;
      setMostrarFormulario(false);
      setEditandoId(null);
      setMensaje("Servicio guardado correctamente.");
      await cargarServicios();
    } catch (err) {
      setError("No se pudo guardar el servicio: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  function campo(nombre, valor) {
    setForm(actual => ({ ...actual, [nombre]: valor }));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: "#b05080" }}>💇‍♀️ Servicios de Tamara</h2>
        <button style={boton} disabled={guardando || cargando} onClick={() => abrirFormulario()}>＋ Nuevo servicio</button>
      </div>
      {error && <p role="alert" style={{ ...tarjeta, color: "#a33", background: "#fff0f0" }}>{error}</p>}
      {mensaje && <p role="status" style={{ color: "#087a5a" }}>{mensaje}</p>}
      {mostrarFormulario && (
        <form onSubmit={guardar} style={tarjeta}>
          <h3 style={{ marginTop: 0, color: "#b05080" }}>{editandoId ? "Editar servicio" : "Nuevo servicio"}</h3>
          <fieldset disabled={guardando} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <Campo label="Nombre *"><input required value={form.nombre} onChange={e => campo("nombre", e.target.value)} style={input} /></Campo>
              <Campo label="Categoría"><input value={form.categoria} onChange={e => campo("categoria", e.target.value)} style={input} /></Campo>
              <Campo label="Precio de referencia"><input type="number" min="0" step="0.01" placeholder="Sin precio de referencia" value={form.precio_referencia} onChange={e => campo("precio_referencia", e.target.value)} style={input} /></Campo>
              <Campo label="Orden *"><input required type="number" step="1" value={form.orden} onChange={e => campo("orden", e.target.value)} style={input} /></Campo>
              <Campo label="Días de seguimiento"><input required={form.seguimiento_activo} type="number" min="1" step="1" value={form.dias_seguimiento} onChange={e => campo("dias_seguimiento", e.target.value)} style={input} /></Campo>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", margin: "20px 0" }}>
              <label><input type="checkbox" checked={form.activo} onChange={e => campo("activo", e.target.checked)} /> Servicio activo</label>
              <label><input type="checkbox" checked={form.seguimiento_activo} onChange={e => campo("seguimiento_activo", e.target.checked)} /> Seguimiento activo</label>
            </div>
            <p style={{ color: "#777", fontSize: 13 }}>Los servicios inactivos dejan de estar disponibles para nuevos conceptos. Las atenciones anteriores conservan sus datos.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" style={secundario} onClick={() => setMostrarFormulario(false)}>Cancelar</button>
              <button type="submit" style={boton}>{guardando ? "Guardando..." : "Guardar servicio"}</button>
            </div>
          </fieldset>
        </form>
      )}
      {cargando ? <p style={{ color: "#777" }}>Cargando servicios...</p> : (
        <>
          <button style={{ ...secundario, marginBottom: 16 }} disabled={guardando} onClick={cargarServicios}>Actualizar listado</button>
          {servicios.length === 0 && !error && <p style={tarjeta}>Todavía no hay servicios de Tamara registrados.</p>}
          {servicios.map(servicio => (
            <div key={servicio.id} style={{ ...tarjeta, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <strong style={{ color: "#b05080" }}>{servicio.nombre}</strong>
                <p style={{ margin: "7px 0", color: "#666" }}>
                  {servicio.categoria || "Sin categoría"} · {servicio.precio_referencia == null ? "Sin precio de referencia" : `$${Number(servicio.precio_referencia).toLocaleString("es-UY", { maximumFractionDigits: 2 })}`}
                </p>
                <small style={{ color: "#777" }}>
                  {servicio.activo ? "Activo" : "Inactivo"} · Orden: {servicio.orden ?? 0} · {servicio.seguimiento_activo ? `Seguimiento: ${servicio.dias_seguimiento} días` : "Seguimiento inactivo"}
                </small>
              </div>
              <button disabled={guardando} style={secundario} onClick={() => abrirFormulario(servicio)}>Editar</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Campo({ label, children }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 7, color: "#b05080", fontSize: 13, fontWeight: 700 }}>{label}{children}</label>;
}

const tarjeta = { background: "#fff", border: "1px solid #f0d9e8", borderRadius: 16, padding: 20, marginBottom: 18 };
const input = { width: "100%", boxSizing: "border-box", border: "1px solid #f0d9e8", borderRadius: 9, padding: 11, font: "inherit", color: "#333" };
const boton = { background: "#b05080", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700 };
const secundario = { ...boton, background: "#fff", color: "#b05080", border: "1px solid #f0d9e8" };
