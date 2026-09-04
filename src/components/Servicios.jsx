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
    categoria: "",
    seguimiento_activo: false,
    dias_seguimiento: ""
  });

  const [editandoId, setEditandoId] = useState(null);

  const [servicioEditado, setServicioEditado] = useState({
    nombre: "",
    duracion: "",
    precio: "",
    categoria: "",
    seguimiento_activo: false,
    dias_seguimiento: ""
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


  function validarSeguimiento(servicio) {

    if (
      servicio.seguimiento_activo &&
      (
        !servicio.dias_seguimiento ||
        Number(servicio.dias_seguimiento) <= 0
      )
    ) {
      alert(
        "Si activás el seguimiento, indicá después de cuántos días corresponde."
      );

      return false;
    }

    return true;
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

    if (!validarSeguimiento(nuevoServicio)) {
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
        categoria: nuevoServicio.categoria.trim() || null,

        seguimiento_activo:
          nuevoServicio.seguimiento_activo,

        dias_seguimiento:
          nuevoServicio.seguimiento_activo
            ? Number(nuevoServicio.dias_seguimiento)
            : null
      });

    if (error) {

      console.error(error);

      if (error.code === "23505") {
        alert(
          "Ya existe un servicio con ese nombre o identificador."
        );
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
      categoria: "",
      seguimiento_activo: false,
      dias_seguimiento: ""
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
      categoria: servicio.categoria || "",

      seguimiento_activo:
        Boolean(servicio.seguimiento_activo),

      dias_seguimiento:
        servicio.dias_seguimiento || ""
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

    if (!validarSeguimiento(servicioEditado)) {
      return;
    }

    const { error } = await supabase
      .from("servicios")
      .update({
        nombre: servicioEditado.nombre.trim(),
        duracion: Number(servicioEditado.duracion),
        precio: Number(servicioEditado.precio),
        categoria:
          servicioEditado.categoria.trim() || null,

        seguimiento_activo:
          servicioEditado.seguimiento_activo,

        dias_seguimiento:
          servicioEditado.seguimiento_activo
            ? Number(servicioEditado.dias_seguimiento)
            : null
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
          onClick={() =>
            setMostrarFormulario(!mostrarFormulario)
          }
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
              style={inputStyle}
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
              style={inputStyle}
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
              style={inputStyle}
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
              style={inputStyle}
            />


            {/* SEGUIMIENTO */}

            <div style={seguimientoStyle}>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "#555"
                }}
              >

                <input
                  type="checkbox"
                  checked={
                    nuevoServicio.seguimiento_activo
                  }
                  onChange={e =>
                    setNuevoServicio({
                      ...nuevoServicio,
                      seguimiento_activo:
                        e.target.checked,

                      dias_seguimiento:
                        e.target.checked
                          ? nuevoServicio.dias_seguimiento
                          : ""
                    })
                  }
                />

                🔔 Seguimiento de mantenimiento

              </label>


              {nuevoServicio.seguimiento_activo && (

                <div style={{ marginTop: 12 }}>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#777",
                      marginBottom: 6
                    }}
                  >
                    Contactar después de:
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >

                    <input
                      type="number"
                      min="1"
                      placeholder="Ej: 21"
                      value={
                        nuevoServicio.dias_seguimiento
                      }
                      onChange={e =>
                        setNuevoServicio({
                          ...nuevoServicio,
                          dias_seguimiento:
                            e.target.value
                        })
                      }
                      style={{
                        width: 100,
                        padding: 9,
                        borderRadius: 8,
                        border: "1px solid #ddd"
                      }}
                    />

                    <span
                      style={{
                        fontSize: 13,
                        color: "#666"
                      }}
                    >
                      días
                    </span>

                  </div>

                </div>

              )}

            </div>


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


        {/* LISTADO */}

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

            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "#b05080"
              }}
            >
              {servicio.nombre}
            </div>


            <div
              style={{
                marginTop: 6,
                color: "#666"
              }}
            >
              {servicio.duracion} min · ${servicio.precio}
            </div>


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


            {/* ESTADO SEGUIMIENTO */}

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: servicio.seguimiento_activo
                  ? "#b05080"
                  : "#999",
                fontWeight: 700
              }}
            >
              {servicio.seguimiento_activo
                ? `🔔 Seguimiento: ${servicio.dias_seguimiento} días`
                : "🔕 Sin seguimiento"}
            </div>


            {/* EDITAR */}

            <button
              onClick={() =>
                comenzarEdicion(servicio)
              }
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


            {/* ACTIVAR / DESACTIVAR */}

            <button
              onClick={() =>
                cambiarEstadoServicio(servicio)
              }
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


            {/* FORMULARIO EDITAR */}

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
                  style={inputStyle}
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
                  style={inputStyle}
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
                  style={inputStyle}
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
                  style={inputStyle}
                />


                {/* SEGUIMIENTO EDITAR */}

                <div style={seguimientoStyle}>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontWeight: 700,
                      color: "#555"
                    }}
                  >

                    <input
                      type="checkbox"
                      checked={
                        servicioEditado.seguimiento_activo
                      }
                      onChange={e =>
                        setServicioEditado({
                          ...servicioEditado,

                          seguimiento_activo:
                            e.target.checked,

                          dias_seguimiento:
                            e.target.checked
                              ? servicioEditado.dias_seguimiento
                              : ""
                        })
                      }
                    />

                    🔔 Seguimiento de mantenimiento

                  </label>


                  {servicioEditado.seguimiento_activo && (

                    <div style={{ marginTop: 12 }}>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#777",
                          marginBottom: 6
                        }}
                      >
                        Contactar después de:
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}
                      >

                        <input
                          type="number"
                          min="1"
                          placeholder="Ej: 21"
                          value={
                            servicioEditado.dias_seguimiento
                          }
                          onChange={e =>
                            setServicioEditado({
                              ...servicioEditado,
                              dias_seguimiento:
                                e.target.value
                            })
                          }
                          style={{
                            width: 100,
                            padding: 9,
                            borderRadius: 8,
                            border: "1px solid #ddd"
                          }}
                        />

                        <span
                          style={{
                            fontSize: 13,
                            color: "#666"
                          }}
                        >
                          días
                        </span>

                      </div>

                    </div>

                  )}

                </div>


                <button
                  onClick={() =>
                    guardarEdicion(servicio)
                  }
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
                  onClick={() =>
                    setEditandoId(null)
                  }
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

          </div>

        ))}

      </div>

    </div>

  );
}


/* ESTILOS */

const inputStyle = {
  width: "100%",
  padding: 10,
  marginBottom: 10,
  boxSizing: "border-box"
};


const seguimientoStyle = {
  padding: 14,
  marginBottom: 15,
  borderRadius: 10,
  background: "#fdf6f8",
  border: "1px solid #f0d9e8"
};