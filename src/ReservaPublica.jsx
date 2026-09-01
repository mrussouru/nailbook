import logo from './assets/logo.png'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { HORARIOS, DIAS_SEMANA, MESES, formatDate, parseDate, seSuperponeConOcupados } from './helpers'
import { obtenerDisponibilidadHoraria } from "./motores/MDI/disponibilidadHoraria";
import { useMemo } from "react";

export default function ReservaPublica() {
  const [servicios, setServicios] = useState([])
  const [profesionales, setProfesionales] = useState([]);
  const [profesionalId, setProfesionalId] = useState("");
  const [mesActual, setMesActual] = useState(new Date())
  const [fecha, setFecha] = useState(formatDate(new Date()))
  const [servicioId, setServicioId] = useState('')
  const [hora, setHora] = useState('')
  const [ocupados, setOcupados] = useState([])
  const [cliente, setCliente] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nota, setNota] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [relacionesServicios, setRelacionesServicios] = useState([]);
  const [turnos, setTurnos] = useState([]);
  

  const hoy = formatDate(new Date())

  useEffect(() => {
    supabase.from('servicios').select('*').eq('activo', true).order('orden')
      .then(({ data }) => {
        setServicios(data || [])
        if (data && data[0]) setServicioId(data[0].id)
      })
  
    // NUEVO ↓↓↓
    supabase
      .from('profesionales')
      .select('*')
      .eq('activa', true)
      .order('nombre')
      .then(({ data }) => {
        setProfesionales(data || [])
      })

          supabase
      .from("profesionales_servicios")
      .select("*")
      .then(({ data }) => {
        setRelacionesServicios(data || []);
      });

    supabase
      .from("turnos")
      .select("*")
      .then(({ data }) => {
        setTurnos(data || []);
      });
  
  }, [])

  const cargarOcupados = useCallback(async (f) => {
    const { data, error } = await supabase.rpc('horarios_ocupados', { fecha_consulta: f })
    if (!error) setOcupados(data || [])
  }, [])

  useEffect(() => { cargarOcupados(fecha) }, [fecha, cargarOcupados])

  const servicioInfo = servicios.find(s => s.id === servicioId)

  const turnosPublicos = useMemo(() => {
    return ocupados.map((ocupado, index) => ({
      id: `ocupado-${index}`,
      fecha,
      hora: ocupado.hora,
      estado: "pendiente",
      profesional_id: ocupado.profesional_id,
      servicio: ocupado.servicio_id
    }));
  }, [ocupados, fecha]);

  const disponibilidadHoraria = useMemo(() => {

    if (
      !fecha ||
      !servicioId ||
      servicios.length === 0 ||
      profesionales.length === 0
    ) {
      return [];
    }
  
    return obtenerDisponibilidadHoraria({
  
      fecha,
  
      servicioId,
  
      profesionalId,
  
      horarios: HORARIOS,
  
      profesionales,
  
      relaciones: relacionesServicios,
  
      turnos: turnosPublicos,
  
      servicios
  
    });
  
  }, [
    fecha,
    servicioId,
    profesionalId,
    profesionales,
    relacionesServicios,
    turnosPublicos,
    servicios
  ]);

  function getDiasDelMes(mes) {
    const año = mes.getFullYear(), m = mes.getMonth()
    const primero = new Date(año, m, 1), ultimo = new Date(año, m+1, 0)
    const dias = []
    for (let i=0; i<primero.getDay(); i++) dias.push(null)
    for (let d=1; d<=ultimo.getDate(); d++) dias.push(new Date(año, m, d))
    return dias
  }

  function horaOcupada(h) {
    if (!servicioInfo) return false
    return seSuperponeConOcupados(h, servicioInfo.duracion, ocupados)
  }

  async function confirmarReserva() {
    setError('')
    if (!cliente.trim() || !telefono.trim() || !hora || !servicioId) {
      setError('Completá todos los campos obligatorios.')
      return
    }
    const horarioSeleccionado = disponibilidadHoraria.find(
      h => h.hora === hora
    );

 
    if (!horarioSeleccionado?.disponible) {
    
      setError("Ese horario ya no está disponible.");
    
      return;
    
    }
    const profesionalAsignada = horarioSeleccionado.profesional;
    
    
    setCargando(true)
    const { error: err } = await supabase
  .from("turnos")
  .insert({

    cliente: cliente.trim(),

    telefono: telefono.trim(),

    servicio: servicioId,

    profesional_id: profesionalAsignada?.id,

    fecha,

    hora,

    estado: "pendiente",

    origen: "publico",

    nota: nota.trim(),

    precio: servicioInfo?.precio ?? null,

  });
    setCargando(false)
    if (err) {
      setError('No se pudo reservar. Probá de nuevo en unos segundos.')
      return
    }
    setEnviado(true)
  }

  if (enviado) {
    return (
      <Contenedor>
        <div style={{ textAlign:'center', padding:'40px 20px' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
          <h2 style={{ color:'#b05080', margin:'0 0 8px' }}>¡Listo, {cliente}!</h2>
          <p style={{ color:'#555', fontSize:14, lineHeight:1.6 }}>
            Tu turno para <strong>{servicioInfo?.nombre}</strong> el {parseDate(fecha).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})} a las <strong>{hora}</strong> quedó <strong>pendiente de confirmación</strong>.
            <br/><br/>
            Nos vamos a contactar por WhatsApp al <strong>{telefono}</strong> para confirmarlo. ¡Gracias! 🌸
          </p>
        </div>
      </Contenedor>
    )
  }

        return (
          <Contenedor>
            <div style={{ textAlign:'center', marginBottom: 20 }}>
            <img
        src={logo}
        alt="Tamy Ayelen"
        style={{
          width: 150,
          marginBottom: 12
        }}
      />

        <h1 style={{ margin:'4px 0 2px', fontSize: 22, color:'#b05080' }}>Reservá tu turno</h1>
        <p style={{ margin:0, fontSize:13, color:'#888' }}>Elegí servicio, día y horario</p>
      </div>

      {/* Servicio */}
      <Campo label="Servicio *">
        <select value={servicioId} onChange={e => { setServicioId(e.target.value); setHora('') }} style={inputStyle}>
          {servicios.map(s => (
            <option key={s.id} value={s.id}>{s.nombre} · {s.duracion} min · ${Number(s.precio).toLocaleString('es-AR')}</option>
          ))}
        </select>
      </Campo>
      <Campo label="Profesional">
          <select
            value={profesionalId}
            onChange={e => {
              setProfesionalId(e.target.value);
              setHora("");
            }}
            style={inputStyle}
          >
            <option value="">
              ✨ Asignación automática (recomendado)
            </option>

            {profesionales.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>

      {/* Mini calendario */}
      <Campo label="Día *">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <button onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth()-1, 1))} style={btnNav}>‹</button>
          <span style={{ fontWeight:700, color:'#b05080', fontSize:14 }}>{MESES[mesActual.getMonth()]} {mesActual.getFullYear()}</span>
          <button onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth()+1, 1))} style={btnNav}>›</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:3, marginBottom:3 }}>
          {DIAS_SEMANA.map(d => <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'#b05080' }}>{d}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:3 }}>
          {getDiasDelMes(mesActual).map((dia, i) => {
            if (!dia) return <div key={i} />
            const fStr = formatDate(dia)
            const pasado = fStr < hoy
            const sel = fStr === fecha
            return (
              <button key={i} disabled={pasado} onClick={() => { setFecha(fStr); setHora('') }}
                style={{ padding:'6px 0', borderRadius:8, border:'none', cursor: pasado ? 'default':'pointer',
                  background: sel ? '#b05080' : pasado ? '#f5f5f5' : '#fdf6f8',
                  color: sel ? '#fff' : pasado ? '#ccc' : '#2d1f27', fontWeight:600, fontSize:13 }}>
                {dia.getDate()}
              </button>
            )
          })}
        </div>
      </Campo>

      {/* Horarios */}
      <Campo label="Horario *">
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {disponibilidadHoraria.map(item => {

const sel = hora === item.hora;

return (

  <button
    key={item.hora}
    disabled={!item.disponible}
    onClick={() => {

      if (!item.disponible) return;

      setHora(item.hora);

    }}
    title={item.disponible ? "" : item.motivo}
    style={{

      padding:'7px 11px',

      borderRadius:10,

      border:
        '2px solid ' +
        (!item.disponible
          ? '#eee'
          : sel
          ? '#b05080'
          : '#f0d9e8'),

      background:
        !item.disponible
          ? '#f5f5f5'
          : sel
          ? '#b05080'
          : '#fff',

      color:
        !item.disponible
          ? '#ccc'
          : sel
          ? '#fff'
          : '#2d1f27',

      fontWeight:600,

      fontSize:13,

      cursor:
        !item.disponible
          ? 'not-allowed'
          : 'pointer',

      textDecoration:
        !item.disponible
          ? 'line-through'
          : 'none'

    }}
  >

    {item.hora}

  </button>

);

})}
        </div>
      </Campo>

      <Campo label="Tu nombre *">
        <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Ej: Laura Pérez" style={inputStyle} />
      </Campo>

      <Campo label="Tu WhatsApp *">
        <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: 098544544" style={inputStyle} />
      </Campo>

      <Campo label="Nota (opcional)">
        <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Alguna preferencia o diseño en mente..." style={{...inputStyle, resize:'vertical'}} />
      </Campo>

      {error && <div style={{ color:'#c0392b', fontSize:13, fontWeight:600, marginBottom:14 }}>⚠️ {error}</div>}

      <button onClick={confirmarReserva} disabled={cargando}
        style={{ width:'100%', padding:13, borderRadius:14, border:'none', background:'#b05080', color:'#fff',
          fontWeight:700, fontSize:15, cursor: cargando ? 'default' : 'pointer', opacity: cargando ? 0.7 : 1 }}>
        {cargando ? 'Reservando...' : 'Reservar turno'}
      </button>
      <p style={{ textAlign:'center', fontSize:12, color:'#aaa', marginTop:10 }}>
        Tu turno queda pendiente hasta que lo confirmemos por WhatsApp.
      </p>
    </Contenedor>
  )
}

function Contenedor({ children }) {
  return (
    <div style={{ minHeight:'100vh', background:'#fdf6f8', fontFamily:"'Segoe UI', sans-serif", display:'flex', justifyContent:'center', padding:'24px 16px' }}>
      <div style={{ width:'100%', maxWidth:420, background:'#fff', borderRadius:20, border:'2px solid #f0d9e8', padding:24, height:'fit-content' }}>
        {children}
      </div>
    </div>
  )
}
function Campo({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#b05080', marginBottom:5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = { width:'100%', padding:'10px 14px', borderRadius:10, border:'2px solid #f0d9e8', fontSize:14, outline:'none', boxSizing:'border-box', background:'#fff' }
const btnNav = { background:'#fce8f3', border:'none', borderRadius:8, width:28, height:28, fontSize:16, cursor:'pointer', color:'#b05080', fontWeight:700 }
