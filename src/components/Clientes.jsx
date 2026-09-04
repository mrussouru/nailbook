import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Clientes() {

  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [clienteSeleccionada, setClienteSeleccionada] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [seguimientos, setSeguimientos] = useState([]);
  const [cargandoSeguimientos, setCargandoSeguimientos] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [notasCliente, setNotasCliente] = useState("");
  const [guardandoNotas, setGuardandoNotas] = useState(false);
  const [mensajeNotas, setMensajeNotas] = useState("");
  const [accionesPendientes, setAccionesPendientes] = useState([]);
  const [cargandoAcciones, setCargandoAcciones] = useState(true);
  const [metricasCrm, setMetricasCrm] = useState(null);
const [cargandoMetricasCrm, setCargandoMetricasCrm] = useState(true);


useEffect(() => {
    cargarClientes();
    cargarAccionesPendientes();
    cargarMetricasCrm();
  }, []);


  async function cargarClientes() {

    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("clientes_resumen")
      .select("*")
      .order("ultima_visita", {
        ascending: false,
        nullsFirst: false
      });

    if (error) {

      console.error(error);
      setError("No se pudieron cargar las clientas.");
      setClientes([]);

    } else {

      setClientes(data || []);

    }

    setCargando(false);
  }


  async function cargarAccionesPendientes() {

    setCargandoAcciones(true);

    const { data, error } = await supabase.rpc(
      "seguimientos_mantenimiento_pendientes"
    );

    if (error) {

      console.error(error);
      setAccionesPendientes([]);

    } else {

      setAccionesPendientes(data || []);

    }

    setCargandoAcciones(false);
  }


  async function cargarMetricasCrm() {

    setCargandoMetricasCrm(true);
  
    const { data, error } = await supabase.rpc("metricas_crm");
  
    if (error) {
  
      console.error("Error cargando métricas CRM:", error);
      setMetricasCrm(null);
  
    } else {
  
      setMetricasCrm(data?.[0] || null);
  
    }
  
    setCargandoMetricasCrm(false);
  }

  async function cargarHistorial(cliente) {

    setClienteSeleccionada(cliente);
    cargarSeguimientos(cliente.id);
    setNotasCliente(cliente.notas || "");
    setMensajeNotas("");
    setCargandoHistorial(true);

    const { data, error } = await supabase
      .from("turnos")
      .select(`
        id,
        fecha,
        hora,
        estado,
        precio,
        servicio,
        origen
      `)
      .eq("cliente_id", cliente.id)
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });

    if (error) {

      console.error(error);
      setHistorial([]);

    } else {

      setHistorial(data || []);

    }

    setCargandoHistorial(false);
  }


  async function cargarSeguimientos(clienteId) {

    setCargandoSeguimientos(true);

    const { data, error } = await supabase.rpc(
      "historial_seguimientos_cliente",
      {
        cliente_id_input: clienteId,
      }
    );

    if (error) {

      console.error("Error cargando seguimientos:", error);
      setSeguimientos([]);

    } else {

      setSeguimientos(data || []);

    }

    setCargandoSeguimientos(false);
  }


  async function guardarNotas() {

    if (!clienteSeleccionada) return;

    setGuardandoNotas(true);
    setMensajeNotas("");

    const { error } = await supabase.rpc(
      "actualizar_notas_cliente",
      {
        cliente_id_input: clienteSeleccionada.id,
        notas_input: notasCliente
      }
    );

    if (error) {

      console.error(error);
      setMensajeNotas("❌ No se pudieron guardar las notas.");

    } else {

      setMensajeNotas("✅ Notas guardadas.");

      setClienteSeleccionada(prev => ({
        ...prev,
        notas: notasCliente
      }));

      setClientes(prev =>
        prev.map(cliente =>
          cliente.id === clienteSeleccionada.id
            ? {
                ...cliente,
                notas: notasCliente
              }
            : cliente
        )
      );

    }

    setGuardandoNotas(false);
  }


  const clientesFiltrados = useMemo(() => {

    const texto = busqueda.trim().toLowerCase();

    return clientes.filter(cliente => {

      const nombre = (cliente.nombre || "").toLowerCase();
      const telefono = (cliente.telefono || "").toLowerCase();

      const coincideBusqueda =
        !texto ||
        nombre.includes(texto) ||
        telefono.includes(texto);

      if (!coincideBusqueda) {
        return false;
      }

      if (filtroEstado === "todas") {
        return true;
      }

      const estado = obtenerEstadoCliente(cliente);

      return estado.tipo === filtroEstado;

    });

  }, [clientes, busqueda, filtroEstado]);


  const resumenClientes = useMemo(() => {

    let nuevas = 0;
    let recurrentes = 0;
    let recuperar = 0;

    let clientasConVisitas = 0;
    let clientasQueVolvieron = 0;

    clientes.forEach(cliente => {

      const estado = obtenerEstadoCliente(cliente);

      const visitas = Number(
        cliente.cantidad_visitas || 0
      );

      if (visitas >= 1) {
        clientasConVisitas++;
      }

      if (visitas >= 2) {
        clientasQueVolvieron++;
      }

      if (estado.tipo === "nueva") {
        nuevas++;
      }

      if (estado.tipo === "recurrente") {
        recurrentes++;
      }

      if (estado.tipo === "recuperar") {
        recuperar++;
      }

    });

    const retencion =
      clientasConVisitas > 0
        ? Math.round(
            (clientasQueVolvieron / clientasConVisitas) * 100
          )
        : 0;

    return {
      total: clientes.length,
      nuevas,
      recurrentes,
      recuperar,
      clientasConVisitas,
      clientasQueVolvieron,
      retencion
    };

  }, [clientes]);


  function formatearFecha(fecha) {

    if (!fecha) return "—";

    const [anio, mes, dia] = fecha.split("-");

    return `${dia}/${mes}/${anio}`;
  }


  function formatearDinero(valor) {

    return `$${Number(valor || 0).toLocaleString("es-UY")}`;

  }


  function diasDesdeUltimaVisita(fecha) {

    if (!fecha) return null;

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    const [anio, mes, dia] = fecha.split("-");

    const ultimaVisita = new Date(
      Number(anio),
      Number(mes) - 1,
      Number(dia)
    );

    const diferencia = hoy - ultimaVisita;

    return Math.floor(
      diferencia / (1000 * 60 * 60 * 24)
    );
  }


  function obtenerEstadoCliente(cliente) {

    const visitas = Number(cliente.cantidad_visitas || 0);

    const dias = diasDesdeUltimaVisita(
      cliente.ultima_visita
    );

    const tieneProximaCita =
      Boolean(cliente.proxima_cita);

    if (visitas === 0) {
      return {
        texto: "🌱 Nueva",
        tipo: "nueva"
      };
    }

    if (
      dias !== null &&
      dias >= 45 &&
      !tieneProximaCita
    ) {
      return {
        texto: "🔔 Para recuperar",
        tipo: "recuperar"
      };
    }

    if (visitas === 1) {
      return {
        texto: "🌱 Nueva",
        tipo: "nueva"
      };
    }

    return {
      texto: "💗 Recurrente",
      tipo: "recurrente"
    };
  }


  function abrirWhatsApp(cliente) {

    if (!cliente.telefono) {
      alert("Esta clienta no tiene teléfono registrado.");
      return;
    }

    let numero = cliente.telefono.replace(/\D/g, "");

    if (numero.startsWith("0")) {
      numero = "598" + numero.slice(1);
    } else if (!numero.startsWith("598")) {
      numero = "598" + numero;
    }

    const primerNombre =
      (cliente.nombre || "").trim().split(" ")[0];

    const estado = obtenerEstadoCliente(cliente);

    let mensaje = "";

    if (estado.tipo === "recuperar") {

      mensaje =
        `Hola ${primerNombre} 💕 ¿Cómo estás? ` +
        `Hace un tiempito que no te vemos por Tamy Ayelen. ` +
        `Si querés agendar nuevamente, escribinos y coordinamos tu próximo turno ✨`;

    } else if (estado.tipo === "recurrente") {

      mensaje =
        `Hola ${primerNombre} 💕 ¿Cómo estás? ` +
        `Si querés coordinar tu próximo turno en Tamy Ayelen, ` +
        `escribinos y vemos juntas el mejor horario ✨`;

    } else {

      mensaje =
        `Hola ${primerNombre} 💕 ¿Cómo estás? ` +
        `Gracias por elegir Tamy Ayelen ✨ ` +
        `Cuando quieras coordinar tu próximo turno, escribinos y te ayudamos 💗`;

    }

    const url =
      `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, "_blank");
  }


  function prepararWhatsAppMantenimiento(accion) {

    if (!accion.telefono) {
      alert("Esta clienta no tiene teléfono registrado.");
      return;
    }

    let numero = accion.telefono.replace(/\D/g, "");

    if (numero.startsWith("0")) {
      numero = "598" + numero.slice(1);
    } else if (!numero.startsWith("598")) {
      numero = "598" + numero;
    }

    const primerNombre =
      (accion.cliente || "").trim().split(" ")[0];

    const mensaje =
      `Hola ${primerNombre} 💕 ¿Cómo estás? ` +
      `Ya pasó el tiempo recomendado desde tu último servicio de ${accion.servicio}. ` +
      `Si querés agendar tu próximo turno en Tamy Ayelen, podés reservar acá: ` +
      `https://www.tamyayelen.com ✨`;

    const url =
      `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, "_blank");
  }


  /* ======================================================
     FICHA INDIVIDUAL DE CLIENTA
  ====================================================== */

  if (clienteSeleccionada) {

    return (
      <div>

        <button
          onClick={() => {
            setClienteSeleccionada(null);
            setHistorial([]);
            setSeguimientos([]);
          }}
          style={{
            border: "none",
            background: "transparent",
            color: "#b05080",
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 16,
            padding: 0
          }}
        >
          ← Volver a clientes
        </button>


        <h2
          style={{
            margin: "0 0 20px",
            color: "#b05080",
            fontWeight: 800
          }}
        >
          👤 {clienteSeleccionada.nombre}
        </h2>


        {/* RESUMEN DE CLIENTA */}

        <div
          style={{
            background: "#fff",
            border: "2px solid #f0d9e8",
            borderRadius: 18,
            padding: 22
          }}
        >

          <div
            style={{
              fontSize: 14,
              color: "#666",
              marginBottom: 18
            }}
          >
            📱 {clienteSeleccionada.telefono || "Sin teléfono"}
          </div>


          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10
            }}
          >

            <Dato
              label="Visitas"
              valor={
                clienteSeleccionada.cantidad_visitas || 0
              }
            />

            <Dato
              label="Gasto acumulado"
              valor={formatearDinero(
                clienteSeleccionada.gasto_acumulado
              )}
            />

            <Dato
              label="Primera visita"
              valor={formatearFecha(
                clienteSeleccionada.primera_visita
              )}
            />

            <Dato
              label="Última visita"
              valor={formatearFecha(
                clienteSeleccionada.ultima_visita
              )}
            />

            <Dato
              label="Desde última visita"
              valor={
                diasDesdeUltimaVisita(
                  clienteSeleccionada.ultima_visita
                ) === null
                  ? "Sin visitas"
                  : `${diasDesdeUltimaVisita(
                      clienteSeleccionada.ultima_visita
                    )} días`
              }
            />

            <Dato
              label="Próxima cita"
              valor={formatearFecha(
                clienteSeleccionada.proxima_cita
              )}
            />

          </div>

        </div>


        <button
          type="button"
          onClick={() => abrirWhatsApp(clienteSeleccionada)}
          style={{
            width: "100%",
            marginTop: 14,
            padding: "12px 16px",
            border: "none",
            borderRadius: 12,
            background: "#25D366",
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          💬 Escribir por WhatsApp
        </button>


        {/* NOTAS DE LA CLIENTA */}

        <div
          style={{
            background: "#fff",
            border: "2px solid #f0d9e8",
            borderRadius: 18,
            padding: 20,
            marginTop: 18
          }}
        >

          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#b05080",
              marginBottom: 10
            }}
          >
            📝 Notas de la clienta
          </div>

          <textarea
            value={notasCliente}
            onChange={e => {
              setNotasCliente(e.target.value);
              setMensajeNotas("");
            }}
            placeholder="Ej: prefiere turnos de mañana, sensible al pegamento..."
            rows={4}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "2px solid #f0d9e8",
              fontSize: 14,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit"
            }}
          />

          <button
            type="button"
            onClick={guardarNotas}
            disabled={guardandoNotas}
            style={{
              marginTop: 10,
              padding: "10px 16px",
              border: "none",
              borderRadius: 10,
              background: guardandoNotas ? "#ccc" : "#b05080",
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              cursor: guardandoNotas ? "default" : "pointer"
            }}
          >
            {guardandoNotas
              ? "Guardando..."
              : "Guardar notas"}
          </button>

          {mensajeNotas && (
            <div
              style={{
                fontSize: 12,
                color: mensajeNotas.startsWith("✅")
                  ? "#4f7d57"
                  : "#c0392b",
                marginTop: 10,
                fontWeight: 700
              }}
            >
              {mensajeNotas}
            </div>
          )}

        </div>


        {/* ACTIVIDAD CRM — PASO 3 */}

        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid #eee"
          }}
        >

          <h3
            style={{
              margin: "0 0 14px",
              color: "#b05080",
              fontWeight: 800
            }}
          >
            📣 Actividad CRM
          </h3>

          {cargandoSeguimientos ? (

            <div style={mensajeStyle}>
              Cargando actividad...
            </div>

          ) : seguimientos.length === 0 ? (

            <div style={mensajeStyle}>
              Todavía no hay acciones de seguimiento para esta clienta.
            </div>

          ) : (

            <div style={{ display: "grid", gap: 10 }}>

              {seguimientos.map(seguimiento => {

                const esMantenimiento =
                  seguimiento.tipo === "mantenimiento";

                return (

                  <div
                    key={seguimiento.id}
                    style={{
                      padding: 14,
                      border: "1px solid #eee",
                      borderRadius: 12,
                      background: "#fafafa"
                    }}
                  >

                    <div
                      style={{
                        fontWeight: 800,
                        color: "#2d1f27",
                        marginBottom: 6
                      }}
                    >
                      {esMantenimiento
                        ? "🔔 Mantenimiento"
                        : "💗 Recuperación"}
                    </div>


                    {seguimiento.enviado_en && (

                      <div
                        style={{
                          fontSize: 14,
                          marginBottom: 4
                        }}
                      >
                        Enviado:{" "}
                        {new Date(
                          seguimiento.enviado_en
                        ).toLocaleString("es-UY")}
                      </div>

                    )}


                    {seguimiento.fecha_objetivo && (

                      <div
                        style={{
                          fontSize: 14,
                          marginBottom: 4
                        }}
                      >
                        Fecha objetivo:{" "}
                        {new Date(
                          `${seguimiento.fecha_objetivo}T12:00:00`
                        ).toLocaleDateString("es-UY")}
                      </div>

                    )}


                    <div
                      style={{
                        fontSize: 14,
                        marginBottom: 4,
                        textTransform: "capitalize"
                      }}
                    >
                      Estado: {seguimiento.estado}
                    </div>


                    {seguimiento.mensaje && (

                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          color: "#666",
                          lineHeight: 1.4
                        }}
                      >
                        {seguimiento.mensaje}
                      </div>

                    )}


                    {/* CONVERSIÓN GENERADA POR EL CRM */}

                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 10,
                        background: seguimiento.convertido
                          ? "#edf8ef"
                          : "#fff8e8",
                        border: seguimiento.convertido
                          ? "1px solid #cfe8d3"
                          : "1px solid #f0dfb5"
                      }}
                    >

                      {seguimiento.convertido ? (

                        <>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: "#4f7d57",
                              marginBottom: 6
                            }}
                          >
                            ✅ Reservó después del seguimiento
                          </div>

                          {seguimiento.fecha_conversion && (
                            <div
                              style={{
                                fontSize: 13,
                                color: "#555",
                                marginBottom: 4
                              }}
                            >
                              📅 Nueva cita: {formatearFecha(
                                seguimiento.fecha_conversion
                              )}
                              {seguimiento.hora_conversion
                                ? ` · ${seguimiento.hora_conversion.slice(0, 5)}`
                                : ""}
                            </div>
                          )}

                          <div
                            style={{
                              fontSize: 13,
                              color: "#555"
                            }}
                          >
                            💰 Valor de la reserva: {formatearDinero(
                              seguimiento.precio_conversion
                            )}
                          </div>
                        </>

                      ) : (

                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#8a6a24"
                          }}
                        >
                          ⏳ Todavía no reservó después del seguimiento
                        </div>

                      )}

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>


        {/* HISTORIAL */}

        <h3
          style={{
            margin: "24px 0 12px",
            color: "#b05080",
            fontWeight: 800
          }}
        >
          🕘 Historial
        </h3>


        {cargandoHistorial ? (

          <div style={mensajeStyle}>
            Cargando historial...
          </div>

        ) : historial.length === 0 ? (

          <div style={mensajeStyle}>
            Esta clienta todavía no tiene turnos registrados.
          </div>

        ) : (

          historial.map(turno => {

            const servicio = turno.servicio
              ? turno.servicio.replaceAll("_", " ")
              : "Servicio";

            return (

              <div
                key={turno.id}
                style={{
                  background: "#fff",
                  border: "2px solid #f0d9e8",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 10
                }}
              >

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap"
                  }}
                >

                  <div>

                    <div
                      style={{
                        fontWeight: 800,
                        color: "#2d1f27",
                        textTransform: "capitalize"
                      }}
                    >
                      {servicio}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#777",
                        marginTop: 4
                      }}
                    >
                      📅 {formatearFecha(turno.fecha)}
                      {" · "}
                      {turno.hora?.slice(0, 5)}
                    </div>

                  </div>


                  <div
                    style={{
                      textAlign: "right"
                    }}
                  >

                    <div
                      style={{
                        fontWeight: 800,
                        color: "#2d1f27"
                      }}
                    >
                      {formatearDinero(turno.precio)}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#777",
                        marginTop: 4,
                        textTransform: "capitalize"
                      }}
                    >
                      {turno.estado}
                    </div>

                  </div>

                </div>

              </div>

            );

          })

        )}

      </div>
    );
  }


  /* ======================================================
     LISTADO DE CLIENTAS
  ====================================================== */

  return (
    <div>

      <h2
        style={{
          margin: "0 0 20px",
          color: "#b05080",
          fontWeight: 800
        }}
      >
        👥 Clientes
      </h2>


      {/* ACCIONES PENDIENTES */}

      <div
        style={{
          background: "#fff",
          border: "2px solid #f0d9e8",
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
            gap: 10,
            marginBottom: 14
          }}
        >

          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#b05080"
            }}
          >
            🎯 Acciones pendientes
          </div>

          <div
            style={{
              background: "#fce8f3",
              color: "#b05080",
              borderRadius: 20,
              padding: "5px 10px",
              fontSize: 12,
              fontWeight: 800
            }}
          >
            {accionesPendientes.length}
          </div>

        </div>


        {cargandoAcciones ? (

          <div
            style={{
              fontSize: 13,
              color: "#777"
            }}
          >
            Buscando seguimientos...
          </div>

        ) : accionesPendientes.length === 0 ? (

          <div
            style={{
              fontSize: 13,
              color: "#777"
            }}
          >
            No hay seguimientos pendientes por el momento.
          </div>

        ) : (

          accionesPendientes.map(accion => {

            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            const [anio, mes, dia] =
              accion.fecha_objetivo.split("-");

            const fechaObjetivo = new Date(
              Number(anio),
              Number(mes) - 1,
              Number(dia)
            );

            const diasPendiente = Math.max(
              0,
              Math.floor(
                (hoy - fechaObjetivo) /
                (1000 * 60 * 60 * 24)
              )
            );

            return (

              <div
                key={accion.turno_id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "#fff8fc",
                  border: "1px solid #f0d9e8",
                  marginTop: 10
                }}
              >

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap"
                  }}
                >

                  <div>

                    <div
                      style={{
                        fontWeight: 800,
                        color: "#2d1f27"
                      }}
                    >
                      {accion.cliente}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#666",
                        marginTop: 4
                      }}
                    >
                      🔔 Mantenimiento · {accion.servicio}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#888",
                        marginTop: 4
                      }}
                    >
                      Correspondía desde{" "}
                      {formatearFecha(accion.fecha_objetivo)}
                    </div>

                  </div>


                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: diasPendiente > 0
                        ? "#a66a00"
                        : "#4f7d57",
                      background: diasPendiente > 0
                        ? "#fff3df"
                        : "#edf8ef",
                      padding: "6px 10px",
                      borderRadius: 10,
                      height: "fit-content"
                    }}
                  >
                    {diasPendiente === 0
                      ? "Corresponde hoy"
                      : `${diasPendiente} ${
                          diasPendiente === 1
                            ? "día pendiente"
                            : "días pendiente"
                        }`}
                  </div>

                </div>


                <button
                  type="button"
                  onClick={() => prepararWhatsAppMantenimiento(accion)}
                  style={{
                    marginTop: 12,
                    marginRight: 8,
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: 9,
                    background: "#25D366",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  💬 Preparar WhatsApp
                </button>


                <button
                  type="button"
                  onClick={() => {

                    const cliente = clientes.find(
                      c => c.id === accion.cliente_id
                    );

                    if (cliente) {
                      cargarHistorial(cliente);
                    }

                  }}
                  style={{
                    marginTop: 12,
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: 9,
                    background: "#b05080",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  Ver clienta
                </button>

              </div>

            );

          })

        )}

      </div>

    {/* RESULTADOS CRM */}

<div
  style={{
    background: "#fff",
    border: "2px solid #f0d9e8",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18
  }}
>
  <div
    style={{
      fontSize: 16,
      fontWeight: 800,
      color: "#b05080",
      marginBottom: 14
    }}
  >
    📈 Resultados del CRM
  </div>

  {cargandoMetricasCrm ? (

    <div
      style={{
        fontSize: 13,
        color: "#777"
      }}
    >
      Cargando resultados...
    </div>

  ) : !metricasCrm ? (

    <div
      style={{
        fontSize: 13,
        color: "#777"
      }}
    >
      No se pudieron cargar las métricas del CRM.
    </div>

  ) : (

    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10
        }}
      >

        <Dato
          label="📨 Seguimientos"
          valor={metricasCrm.seguimientos_enviados || 0}
        />

        <Dato
          label="✅ Reservas generadas"
          valor={metricasCrm.conversiones || 0}
        />

        <Dato
          label="📈 Conversión"
          valor={`${Number(
            metricasCrm.tasa_conversion || 0
          ).toLocaleString("es-UY")}%`}
        />

        <Dato
          label="📅 Valor reservado"
          valor={formatearDinero(
            metricasCrm.valor_reservas
          )}
        />

        <Dato
          label="💰 Ingreso completado"
          valor={formatearDinero(
            metricasCrm.ingreso_completado
          )}
        />

        <Dato
        label="🏠 Ingreso para el salón"
        valor={formatearDinero(
            metricasCrm.participacion_salon
        )}
        />

      </div>

      <div
        style={{
          fontSize: 11,
          color: "#999",
          marginTop: 12,
          lineHeight: 1.5
        }}
      >
        Valor reservado corresponde a citas generadas por el CRM.
El ingreso completado solo cuenta servicios que efectivamente
fueron realizados. Ingreso para el salón muestra cuánto
de esos ingresos completados corresponde a Tamy Ayelen según
el porcentaje de cada profesional.
      </div>
      <div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
    marginTop: 18
  }}
>

  {/* MANTENIMIENTO */}

  <div
    style={{
      background: "#fff8fc",
      border: "1px solid #f0d9e8",
      borderRadius: 14,
      padding: 16
    }}
  >
    <div
      style={{
        fontSize: 15,
        fontWeight: 800,
        color: "#b05080",
        marginBottom: 12
      }}
    >
      🔔 Mantenimiento
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8
      }}
    >
      <Dato
        label="Enviados"
        valor={metricasCrm.mantenimiento_enviados || 0}
      />

      <Dato
        label="Reservas"
        valor={metricasCrm.mantenimiento_conversiones || 0}
      />

      <Dato
        label="Conversión"
        valor={`${Number(
          metricasCrm.mantenimiento_tasa || 0
        ).toLocaleString("es-UY")}%`}
      />
    </div>
  </div>


  {/* RECUPERACIÓN */}

  <div
    style={{
      background: "#fff8fc",
      border: "1px solid #f0d9e8",
      borderRadius: 14,
      padding: 16
    }}
  >
    <div
      style={{
        fontSize: 15,
        fontWeight: 800,
        color: "#b05080",
        marginBottom: 12
      }}
    >
      💗 Recuperación
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8
      }}
    >
      <Dato
        label="Enviados"
        valor={metricasCrm.recuperacion_enviados || 0}
      />

      <Dato
        label="Reservas"
        valor={metricasCrm.recuperacion_conversiones || 0}
      />

      <Dato
        label="Conversión"
        valor={`${Number(
          metricasCrm.recuperacion_tasa || 0
        ).toLocaleString("es-UY")}%`}
      />
    </div>
  </div>

</div>
    </>
    

  )}
</div>

      {/* RESUMEN CRM */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10,
          marginBottom: 18
        }}
      >

        <Dato
          label="Total clientas"
          valor={resumenClientes.total}
        />

        <Dato
          label="🌱 Nuevas"
          valor={resumenClientes.nuevas}
        />

        <Dato
          label="💗 Recurrentes"
          valor={resumenClientes.recurrentes}
        />

        <Dato
          label="🔔 Para recuperar"
          valor={resumenClientes.recuperar}
        />

      </div>


      {/* RETENCIÓN */}

      <div
        style={{
          background: "#fff",
          border: "2px solid #f0d9e8",
          borderRadius: 18,
          padding: 20,
          marginBottom: 18
        }}
      >

        <div
          style={{
            fontSize: 12,
            color: "#999",
            marginBottom: 6
          }}
        >
          Retención de clientas
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            flexWrap: "wrap"
          }}
        >

          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#b05080"
            }}
          >
            {resumenClientes.retencion}%
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#777"
            }}
          >
            {resumenClientes.clientasQueVolvieron} de{" "}
            {resumenClientes.clientasConVisitas} clientas volvieron
          </div>

        </div>

        <div
          style={{
            fontSize: 11,
            color: "#999",
            marginTop: 8
          }}
        >
          Se considera retenida a una clienta cuando vuelve después de su primera visita.
        </div>

      </div>


      {/* BUSCADOR */}

      <div
        style={{
          background: "#fff",
          border: "2px solid #f0d9e8",
          borderRadius: 18,
          padding: 20,
          marginBottom: 18
        }}
      >

        <input
          type="text"
          placeholder="Buscar por nombre o WhatsApp..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={inputStyle}
        />

      </div>


      {/* FILTROS CRM */}

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 18
        }}
      >

        <BotonFiltro
          texto="Todas"
          activo={filtroEstado === "todas"}
          onClick={() => setFiltroEstado("todas")}
        />

        <BotonFiltro
          texto="🌱 Nuevas"
          activo={filtroEstado === "nueva"}
          onClick={() => setFiltroEstado("nueva")}
        />

        <BotonFiltro
          texto="💗 Recurrentes"
          activo={filtroEstado === "recurrente"}
          onClick={() => setFiltroEstado("recurrente")}
        />

        <BotonFiltro
          texto="🔔 Para recuperar"
          activo={filtroEstado === "recuperar"}
          onClick={() => setFiltroEstado("recuperar")}
        />

      </div>


      {cargando && (

        <div style={mensajeStyle}>
          Cargando clientas...
        </div>

      )}


      {!cargando && error && (

        <div
          style={{
            ...mensajeStyle,
            color: "#c0392b"
          }}
        >
          {error}
        </div>

      )}


      {!cargando &&
        !error &&
        clientesFiltrados.length === 0 && (

          <div style={mensajeStyle}>
            No se encontraron clientas.
          </div>

        )}


      {!cargando &&
        !error &&
        clientesFiltrados.map(cliente => (

          <div
            key={cliente.id}
            onClick={() => cargarHistorial(cliente)}
            style={{
              background: "#fff",
              border: "2px solid #f0d9e8",
              borderRadius: 18,
              padding: 20,
              marginBottom: 12,
              cursor: "pointer"
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 15,
                flexWrap: "wrap"
              }}
            >

              <div>

                <div
                  style={{
                    fontSize: 17,
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
                    color: "#777"
                  }}
                >
                  📱 {cliente.telefono || "Sin teléfono"}
                </div>

              </div>


              <div
                style={{
                  background:
                    obtenerEstadoCliente(cliente).tipo === "recuperar"
                      ? "#fff3df"
                      : obtenerEstadoCliente(cliente).tipo === "recurrente"
                      ? "#fce8f3"
                      : "#f5f5f5",

                  color:
                    obtenerEstadoCliente(cliente).tipo === "recuperar"
                      ? "#a66a00"
                      : obtenerEstadoCliente(cliente).tipo === "recurrente"
                      ? "#b05080"
                      : "#777",

                  padding: "6px 10px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  height: "fit-content"
                }}
              >
                {obtenerEstadoCliente(cliente).texto}
              </div>

            </div>


            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 10,
                marginTop: 18
              }}
            >

              <Dato
                label="Visitas"
                valor={cliente.cantidad_visitas || 0}
              />

              <Dato
                label="Gasto acumulado"
                valor={formatearDinero(
                  cliente.gasto_acumulado
                )}
              />

              <Dato
                label="Última visita"
                valor={formatearFecha(
                  cliente.ultima_visita
                )}
              />

              <Dato
                label="Próxima cita"
                valor={formatearFecha(
                  cliente.proxima_cita
                )}
              />

            </div>

          </div>

        ))}

    </div>
  );
}


function BotonFiltro({ texto, activo, onClick }) {

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: activo
          ? "2px solid #b05080"
          : "2px solid #f0d9e8",
        background: activo ? "#fce8f3" : "#fff",
        color: activo ? "#b05080" : "#666",
        borderRadius: 20,
        padding: "8px 13px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer"
      }}
    >
      {texto}
    </button>
  );
}


/* ======================================================
   COMPONENTE DATO
====================================================== */

function Dato({ label, valor }) {

  return (
    <div
      style={{
        background: "#fdf6f8",
        borderRadius: 12,
        padding: 12
      }}
    >

      <div
        style={{
          fontSize: 11,
          color: "#999",
          marginBottom: 4
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: "#2d1f27"
        }}
      >
        {valor}
      </div>

    </div>
  );
}


/* ======================================================
   ESTILOS
====================================================== */

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: "2px solid #f0d9e8",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff"
};


const mensajeStyle = {
  background: "#fff",
  border: "2px solid #f0d9e8",
  borderRadius: 18,
  padding: 20,
  color: "#777",
  textAlign: "center"
};