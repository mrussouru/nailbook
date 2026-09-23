export function construirUrlWhatsApp(telefonoNormalizado) {
  const digits = String(telefonoNormalizado ?? "").trim();

  if (!/^\d{8,15}$/.test(digits)) {
    return null;
  }

  return `https://wa.me/${digits}`;
}
