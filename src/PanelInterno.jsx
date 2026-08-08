import logo from './assets/logo.png'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './supabaseClient'
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
      <header style={{ background:'#fff', borderBottom:'2px solid #f0d9e8', padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:72, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center' }}>
          <img
            src={logo}
            alt="Tamy Ayelen"
            style={{
              width:150,
              height:'auto'
            }}
          />
        </div>
        <nav style={{ display:'flex', gap:6, alignItems:'center' }}>
          {[['calendario','📅 Calendario'],['recordatorios','📲 Recordatorios'],['listado','📋 Turnos'],['nuevo','➕ Nuevo turno']].map(([v,l]) => (
            <button key={v} onClick={() => { setVista(v); setTurnoSeleccionado(null) }}
              style={{ padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
                background: vista===v ? '#b05080' : 'transparent', color: vista===v ? '#fff' : '#b05080', position:'relative' }}>
              {l}
              {v==='recordatorios' && turnosManana.filter(t=>!t.recordatorio_enviado).length > 0 && (
                <span style={{ position:'absolute', top:-4, right:-4, background:'#25d366', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {turnosManana.filter(t=>!t.recordatorio_enviado).length}
                </span>
              )}
            </button>
          ))}
          <button onClick={salir} style={{ padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, color:'#999', background:'transparent' }}>Salir</button>
        </nav>
      </header>

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

        {vista === 'calendario' && !turnoSeleccionado && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <button onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth()-1, 1))} style={btnNav}>‹</button>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#b05080', minWidth:180, textAlign:'center' }}>{MESES[mesActual.getMonth()]} {mesActual.getFullYear()}</h2>
              <button onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth()+1, 1))} style={btnNav}>›</button>
              <button onClick={() => { setMesActual(new Date()); setFechaSeleccionada(hoy) }} style={{ ...btnNav, fontSize:12, padding:'4px 12px', borderRadius:12, marginLeft:8, width:'auto' }}>Hoy</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginBottom:4 }}>
              {DIAS_SEMANA.map(d => <div key={d} style={{ textAlign:'center', fontSize:12, fontWeight:700, color:'#b05080' }}>{d}</div>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginBottom:24 }}>
              {getDiasDelMes(mesActual).map((dia, i) => {
                if (!dia) return <div key={i} />
                const fStr = formatDate(dia)
                const tsDia = turnos.filter(t => t.fecha === fStr)
                const esHoy = fStr === hoy, esSel = fStr === fechaSeleccionada
                return (
                  <button key={i} onClick={() => setFechaSeleccionada(fStr)}
                    style={{ background: esSel ? '#b05080' : esHoy ? '#fce8f3' : '#fff', border: esHoy && !esSel ? '2px solid #b05080' : '2px solid transparent',
                      borderRadius:10, padding:'6px 4px', cursor:'pointer', minHeight:52, display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <span style={{ fontWeight:700, fontSize:14, color: esSel?'#fff':esHoy?'#b05080':'#2d1f27' }}>{dia.getDate()}</span>
                    <div style={{ display:'flex', gap:2, flexWrap:'wrap', justifyContent:'center', marginTop:2 }}>
                      {tsDia.slice(0,3).map(t => <span key={t.id} style={{ width:7, height:7, borderRadius:'50%', background: esSel?'#fff':'#b05080' }} />)}
                    </div>
                  </button>
                )
              })}
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>
                {fechaSeleccionada === hoy ? 'Hoy' : fechaSeleccionada === manana ? 'Mañana' : parseDate(fechaSeleccionada).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}
                <span style={{ fontWeight:400, fontSize:13, color:'#999', marginLeft:8 }}>({turnosDelDia.length} turno{turnosDelDia.length!==1?'s':''})</span>
              </h3>
              <button onClick={() => { setForm({...form, fecha: fechaSeleccionada}); setVista('nuevo') }} style={{ background:'#b05080', color:'#fff', border:'none', borderRadius:20, padding:'7px 16px', fontWeight:700, cursor:'pointer', fontSize:13 }}>+ Turno</button>
            </div>
            {turnosDelDia.length === 0
              ? <div style={{ textAlign:'center', padding:'40px 0', color:'#bba' }}>No hay turnos este día.</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {turnosDelDia.sort((a,b)=>a.hora.localeCompare(b.hora)).map(t => (
                    <div key={t.id} onClick={() => setTurnoSeleccionado(t)}
                      style={{ background:'#fff', borderRadius:14, padding:'14px 18px', cursor:'pointer',
                        border:'2px solid ' + (t.fecha===manana && !t.recordatorio_enviado && t.estado!=='cancelado' ? '#25d366' : '#f0d9e8'),
                        display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ background:'#fce8f3', borderRadius:10, padding:'8px 14px', textAlign:'center', minWidth:54 }}>
                        <div style={{ fontSize:16, fontWeight:800, color:'#b05080' }}>{t.hora}</div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15 }}>
                          {t.cliente} {t.origen === 'publico' && <span style={{ fontSize:11, background:'#e3f2fd', color:'#1565c0', padding:'2px 8px', borderRadius:10, marginLeft:6 }}>Reservado online</span>}
                        </div>
                        <div style={{ fontSize:13, color:'#888' }}>{servicioInfo(t.servicio)?.nombre} · ${Number(servicioInfo(t.servicio)?.precio).toLocaleString('es-AR')}</div>
                      </div>
                      <span style={{ background:estadoColor[t.estado], padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, color:'#555' }}>{estadoLabel[t.estado]}</span>
                    </div>
                  ))}
                </div>}
          </div>
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
          <div>
            <h2 style={{ margin:'0 0 16px', fontWeight:800, color:'#b05080' }}>Todos los turnos</h2>
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
              <input placeholder="🔍 Buscar cliente o teléfono..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{ flex:1, minWidth:180, padding:'9px 14px', borderRadius:20, border:'2px solid #f0d9e8', fontSize:14 }} />
              <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)} style={{ padding:'9px 14px', borderRadius:20, border:'2px solid #f0d9e8', fontSize:14, background:'#fff' }}>
                <option value="todos">Todos los estados</option>
                {Object.entries(estadoLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {turnosFiltrados.length === 0
              ? <div style={{ textAlign:'center', padding:'40px 0', color:'#bba' }}>No se encontraron turnos.</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {turnosFiltrados.map(t => (
                    <div key={t.id} onClick={() => { setVista('calendario'); setFechaSeleccionada(t.fecha); setTurnoSeleccionado(t) }}
                      style={{ background:'#fff', borderRadius:12, padding:'12px 16px', cursor:'pointer', border:'2px solid #f0d9e8', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ minWidth:80, textAlign:'center' }}>
                        <div style={{ fontSize:12, color:'#b05080', fontWeight:700 }}>{parseDate(t.fecha).toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</div>
                        <div style={{ fontSize:15, fontWeight:800 }}>{t.hora}</div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700 }}>{t.cliente}</div>
                        <div style={{ fontSize:13, color:'#888' }}>{servicioInfo(t.servicio)?.nombre}</div>
                      </div>
                      <span style={{ background:estadoColor[t.estado], padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700, color:'#555' }}>{estadoLabel[t.estado]}</span>
                    </div>
                  ))}
                </div>}
          </div>
        )}

        {vista === 'nuevo' && (
          <div>
            <h2 style={{ margin:'0 0 20px', fontWeight:800, color:'#b05080' }}>Nuevo turno</h2>
            <div style={{ background:'#fff', borderRadius:18, padding:28, border:'2px solid #f0d9e8', maxWidth:480 }}>
              <Campo label="Nombre de la cliente *">
                <input value={form.cliente} onChange={e => setForm({...form, cliente:e.target.value})} placeholder="Ej: Laura Pérez" style={inputStyle} />
              </Campo>
              <Campo label="Teléfono / WhatsApp">
                <input value={form.telefono} onChange={e => setForm({...form, telefono:e.target.value})} placeholder="Ej: 5491122334455" style={inputStyle} />
              </Campo>
              <Campo label="Fecha *">
                <input type="date" value={form.fecha} onChange={e => setForm({...form, fecha:e.target.value})} style={inputStyle} />
              </Campo>
              <Campo label="Servicio *">
                <select value={form.servicio} onChange={e => setForm({...form, servicio:e.target.value})} style={inputStyle}>
                  {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} · {s.duracion} min · ${Number(s.precio).toLocaleString('es-AR')}</option>)}
                </select>
              </Campo>
              <Campo label={`Horario * ${servicioInfo(form.servicio) ? `(${servicioInfo(form.servicio).nombre} dura ${servicioInfo(form.servicio).duracion} min)` : ''}`}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {HORARIOS.map(h => {
                    const choque = turnoQueChoca(form.fecha, h, form.servicio)
                    const ocupado = !!choque
                    const sel = form.hora === h
                    return (
                      <button key={h} disabled={ocupado} onClick={() => !ocupado && setForm({...form, hora:h})}
                        title={ocupado ? `Se superpone con el turno de ${choque.cliente} a las ${choque.hora}` : ''}
                        style={{ padding:'7px 12px', borderRadius:10, border:'2px solid ' + (ocupado ? '#fcd2d2' : sel ? '#b05080' : '#f0d9e8'),
                          background: ocupado ? '#fdf0f0' : sel ? '#b05080' : '#fff', color: ocupado ? '#c0392b' : sel ? '#fff' : '#2d1f27',
                          fontWeight:600, fontSize:13, cursor: ocupado ? 'not-allowed' : 'pointer', textDecoration: ocupado ? 'line-through' : 'none' }}>
                        {h}
                      </button>
                    )
                  })}
                </div>
              </Campo>
              <Campo label="Nota (opcional)">
                <textarea value={form.nota} onChange={e => setForm({...form, nota:e.target.value})} rows={2} style={{...inputStyle, resize:'vertical'}} />
              </Campo>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setVista('calendario')} style={{ flex:1, padding:11, borderRadius:12, border:'2px solid #f0d9e8', background:'#fff', fontWeight:700, cursor:'pointer' }}>Cancelar</button>
                <button onClick={agregarTurno} disabled={!form.cliente || !form.fecha || !!turnoQueChoca(form.fecha, form.hora, form.servicio)}
                  style={{ flex:2, padding:11, borderRadius:12, border:'none',
                    background: (form.cliente && form.fecha && !turnoQueChoca(form.fecha, form.hora, form.servicio)) ? '#b05080' : '#ddd',
                    color:'#fff', fontWeight:700, cursor:'pointer' }}>
                  Confirmar turno
                </button>
              </div>
            </div>
          </div>
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
