import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const CATEGORIAS = [
  "Insumos",
  "Publicidad",
  "Alquiler",
  "Servicios",
  "Comisiones",
  "Herramientas/equipamiento",
  "Otros"
];

export default function GastosTamara() {
  const hoy = fechaLocal(new Date());
  const inicioMes = `${hoy.slice(0, 7)}-01`;

  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fecha: hoy,
    categoria: "Insumos",
    concepto: "",
    importe: "",
    notas: ""
  });

  useEffect(() => {
    cargarGastos();
  }, [desde, hasta]);

  async function cargarGastos() {
    if (!desde || !hasta) return;

    if (desde > hasta) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      setGastos([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("gastos_tamara")
      .select("id,fecha,categoria,concepto,importe,notas,created_at")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando gastos de Tamara:", error);
      setError("No se pudieron cargar los gastos.");
      setGastos([]);
      setCargando(false);
      return;
    }

    setGastos(data || []);
    setCargando(false);
  }

  async function guardarGasto(e) {
    e.preventDefault();

    const concepto = form.concepto.trim();
    const importe = Number(form.importe);

    if (!form.fecha || !form.categoria || !concepto) {
      setError("Completá fecha, categoría y concepto.");
      return;
    }

    if (!Number.isFinite(importe) || importe <= 0) {
      setError("El importe debe ser mayor a 0.");
      return;
    }

    setGuardando(true);
    setError("");

    const { error } = await supabase.from("gastos_tamara").insert({
      fecha: form.fecha,
      categoria: form.categoria,
      concepto,
      importe,
      notas: form.notas.trim() || null
    });

    if (error) {
      console.error("Error guardando gasto de Tamara:", error);
      setError("No se pudo guardar el gasto.");
      setGuardando(false);
      return;
    }

    setForm({
      fecha: hoy,
      categoria: "Insumos",
      concepto: "",
      importe: "",
      notas: ""
    });

    setGuardando(false);
    await cargarGastos();
  }

  async function eliminarGasto(gasto) {
    const confirmar = window.confirm(
      `¿Eliminar "${gasto.concepto}" por $${dinero(gasto.importe)}?`
    );

    if (!confirmar) return;

    setError("");

    const { error } = await supabase
      .from("gastos_tamara")
      .delete()
      .eq("id", gasto.id);

    if (error) {
      console.error("Error eliminando gasto de Tamara:", error);
      setError("No se pudo eliminar el gasto.");
      return;
    }

    setGastos((actuales) => actuales.filter((g) => g.id !== gasto.id));
  }

  function seleccionarEsteMes() {
    const fechaHoy = fechaLocal(new Date());
    setDesde(`${fechaHoy.slice(0, 7)}-01`);
    setHasta(fechaHoy);
  }

  function seleccionarMesAnterior() {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
    setDesde(fechaLocal(primerDia));
    setHasta(fechaLocal(ultimoDia));
  }

  function seleccionarUltimos30Dias() {
    const fechaHasta = new Date();
    const fechaDesde = new Date();
    fechaDesde.setDate(fechaDesde.getDate() - 29);
    setDesde(fechaLocal(fechaDesde));
    setHasta(fechaLocal(fechaHasta));
  }

  const resumen = useMemo(() => {
    const total = gastos.reduce((acc, gasto) => acc + Number(gasto.importe || 0), 0);
    const publicidad = gastos
      .filter((gasto) => gasto.categoria === "Publicidad")
      .reduce((acc, gasto) => acc + Number(gasto.importe || 0), 0);

    return {
      total,
      publicidad,
      otros: total - publicidad
    };
  }, [gastos]);

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: "0 0 4px", color: "#cc2674", fontSize: 26 }}>
          💸 Gastos de Tamara
        </h2>
        <p style={{ margin: 0, color: "#888", fontSize: 14 }}>
          Registrá gastos para conocer la ganancia y rentabilidad real.
        </p>
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

      <form
        onSubmit={guardarGasto}
        style={{
          background: "#fff",
          border: "1px solid #f0d9e8",
          borderRadius: 16,
          padding: 18,
          marginBottom: 18
        }}
      >
        <h3 style={{ margin: "0 0 4px", color: "#cc2674", fontSize: 18 }}>
          ➕ Registrar gasto
        </h3>
        <p style={{ margin: "0 0 16px", color: "#999", fontSize: 12 }}>
          Los gastos cargados impactan automáticamente en el dashboard.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12
          }}
        >
          <Campo label="Fecha">
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              style={inputStyle}
            />
          </Campo>

          <Campo label="Categoría">
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              style={inputStyle}
            >
              {CATEGORIAS.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Concepto">
            <input
              type="text"
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
              placeholder="Ej: Tintura, Meta Ads..."
              style={inputStyle}
            />
          </Campo>

          <Campo label="Importe">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.importe}
              onChange={(e) => setForm({ ...form, importe: e.target.value })}
              placeholder="0"
              style={inputStyle}
            />
          </Campo>
        </div>

        <Campo label="Notas (opcional)">
          <textarea
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            placeholder="Detalle adicional del gasto"
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Campo>

        <button
          type="submit"
          disabled={guardando}
          style={{
            border: "none",
            background: "#cc2674",
            color: "#fff",
            borderRadius: 12,
            padding: "11px 18px",
            fontWeight: 800,
            cursor: guardando ? "default" : "pointer",
            opacity: guardando ? 0.65 : 1
          }}
        >
          {guardando ? "Guardando..." : "Guardar gasto"}
        </button>
      </form>

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

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <BotonPeriodo onClick={seleccionarEsteMes}>Este mes</BotonPeriodo>
          <BotonPeriodo onClick={seleccionarMesAnterior}>Mes anterior</BotonPeriodo>
          <BotonPeriodo onClick={seleccionarUltimos30Dias}>Últimos 30 días</BotonPeriodo>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12
          }}
        >
          <Campo label="Desde">
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              style={inputStyle}
            />
          </Campo>

          <Campo label="Hasta">
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              style={inputStyle}
            />
          </Campo>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
          marginBottom: 18
        }}
      >
        <TarjetaResumen titulo="Gastos totales" valor={`$${dinero(resumen.total)}`} />
        <TarjetaResumen titulo="Publicidad" valor={`$${dinero(resumen.publicidad)}`} />
        <TarjetaResumen titulo="Otros gastos" valor={`$${dinero(resumen.otros)}`} />
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #f0d9e8",
          borderRadius: 16,
          padding: 18
        }}
      >
        <h3 style={{ margin: "0 0 4px", color: "#cc2674", fontSize: 18 }}>
          📋 Gastos registrados
        </h3>
        <p style={{ margin: "0 0 16px", color: "#999", fontSize: 12 }}>
          {desde} al {hasta}
        </p>

        {cargando ? (
          <div style={{ padding: 30, textAlign: "center", color: "#999" }}>
            Cargando gastos...
          </div>
        ) : gastos.length === 0 ? (
          <div
            style={{
              background: "#fff7fb",
              borderRadius: 12,
              padding: 20,
              color: "#888",
              textAlign: "center"
            }}
          >
            No hay gastos registrados en este período.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {gastos.map((gasto) => (
              <div
                key={gasto.id}
                style={{
                  border: "1px solid #f0d9e8",
                  borderRadius: 12,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap"
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 5
                    }}
                  >
                    <strong style={{ color: "#2d1f27" }}>{gasto.concepto}</strong>
                    <span
                      style={{
                        background: "#fff0f7",
                        color: "#cc2674",
                        borderRadius: 20,
                        padding: "4px 8px",
                        fontSize: 10,
                        fontWeight: 800
                      }}
                    >
                      {gasto.categoria}
                    </span>
                  </div>

                  <div style={{ color: "#888", fontSize: 12 }}>
                    {formatearFecha(gasto.fecha)}
                    {gasto.notas ? ` · ${gasto.notas}` : ""}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginLeft: "auto"
                  }}
                >
                  <strong style={{ color: "#2d1f27", fontSize: 18 }}>
                    ${dinero(gasto.importe)}
                  </strong>

                  <button
                    type="button"
                    onClick={() => eliminarGasto(gasto)}
                    title="Eliminar gasto"
                    style={{
                      border: "1px solid #f0d9e8",
                      background: "#fff",
                      color: "#c62828",
                      borderRadius: 10,
                      padding: "7px 9px",
                      cursor: "pointer",
                      fontWeight: 700
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
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
      {children}
    </div>
  );
}

function TarjetaResumen({ titulo, valor }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #f0d9e8",
        borderRadius: 16,
        padding: 16
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
      <div style={{ color: "#2d1f27", fontSize: 24, fontWeight: 900 }}>
        {valor}
      </div>
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

function formatearFecha(fecha) {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

function fechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "2px solid #f0d9e8",
  borderRadius: 10,
  background: "#fff",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit"
};