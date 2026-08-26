import { useUsuario } from "../context/UsuarioContext";
import {
  DIAS_SEMANA,
  MESES,
  formatDate,
  parseDate,
  estadoColor,
  estadoLabel
} from "../helpers";

const btnNav = {
  background:"#fce8f3",
  border:"none",
  borderRadius:8,
  width:32,
  height:32,
  fontSize:18,
  cursor:"pointer",
  color:"#b05080",
  fontWeight:700
}

export default function Calendario(props){

  const { usuario } = useUsuario();

  const esProfesional =
    usuario?.rol === "profesional";

  const{
    mesActual,
    setMesActual,
    fechaSeleccionada,
    setFechaSeleccionada,
    hoy,
    manana,
    turnos,
    turnosDelDia,
    getDiasDelMes,
    servicioInfo,
    profesionales,
    setVista,
    form,
    setForm,
    setTurnoSeleccionado,
    profesionalSeleccionada,
    setProfesionalSeleccionada,
  }=props

  function profesionalInfo(id) {
    return profesionales.find(p => p.id === id)
  }

  return(

    <div>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <button
          onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth()-1, 1))}
          style={btnNav}
        >
          ‹
        </button>

        <h2
          style={{
            margin:0,
            fontSize:18,
            fontWeight:700,
            color:'#b05080',
            minWidth:180,
            textAlign:'center'
          }}
        >
          {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
        </h2>

        <button
          onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth()+1, 1))}
          style={btnNav}
        >
          ›
        </button>

        <button
          onClick={() => {
            setMesActual(new Date());
            setFechaSeleccionada(hoy);
          }}
          style={{
            ...btnNav,
            fontSize:12,
            padding:'4px 12px',
            borderRadius:12,
            marginLeft:8,
            width:'auto'
          }}
        >
          Hoy
        </button>
      </div>

      {/* SOLO EL DUEÑO VE EL FILTRO */}

      {!esProfesional && (

        <div style={{ marginBottom:16 }}>

          <select
            value={profesionalSeleccionada}
            onChange={e => setProfesionalSeleccionada(e.target.value)}
            style={{
              padding:"10px 14px",
              borderRadius:10,
              border:"2px solid #f0d9e8",
              background:"#fff",
              minWidth:220
            }}
          >

            <option value="todas">
              🌸 Todas las profesionales
            </option>

            {profesionales.map(p => (

              <option
                key={p.id}
                value={p.id}
              >
                💅 {p.nombre}
              </option>

            ))}

          </select>

        </div>

      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginBottom:4 }}>
        {DIAS_SEMANA.map(d => (
          <div
            key={d}
            style={{
              textAlign:'center',
              fontSize:12,
              fontWeight:700,
              color:'#b05080'
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginBottom:24 }}>

        {getDiasDelMes(mesActual).map((dia, i) => {

          if (!dia) return <div key={i} />

          const fStr = formatDate(dia)

          const tsDia = turnos.filter(t => t.fecha === fStr)

          const esHoy = fStr === hoy

          const esSel = fStr === fechaSeleccionada

          return (

            <button
              key={i}
              onClick={() => setFechaSeleccionada(fStr)}
              style={{
                background: esSel ? '#b05080' : esHoy ? '#fce8f3' : '#fff',
                border: esHoy && !esSel ? '2px solid #b05080' : '2px solid transparent',
                borderRadius:10,
                padding:'6px 4px',
                cursor:'pointer',
                minHeight:52,
                display:'flex',
                flexDirection:'column',
                alignItems:'center'
              }}
            >

              <span
                style={{
                  fontWeight:700,
                  fontSize:14,
                  color: esSel ? '#fff' : esHoy ? '#b05080' : '#2d1f27'
                }}
              >
                {dia.getDate()}
              </span>

              <div
                style={{
                  display:'flex',
                  gap:2,
                  flexWrap:'wrap',
                  justifyContent:'center',
                  marginTop:2
                }}
              >
                {tsDia.slice(0,3).map(t => (
                  <span
                    key={t.id}
                    style={{
                      width:7,
                      height:7,
                      borderRadius:'50%',
                      background: esSel ? '#fff' : '#b05080'
                    }}
                  />
                ))}
              </div>

            </button>

          )

        })}

      </div>

      <div
        style={{
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          marginBottom:12
        }}
      >

        <h3
          style={{
            margin:0,
            fontSize:16,
            fontWeight:700
          }}
        >
          {fechaSeleccionada === hoy
            ? 'Hoy'
            : fechaSeleccionada === manana
            ? 'Mañana'
            : parseDate(fechaSeleccionada).toLocaleDateString('es-AR',{
                weekday:'long',
                day:'numeric',
                month:'long'
              })}

          <span
            style={{
              fontWeight:400,
              fontSize:13,
              color:'#999',
              marginLeft:8
            }}
          >
            ({turnosDelDia.length} turno{turnosDelDia.length!==1?'s':''})
          </span>

        </h3>

        <button
          onClick={() => {
            setForm({...form, fecha: fechaSeleccionada});
            setVista('nuevo');
          }}
          style={{
            background:'#b05080',
            color:'#fff',
            border:'none',
            borderRadius:20,
            padding:'7px 16px',
            fontWeight:700,
            cursor:'pointer',
            fontSize:13
          }}
        >
          + Turno
        </button>

      </div>

      {turnosDelDia.length === 0

        ? (

          <div
            style={{
              textAlign:'center',
              padding:'40px 0',
              color:'#bba'
            }}
          >
            No hay turnos este día.
          </div>

        )

        : (

          <div
            style={{
              display:'flex',
              flexDirection:'column',
              gap:10
            }}
          >

            {turnosDelDia
              .sort((a,b)=>a.hora.localeCompare(b.hora))
              .map(t => (

              <div
                key={t.id}
                onClick={() => setTurnoSeleccionado(t)}
                style={{
                  background:'#fff',
                  borderRadius:14,
                  padding:'14px 18px',
                  cursor:'pointer',
                  border:'2px solid ' + (t.fecha===manana && !t.recordatorio_enviado && t.estado!=='cancelado'
                    ? '#25d366'
                    : '#f0d9e8'),
                  display:'flex',
                  alignItems:'center',
                  gap:14
                }}
              >

                <div
                  style={{
                    background:'#fce8f3',
                    borderRadius:10,
                    padding:'8px 14px',
                    textAlign:'center',
                    minWidth:54
                  }}
                >
                  <div
                    style={{
                      fontSize:16,
                      fontWeight:800,
                      color:'#b05080'
                    }}
                  >
                    {t.hora}
                  </div>
                </div>

                <div style={{ flex:1 }}>

                  <div
                    style={{
                      fontWeight:700,
                      fontSize:15
                    }}
                  >
                    {t.cliente}

                    {t.origen === 'publico' && (
                      <span
                        style={{
                          fontSize:11,
                          background:'#e3f2fd',
                          color:'#1565c0',
                          padding:'2px 8px',
                          borderRadius:10,
                          marginLeft:6
                        }}
                      >
                        Reservado online
                      </span>
                    )}

                  </div>

                  <div
                    style={{
                      fontSize:13,
                      color:'#888'
                    }}
                  >

                    {profesionalInfo(t.profesional_id) && (

                      <>
                        💅 {profesionalInfo(t.profesional_id).nombre}
                        <br />
                      </>

                    )}

                    {servicioInfo(t.servicio)?.nombre}
                    {" · "}
                    ${Number(servicioInfo(t.servicio)?.precio).toLocaleString('es-AR')}

                  </div>

                </div>

                <span
                  style={{
                    background:estadoColor[t.estado],
                    padding:'4px 12px',
                    borderRadius:20,
                    fontSize:12,
                    fontWeight:700,
                    color:'#555'
                  }}
                >
                  {estadoLabel[t.estado]}
                </span>

              </div>

            ))}

          </div>

        )}

    </div>

  )

}