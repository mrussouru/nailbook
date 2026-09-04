import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export default function AgendaTamara() {
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    fechaLocal(new Date())
  );

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    hora: "10:00",
    trabajo_estimado: "",
    precio_estimado: "",
    origen_cliente: "",
    notas: ""
  });

  // =========================
  // DETALLE DE CITA
  // =========================

  const [turnoAbierto, setTurnoAbierto] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [guardandoDetalle, setGuardandoDetalle] = useState(false);

  const [nuevoConcepto, setNuevoConcepto] = useState({
    concepto: "",
    importe: ""
  });

  useEffect(() => {
    cargarTurnos();
  }, []);

  async function cargarTurnos() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("turnos_tamara")
      .select(`
        id,
        cliente_id,
        fecha,
        hora,
        trabajo_estimado,
        precio_estimado,
        estado,
        notas,
        origen_cliente,
        recordatorio_enviado,
        clientes (
          id,
          nombre,
          telefono
        )
      `)
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    if (error) {
      console.error(error);
      setError("No se pudo cargar la agenda de Tamara.");
      setTurnos([]);
    } else {
      setTurnos(data || []);

      if (turnoAbierto) {
        const actualizado = (data || []).find(
          (turno) => turno.id === turnoAbierto.id
        );

        if (actualizado) {
          setTurnoAbierto(actualizado);
        }
      }
    }

    setCargando(false);
  }

  const turnosDelDia = useMemo(() => {
    return turnos.filter(
      (turno) =>
        turno.fecha === fechaSeleccionada &&
        turno.estado !== "cancelado"
    );
  }, [turnos, fechaSeleccionada]);

  const totalDetalle = useMemo(() => {
    return detalles.reduce(
      (total, detalle) => total + Number(detalle.importe || 0),
      0
    );
  }, [detalles]);

  // =========================
  // NUEVA CITA
  // =========================

  async function guardarTurno(e) {
    e.preventDefault();

    const nombre = form.nombre.trim();
    const telefono = form.telefono.trim();

    if (!nombre) {
      alert("Ingresá el nombre de la clienta.");
      return;
    }

    if (!telefono) {
      alert("Ingresá el teléfono de la clienta.");
      return;
    }

    if (!fechaSeleccionada || !form.hora) {
      alert("Seleccioná fecha y hora.");
      return;
    }

    const telefonoNormalizado = normalizarTelefono(telefono);

    if (!telefonoNormalizado) {
      alert("El teléfono ingresado no es válido.");
      return;
    }

    const precioEstimado =
      form.precio_estimado === ""
        ? null
        : Number(form.precio_estimado);

    setCargando(true);

    try {
      const { error } = await supabase.rpc(
        "crear_turno_tamara",
        {
          p_nombre: nombre,
          p_telefono: telefono,
          p_telefono_normalizado: telefonoNormalizado,
          p_fecha: fechaSeleccionada,
          p_hora: form.hora,
          p_trabajo_estimado:
            form.trabajo_estimado.trim() || null,
          p_precio_estimado: precioEstimado,
          p_origen_cliente:
            form.origen_cliente || null,
          p_notas: form.notas.trim() || null
        }
      );

      if (error) {
        throw error;
      }

      setForm({
        nombre: "",
        telefono: "",
        hora: "10:00",
        trabajo_estimado: "",
        precio_estimado: "",
        origen_cliente: "",
        notas: ""
      });

      setMostrarFormulario(false);

      await cargarTurnos();
    } catch (err) {
      console.error(err);

      alert(
        "No se pudo guardar la cita: " +
          (err?.message || "Error desconocido")
      );

      setCargando(false);
    }
  }

  // =========================
  // ABRIR / CERRAR CITA
  // =========================

  async function abrirTurno(turno) {
    setTurnoAbierto(turno);
    setMostrarFormulario(false);
    setNuevoConcepto({
      concepto: "",
      importe: ""
    });

    await cargarDetalles(turno.id);
  }

  function cerrarTurno() {
    setTurnoAbierto(null);
    setDetalles([]);
    setNuevoConcepto({
      concepto: "",
      importe: ""
    });
  }

  async function cargarDetalles(turnoId) {
    setCargandoDetalle(true);

    const { data, error } = await supabase
      .from("detalles_turnos_tamara")
      .select(`
        id,
        turno_id,
        concepto,
        importe,
        orden
      `)
      .eq("turno_id", turnoId)
      .order("orden", { ascending: true });

    if (error) {
      console.error(error);
      alert(
        "No se pudo cargar el detalle de la atención: " +
          error.message
      );
      setDetalles([]);
    } else {
      setDetalles(data || []);
    }

    setCargandoDetalle(false);
  }

  // =========================
  // CONCEPTOS
  // =========================

  async function agregarConcepto(e) {
    e.preventDefault();

    if (!turnoAbierto) return;

    const concepto = nuevoConcepto.concepto.trim();
    const importe = Number(nuevoConcepto.importe);

    if (!concepto) {
      alert("Ingresá el concepto.");
      return;
    }

    if (
      nuevoConcepto.importe === "" ||
      Number.isNaN(importe) ||
      importe < 0
    ) {
      alert("Ingresá un importe válido.");
      return;
    }

    setGuardandoDetalle(true);

    const siguienteOrden =
      detalles.length === 0
        ? 1
        : Math.max(
            ...detalles.map((detalle) =>
              Number(detalle.orden || 0)
            )
          ) + 1;

    const { error } = await supabase
      .from("detalles_turnos_tamara")
      .insert({
        turno_id: turnoAbierto.id,
        concepto,
        importe,
        orden: siguienteOrden
      });

    if (error) {
      console.error(error);
      alert(
        "No se pudo agregar el concepto: " +
          error.message
      );
      setGuardandoDetalle(false);
      return;
    }

    setNuevoConcepto({
      concepto: "",
      importe: ""
    });

    await cargarDetalles(turnoAbierto.id);
    setGuardandoDetalle(false);
  }

  async function eliminarConcepto(detalleId) {
    if (!turnoAbierto) return;

    const confirmar = window.confirm(
      "¿Eliminar este concepto del trabajo?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("detalles_turnos_tamara")
      .delete()
      .eq("id", detalleId);

    if (error) {
      console.error(error);
      alert(
        "No se pudo eliminar el concepto: " +
          error.message
      );
      return;
    }

    await cargarDetalles(turnoAbierto.id);
  }

  // =========================
  // ESTADOS
  // =========================

  async function cambiarEstado(nuevoEstado) {
    if (!turnoAbierto) return;

    if (
      nuevoEstado === "completado" &&
      detalles.length === 0
    ) {
      alert(
        "Agregá al menos un concepto antes de completar la atención."
      );
      return;
    }

    let mensajeConfirmacion = "";

    if (nuevoEstado === "completado") {
      mensajeConfirmacion =
        `¿Completar esta atención por ${formatearDinero(
          totalDetalle
        )}?`;
    }

    if (nuevoEstado === "cancelado") {
      mensajeConfirmacion =
        "¿Querés cancelar esta cita?";
    }

    if (nuevoEstado === "ausente") {
      mensajeConfirmacion =
        "¿Confirmás que la clienta no se presentó?";
    }

    if (
      mensajeConfirmacion &&
      !window.confirm(mensajeConfirmacion)
    ) {
      return;
    }

    setGuardandoDetalle(true);

    const { error } = await supabase
      .from("turnos_tamara")
      .update({
        estado: nuevoEstado
      })
      .eq("id", turnoAbierto.id);

    if (error) {
      console.error(error);
      alert(
        "No se pudo actualizar la cita: " +
          error.message
      );
      setGuardandoDetalle(false);
      return;
    }

    await cargarTurnos();

    setTurnoAbierto((actual) => ({
      ...actual,
      estado: nuevoEstado
    }));

    setGuardandoDetalle(false);

    if (nuevoEstado === "cancelado") {
      cerrarTurno();
    }
  }

  // =========================
  // NAVEGACIÓN DE FECHA
  // =========================

  function moverDia(cantidad) {
    const fecha = new Date(
      `${fechaSeleccionada}T12:00:00`
    );

    fecha.setDate(fecha.getDate() + cantidad);

    setFechaSeleccionada(fechaLocal(fecha));
    cerrarTurno();
  }

  // =========================
  // VISTA DETALLE
  // =========================

  if (turnoAbierto) {
    const puedeEditar =
      turnoAbierto.estado !== "completado" &&
      turnoAbierto.estado !== "cancelado" &&
      turnoAbierto.estado !== "ausente";

    return (
      <div>
        <button
          onClick={cerrarTurno}
          style={{
            ...botonSecundario,
            marginBottom: 18
          }}
        >
          ← Volver a la agenda
        </button>

        <div
          style={{
            background: "#fff",
            border: "1px solid #f0d9e8",
            borderRadius: 18,
            padding: 20,
            marginBottom: 18,
            boxShadow:
              "0 4px 14px rgba(176,80,128,.06)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap"
            }}
          >
            <div>
              <div
                style={{
                  color: "#999",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  marginBottom: 5
                }}
              >
                Atención de Tamara
              </div>

              <h2
                style={{
                  margin: "0 0 7px",
                  color: "#b05080",
                  fontSize: 25
                }}
              >
                {turnoAbierto.clientes?.nombre ||
                  "Clienta"}
              </h2>

              <div
                style={{
                  color: "#666",
                  fontSize: 14
                }}
              >
                {formatearFechaCorta(
                  turnoAbierto.fecha
                )}{" "}
                · {turnoAbierto.hora?.slice(0, 5)}
              </div>

              {turnoAbierto.clientes?.telefono && (
                <div
                  style={{
                    color: "#999",
                    fontSize: 13,
                    marginTop: 4
                  }}
                >
                  📱{" "}
                  {turnoAbierto.clientes.telefono}
                </div>
              )}
            </div>

            <span
              style={{
                ...estadoStyle(turnoAbierto.estado),
                fontSize: 12,
                padding: "7px 11px"
              }}
            >
              {estadoLabel(turnoAbierto.estado)}
            </span>
          </div>

          <div
            style={{
              height: 1,
              background: "#f3e4ed",
              margin: "20px 0"
            }}
          />

          <div style={gridResumen}>
            <BloqueResumen label="Trabajo previsto">
              {turnoAbierto.trabajo_estimado ||
                "A definir"}
            </BloqueResumen>

            <BloqueResumen label="Precio estimado">
              {turnoAbierto.precio_estimado != null
                ? formatearDinero(
                    turnoAbierto.precio_estimado
                  )
                : "Sin estimar"}
            </BloqueResumen>

            <BloqueResumen label="Origen">
              {turnoAbierto.origen_cliente ||
                "Sin registrar"}
            </BloqueResumen>
          </div>

          {turnoAbierto.notas && (
            <div
              style={{
                marginTop: 18,
                background: "#fff8fc",
                borderRadius: 12,
                padding: 14
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#b05080",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  marginBottom: 5
                }}
              >
                Notas
              </div>

              <div
                style={{
                  color: "#555",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5
                }}
              >
                {turnoAbierto.notas}
              </div>
            </div>
          )}
        </div>

        {/* DETALLE DEL TRABAJO */}

        <div
          style={{
            background: "#fff",
            border: "1px solid #f0d9e8",
            borderRadius: 18,
            padding: 20,
            marginBottom: 18
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 4px",
                  color: "#b05080"
                }}
              >
                Detalle del trabajo
              </h3>

              <div
                style={{
                  color: "#999",
                  fontSize: 12
                }}
              >
                Registrá cada concepto cobrado a la
                clienta.
              </div>
            </div>
          </div>

          {cargandoDetalle ? (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "#999"
              }}
            >
              Cargando detalle...
            </div>
          ) : (
            <>
              {detalles.length === 0 ? (
                <div
                  style={{
                    padding: "20px 12px",
                    background: "#fffafd",
                    borderRadius: 12,
                    textAlign: "center",
                    color: "#999",
                    fontSize: 13,
                    marginBottom: 16
                  }}
                >
                  Todavía no hay conceptos cargados.
                </div>
              ) : (
                <div
                  style={{
                    marginBottom: 18
                  }}
                >
                  {detalles.map((detalle) => (
                    <div
                      key={detalle.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(0, 1fr) auto auto",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 0",
                        borderBottom:
                          "1px solid #f3e4ed"
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          minWidth: 0,
                          overflowWrap: "anywhere"
                        }}
                      >
                        {detalle.concepto}
                      </div>

                      <div
                        style={{
                          fontWeight: 800,
                          whiteSpace: "nowrap"
                        }}
                      >
                        {formatearDinero(
                          detalle.importe
                        )}
                      </div>

                      {puedeEditar && (
                        <button
                          onClick={() =>
                            eliminarConcepto(
                              detalle.id
                            )
                          }
                          title="Eliminar concepto"
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            border: "none",
                            background: "#fff0f0",
                            color: "#b44",
                            cursor: "pointer",
                            fontWeight: 900
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {puedeEditar && (
                <form
                  onSubmit={agregarConcepto}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0, 1fr) minmax(110px, 160px) auto",
                    gap: 10,
                    alignItems: "end",
                    marginBottom: 20
                  }}
                  className="tamara-concepto-form"
                >
                  <Campo label="Concepto">
                    <input
                      value={nuevoConcepto.concepto}
                      onChange={(e) =>
                        setNuevoConcepto({
                          ...nuevoConcepto,
                          concepto: e.target.value
                        })
                      }
                      style={inputStyle}
                      placeholder="Ej: Color"
                    />
                  </Campo>

                  <Campo label="Importe">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={nuevoConcepto.importe}
                      onChange={(e) =>
                        setNuevoConcepto({
                          ...nuevoConcepto,
                          importe: e.target.value
                        })
                      }
                      style={inputStyle}
                      placeholder="$"
                    />
                  </Campo>

                  <div
                    style={{
                      marginBottom: 16
                    }}
                  >
                    <button
                      type="submit"
                      disabled={guardandoDetalle}
                      style={{
                        ...botonPrincipal,
                        width: "100%",
                        opacity: guardandoDetalle
                          ? 0.6
                          : 1
                      }}
                    >
                      + Agregar
                    </button>
                  </div>
                </form>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 15,
                  paddingTop: 15,
                  borderTop: "2px solid #f0d9e8"
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#777",
                    fontWeight: 800
                  }}
                >
                  TOTAL
                </div>

                <div
                  style={{
                    fontSize: 25,
                    color: "#b05080",
                    fontWeight: 900
                  }}
                >
                  {formatearDinero(totalDetalle)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ACCIONES */}

        <div
          style={{
            background: "#fff",
            border: "1px solid #f0d9e8",
            borderRadius: 18,
            padding: 20
          }}
        >
          <h3
            style={{
              margin: "0 0 15px",
              color: "#b05080"
            }}
          >
            Estado de la cita
          </h3>

          {turnoAbierto.estado === "completado" ? (
            <div
              style={{
                background: "#f1effc",
                borderRadius: 12,
                padding: 15,
                color: "#59527e",
                fontWeight: 700
              }}
            >
              ✓ Atención completada por{" "}
              {formatearDinero(totalDetalle)}
            </div>
          ) : turnoAbierto.estado === "ausente" ? (
            <div
              style={{
                background: "#f5eff8",
                borderRadius: 12,
                padding: 15,
                color: "#76577f",
                fontWeight: 700
              }}
            >
              La clienta fue marcada como no presentada.
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 18
                }}
              >
                {turnoAbierto.estado !==
                  "confirmado" && (
                  <button
                    disabled={guardandoDetalle}
                    onClick={() =>
                      cambiarEstado("confirmado")
                    }
                    style={botonConfirmar}
                  >
                    ✓ Confirmar cita
                  </button>
                )}

                <button
                  disabled={guardandoDetalle}
                  onClick={() =>
                    cambiarEstado("ausente")
                  }
                  style={botonAusente}
                >
                  No se presentó
                </button>

                <button
                  disabled={guardandoDetalle}
                  onClick={() =>
                    cambiarEstado("cancelado")
                  }
                  style={botonCancelar}
                >
                  Cancelar cita
                </button>
              </div>

              <button
                disabled={
                  guardandoDetalle ||
                  detalles.length === 0
                }
                onClick={() =>
                  cambiarEstado("completado")
                }
                style={{
                  ...botonCompletar,
                  opacity:
                    guardandoDetalle ||
                    detalles.length === 0
                      ? 0.5
                      : 1,
                  cursor:
                    guardandoDetalle ||
                    detalles.length === 0
                      ? "not-allowed"
                      : "pointer"
                }}
              >
                ✓ COMPLETAR ATENCIÓN
              </button>

              {detalles.length === 0 && (
                <div
                  style={{
                    color: "#999",
                    fontSize: 12,
                    marginTop: 8,
                    textAlign: "center"
                  }}
                >
                  Agregá al menos un concepto para
                  completar la atención.
                </div>
              )}
            </>
          )}
        </div>

        <style>{`
          @media (max-width: 650px) {
            .tamara-concepto-form {
              grid-template-columns: 1fr !important;
              gap: 0 !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // =========================
  // VISTA AGENDA
  // =========================

  return (
    <div>
      {/* CABECERA */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20
        }}
      >
        <div>
          <h2
            style={{
              margin: "0 0 5px",
              color: "#b05080",
              fontSize: 25
            }}
          >
            💇‍♀️ Agenda Tamara
          </h2>

          <div
            style={{
              color: "#888",
              fontSize: 14
            }}
          >
            Citas y trabajos de peluquería
          </div>
        </div>

        <button
          onClick={() =>
            setMostrarFormulario(
              !mostrarFormulario
            )
          }
          style={botonPrincipal}
        >
          {mostrarFormulario
            ? "Cancelar"
            : "＋ Nueva cita"}
        </button>
      </div>

      {/* FORMULARIO */}

      {mostrarFormulario && (
        <form
          onSubmit={guardarTurno}
          style={{
            background: "#fff",
            border: "1px solid #f0d9e8",
            borderRadius: 16,
            padding: 20,
            marginBottom: 22,
            boxShadow:
              "0 4px 14px rgba(176,80,128,.06)"
          }}
        >
          <h3
            style={{
              margin: "0 0 18px",
              color: "#b05080"
            }}
          >
            Nueva cita
          </h3>

          <div style={gridFormulario}>
            <Campo label="Nombre de la clienta *">
              <input
                value={form.nombre}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nombre: e.target.value
                  })
                }
                style={inputStyle}
                placeholder="Ej: María Rodríguez"
              />
            </Campo>

            <Campo label="WhatsApp / teléfono *">
              <input
                value={form.telefono}
                onChange={(e) =>
                  setForm({
                    ...form,
                    telefono: e.target.value
                  })
                }
                style={inputStyle}
                placeholder="Ej: 099 123 456"
                inputMode="tel"
              />
            </Campo>

            <Campo label="Fecha *">
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) =>
                  setFechaSeleccionada(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Hora *">
              <input
                type="time"
                value={form.hora}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hora: e.target.value
                  })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Trabajo estimado">
              <input
                value={form.trabajo_estimado}
                onChange={(e) =>
                  setForm({
                    ...form,
                    trabajo_estimado:
                      e.target.value
                  })
                }
                style={inputStyle}
                placeholder="Ej: Color + corte"
              />
            </Campo>

            <Campo label="Precio estimado">
              <input
                type="number"
                min="0"
                step="1"
                value={form.precio_estimado}
                onChange={(e) =>
                  setForm({
                    ...form,
                    precio_estimado:
                      e.target.value
                  })
                }
                style={inputStyle}
                placeholder="$"
              />
            </Campo>

            <Campo label="Origen de la clienta">
              <select
                value={form.origen_cliente}
                onChange={(e) =>
                  setForm({
                    ...form,
                    origen_cliente:
                      e.target.value
                  })
                }
                style={inputStyle}
              >
                <option value="">
                  Seleccionar...
                </option>
                <option value="Publicidad Instagram">
                  Publicidad Instagram
                </option>
                <option value="Instagram orgánico">
                  Instagram orgánico
                </option>
                <option value="Recomendación">
                  Recomendación
                </option>
                <option value="Google">
                  Google
                </option>
                <option value="Clienta anterior">
                  Clienta anterior
                </option>
                <option value="Otro">
                  Otro
                </option>
              </select>
            </Campo>
          </div>

          <Campo label="Notas">
            <textarea
              value={form.notas}
              onChange={(e) =>
                setForm({
                  ...form,
                  notas: e.target.value
                })
              }
              style={{
                ...inputStyle,
                minHeight: 85,
                resize: "vertical",
                fontFamily: "inherit"
              }}
              placeholder="Fórmula prevista, observaciones, preferencias..."
            />
          </Campo>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              flexWrap: "wrap"
            }}
          >
            <button
              type="button"
              onClick={() =>
                setMostrarFormulario(false)
              }
              style={botonSecundario}
            >
              Cancelar
            </button>

            <button
              type="submit"
              style={botonPrincipal}
            >
              Guardar cita
            </button>
          </div>
        </form>
      )}

      {/* SELECTOR DEL DÍA */}

      <div
        style={{
          background: "#fff",
          border: "1px solid #f0d9e8",
          borderRadius: 16,
          padding: 16,
          marginBottom: 18
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10
          }}
        >
          <button
            onClick={() => moverDia(-1)}
            style={botonDia}
            title="Día anterior"
          >
            ‹
          </button>

          <div
            style={{
              textAlign: "center",
              minWidth: 0
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color: "#b05080",
                textTransform: "capitalize"
              }}
            >
              {formatearFecha(
                fechaSeleccionada
              )}
            </div>

            <button
              onClick={() =>
                setFechaSeleccionada(
                  fechaLocal(new Date())
                )
              }
              style={{
                border: "none",
                background: "transparent",
                color: "#999",
                fontSize: 12,
                cursor: "pointer",
                marginTop: 3
              }}
            >
              Ir a hoy
            </button>
          </div>

          <button
            onClick={() => moverDia(1)}
            style={botonDia}
            title="Día siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {/* CONTENIDO */}

      {error && (
        <div
          style={{
            background: "#fff0f0",
            color: "#a33",
            padding: 14,
            borderRadius: 12,
            marginBottom: 15
          }}
        >
          {error}
        </div>
      )}

      {cargando ? (
        <div
          style={{
            textAlign: "center",
            padding: 35,
            color: "#999"
          }}
        >
          Cargando agenda...
        </div>
      ) : turnosDelDia.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #f0d9e8",
            borderRadius: 16,
            padding: "38px 20px",
            textAlign: "center"
          }}
        >
          <div
            style={{
              fontSize: 34,
              marginBottom: 8
            }}
          >
            ✨
          </div>

          <div
            style={{
              fontWeight: 800,
              color: "#b05080",
              marginBottom: 5
            }}
          >
            No hay citas para este día
          </div>

          <div
            style={{
              color: "#999",
              fontSize: 13
            }}
          >
            Podés agregar una nueva cita desde el
            botón superior.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 12
          }}
        >
          {turnosDelDia.map((turno) => (
            <button
              key={turno.id}
              type="button"
              onClick={() => abrirTurno(turno)}
              style={{
                width: "100%",
                background: "#fff",
                border: "1px solid #f0d9e8",
                borderRadius: 15,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit"
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  minWidth: 0
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    color: "#b05080",
                    fontSize: 17,
                    minWidth: 52
                  }}
                >
                  {turno.hora?.slice(0, 5)}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      marginBottom: 4,
                      color: "#222"
                    }}
                  >
                    {turno.clientes?.nombre ||
                      "Clienta"}
                  </div>

                  <div
                    style={{
                      color: "#777",
                      fontSize: 13
                    }}
                  >
                    {turno.trabajo_estimado ||
                      "Trabajo a definir"}
                  </div>

                  {turno.clientes?.telefono && (
                    <div
                      style={{
                        color: "#999",
                        fontSize: 12,
                        marginTop: 3
                      }}
                    >
                      {
                        turno.clientes
                          .telefono
                      }
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap"
                }}
              >
                {turno.precio_estimado != null && (
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#222"
                    }}
                  >
                    {formatearDinero(
                      turno.precio_estimado
                    )}
                  </div>
                )}

                <span
                  style={estadoStyle(
                    turno.estado
                  )}
                >
                  {estadoLabel(turno.estado)}
                </span>

                <span
                  style={{
                    color: "#b05080",
                    fontSize: 20,
                    fontWeight: 900
                  }}
                >
                  ›
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================
// COMPONENTES AUXILIARES
// =========================

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: "#b05080",
          marginBottom: 5
        }}
      >
        {label}
      </label>

      {children}
    </div>
  );
}

function BloqueResumen({ label, children }) {
  return (
    <div
      style={{
        background: "#fffafd",
        borderRadius: 12,
        padding: 13,
        minWidth: 0
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "#b05080",
          textTransform: "uppercase",
          marginBottom: 5
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: 700,
          color: "#444",
          overflowWrap: "anywhere"
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =========================
// HELPERS
// =========================

function fechaLocal(fecha) {
  const año = fecha.getFullYear();
  const mes = String(
    fecha.getMonth() + 1
  ).padStart(2, "0");
  const dia = String(
    fecha.getDate()
  ).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}

function formatearFecha(fecha) {
  const date = new Date(
    `${fecha}T12:00:00`
  );

  return date.toLocaleDateString("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatearFechaCorta(fecha) {
  const date = new Date(
    `${fecha}T12:00:00`
  );

  return date.toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatearDinero(valor) {
  return `$${Number(valor || 0).toLocaleString(
    "es-UY",
    {
      maximumFractionDigits: 2
    }
  )}`;
}

function normalizarTelefono(telefono) {
  let numero = String(
    telefono || ""
  ).replace(/\D/g, "");

  if (!numero) return "";

  if (numero.startsWith("598")) {
    return numero;
  }

  if (numero.startsWith("0")) {
    numero = numero.slice(1);
  }

  return `598${numero}`;
}

function estadoLabel(estado) {
  const labels = {
    pendiente: "Pendiente",
    confirmado: "Confirmado",
    completado: "Completado",
    cancelado: "Cancelado",
    ausente: "No se presentó"
  };

  return labels[estado] || estado;
}

function estadoStyle(estado) {
  const fondos = {
    pendiente: "#fde8b0",
    confirmado: "#b5e8d5",
    completado: "#d4d4f5",
    cancelado: "#fcd2d2",
    ausente: "#e8d5f5"
  };

  return {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    background: fondos[estado] || "#eee",
    color: "#333",
    whiteSpace: "nowrap"
  };
}

// =========================
// ESTILOS
// =========================

const gridFormulario = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
  gap: "0 14px"
};

const gridResumen = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
  gap: 10
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "2px solid #f0d9e8",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff"
};

const botonPrincipal = {
  padding: "10px 16px",
  borderRadius: 11,
  border: "none",
  background: "#b05080",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer"
};

const botonSecundario = {
  padding: "10px 16px",
  borderRadius: 11,
  border: "2px solid #f0d9e8",
  background: "#fff",
  color: "#777",
  fontWeight: 700,
  cursor: "pointer"
};

const botonDia = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: "none",
  background: "#fce8f3",
  color: "#b05080",
  fontWeight: 900,
  fontSize: 25,
  cursor: "pointer"
};

const botonConfirmar = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#dff5ec",
  color: "#34735f",
  fontWeight: 800,
  cursor: "pointer"
};

const botonAusente = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#f3eafa",
  color: "#76577f",
  fontWeight: 800,
  cursor: "pointer"
};

const botonCancelar = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#fff0f0",
  color: "#a64b4b",
  fontWeight: 800,
  cursor: "pointer"
};

const botonCompletar = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 12,
  border: "none",
  background: "#b05080",
  color: "#fff",
  fontSize: 14,
  fontWeight: 900
};