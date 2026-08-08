export const HORARIOS = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00"]
export const DIAS_SEMANA = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
export const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

export function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
export function parseDate(str) {
  const [y,m,d] = str.split('-').map(Number)
  return new Date(y, m-1, d)
}
export function addDays(dateStr, n) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return formatDate(d)
}
export function horaAMinutos(hora) {
  const [h,m] = hora.slice(0,5).split(':').map(Number)
  return h*60 + m
}

// Dado un horario candidato y la duración del servicio elegido,
// y una lista de "ocupaciones" {hora, duracion}, devuelve si choca.
export function seSuperponeConOcupados(hora, duracionServicio, ocupados) {
  const inicioNuevo = horaAMinutos(hora)
  const finNuevo = inicioNuevo + duracionServicio
  return ocupados.some(o => {
    const inicioOtro = horaAMinutos(o.hora)
    const finOtro = inicioOtro + o.duracion
    return inicioNuevo < finOtro && inicioOtro < finNuevo
  })
}

export function generarMensajeWA(turno, servicio) {
  const fechaObj = parseDate(turno.fecha)
  const fechaTexto = fechaObj.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" })
  return `Hola ${turno.cliente} 💅 Te recuerdo que mañana tenés turno de *${servicio?.nombre}* a las *${turno.hora.slice(0,5)} hs*.\n\nSi necesitás cancelar o reprogramar, avisame con tiempo. ¡Te espero! 🌸`
}

export function abrirWhatsApp(telefono, mensaje) {
  const tel = telefono.replace(/\D/g, "")
  const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`
  window.open(url, "_blank")
}

export const estadoColor = { confirmado:"#b5e8d5", pendiente:"#fde8b0", cancelado:"#fcd2d2", completado:"#d4d4f5" }
export const estadoLabel = { confirmado:"Confirmado", pendiente:"Pendiente", cancelado:"Cancelado", completado:"Completado" }
