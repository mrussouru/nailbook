import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function DashboardTamara() {
  const hoy = fechaLocal(new Date());
  const inicioMes = `${hoy.slice(0, 7)}-01`;

  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);
  const [datos, setDatos] = useState(null);
  const [rentabilidad, setRentabilidad] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarDashboard();
  }, [desde, hasta]);

  async function cargarDashboard() {
    if (!desde || !hasta) return;

    if (desde > hasta) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      setDatos(null);
      setRentabilidad(null);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError("");

    const [resultadoDashboard, resultadoRentabilidad] = await Promise.all([
      supabase.rpc("dashboard_tamara", {
        p_desde: desde,
        p_hasta: hasta
      }),
      supabase.rpc("rentabilidad_tamara", {
        p_desde: desde,
        p_hasta: hasta
      })
    ]);

    if (resultadoDashboard.error || resultadoRentabilidad.error) {
      console.error(
        "Error cargando dashboard de Tamara:",
        resultadoDashboard.error || resultadoRentabilidad.error
      );
      setError("No se pudieron cargar las métricas de Tamara.");
      setDatos(null);
      setRentabilidad(null);
      setCargando(false);
      return;
    }

    setDatos(resultadoDashboard.data?.[0] || null);
    setRentabilidad(resultadoRentabilidad.data?.[0] || null);
    setCargando(false);
  }

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

  const facturacion = Number(
    rentabilidad?.facturacion ?? datos?.facturacion ?? 0
  );
  const gastosTotales = Number(rentabilidad?.gastos_totales || 0);
  const gastosPublicidad = Number(rentabilidad?.gastos_publicidad || 0);
  const ganancia = Number(rentabilidad?.ganancia || 0);
  const margen = Number(rentabilidad?.margen_porcentaje || 0);

  const atenciones = Number(datos?.atenciones || 0);
  const ticketPromedio = Number(datos?.ticket_promedio || 0);
  const nuevas = Number(datos?.clientas_nuevas || 0);
  const recurrentes = Number(datos?.clientas_recurrentes || 0);
  const ausencias = Number(datos?.ausencias || 0);
  const valorPerdido = Number(datos?.valor_perdido_ausencias || 0);

  const totalClientas = nuevas + recurrentes;

  const porcentajeNuevas =
    totalClientas > 0 ? Math.round((nuevas / totalClientas) * 100) : 0;

  const porcentajeRecurrentes =
    totalClientas > 0 ? Math.round((recurrentes / totalClientas) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2
          style={{
            margin: "0 0 4px",
            color: "#cc2674",
            fontSize: 26
          }}
        >
          📊 Dashboard de Tamara
        </h2>

        <p
          style={{
            margin: 0,
            color: "#888",
            fontSize: 14
          }}
        >
          Facturación, rentabilidad, clientas y rendimiento de sus atenciones.
        </p>
      </div>

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
            fontSize: 11,
            fontWeight: 800,
            color: "#cc2674",
            textTransform: "uppercase",
            marginBottom: 10
          }}
        >
          Período
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 14
          }}
        >
          <BotonPeriodo onClick={seleccionarEsteMes}>Este mes</BotonPeriodo>
          <BotonPeriodo onClick={seleccionarMesAnterior}>
            Mes anterior
          </BotonPeriodo>
          <BotonPeriodo onClick={seleccionarUltimos30Dias}>
            Últimos 30 días
          </BotonPeriodo>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12
          }}
        >
          <CampoFecha label="Desde" value={desde} onChange={setDesde} />
          <CampoFecha label="Hasta" value={hasta} onChange={setHasta} />
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fff0f2",
            color: "#c62828",
            borderRadius: 12,
            padding: 14,
            marginBottom: 18
          }}
        >
          {error}
        </div>
      )}

      {cargando && !error && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #f0d9e8",
            borderRadius: 16,
            padding: 45,
            textAlign: "center",
            color: "#999"
          }}
        >
          Cargando métricas...
        </div>
      )}

      {!cargando && !error && datos && rentabilidad && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 12,
              marginBottom: 22
            }}
          >
            <TarjetaMetrica
              icono="💰"
              titulo="Facturación"
              valor={`$${dinero(facturacion)}`}
              detalle="Cobrado en atenciones completadas"
              destacada
            />

            <TarjetaMetrica
              icono="💸"
              titulo="Gastos"
              valor={`$${dinero(gastosTotales)}`}
              detalle="Gastos registrados en el período"
            />

            <TarjetaMetrica
              icono="📈"
              titulo="Ganancia"
              valor={`$${dinero(ganancia)}`}
              detalle="Facturación menos gastos"
            />

            <TarjetaMetrica
              icono="📊"
              titulo="Margen"
              valor={`${numero(margen)}%`}
              detalle="Ganancia sobre facturación"
            />
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #f0d9e8",
              borderRadius: 16,
              padding: 18,
              marginBottom: 18
            }}
          >
            <h3
              style={{
                margin: "0 0 4px",
                color: "#cc2674",
                fontSize: 18
              }}
            >
              💼 Operación
            </h3>

            <p
              style={{
                margin: "0 0 16px",
                color: "#999",
                fontSize: 12
              }}
            >
              Producción, ticket y gasto en adquisición.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12
              }}
            >
              <TarjetaSecundaria
                titulo="Atenciones"
                valor={atenciones}
                detalle="Atenciones completadas"
              />

              <TarjetaSecundaria
                titulo="Ticket promedio"
                valor={`$${dinero(ticketPromedio)}`}
                detalle="Promedio cobrado por atención"
              />

              <TarjetaSecundaria
                titulo="Publicidad"
                valor={`$${dinero(gastosPublicidad)}`}
                detalle="Gasto registrado como Publicidad"
              />
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #f0d9e8",
              borderRadius: 16,
              padding: 18,
              marginBottom: 18
            }}
          >
            <h3
              style={{
                margin: "0 0 4px",
                color: "#cc2674",
                fontSize: 18
              }}
            >
              👩 Clientas atendidas
            </h3>

            <p
              style={{
                margin: "0 0 16px",
                color: "#999",
                fontSize: 12
              }}
            >
              Nuevas clientas y clientas que volvieron.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12
              }}
            >
              <TarjetaSecundaria
                titulo="Clientas nuevas"
                valor={nuevas}
                detalle={
                  totalClientas > 0
                    ? `${porcentajeNuevas}% de las clientas del período`
                    : "Sin clientas en el período"
                }
              />

              <TarjetaSecundaria
                titulo="Clientas recurrentes"
                valor={recurrentes}
                detalle={
                  totalClientas > 0
                    ? `${porcentajeRecurrentes}% de las clientas del período`
                    : "Sin clientas en el período"
                }
              />

              <TarjetaSecundaria
                titulo="Clientas únicas"
                valor={totalClientas}
                detalle="Con al menos una atención completada"
              />
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #f0d9e8",
              borderRadius: 16,
              padding: 18
            }}
          >
            <h3
              style={{
                margin: "0 0 4px",
                color: "#cc2674",
                fontSize: 18
              }}
            >
              🚫 Ausencias
            </h3>

            <p
              style={{
                margin: "0 0 16px",
                color: "#999",
                fontSize: 12
              }}
            >
              Citas en las que la clienta no se presentó.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12
              }}
            >
              <TarjetaSecundaria
                titulo="No se presentaron"
                valor={ausencias}
                detalle={
                  ausencias === 1
                    ? "1 cita ausente"
                    : `${ausencias} citas ausentes`
                }
              />

              <TarjetaSecundaria
                titulo="Valor potencial perdido"
                valor={`$${dinero(valorPerdido)}`}
                detalle="Según precio estimado de las citas"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TarjetaMetrica({
  icono,
  titulo,
  valor,
  detalle,
  destacada = false
}) {
  return (
    <div
      style={{
        background: destacada ? "#cc2674" : "#fff",
        border: destacada ? "1px solid #cc2674" : "1px solid #f0d9e8",
        borderRadius: 16,
        padding: 18,
        minHeight: 115
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
        <span>{icono}</span>

        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            color: destacada ? "#fff" : "#cc2674"
          }}
        >
          {titulo}
        </span>
      </div>

      <div
        style={{
          fontSize: 28,
          lineHeight: 1,
          fontWeight: 900,
          color: destacada ? "#fff" : "#2d1f27",
          marginBottom: 9
        }}
      >
        {valor}
      </div>

      <div
        style={{
          fontSize: 11,
          color: destacada ? "rgba(255,255,255,.8)" : "#999"
        }}
      >
        {detalle}
      </div>
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
      <label
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
  }).format(Number(valor || 0));
}

function numero(valor) {
  return new Intl.NumberFormat("es-UY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(valor || 0));
}

function fechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}