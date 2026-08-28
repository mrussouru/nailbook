import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Servicios({ onServiciosActualizados }) {

  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nuevoServicio, setNuevoServicio] = useState({
    nombre: "",
    duracion: "",
    precio: "",
    categoria: ""
  });

  const [editandoId, setEditandoId] = useState(null);

  const [servicioEditado, setServicioEditado] = useState({
    nombre: "",
    duracion: "",
    precio: "",
    categoria: ""
  });

  useEffect(() => {
    cargarServicios();
  }, []);

  async function cargarServicios() {

    setCargando(true);

    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .order("orden", { ascending: true });

    if (error) {
      console.error(error);
      alert("Error al cargar los servicios");
      setCargando(false);
      return;
    }

    setServicios(data || []);
    setCargando(false);
  }

  function generarId(nombre) {
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  async function guardarNuevoServicio() {

    if (
      !nuevoServicio.nombre.trim() ||
      !nuevoServicio.duracion ||
      !nuevoServicio.precio
    ) {
      alert("Completá nombre, duración y precio.");
      return;
    }

    const id = generarId(nuevoServicio.nombre);

    if (!id) {
      alert("El nombre del servicio no es válido.");
      return;
    }

    const siguienteOrden =
      servicios.length > 0
        ? Math.max(...servicios.map(s => s.orden || 0)) + 1
        : 1;

    const { error } = await supabase
      .from("servicios")
      .insert({
        id,
        nombre: nuevoServicio.nombre.trim(),
        duracion: Number(nuevoServicio.duracion),
        precio: Number(nuevoServicio.precio),
        activo: true,
        orden: siguienteOrden,
        categoria: nuevoServicio.categoria.trim() || null
      });

    if (error) {

      console.error(error);

      if (error.code === "23505") {
        alert("Ya existe un servicio con ese nombre o identificador.");
      } else {
        alert("Error al guardar el servicio.");
      }

      return;
    }

    await cargarServicios();
await onServiciosActualizados?.();

setNuevoServicio({
      nombre: "",
      duracion: "",
      precio: "",
      categoria: ""
    });

    setMostrarFormulario(false);

    alert("✅ Servicio creado correctamente");
  }

  async function cambiarEstadoServicio(servicio) {

    const nuevoEstado = !servicio.activo;

    const mensaje = nuevoEstado
      ? `¿Querés activar "${servicio.nombre}"?`
      : `¿Querés desactivar "${servicio.nombre}"?`;

    if (!window.confirm(mensaje)) return;

    const { error } = await supabase
      .from("servicios")
      .update({
        activo: nuevoEstado
      })
      .eq("id", servicio.id);

    if (error) {
      console.error(error);
      alert("Error al actualizar el servicio.");
      return;
    }

    await cargarServicios();
await onServiciosActualizados?.();
  }

  function comenzarEdicion(servicio) {

    setEditandoId(servicio.id);

    setServicioEditado({
      nombre: servicio.nombre,
      duracion: servicio.duracion,
      precio: servicio.precio,
      categoria: servicio.categoria || ""
    });
  }

  async function guardarEdicion(servicio) {

    if (
      !servicioEditado.nombre.trim() ||
      !servicioEditado.duracion ||
      !servicioEditado.precio
    ) {
      alert("Completá nombre, duración y precio.");
      return;
    }

    const { error } = await supabase
      .from("servicios")
      .update({
        nombre: servicioEditado.nombre.trim(),
        duracion: Number(servicioEditado.duracion),
        precio: Number(servicioEditado.precio),
        categoria: servicioEditado.categoria.trim() || null
      })
      .eq("id", servicio.id);

    if (error) {
      console.error(error);
      alert("Error al actualizar el servicio.");
      return;
    }

    await cargarServicios();
await onServiciosActualizados?.();

setEditandoId(null);

    alert("✅ Servicio actualizado correctamente");
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
        💅 Servicios
      </h2>

      <div
        style={{
          background: "#fff",
          border: "2px solid #f0d9e8",
          borderRadius: 18,
          padding: 28
        }}
      >

        {/* BOTÓN NUEVO SERVICIO */}

        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          style={{
            marginBottom: 20,
            padding: "10px 18px",
            border: "none",
            borderRadius: 10,
            background: "#b05080",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700
          }}
        >
          {mostrarFormulario
            ? "✖ Cancelar"
            : "➕ Nuevo servicio"}
        </button>


        {/* FORMULARIO NUEVO SERVICIO */}

        {mostrarFormulario && (

          <div
            style={{
              padding: 18,
              marginBottom: 22,
              border: "2px solid #f0d9e8",
              borderRadius: 14,
              background: "#fff8fc"
            }}
          >

            <input
              type="text"
              placeholder="Nombre del servicio"
              value={nuevoServicio.nombre}
              onChange={e =>
                setNuevoServicio({
                  ...nuevoServicio,
                  nombre: e.target.value
                })
              }
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 10,
                boxSizing: "border-box"
              }}
            />

            <input
              type="number"
              min="1"
              placeholder="Duración en minutos"
              value={nuevoServicio.duracion}
              onChange={e =>
                setNuevoServicio({
                  ...nuevoServicio,
                  duracion: e.target.value
                })
              }
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 10,
                boxSizing: "border-box"
              }}
            />

            <input
              type="number"
              min="0"
              step="1"
              placeholder="Precio"
              value={nuevoServicio.precio}
              onChange={e =>
                setNuevoServicio({
                  ...nuevoServicio,
                  precio: e.target.value
                })
              }
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 10,
                boxSizing: "border-box"
              }}
            />

            <input
              type="text"
              placeholder="Categoría (opcional)"
              value={nuevoServicio.categoria}
              onChange={e =>
                setNuevoServicio({
                  ...nuevoServicio,
                  categoria: e.target.value
                })
              }
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 15,
                boxSizing: "border-box"
              }}
            />

            <button
              onClick={guardarNuevoServicio}
              style={{
                padding: "10px 18px",
                border: "none",
                borderRadius: 10,
                background: "#2ecc71",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              💾 Guardar servicio
            </button>

          </div>

        )}


        {/* CARGANDO */}

        {cargando && (
          <div>Cargando servicios...</div>
        )}


        {/* SIN SERVICIOS */}

        {!cargando && servicios.length === 0 && (
          <div>No hay servicios registrados.</div>
        )}


        {/* LISTADO DE SERVICIOS */}

        {!cargando && servicios.map(servicio => (

          <div
            key={servicio.id}
            style={{
              padding: "16px",
              marginBottom: 12,
              border: "1px solid #f0d9e8",
              borderRadius: 12
            }}
          >

            {/* NOMBRE */}

            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "#b05080"
              }}
            >
              {servicio.nombre}
            </div>


            {/* DURACIÓN Y PRECIO */}

            <div
              style={{
                marginTop: 6,
                color: "#666"
              }}
            >
              {servicio.duracion} min · ${servicio.precio}
            </div>


            {/* ESTADO */}

            <div
              style={{
                marginTop: 6,
                fontWeight: 700
              }}
            >
              {servicio.activo
                ? "🟢 Activo"
                : "⚪ Inactivo"}
            </div>


            {/* BOTÓN EDITAR */}

            <button
              onClick={() => comenzarEdicion(servicio)}
              style={{
                marginTop: 10,
                marginRight: 8,
                padding: "7px 12px",
                border: "none",
                borderRadius: 8,
                background: "#b05080",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              ✏️ Editar
            </button>


            {/* BOTÓN ACTIVAR / DESACTIVAR */}

            <button
              onClick={() => cambiarEstadoServicio(servicio)}
              style={{
                marginTop: 10,
                padding: "7px 12px",
                border: "none",
                borderRadius: 8,
                background: servicio.activo
                  ? "#e74c3c"
                  : "#2ecc71",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              {servicio.activo
                ? "⏸ Desactivar"
                : "▶ Activar"}
            </button>


            {/* FORMULARIO EDITAR SERVICIO - PASO 5 */}

            {editandoId === servicio.id && (

              <div
                style={{
                  marginTop: 15,
                  paddingTop: 15,
                  borderTop: "1px solid #f0d9e8"
                }}
              >

                <input
                  type="text"
                  value={servicioEditado.nombre}
                  onChange={e =>
                    setServicioEditado({
                      ...servicioEditado,
                      nombre: e.target.value
                    })
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    marginBottom: 8,
                    boxSizing: "border-box"
                  }}
                />

                <input
                  type="number"
                  min="1"
                  value={servicioEditado.duracion}
                  onChange={e =>
                    setServicioEditado({
                      ...servicioEditado,
                      duracion: e.target.value
                    })
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    marginBottom: 8,
                    boxSizing: "border-box"
                  }}
                />

                <input
                  type="number"
                  min="0"
                  value={servicioEditado.precio}
                  onChange={e =>
                    setServicioEditado({
                      ...servicioEditado,
                      precio: e.target.value
                    })
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    marginBottom: 8,
                    boxSizing: "border-box"
                  }}
                />

                <input
                  type="text"
                  placeholder="Categoría"
                  value={servicioEditado.categoria}
                  onChange={e =>
                    setServicioEditado({
                      ...servicioEditado,
                      categoria: e.target.value
                    })
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    marginBottom: 10,
                    boxSizing: "border-box"
                  }}
                />

                <button
                  onClick={() => guardarEdicion(servicio)}
                  style={{
                    padding: "8px 12px",
                    marginRight: 8,
                    border: "none",
                    borderRadius: 8,
                    background: "#2ecc71",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  💾 Guardar cambios
                </button>

                <button
                  onClick={() => setEditandoId(null)}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    background: "#fff",
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>

              </div>

            )}

            {/* FIN FORMULARIO EDITAR */}

          </div>

        ))}

      </div>

    </div>

  );
}