export default function ListadoTurnos(props) {

    const {
      busqueda,
      setBusqueda,
      filtroEstado,
      setFiltroEstado,
      turnosFiltrados,
      servicioInfo,
      estadoLabel,
      estadoColor,
      parseDate,
      setVista,
      setFechaSeleccionada,
      setTurnoSeleccionado
    } = props


    return (
  
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
  
    )
  
  }