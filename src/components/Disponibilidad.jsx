import { useState, useEffect } from "react";
import {
    guardarHorarios,
    cargarHorariosProfesional
  } from "../motores/disponibilidad";

export default function Disponibilidad({ profesionales }) {

    const dias = [

        "Lunes",
      
        "Martes",
      
        "Miércoles",
      
        "Jueves",
      
        "Viernes",
      
        "Sábado"
      
      ];

      const [horarios, setHorarios] = useState({});

      useEffect(() => {

        async function cargar() {
      
          const estado = {};
      
          for (const profesional of profesionales) {
      
            const horariosBD =
              await cargarHorariosProfesional(profesional.id);
      
            estado[profesional.id] = {};
      
            horariosBD.forEach(h => {
      
              estado[profesional.id][h.dia_semana] = {
      
                activo: h.activo,
      
                desde: h.hora_inicio,
      
                hasta: h.hora_fin
      
              };
      
            });
      
          }
      
          setHorarios(estado);
      
        }
      
        if (profesionales.length) {
      
          cargar();
      
        }
      
      }, [profesionales]);

      function cambiarHorario(profesionalId, dia, campo, valor) {

        setHorarios(actual => ({
      
          ...actual,
      
          [profesionalId]: {
      
            ...(actual[profesionalId] || {}),
      
            [dia]: {
      
              activo: true,
      
              desde: "09:00",
      
              hasta: dia === 5 ? "14:00" : "19:00",
      
              ...(actual[profesionalId]?.[dia] || {}),
      
              [campo]: valor
      
            }
      
          }
      
        }));
      
      }

      async function guardar(profesionalId) {

        try {
      
          // 1. Traemos los horarios actuales de la BD
          const horariosBD = await cargarHorariosProfesional(profesionalId);
      
          // 2. Los pasamos a un objeto por día
          const mapa = {};
      
          horariosBD.forEach(h => {
      
            mapa[h.dia_semana] = {
      
              activo: h.activo,
      
              desde: h.hora_inicio,
      
              hasta: h.hora_fin
      
            };
      
          });
      
          // 3. Aplicamos encima solamente los cambios hechos en pantalla
          Object.entries(horarios[profesionalId] || {}).forEach(
      
            ([dia, horario]) => {
      
              mapa[dia] = horario;
      
            }
      
          );
      
          // 4. Convertimos nuevamente a arreglo para guardar
          const datos = Object.entries(mapa).map(
      
            ([dia, horario]) => ({
      
              profesional_id: profesionalId,
      
              dia_semana: Number(dia),
      
              activo: horario.activo,
      
              hora_inicio: horario.activo
                ? horario.desde
                : null,
      
              hora_fin: horario.activo
                ? horario.hasta
                : null
      
            })
      
          );
      
          // 5. Guardamos los 6 registros
          await guardarHorarios(profesionalId, datos);
      
          alert("✅ Horario guardado correctamente");
      
        } catch (error) {
      
          console.error(error);
      
          alert("Error al guardar el horario");
      
        }
      
      }

    return (
  
      <div>
  
        <h2
          style={{
            margin: "0 0 20px",
            color: "#b05080",
            fontWeight: 800
          }}
        >
          🗓 Disponibilidad
        </h2>
  
        <div
          style={{
            background: "#fff",
            border: "2px solid #f0d9e8",
            borderRadius: 18,
            padding: 28
          }}
        >
         <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 18
  }}
>

  {profesionales.map(profesional => (

    <div
      key={profesional.id}
      style={{
        border: "2px solid #f0d9e8",
        borderRadius: 18,
        padding: 20,
        background: "#fff"
      }}
    >

      <h3
        style={{
          margin: "0 0 8px",
          color: profesional.color || "#b05080"
        }}
      >
        👩 {profesional.nombre}
      </h3>

      <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 15
  }}
>

{dias.map((dia, index)=>(

<div

key={dia}

style={{

display:"grid",

gridTemplateColumns:"120px 60px 1fr 1fr",

gap:10,

alignItems:"center"

}}

>

<div>

{dia}

</div>

<input
  type="checkbox"
  checked={horarios[profesional.id]?.[index + 1]?.activo ?? true}
  onChange={e =>
    cambiarHorario(
        profesional.id,
        index + 1,
        "activo",
        e.target.checked
    )
  }
/>

<input

type="time"

value={horarios[profesional.id]?.[index + 1]?.desde ?? "09:00"}

onChange={e =>
  cambiarHorario(
    profesional.id,
    index +1,
    "desde",
    e.target.value
  )
}

/>

<input

type="time"

value={
    horarios[profesional.id]?.[index + 1]?.hasta ??
    (index === 5 ? "14:00" : "19:00")
  }
  
  onChange={e =>
    cambiarHorario(
      profesional.id,
      index +1,
      "hasta",
      e.target.value
    )
  }

/>

</div>

))}

</div>
<button
  onClick={() => guardar(profesional.id)}
  style={{
    marginTop: 20,
    padding: "10px 18px",
    border: "none",
    borderRadius: 10,
    background: "#b05080",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700
  }}
>
  💾 Guardar horario
</button>
    </div>

  ))}

</div>
  
        </div>
  
      </div>
  
    );
  
  }