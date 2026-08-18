import { HORARIOS } from "../helpers";

export default function NuevoTurno(props) {

  const {
    form,
    setForm,
    servicios,
    profesionales,
    servicioInfo,
    turnoQueChoca,
    agregarTurno,
    setVista,
    Campo,
    inputStyle
  } = props;

  return (

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
            <Campo label="Profesional *">
            <select
                value={form.profesional_id || ""}
                onChange={e =>
                setForm({
                    ...form,
                    profesional_id: e.target.value
                })
                }
                style={inputStyle}
            >
                <option value="">
                ✨ Asignación automática (recomendado)
                </option>

                {profesionales
                .filter(p => p.activa)
                .map(p => (
                    <option key={p.id} value={p.id}>
                    {p.nombre}
                    </option>
                ))}
            </select>
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
  );

}