import {
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberWithError
} from "libphonenumber-js/max";

/**
 * Normaliza un teléfono de contacto sin efectos secundarios.
 * `pais` es null si un número internacional válido no tiene país identificable.
 */
export function normalizarTelefono({ pais = "UY", numero } = {}) {
  if (typeof pais !== "string" || !isSupportedCountry(pais)) {
    return { valido: false, error: "PAIS_INVALIDO" };
  }
  if (numero == null || (typeof numero === "string" && !numero.trim())) {
    return { valido: false, error: "TELEFONO_REQUERIDO" };
  }
  if (typeof numero !== "string") {
    return { valido: false, error: "TELEFONO_INVALIDO" };
  }

  const texto = numero.trim();
  try {
    const internacional = texto.startsWith("+");
    const telefono = parsePhoneNumberWithError(texto, {
      defaultCountry: internacional ? undefined : pais,
      extract: false
    });
    if (telefono.ext || !telefono.isValid() || texto.startsWith("tel:")) {
      return { valido: false, error: "TELEFONO_INVALIDO" };
    }

    if (!internacional) {
      // Impide que el parser adivine un internacional sin + o convierta un IDD.
      // El prefijo se obtiene de sus metadatos; no quitamos prefijos nacionales.
      const nacional = parsePhoneNumberWithError(
        `+${getCountryCallingCode(pais)} ${texto}`,
        { extract: false }
      );
      if (!nacional.isValid() || nacional.number !== telefono.number) {
        return { valido: false, error: "TELEFONO_INVALIDO" };
      }
    }

    return {
      valido: true,
      pais: telefono.country ?? null,
      telefono: telefono.number,
      telefono_normalizado: telefono.number.slice(1)
    };
  } catch {
    return { valido: false, error: "TELEFONO_INVALIDO" };
  }
}
