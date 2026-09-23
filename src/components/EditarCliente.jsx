import { useRef, useState } from "react";
import { parsePhoneNumberWithError } from "libphonenumber-js/max";
import CampoTelefono from "./CampoTelefono";
import { normalizarTelefono } from "../utils/telefonos";

function telefonoInicial(cliente) {
  const original = cliente.telefono || "";
  const internacional = original.trim().startsWith("+")
    ? original
    : cliente.telefono_normalizado ? `+${cliente.telefono_normalizado}` : null;

  if (internacional) {
    const resultado = normalizarTelefono({ numero: internacional });
    if (resultado.valido) {
      const telefono = parsePhoneNumberWithError(resultado.telefono, { extract: false });
      return {
        pais: resultado.pais || "UY",
        numero: resultado.pais ? telefono.formatNational() : resultado.telefono
      };
    }
  }

  // Solo un fallback editable: al guardar se valida, nunca se presume válido.
  return { pais: "UY", numero: original || internacional || "" };
}

export default function EditarCliente({ cliente, onGuardar, onCancelar }) {
  // Otra identidad obtiene un borrador nuevo; un refresco del mismo ID no lo pisa.
  return <FormularioCliente key={cliente.id} cliente={cliente} onGuardar={onGuardar} onCancelar={onCancelar} />;
}

function FormularioCliente({ cliente, onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState(() => cliente.nombre || "");
  const [telefono, setTelefono] = useState(() => telefonoInicial(cliente));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const guardadoEnCurso = useRef(false);

  async function guardar(event) {
    event.preventDefault();
    if (guardadoEnCurso.current) return;
    setError("");

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setError("Ingresá el nombre de la clienta.");
      return;
    }
    const resultado = normalizarTelefono(telefono);
    if (!resultado.valido) {
      setError(resultado.error === "TELEFONO_REQUERIDO"
        ? "Ingresá el teléfono de la clienta."
        : "El teléfono no es válido. Revisá el número y el país seleccionado.");
      return;
    }

    guardadoEnCurso.current = true;
    setGuardando(true);
    try {
      await onGuardar({
        cliente_id: cliente.id,
        nombre: nombreLimpio,
        telefono: resultado.telefono,
        telefono_normalizado: resultado.telefono_normalizado
      });
    } catch (err) {
      setError((typeof err === "string" ? err : err?.message) || "No se pudieron guardar los cambios.");
    } finally {
      guardadoEnCurso.current = false;
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate style={tarjeta} aria-busy={guardando}>
      <h3 style={{ margin: "0 0 16px", color: "#b05080" }}>Editar datos de la clienta</h3>
      <fieldset disabled={guardando} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <label style={{ display: "block", color: "#b05080", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          Nombre *
          <input value={nombre} onChange={event => setNombre(event.target.value)} required autoComplete="name" style={inputStyle} />
        </label>
        <CampoTelefono pais={telefono.pais} numero={telefono.numero} onChange={setTelefono} requerido disabled={guardando} />
        {error && <p role="alert" style={{ color: "#c62828", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button type="button" disabled={guardando} onClick={() => { if (!guardadoEnCurso.current) onCancelar(); }} style={{ ...boton, background: "#fff", color: "#b05080", border: "1px solid #f0d9e8" }}>Cancelar</button>
          <button type="submit" disabled={guardando} style={boton}>{guardando ? "Guardando..." : "Guardar"}</button>
        </div>
      </fieldset>
    </form>
  );
}

const tarjeta = { background: "#fff", border: "1px solid #f0d9e8", borderRadius: 16, padding: 20 };
const inputStyle = { display: "block", width: "100%", boxSizing: "border-box", marginTop: 7, border: "1px solid #f0d9e8", borderRadius: 9, padding: 11, font: "inherit", color: "#333" };
const boton = { background: "#b05080", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700 };
