import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { METRICAS, cargarDashboardTamara, calcularVariacion, fechaValida } from "../utils/dashboardTamara";

const tarjeta = { background: "#fff", border: "1px solid #f0d9e8", borderRadius: 16, padding: 18, marginBottom: 18, minWidth: 0 };
const grilla = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 12 };
const cargaInicial = { cargando: true, error: "", datos: null };

// Agrupación visual: las definiciones y cálculos siguen en METRICAS.
const gruposKpi = [
  { titulo: "💰 Rentabilidad", principal: true, campos: ["facturacion", "gastos_totales", "ganancia", "margen_porcentaje"] },
  { titulo: "💼 Operación", campos: ["atenciones", "ticket_promedio"] },
  { titulo: "👩 Clientas atendidas", campos: ["clientas_nuevas", "clientas_recurrentes"] },
  { titulo: "🚫 Ausencias", campos: ["ausencias", "valor_perdido_ausencias"] }
];
const iconosKpi = {
  facturacion: "💰", gastos_totales: "💸", ganancia: "📈", margen_porcentaje: "📊",
  atenciones: "💼", ticket_promedio: "🎟️", clientas_nuevas: "✨",
  clientas_recurrentes: "🔁", ausencias: "🚫", valor_perdido_ausencias: "💸"
};

export default function DashboardTamara() {
  const hoy = fechaLocal(new Date());
  const [desde, setDesde] = useState(`${hoy.slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState({});
  const clave = `${desde}/${hasta}/${intento}`;
  const errorPeriodo = !fechaValida(desde) || !fechaValida(hasta)
    ? "Seleccioná las fechas desde y hasta."
    : desde > hasta ? "La fecha desde no puede ser posterior a la fecha hasta." : "";

  useEffect(() => {
    if (errorPeriodo) return;
    const solicitud = cargarDashboardTamara(supabase, desde, hasta, (seccion, estado) => {
      setResultado(actual => ({ ...actual, [seccion]: { ...estado, clave } }));
    });
    return solicitud.cancelar;
  }, [desde, hasta, clave, errorPeriodo]);

  // Nunca mostrar resultados de otro rango, ni siquiera antes del cleanup del efecto.
  const seccion = nombre => resultado[nombre]?.clave === clave ? resultado[nombre] : cargaInicial;
  const resumen = seccion("resumen");
  const evolucion = seccion("evolucion");
  const servicios = seccion("servicios");
  const datos = resumen.datos;

  function seleccionarEsteMes() {
    const fechaHoy = fechaLocal(new Date());
    setDesde(`${fechaHoy.slice(0, 7)}-01`);
    setHasta(fechaHoy);
  }

  function seleccionarMesAnterior() {
    const ahora = new Date();

    const primerDiaMesAnterior = new Date(
      ahora.getFullYear(),
      ahora.getMonth() - 1,
      1
    );

    const ultimoDiaMesAnterior = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      0
    );

    setDesde(fechaLocal(primerDiaMesAnterior));
    setHasta(fechaLocal(ultimoDiaMesAnterior));
  }

  function seleccionarUltimos30Dias() {
    const fechaHasta = new Date();
    const fechaDesde = new Date();

    fechaDesde.setDate(fechaDesde.getDate() - 29);

    setDesde(fechaLocal(fechaDesde));
    setHasta(fechaLocal(fechaHasta));
  }

  const tramoDistinto = datos?.comparacion_disponible &&
    (datos.comparacion_actual_desde !== desde || datos.comparacion_actual_hasta !== hasta);

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", color: "#cc2674", fontSize: 26 }}>📊 Dashboard de Tamara</h2>
      <p style={{ color: "#777", fontSize: 14 }}>Facturación registrada, rentabilidad y atenciones. Los importes registrados no acreditan pagos efectivos.</p>
      <section style={tarjeta} aria-label="Período">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <BotonPeriodo onClick={seleccionarEsteMes}>Este mes</BotonPeriodo>
          <BotonPeriodo onClick={seleccionarMesAnterior}>Mes anterior</BotonPeriodo>
          <BotonPeriodo onClick={seleccionarUltimos30Dias}>Últimos 30 días</BotonPeriodo>
        </div>
        <p style={{ color: "#777", fontSize: 12 }}>Período personalizado: ajustá Desde y Hasta.</p>
        <div style={grilla}>
          <CampoFecha label="Desde" value={desde} onChange={setDesde} />
          <CampoFecha label="Hasta" value={hasta} onChange={setHasta} />
        </div>
      </section>
      {errorPeriodo ? <p role="alert" style={{ color: "#c62828" }}>{errorPeriodo}</p> : (
        <>
          <section style={tarjeta} aria-label="Resumen del período">
            <h3 style={{ color: "#cc2674", marginTop: 0 }}>Resumen del período</h3>
            <p>{rango(desde, hasta)}</p>
            <Estado estado={resumen} reintentar={() => setIntento(i => i + 1)} />
            {datos && (
              <>
                {datos.comparacion_disponible ? (
                  <div style={{ background: "#fff7fb", padding: 14, borderRadius: 12, marginBottom: 16 }}>
                    <strong>📊 Comparación: {rango(datos.comparacion_actual_desde, datos.comparacion_actual_hasta)} vs {rango(datos.comparacion_desde, datos.comparacion_hasta)}</strong>
                    <p style={{ fontSize: 13, marginBottom: 0 }}>
                      {tramoDistinto
                        ? "La comparación usa un tramo más corto. Los valores principales siguen mostrando todo el período seleccionado."
                        : "Las variaciones comparan los dos rangos indicados."}
                    </p>
                  </div>
                ) : <p style={{ color: "#777", fontSize: 13 }}>Sin comparación automática para este período.</p>}
                {gruposKpi.map(grupo => (
                  <section key={grupo.titulo} aria-label={grupo.titulo} style={{
                    marginTop: grupo.principal ? 20 : 28,
                    paddingTop: grupo.principal ? 0 : 20,
                    borderTop: grupo.principal ? "none" : "1px solid #f0d9e8",
                    minWidth: 0
                  }}>
                    <h4 style={{ color: "#cc2674", fontSize: grupo.principal ? 19 : 16, margin: "0 0 12px", fontWeight: 800 }}>
                      {grupo.titulo}
                    </h4>
                    <div style={grilla}>
                      {METRICAS.filter(metrica => grupo.campos.includes(metrica.campo)).map(metrica => (
                        <TarjetaMetrica key={metrica.campo} titulo={metrica.titulo}
                          icono={iconosKpi[metrica.campo]} principal={grupo.principal}
                          destacada={metrica.campo === "facturacion"}
                          valor={valorMetrica(datos[metrica.campo], metrica.tipo)} detalle={metrica.detalle}>
                          {datos.comparacion_disponible && <Comparacion metrica={metrica} datos={datos} />}
                        </TarjetaMetrica>
                      ))}
                    </div>
                  </section>
                ))}
                <div style={{ marginTop: 16 }}>
                  <TarjetaSecundaria titulo="📣 Publicidad" valor={valorMetrica(datos.gastos_publicidad, "dinero")}
                    detalle="Incluida en los gastos totales; no se resta nuevamente de la ganancia." />
                </div>
              </>
            )}
          </section>

          <section style={tarjeta} aria-label="Evolución mensual">
            <h3 style={{ color: "#cc2674", marginTop: 0 }}>📈 Evolución de los últimos 6 meses</h3>
            <p style={{ color: "#777", fontSize: 13 }}>Seis meses hasta {fechaTexto(hasta)}. El último mes incluye solo las fechas hasta ese día.</p>
            <Estado estado={evolucion} reintentar={() => setIntento(i => i + 1)} />
            {evolucion.datos && <div style={grilla}>
              {evolucion.datos.map(mes => {
                const fin = mes.mes.slice(0, 7) === hasta.slice(0, 7) ? hasta : finMes(mes.mes);
                return (
                  <article key={mes.mes} style={{ background: "#fff7fb", padding: 14, borderRadius: 12, minWidth: 0 }}>
                    <h4 style={{ color: "#cc2674", margin: "0 0 8px" }}>{nombreMes(mes.mes)}</h4>
                    <p style={{ color: "#777", fontSize: 12 }}>{rango(mes.mes, fin)}{fin < finMes(mes.mes) ? " · Mes parcial" : ""}</p>
                    <dl style={{ margin: 0 }}>
                      {METRICAS.filter(m => ["facturacion", "gastos_totales", "ganancia", "atenciones", "ticket_promedio"].includes(m.campo)).map(m => (
                        <div key={m.campo} style={{ marginTop: 10 }}>
                          <dt style={{ color: "#777", fontSize: 12 }}>{m.titulo}</dt>
                          <dd style={{ margin: "3px 0 0", fontWeight: 700, overflowWrap: "anywhere" }}>{valorMetrica(mes[m.campo], m.tipo)}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                );
              })}
            </div>}
          </section>

          <section style={tarjeta} aria-label="Rendimiento por servicio">
            <h3 style={{ color: "#cc2674", marginTop: 0 }}>💅 Servicios</h3>
            <Estado estado={servicios} reintentar={() => setIntento(i => i + 1)} />
            {servicios.datos?.length === 0 && <p style={{ color: "#777" }}>No hay conceptos de atenciones completadas en este período.</p>}
            {servicios.datos && <div style={grilla}>
              {servicios.datos.map(servicio => (
                <article key={servicio.servicio_id ?? "manual"} style={{ background: "#fff7fb", padding: 14, borderRadius: 12, minWidth: 0, overflowWrap: "anywhere" }}>
                  <strong>{servicio.nombre}</strong>
                  <p>{numero(servicio.cantidad)} conceptos{servicio.activo === false ? " · Servicio inactivo" : ""}</p>
                  <p style={{ color: "#cc2674", fontWeight: 700 }}>Facturación registrada: ${dinero(servicio.facturacion)}</p>
                  <p style={{ color: "#777", fontSize: 13 }}>{numero(servicio.porcentaje_facturacion)}% de la facturación registrada</p>
                  <div aria-hidden="true" style={{ background: "#f0d9e8", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ background: "#cc2674", height: "100%", width: `${Math.min(100, Math.max(0, servicio.porcentaje_facturacion))}%` }} />
                  </div>
                </article>
              ))}
            </div>}
          </section>
        </>
      )}
    </div>
  );
}

function Estado({ estado, reintentar }) {
  if (estado.cargando) return <p role="status" style={{ color: "#777" }}>Cargando…</p>;
  if (estado.error) return <div role="alert" style={{ color: "#c62828" }}>
    <p>{estado.error}</p><BotonPeriodo onClick={reintentar}>Reintentar</BotonPeriodo>
  </div>;
  return null;
}

function Comparacion({ metrica, datos }) {
  const actual = datos[`${metrica.campo}_comparable_actual`];
  const anterior = datos[`${metrica.campo}_anterior`];
  const cambio = calcularVariacion(actual, anterior, metrica);
  const signo = cambio.valor > 0 ? "+" : cambio.valor < 0 ? "−" : "";
  const magnitud = cambio.unidad === "dinero" ? `$${numero(Math.abs(cambio.valor))}` : numero(Math.abs(cambio.valor));
  const sufijo = ["pp", "%"].includes(cambio.unidad) ? ` ${cambio.unidad}` : "";
  const lectura = cambio.favorable === null ? "Sin cambios" : cambio.favorable ? "Favorable" : "Desfavorable";
  return <div style={{ marginTop: 12, borderTop: "1px solid #f0d9e8", paddingTop: 10, fontSize: 12 }}>
    <div style={{ color: cambio.favorable === null ? "#777" : cambio.favorable ? "#087a5a" : "#b3261e", fontWeight: 700 }}>
      {signo}{magnitud}{sufijo} · {lectura}
    </div>
    {cambio.sinBase && <div style={{ color: "#777", marginTop: 4 }}>Sin base comparable · diferencia absoluta</div>}
    <div style={{ color: "#777", marginTop: 4 }}>Tramo actual: {valorMetrica(actual, metrica.tipo)} · Anterior: {valorMetrica(anterior, metrica.tipo)}</div>
  </div>;
}

function valorMetrica(valor, tipo) {
  return tipo === "dinero" ? `$${dinero(valor)}` : tipo === "porcentaje" ? `${numero(valor)}%` : numero(valor);
}
function fechaTexto(fecha) {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}
function rango(desde, hasta) { return `${fechaTexto(desde)} – ${fechaTexto(hasta)}`; }
function nombreMes(fecha) {
  return new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${fecha}T12:00:00Z`));
}
function finMes(fecha) {
  const fin = new Date(`${fecha}T12:00:00Z`);
  fin.setUTCMonth(fin.getUTCMonth() + 1, 0);
  return fin.toISOString().slice(0, 10);
}

function TarjetaMetrica({
  icono,
  titulo,
  valor,
  detalle,
  destacada = false,
  principal = false,
  children
}) {
  return (
    <div
      style={{
        background: destacada ? "#fff7fb" : "#fff",
        border: destacada ? "1px solid #cc2674" : "1px solid #f0d9e8",
        borderTop: principal ? "3px solid #cc2674" : "1px solid #f0d9e8",
        borderRadius: 16,
        padding: 18,
        minWidth: 0,
        overflowWrap: "anywhere",
        minHeight: principal ? 125 : 105
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 9
        }}
      >
        <span aria-hidden="true" style={{ fontSize: principal ? 21 : 18 }}>{icono}</span>

        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            color: "#cc2674"
          }}
        >
          {titulo}
        </span>
      </div>

      <div
        style={{
          fontSize: destacada ? 32 : principal ? 28 : 24,
          lineHeight: 1,
          fontWeight: 900,
          color: destacada ? "#cc2674" : "#2d1f27",
          marginBottom: 9
        }}
      >
        {valor}
      </div>

      <div
        style={{
          fontSize: 11,
          color: "#777"
        }}
      >
        {detalle}
      </div>
      {children}
    </div>
  );
}

function TarjetaSecundaria({ titulo, valor, detalle }) {
  return (
    <div
      style={{
        background: "#fff7fb",
        borderRadius: 12,
        padding: 14
      }}
    >
      <div
        style={{
          color: "#cc2674",
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          marginBottom: 6
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          color: "#2d1f27",
          fontSize: 22,
          fontWeight: 900,
          marginBottom: 5
        }}
      >
        {valor}
      </div>

      <div style={{ color: "#999", fontSize: 11 }}>{detalle}</div>
    </div>
  );
}

function CampoFecha({ label, value, onChange }) {
  return (
    <div>
      <label htmlFor={`tamara-${label}`}
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: "#777",
          marginBottom: 5
        }}
      >
        {label}
      </label>

      <input
        id={`tamara-${label}`}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 12px",
          border: "2px solid #f0d9e8",
          borderRadius: 10,
          background: "#fff",
          fontSize: 14,
          outline: "none"
        }}
      />
    </div>
  );
}

function BotonPeriodo({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid #f0d9e8",
        background: "#fff7fb",
        color: "#cc2674",
        borderRadius: 20,
        padding: "8px 13px",
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer"
      }}
    >
      {children}
    </button>
  );
}

function dinero(valor) {
  return new Intl.NumberFormat("es-UY", {
    maximumFractionDigits: 0
  }).format(valor);
}

function numero(valor) {
  return new Intl.NumberFormat("es-UY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(valor);
}

function fechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}
