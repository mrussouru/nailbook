export default function Recordatorios(props) {

    const {
      manana,
      turnosManana,
      servicioInfo,
      generarMensajeWA,
      setMsgPreview,
      parseDate
    } = props
  
    return (
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
    ) 
  }