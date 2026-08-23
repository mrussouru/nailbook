import { HORARIOS } from "../helpers";
import { obtenerDisponibilidadHoraria } from "../motores/MDI/disponibilidadHoraria";
import { useMemo } from "react";

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
    inputStyle,
    relacionesServicios,
    turnos,
    horarios,
  } = props;

  const disponibilidadHoraria = useMemo(() => {

    return obtenerDisponibilidadHoraria({
  
      fecha: form.fecha,
  
      servicioId: form.servicio,
  
      profesionalId: form.profesional_id,
  
      horarios,
  
      profesionales,
  
      relaciones: relacionesServicios,
  
      turnos,
  
      servicios
  
    });
  
  },
   [
    form.fecha,
    form.servicio,
    form.profesional_id,
    horarios,
    profesionales,
    relacionesServicios,
    turnos,
    servicios
  ]);

  const horarioSeleccionado = disponibilidadHoraria.find(
    h => h.hora === form.hora
  );
  
  const puedeConfirmar =
    !!form.cliente &&
    !!form.fecha &&
    !!horarioSeleccionado?.disponible;

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
              {disponibilidadHoraria.map(item => {

const sel = form.hora === item.hora;

return (

  <button
    key={item.hora}
    disabled={!item.disponible}
    onClick={() =>
      item.disponible &&
      setForm({
        ...form,
        hora: item.hora
      })
    }
    title={item.disponible ? "" : item.motivo}
    style={{
      padding: "7px 12px",
      borderRadius: 10,

      border:
        "2px solid " +
        (!item.disponible
          ? "#fcd2d2"
          : sel
          ? "#b05080"
          : "#f0d9e8"),

      background:
        !item.disponible
          ? "#fdf0f0"
          : sel
          ? "#b05080"
          : "#fff",

      color:
        !item.disponible
          ? "#c0392b"
          : sel
          ? "#fff"
          : "#2d1f27",

      fontWeight: 600,
      fontSize: 13,

      cursor: !item.disponible
        ? "not-allowed"
        : "pointer",

      textDecoration: !item.disponible
        ? "line-through"
        : "none"

    }}
  >

    {item.hora}

  </button>

);

})} 
              </div>
            </Campo>
            <Campo label="Nota (opcional)">
              <textarea value={form.nota} onChange={e => setForm({...form, nota:e.target.value})} rows={2} style={{...inputStyle, resize:'vertical'}} />
            </Campo>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setVista('calendario')} style={{ flex:1, padding:11, borderRadius:12, border:'2px solid #f0d9e8', background:'#fff', fontWeight:700, cursor:'pointer' }}>Cancelar</button>
              <button onClick={agregarTurno} disabled={!puedeConfirmar}
                style={{ flex:2, padding:11, borderRadius:12, border:'none',
                background: puedeConfirmar ? '#b05080' : '#ddd',
                  color:'#fff', fontWeight:700, cursor:'pointer' }}>
                Confirmar turno
              </button>
            </div>
          </div>
        </div>
  );

}