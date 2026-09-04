import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ClientesTamara() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [clienteSeleccionada, setClienteSeleccionada] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");

  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarClientes() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase.rpc(
      "clientes_tamara_resumen"
    );

    if (error) {
      console.error("Error cargando clientas de Tamara:", error);
      setError("No se pudieron cargar las clientas de Tamara.");
      setClientes([]);
      setCargando(false);
      return;
    }

    setClientes(data || []);
    setCargando(false);
  }

  async function abrirCliente(cliente) {
    setClienteSeleccionada(cliente);
    setHistorial([]);
    setErrorHistorial("");
    setCargandoHistorial(true);

    const { data, error } = await supabase.rpc(
      "historial_cliente_tamara",
      {
        cliente_id_input: cliente.cliente_id
      }
    );

    if (error) {
      console.error(
        "Error cargando historial de Tamara:",
        error
      );

      setErrorHistorial(
        "No se pudo cargar el historial de esta clienta."
      );

      setCargandoHistorial(false);
      return;
    }

    setHistorial(data || []);
    setCargandoHistorial(false);
  }

  function volverAClientes() {
    setClienteSeleccionada(null);
    setHistorial([]);
    setErrorHistorial("");
  }

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return clientes;

    return clientes.filter((cliente) => {
      const nombre = (cliente.nombre || "").toLowerCase();
      const telefono = (cliente.telefono || "").toLowerCase();

      return (
        nombre.includes(texto) ||
        telefono.includes(texto)
      );
    });
  }, [clientes, busqueda]);

  function dinero(valor) {
    return new Intl.NumberFormat("es-UY", {
      maximumFractionDigits: 0
    }).format(Number(valor || 0));
  }

  function fechaUruguay(fecha) {
    if (!fecha) return "—";

    const [anio, mes, dia] = fecha.split("-");

    return `${dia}/${mes}/${anio}`;
  }

  function horaCorta(hora) {
    if (!hora) return "";

    return hora.slice(0, 5);
  }

  function etiquetaEstado(estado) {
    const etiquetas = {
      pendiente: "Pendiente",
      confirmado: "Confirmado",
      completado: "Completado",
      cancelado: "Cancelado",
      ausente: "No se presentó"
    };

    return etiquetas[estado] || estado;
  }

  function estiloEstado(estado) {
    const estilos = {
      pendiente: {
        background: "#fff0b8",
        color: "#6b5200"
      },
      confirmado: {
        background: "#d9f5ea",
        color: "#087a5a"
      },
      completado: {
        background: "#e4dcfa",
        color: "#55408f"
      },
      cancelado: {
        background: "#fde1e5",
        color: "#b4233c"
      },
      ausente: {
        background: "#f0e0f6",
        color: "#7b3f8c"
      }
    };

    return (
      estilos[estado] || {
        background: "#eee",
        color: "#555"
      }
    );
  }

  // =========================================================
  // FICHA DE CLIENTA
  // =========================================================

  if (clienteSeleccionada) {
    return (
      <div>
        <button
          type="button"
          onClick={volverAClientes}
          style={{
            background: "#fff",
            border: "2px solid #f0d9e8",
            borderRadius: 10,
            padding: "9px 14px",
            cursor: "pointer",
            color: "#777",
            fontWeight: 700,
            marginBottom: 18
          }}
        >
          ← Volver a Mis clientas
        </button>

        {/* DATOS PRINCIPALES */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #f0d9e8",
            borderRadius: 16,
            padding: 20,
            marginBottom: 18
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 15,
              alignItems: "flex-start",
              flexWrap: "wrap"
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#999",
                  textTransform: "uppercase",
                  marginBottom: 5
                }}
              >
                Clienta de Tamara
              </div>

              <h2
                style={{
                  margin: "0 0 6px",
                  color: "#cc2674",
                  fontSize: 26
                }}
              >
                {clienteSeleccionada.nombre}
              </h2>

              <div
                style={{
                  color: "#888",
                  fontSize: 14
                }}
              >
                📱{" "}
                {clienteSeleccionada.telefono ||
                  "Sin teléfono"}
              </div>
            </div>

            <div
              style={{
                background: "#fdf2f8",
                color: "#cc2674",
                fontSize: 13,
                fontWeight: 800,
                padding: "7px 12px",
                borderRadius: 20
              }}
            >
              {clienteSeleccionada.cantidad_visitas}{" "}
              {Number(
                clienteSeleccionada.cantidad_visitas
              ) === 1
                ? "visita"
                : "visitas"}
            </div>
          </div>

          {/* MÉTRICAS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10,
              marginTop: 20
            }}
          >
            <Dato
              titulo="Total gastado"
              valor={`$${dinero(
                clienteSeleccionada.total_gastado
              )}`}
            />

            <Dato
              titulo="Ticket promedio"
              valor={`$${dinero(
                clienteSeleccionada.ticket_promedio
              )}`}
            />

            <Dato
              titulo="Última visita"
              valor={fechaUruguay(
                clienteSeleccionada.ultima_visita
              )}
            />
          </div>
        </div>

        {/* HISTORIAL */}
        <div
          style={{
            marginBottom: 14
          }}
        >
          <h3
            style={{
              color: "#cc2674",
              margin: "0 0 4px",
              fontSize: 20
            }}
          >
            Historial de atenciones
          </h3>

          <div
            style={{
              color: "#999",
              fontSize: 13
            }}
          >
            Trabajos realizados y valores cobrados.
          </div>
        </div>

        {cargandoHistorial && (
          <div
            style={{
              textAlign: "center",
              padding: 45,
              color: "#999"
            }}
          >
            Cargando historial...
          </div>
        )}

        {!cargandoHistorial && errorHistorial && (
          <div
            style={{
              background: "#fff0f2",
              color: "#c62828",
              padding: 14,
              borderRadius: 12
            }}
          >
            {errorHistorial}
          </div>
        )}

        {!cargandoHistorial &&
          !errorHistorial &&
          historial.length === 0 && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #f0d9e8",
                borderRadius: 16,
                padding: "40px 20px",
                textAlign: "center",
                color: "#999"
              }}
            >
              Esta clienta todavía no tiene atenciones
              registradas.
            </div>
          )}

        {!cargandoHistorial &&
          !errorHistorial &&
          historial.map((turno) => {
            const conceptos = Array.isArray(turno.conceptos)
              ? turno.conceptos
              : [];

            return (
              <div
                key={turno.turno_id}
                style={{
                  background: "#fff",
                  border: "1px solid #f0d9e8",
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 14
                }}
              >
                {/* FECHA / ESTADO */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    paddingBottom: 14,
                    borderBottom: "1px solid #f4e4ed"
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#cc2674",
                        fontSize: 16,
                        fontWeight: 800,
                        marginBottom: 4
                      }}
                    >
                      {fechaUruguay(turno.fecha)} ·{" "}
                      {horaCorta(turno.hora)}
                    </div>

                    <div
                      style={{
                        color: "#333",
                        fontWeight: 700,
                        fontSize: 15
                      }}
                    >
                      {turno.trabajo_estimado ||
                        "Trabajo sin descripción"}
                    </div>
                  </div>

                  <span
                    style={{
                      ...estiloEstado(turno.estado),
                      borderRadius: 20,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 800
                    }}
                  >
                    {etiquetaEstado(turno.estado)}
                  </span>
                </div>

                {/* PRECIO ESTIMADO */}
                {turno.precio_estimado != null && (
                  <div
                    style={{
                      marginTop: 14,
                      color: "#888",
                      fontSize: 12
                    }}
                  >
                    Precio estimado:{" "}
                    <strong
                      style={{
                        color: "#555"
                      }}
                    >
                      ${dinero(turno.precio_estimado)}
                    </strong>
                  </div>
                )}

                {/* CONCEPTOS */}
                {conceptos.length > 0 && (
                  <div
                    style={{
                      marginTop: 15
                    }}
                  >
                    <div
                      style={{
                        color: "#cc2674",
                        textTransform: "uppercase",
                        fontWeight: 800,
                        fontSize: 10,
                        marginBottom: 8
                      }}
                    >
                      Detalle del trabajo
                    </div>

                    {conceptos.map((concepto, index) => (
                      <div
                        key={concepto.id || index}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 15,
                          padding: "9px 0",
                          borderBottom:
                            "1px solid #f5e8ef"
                        }}
                      >
                        <span
                          style={{
                            color: "#333",
                            fontWeight: 600
                          }}
                        >
                          {concepto.concepto}
                        </span>

                        <strong>
                          ${dinero(concepto.importe)}
                        </strong>
                      </div>
                    ))}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 15,
                        paddingTop: 12,
                        alignItems: "center"
                      }}
                    >
                      <span
                        style={{
                          color: "#777",
                          fontSize: 12,
                          fontWeight: 800,
                          textTransform: "uppercase"
                        }}
                      >
                        Total cobrado
                      </span>

                      <strong
                        style={{
                          color: "#cc2674",
                          fontSize: 20
                        }}
                      >
                        ${dinero(turno.total_cobrado)}
                      </strong>
                    </div>
                  </div>
                )}

                {/* SIN CONCEPTOS */}
                {conceptos.length === 0 && (
                  <div
                    style={{
                      marginTop: 14,
                      background: "#fff7fb",
                      borderRadius: 10,
                      padding: 12,
                      color: "#999",
                      fontSize: 12
                    }}
                  >
                    Esta cita no tiene conceptos cobrados
                    registrados.
                  </div>
                )}

                {/* ORIGEN */}
                {turno.origen_cliente && (
                  <div
                    style={{
                      marginTop: 15,
                      background: "#fff7fb",
                      borderRadius: 10,
                      padding: 12
                    }}
                  >
                    <div
                      style={{
                        color: "#cc2674",
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        marginBottom: 4
                      }}
                    >
                      Origen de la clienta
                    </div>

                    <div
                      style={{
                        color: "#555",
                        fontSize: 13
                      }}
                    >
                      {turno.origen_cliente}
                    </div>
                  </div>
                )}

                {/* NOTAS */}
                {turno.notas && (
                  <div
                    style={{
                      marginTop: 10,
                      background: "#fff7fb",
                      borderRadius: 10,
                      padding: 12
                    }}
                  >
                    <div
                      style={{
                        color: "#cc2674",
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        marginBottom: 4
                      }}
                    >
                      Notas
                    </div>

                    <div
                      style={{
                        color: "#555",
                        fontSize: 13,
                        whiteSpace: "pre-wrap"
                      }}
                    >
                      {turno.notas}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    );
  }

  // =========================================================
  // LISTA DE CLIENTAS
  // =========================================================

  return (
    <div>
      <div
        style={{
          marginBottom: 22
        }}
      >
        <h2
          style={{
            margin: "0 0 4px",
            color: "#cc2674",
            fontSize: 26
          }}
        >
          👩 Mis clientas
        </h2>

        <p
          style={{
            margin: 0,
            color: "#888",
            fontSize: 14
          }}
        >
          Historial y valor de las clientas de Tamara
        </p>
      </div>

      {/* BUSCADOR */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #f0d9e8",
          borderRadius: 16,
          padding: 16,
          marginBottom: 18
        }}
      >
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔎 Buscar por nombre o teléfono..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "2px solid #f0d9e8",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 14,
            outline: "none",
            background: "#fff"
          }}
        />
      </div>

      {cargando && (
        <div
          style={{
            textAlign: "center",
            padding: 50,
            color: "#999"
          }}
        >
          Cargando clientas...
        </div>
      )}

      {!cargando && error && (
        <div
          style={{
            background: "#fff0f2",
            borderRadius: 12,
            padding: 14,
            color: "#c62828",
            marginBottom: 16
          }}
        >
          {error}
        </div>
      )}

      {!cargando &&
        !error &&
        clientesFiltrados.length === 0 && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #f0d9e8",
              borderRadius: 16,
              padding: "45px 20px",
              textAlign: "center"
            }}
          >
            <div
              style={{
                fontSize: 32,
                marginBottom: 8
              }}
            >
              👩
            </div>

            <div
              style={{
                color: "#cc2674",
                fontWeight: 700,
                marginBottom: 5
              }}
            >
              {busqueda
                ? "No encontramos clientas"
                : "Todavía no hay clientas"}
            </div>

            <div
              style={{
                color: "#999",
                fontSize: 13
              }}
            >
              {busqueda
                ? "Probá buscando por otro nombre o teléfono."
                : "Las clientas aparecerán acá cuando tengan atenciones registradas."}
            </div>
          </div>
        )}

      {!cargando &&
        !error &&
        clientesFiltrados.map((cliente) => (
          <div
            key={cliente.cliente_id}
            onClick={() => abrirCliente(cliente)}
            style={{
              background: "#fff",
              border: "1px solid #f0d9e8",
              borderRadius: 16,
              padding: 18,
              marginBottom: 12,
              cursor: "pointer"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
                flexWrap: "wrap"
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#2d1f27",
                    marginBottom: 4
                  }}
                >
                  {cliente.nombre}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#888"
                  }}
                >
                  📱 {cliente.telefono || "Sin teléfono"}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10
                }}
              >
                <div
                  style={{
                    background: "#fdf2f8",
                    color: "#cc2674",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "6px 10px",
                    borderRadius: 20
                  }}
                >
                  {cliente.cantidad_visitas}{" "}
                  {Number(cliente.cantidad_visitas) === 1
                    ? "visita"
                    : "visitas"}
                </div>

                <span
                  style={{
                    color: "#cc2674",
                    fontWeight: 900,
                    fontSize: 20
                  }}
                >
                  ›
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 10,
                marginTop: 16
              }}
            >
              <Dato
                titulo="Última visita"
                valor={fechaUruguay(cliente.ultima_visita)}
              />

              <Dato
                titulo="Total gastado"
                valor={`$${dinero(cliente.total_gastado)}`}
              />

              <Dato
                titulo="Ticket promedio"
                valor={`$${dinero(cliente.ticket_promedio)}`}
              />
            </div>
          </div>
        ))}
    </div>
  );
}

function Dato({ titulo, valor }) {
  return (
    <div
      style={{
        background: "#fff7fb",
        borderRadius: 12,
        padding: "11px 13px"
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#cc2674",
          textTransform: "uppercase",
          marginBottom: 4
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#2d1f27"
        }}
      >
        {valor}
      </div>
    </div>
  );
}