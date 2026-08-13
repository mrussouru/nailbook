import logo from './assets/logo.png'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Calendario from "./components/Calendario"
import ListadoTurnos from "./components/ListadoTurnos"
import NuevoTurno from "./components/NuevoTurno"

import Header from './components/Header'
import Profesionales from './components/Profesionales'

import {
  HORARIOS, DIAS_SEMANA, MESES, formatDate, parseDate, addDays, horaAMinutos,
  generarMensajeWA, abrirWhatsApp, estadoColor, estadoLabel,
} from './helpers'

export default function PanelInterno() {
  const [vista, setVista] = useState('calendario')
  const [servicios, setServicios] = useState([])
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(formatDate(new Date()))
  const [mesActual, setMesActual] = useState(new Date())
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null)
  const [form, setForm] = useState({ cliente:'', telefono:'', servicio:'', fecha: formatDate(new Date()), hora:'10:00', nota:'' })
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [msgPreview, setMsgPreview] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const esMovil = window.innerWidth < 768

  const hoy = formatDate(new Date())
  const manana = addDays(hoy, 1)

  const cargarTodo = useCallback(async () => {
    setCargando(true)
    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.from('servicios').select('*').eq('activo', true).order('orden'),
      supabase.from('turnos').select('*').order('fecha').order('hora'),
    ])
    setServicios(s || [])
    setTurnos((t || []).map(x => ({ ...x, hora: x.hora.slice(0,5) })))
    if (s && s[0] && !form.servicio) setForm(f => ({ ...f, servicio: s[0].id }))
    setCargando(false)
  }, []) // eslint-disable-line

  useEffect(() => { cargarTodo() }, [cargarTodo])

  // Suscripción en tiempo real: si otra persona del salón agenda algo, se actualiza solo
  useEffect(() => {
    const canal = supabase.channel('turnos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos' }, () => cargarTodo())
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [cargarTodo])

  const servicioInfo = (id) => servicios.find(s => s.id === id)
  const turnosManana = useMemo(() => turnos.filter(t => t.fecha === manana && t.estado !== 'cancelado'), [turnos, manana])

  function getDiasDelMes(mes) {
    const año = mes.getFullYear(), m = mes.getMonth()
    const primero = new Date(año, m, 1), ultimo = new Date(año, m+1, 0)
    const dias = []
    for (let i=0; i<primero.getDay(); i++) dias.push(null)
    for (let d=1; d<=ultimo.getDate(); d++) dias.push(new Date(año, m, d))
    return dias
  }

  function turnoQueChoca(fecha, hora, servicioId, ignorarId) {
    const s = servicioInfo(servicioId)
    const inicioNuevo = horaAMinutos(hora)
    const finNuevo = inicioNuevo + (s?.duracion || 0)
    return turnos.find(t => {
      if (t.id === ignorarId) return false
      if (t.fecha !== fecha) return false
      if (t.estado === 'cancelado') return false
      const sOtro = servicioInfo(t.servicio)
      const inicioOtro = horaAMinutos(t.hora)
      const finOtro = inicioOtro + (sOtro?.duracion || 0)
      return inicioNuevo < finOtro && inicioOtro < finNuevo
    })
  }

  async function agregarTurno() {
    if (!form.cliente || !form.fecha || !form.hora) return
    if (turnoQueChoca(form.fecha, form.hora, form.servicio)) return
    const { error } = await supabase.from('turnos').insert({
      cliente: form.cliente, telefono: form.telefono, servicio: form.servicio,
      fecha: form.fecha, hora: form.hora, estado: 'confirmado', origen: 'interno', nota: form.nota,
    })
    if (error) { alert('No se pudo guardar: ' + error.message); return }
    await cargarTodo()
    setVista('calendario')
    setFechaSeleccionada(form.fecha)
    setForm({ cliente:'', telefono:'', servicio: servicios[0]?.id || '', fecha: hoy, hora:'10:00', nota:'' })
  }

  async function cambiarEstado(id, estado) {
    await supabase.from('turnos').update({ estado }).eq('id', id)
    setTurnos(turnos.map(t => t.id === id ? { ...t, estado } : t))
    if (turnoSeleccionado?.id === id) setTurnoSeleccionado({ ...turnoSeleccionado, estado })
  }

  async function eliminarTurno(id) {
    await supabase.from('turnos').delete().eq('id', id)
    setTurnos(turnos.filter(t => t.id !== id))
    setTurnoSeleccionado(null)
    setVista('calendario')
  }

  async function marcarRecordatorio(id, valor) {
    await supabase.from('turnos').update({ recordatorio_enviado: valor }).eq('id', id)
    setTurnos(turnos.map(t => t.id === id ? { ...t, recordatorio_enviado: valor } : t))
    if (turnoSeleccionado?.id === id) setTurnoSeleccionado({ ...turnoSeleccionado, recordatorio_enviado: valor })
  }

  function enviarRecordatorio(turno) {
    const s = servicioInfo(turno.servicio)
    const msg = generarMensajeWA(turno, s)
    if (!turno.telefono) { alert('Esta cliente no tiene teléfono cargado.'); return }
    abrirWhatsApp(turno.telefono, msg)
    marcarRecordatorio(turno.id, true)
    setMsgPreview(null)
  }

 
  async function salir() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const turnosDelDia = turnos.filter(t => t.fecha === fechaSeleccionada)
  const turnosFiltrados = turnos.filter(t => {
    const estadoOk = filtroEstado === 'todos' || t.estado === filtroEstado
    const busOk = t.cliente.toLowerCase().includes(busqueda.toLowerCase()) || t.telefono.includes(busqueda)
    return estadoOk && busOk
  }).sort((a,b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))

  if (cargando) {
    return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fdf6f8', color:'#b05080', fontWeight:700 }}>Cargando agenda...</div>
  }

  return (
            <div style={{ fontFamily:"'Segoe UI', sans-serif", background:'#fdf6f8', minHeight:'100vh', color:'#2d1f27' }}>
              <Header
              logo={logo}
              esMovil={esMovil}
              menuAbierto={menuAbierto}
              setMenuAbierto={setMenuAbierto}
              vista={vista}
              setVista={setVista}
              setTurnoSeleccionado={setTurnoSeleccionado}
              salir={salir}
            />
      <main style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>

        {vista === 'recordatorios' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <span style={{ fontSize:28 }}>📲</span>
              <div>
                <h2 style={{ margin:0, fontWeight:800, color:'#b05080', fontSize:20 }}>Recordatorios por WhatsApp</h2>
                <p style={{ margin:0, fontSize:13, color:'#888' }}>Turnos de mañana · {parseDate(manana).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</p>
              </div>
            </div>
            {turnosManana.length === 0
              ? <div style={{ textAlign:'center', padding:'50px 0', color:'#bba' }}>No hay turnos agendados para mañana. 🌸</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {turnosManana.sort((a,b)=>a.hora.localeCompare(b.hora)).map(t => {
                    const s = servicioInfo(t.servicio)
                    const msg = generarMensajeWA(t, s)
                    return (
                      <div key={t.id} style={{ background:'#fff', borderRadius:16, border:'2px solid ' + (t.recordatorio_enviado ? '#c8e6c9' : '#25d366'), overflow:'hidden' }}>
                        <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
                          <div style={{ background:'#fce8f3', borderRadius:10, padding:'8px 14px', textAlign:'center', minWidth:54 }}>
                            <div style={{ fontSize:16, fontWeight:800, color:'#b05080' }}>{t.hora}</div>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, fontSize:16 }}>{t.cliente}</div>
                            <div style={{ fontSize:13, color:'#888' }}>{s?.nombre} · {t.telefono || 'Sin teléfono'}</div>
                          </div>
                          {t.recordatorio_enviado
                            ? <span style={{ background:'#e8f5e9', color:'#2e7d32', padding:'6px 14px', borderRadius:20, fontWeight:700, fontSize:13 }}>✓ Enviado</span>
                            : <button onClick={() => setMsgPreview({ turno:t, mensaje:msg })}
                                style={{ background:'#25d366', color:'#fff', border:'none', borderRadius:20, padding:'8px 18px', fontWeight:700, cursor:'pointer', fontSize:14 }}>
                                WhatsApp
                              </button>}
                        </div>
                        <div style={{ background:'#f9fdf9', borderTop:'1px solid #e8f5e9', padding:'12px 20px' }}>
                          <div style={{ fontSize:11, color:'#888', fontWeight:700, marginBottom:4 }}>MENSAJE A ENVIAR</div>
                          <div style={{ fontSize:13, color:'#333', whiteSpace:'pre-line', fontStyle:'italic' }}>{msg}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>}
          </div>
        )}

        {msgPreview && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={() => setMsgPreview(null)}>
            <div style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:420, width:'100%' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin:'0 0 4px', fontWeight:800, color:'#25d366' }}>📲 Enviar por WhatsApp</h3>
              <p style={{ margin:'0 0 16px', fontSize:13, color:'#888' }}>Para: <strong>{msgPreview.turno.cliente}</strong> · {msgPreview.turno.telefono}</p>
              <div style={{ background:'#dcf8c6', borderRadius:14, padding:'14px 16px', marginBottom:20, fontSize:14, whiteSpace:'pre-line', lineHeight:1.6 }}>{msgPreview.mensaje}</div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setMsgPreview(null)} style={{ flex:1, padding:11, borderRadius:12, border:'2px solid #f0d9e8', background:'#fff', fontWeight:700, cursor:'pointer' }}>Cancelar</button>
                <button onClick={() => enviarRecordatorio(msgPreview.turno)} style={{ flex:2, padding:11, borderRadius:12, border:'none', background:'#25d366', color:'#fff', fontWeight:700, cursor:'pointer' }}>Abrir WhatsApp →</button>
              </div>
            </div>
          </div>
        )}

{vista === "calendario" && !turnoSeleccionado && (

<Calendario

mesActual={mesActual}
setMesActual={setMesActual}

fechaSeleccionada={fechaSeleccionada}
setFechaSeleccionada={setFechaSeleccionada}

hoy={hoy}
manana={manana}

turnos={turnos}
turnosDelDia={turnosDelDia}

getDiasDelMes={getDiasDelMes}

servicioInfo={servicioInfo}

setVista={setVista}

form={form}
setForm={setForm}

setTurnoSeleccionado={setTurnoSeleccionado}

/>

)}

        {turnoSeleccionado && (
          <div>
            <button onClick={() => setTurnoSeleccionado(null)} style={{ background:'transparent', border:'none', color:'#b05080', fontWeight:700, cursor:'pointer', marginBottom:16 }}>← Volver</button>
            <div style={{ background:'#fff', borderRadius:18, padding:28, border:'2px solid #f0d9e8' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                <div>
                  <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800 }}>{turnoSeleccionado.cliente}</h2>
                  <div style={{ color:'#888', fontSize:14 }}>📞 {turnoSeleccionado.telefono || 'Sin teléfono'}</div>
                </div>
                <span style={{ background:estadoColor[turnoSeleccionado.estado], padding:'6px 16px', borderRadius:20, fontSize:13, fontWeight:700, color:'#555' }}>{estadoLabel[turnoSeleccionado.estado]}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
                {[
                  ['📅 Fecha', parseDate(turnoSeleccionado.fecha).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})],
                  ['⏰ Hora', turnoSeleccionado.hora],
                  ['💅 Servicio', servicioInfo(turnoSeleccionado.servicio)?.nombre],
                  ['💵 Precio', `$${Number(servicioInfo(turnoSeleccionado.servicio)?.precio).toLocaleString('es-AR')}`],
                ].map(([l,v]) => (
                  <div key={l} style={{ background:'#fdf6f8', borderRadius:10, padding:'10px 14px' }}>
                    <div style={{ fontSize:12, color:'#b05080', fontWeight:700 }}>{l}</div>
                    <div style={{ fontWeight:600, fontSize:15 }}>{v}</div>
                  </div>
                ))}
                {turnoSeleccionado.nota && (
                  <div style={{ background:'#fdf6f8', borderRadius:10, padding:'10px 14px', gridColumn:'1/-1' }}>
                    <div style={{ fontSize:12, color:'#b05080', fontWeight:700 }}>📝 Nota</div>
                    <div style={{ fontSize:14 }}>{turnoSeleccionado.nota}</div>
                  </div>
                )}
              </div>
              {turnoSeleccionado.fecha === manana && turnoSeleccionado.estado !== 'cancelado' && !turnoSeleccionado.recordatorio_enviado && (
                <div style={{ background:'#f0faf4', borderRadius:12, padding:'14px 16px', marginBottom:16, border:'1px solid #c8e6c9' }}>
                  <div style={{ fontWeight:700, color:'#1a7a40', marginBottom:8 }}>📲 Este turno es mañana</div>
                  <button onClick={() => { const s=servicioInfo(turnoSeleccionado.servicio); setMsgPreview({turno:turnoSeleccionado, mensaje:generarMensajeWA(turnoSeleccionado,s)}) }}
                    style={{ background:'#25d366', color:'#fff', border:'none', borderRadius:20, padding:'8px 20px', fontWeight:700, cursor:'pointer' }}>
                    Enviar recordatorio por WhatsApp
                  </button>
                </div>
              )}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {['confirmado','pendiente','completado','cancelado'].filter(e=>e!==turnoSeleccionado.estado).map(e => (
                  <button key={e} onClick={() => cambiarEstado(turnoSeleccionado.id, e)} style={{ background:estadoColor[e], border:'none', borderRadius:20, padding:'7px 16px', fontWeight:700, cursor:'pointer', fontSize:13, color:'#555' }}>
                    Marcar como {estadoLabel[e].toLowerCase()}
                  </button>
                ))}
                <button onClick={() => eliminarTurno(turnoSeleccionado.id)} style={{ background:'#fff0f0', border:'none', borderRadius:20, padding:'7px 16px', fontWeight:700, cursor:'pointer', fontSize:13, color:'#c0392b', marginLeft:'auto' }}>🗑 Eliminar</button>
              </div>
            </div>
          </div>
        )}


          {vista === 'listado' && (
            <ListadoTurnos
              busqueda={busqueda}
              setBusqueda={setBusqueda}
              filtroEstado={filtroEstado}
              setFiltroEstado={setFiltroEstado}
              turnosFiltrados={turnosFiltrados}
              servicioInfo={servicioInfo}
              estadoLabel={estadoLabel}
              estadoColor={estadoColor}
              parseDate={parseDate}
              setVista={setVista}
              setFechaSeleccionada={setFechaSeleccionada}
              setTurnoSeleccionado={setTurnoSeleccionado}
            />
          )}

          {vista === "nuevo" && (

          <NuevoTurno

          form={form}
          setForm={setForm}

          servicios={servicios}

          servicioInfo={servicioInfo}

          turnoQueChoca={turnoQueChoca}

          agregarTurno={agregarTurno}

          setVista={setVista}

          Campo={Campo}

          inputStyle={inputStyle}

          />

          )}
              
      </main>
    </div>
  )
}

function Campo({ label, children }) {
  return <div style={{ marginBottom:16 }}><label style={{ display:'block', fontSize:12, fontWeight:700, color:'#b05080', marginBottom:5 }}>{label}</label>{children}</div>
}
const inputStyle = { width:'100%', padding:'10px 14px', borderRadius:10, border:'2px solid #f0d9e8', fontSize:14, outline:'none', boxSizing:'border-box', background:'#fff' }
const btnNav = { background:'#fce8f3', border:'none', borderRadius:8, width:32, height:32, fontSize:18, cursor:'pointer', color:'#b05080', fontWeight:700 }
