import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { normalizarTelefono } from "../utils/telefonos";

export default function SelectorCliente({ value, onChange, inputStyle, children }) {
  const [busqueda, setBusqueda] = useState("");
  const [manual, setManual] = useState(!value.cliente_id && !!(value.cliente || value.telefono));
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [consultado, setConsultado] = useState(false);
  const texto = busqueda.trim();
  const esTelefono = /^[+\d\s().-]+$/.test(texto);
  const digitos = texto.replace(/\D/g, "");
  const termino = esTelefono ? digitos : texto;
  const puedeBuscar = termino.length >= 3;

  useEffect(() => {
    let vigente = true;
    setResultados([]);
    setError("");
    setConsultado(false);
    setCargando(false);
    if (value.cliente_id || manual || !puedeBuscar) return;

    setCargando(true);
    const timer = setTimeout(async () => {
      try {
        let consulta = supabase
          .schema("public")
          .from("clientes")
          .select("id, nombre, telefono");

        if (esTelefono) {
          const condiciones = new Set([`telefono_normalizado.ilike.%${digitos}%`]);
          const normalizado = normalizarTelefono({ pais: "UY", numero: texto });
          if (normalizado.valido && /^\d+$/.test(normalizado.telefono_normalizado)) {
            condiciones.add(`telefono_normalizado.eq.${normalizado.telefono_normalizado}`);
          }
          // Comodidad de búsqueda, no normalización ni resolución de identidad.
          if (!texto.startsWith("+") && digitos.startsWith("0") && digitos.length >= 4) {
            condiciones.add(`telefono_normalizado.ilike.%${digitos.slice(1)}%`);
          }
          // Solo dígitos en los valores; columnas y operadores son constantes.
          consulta = consulta.or([...condiciones].join(","));
        } else {
          const patron = termino.replace(/[\\%_]/g, "\\$&");
          consulta = consulta.ilike("nombre", `%${patron}%`);
        }

        const { data, error: errorConsulta } = await consulta
          .order("nombre")
          .order("id")
          .limit(10);

        if (!vigente) return;
        if (errorConsulta) throw errorConsulta;
        setResultados(data || []);
        setConsultado(true);
      } catch (err) {
        if (!vigente) return;
        setError("No se pudo buscar clientas. Intentá nuevamente.");
      } finally {
        if (vigente) setCargando(false);
      }
    }, 300);

    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [busqueda, texto, digitos, termino, esTelefono, puedeBuscar, manual, value.cliente_id]);

  function cambiarModo(nueva) {
    setBusqueda("");
    setResultados([]);
    setError("");
    setConsultado(false);
    setManual(nueva);
    onChange({ cliente_id: null, cliente: "", telefono: "" });
  }

  const boton = {
    border: "none", background: "transparent", color: "#b05080",
    cursor: "pointer", padding: "8px 0", fontWeight: 700
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {value.cliente_id ? (
        <div style={{ background: "#fff7fb", borderRadius: 10, padding: 12 }}>
          <strong>{value.cliente}</strong>
          <div style={{ color: "#777", marginTop: 4 }}>{value.telefono || "Sin teléfono"}</div>
          <button type="button" style={boton} onClick={() => cambiarModo(false)}>Cambiar</button>
        </div>
      ) : manual ? (
        <>
          {children}
          <button type="button" style={boton} onClick={() => cambiarModo(false)}>
            Buscar clienta existente
          </button>
        </>
      ) : (
        <>
          <label style={{ display: "block", fontSize: 13, color: "#777" }}>
            Buscar clienta por nombre o teléfono
            <input
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setResultados([]);
                setError("");
                setConsultado(false);
              }}
              placeholder="Escribí al menos 3 letras o dígitos"
              style={{ ...inputStyle, marginTop: 6 }}
            />
          </label>
          <div role="status" style={{ color: "#777", fontSize: 13, marginTop: 8 }}>
            {cargando && puedeBuscar && "Buscando..."}
            {!cargando && !error && consultado && resultados.length === 0 && "No se encontraron clientas."}
          </div>
          {error && <div role="alert" style={{ color: "#c62828", fontSize: 13 }}>{error}</div>}
          {resultados.map((cliente) => (
            <button
              key={cliente.id}
              type="button"
              onClick={() => onChange({
                cliente_id: cliente.id,
                cliente: cliente.nombre,
                telefono: cliente.telefono
              })}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: 10, border: "1px solid #f0d9e8", borderRadius: 8,
                background: "#fff", cursor: "pointer", marginTop: 6
              }}
            >
              <strong>{cliente.nombre}</strong>
              <span style={{ display: "block", color: "#777" }}>{cliente.telefono || "Sin teléfono"}</span>
            </button>
          ))}
        </>
      )}
      {!manual && (
        <button type="button" style={boton} onClick={() => cambiarModo(true)}>+ Nueva clienta</button>
      )}
    </div>
  );
}
