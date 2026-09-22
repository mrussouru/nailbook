import { useId } from "react";
import { getCountries, getCountryCallingCode, parsePhoneNumberWithError } from "libphonenumber-js/max";
import { normalizarTelefono } from "../utils/telefonos";

const paises = ["UY", ...getCountries().filter(pais => pais !== "UY").sort()];

export default function CampoTelefono({
  pais = "UY",
  numero = "",
  onChange,
  requerido = false,
  required = requerido,
  disabled = false,
  label = "Teléfono / WhatsApp",
  error = ""
}) {
  const id = useId();

  function cambiarNumero(event) {
    const nuevoNumero = event.target.value;
    if (nuevoNumero.trim().startsWith("+")) {
      const resultado = normalizarTelefono({ pais, numero: nuevoNumero });
      if (resultado.valido && resultado.pais) {
        const telefono = parsePhoneNumberWithError(resultado.telefono, { extract: false });
        onChange({ pais: resultado.pais, numero: telefono.formatNational() });
        return;
      }
    }
    onChange({ pais, numero: nuevoNumero });
  }

  return (
    <div>
      {label && <label htmlFor={id} style={labelStyle}>{label}{required ? " *" : ""}</label>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <select
          aria-label="País del teléfono"
          value={pais}
          onChange={event => onChange({ pais: event.target.value, numero })}
          disabled={disabled}
          required={required}
          style={{ ...inputStyle, flex: "0 1 140px", maxWidth: "100%" }}
        >
          {paises.map(codigo => (
            <option key={codigo} value={codigo}>
              {`${codigo} (+${getCountryCallingCode(codigo)})`}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-label={label ? undefined : "Teléfono"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={numero}
          onChange={cambiarNumero}
          disabled={disabled}
          required={required}
          style={{ ...inputStyle, flex: "1 1 180px", minWidth: 0 }}
        />
      </div>
      {error && <div id={`${id}-error`} role="alert" style={{ color: "#c62828", fontSize: 13, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

const labelStyle = { display: "block", color: "#b05080", fontSize: 13, fontWeight: 700, marginBottom: 7 };
const inputStyle = { boxSizing: "border-box", border: "1px solid #f0d9e8", borderRadius: 9, padding: 11, font: "inherit", color: "#333", background: "#fff" };
