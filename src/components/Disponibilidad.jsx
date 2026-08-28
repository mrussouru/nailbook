import { useState, useEffect } from "react";
import {
    guardarHorarios,
    cargarHorariosProfesional,
    guardarLicencia,
    cargarLicencias,
    eliminarLicencia
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

      const [licencias, setLicencias] = useState({});

      const [licenciasGuardadas, setLicenciasGuardadas] = useState({});

      useEffect(() => {

        async function cargar() {
      
          const estadoHorarios = {};
          const estadoLicencias = {};
      
          for (const profesional of profesionales) {
      
            // Horarios
            const horariosBD =
              await cargarHorariosProfesional(profesional.id);
      
            estadoHorarios[profesional.id] = {};
      
            horariosBD.forEach(h => {
      
              estadoHorarios[profesional.id][h.dia_semana] = {
      
                activo: h.activo,
      
                desde: h.hora_inicio,
      
                hasta: h.hora_fin
      
              };
      
            });
      
            // Licencias guardadas
            const licenciasBD =
            await cargarLicencias(profesional.id);

            estadoLicencias[profesional.id] = licenciasBD;
                  
                      }
      
                      setHorarios(estadoHorarios);
                      setLicenciasGuardadas(estadoLicencias);
      
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

      async function guardarNuevaLicencia(profesionalId) {

        const licencia = licencias[profesionalId];
      
        if (!licencia?.desde || !licencia?.hasta) {
      
          alert("Debés seleccionar las fechas.");
      
          return;
      
        }
      
        try {
      
          await guardarLicencia({

            profesional_id: profesionalId,
          
            fecha_desde: licencia.desde,
          
            fecha_hasta: licencia.hasta,
          
            motivo: licencia.motivo || ""
          
          });
          
          // Volvemos a cargar las licencias del profesional
          const licenciasActualizadas =
            await cargarLicencias(profesionalId);
          
          setLicenciasGuardadas(actual => ({
            ...actual,
            [profesionalId]: licenciasActualizadas
          }));
          
          // Limpiamos el formulario
          setLicencias(actual => ({
            ...actual,
            [profesionalId]: {
              desde: "",
              hasta: "",
              motivo: ""
            }
          }));
          
          alert("✅ Licencia guardada");
      
        }
      
        catch(error){
      
          console.error(error);
      
          alert("Error al guardar la licencia");
      
        }
      
      }

      async function quitarLicencia(profesionalId, licenciaId) {

        const confirmar = window.confirm(
          "¿Seguro que querés quitar esta licencia?"
        );
      
        if (!confirmar) return;
      
        try {
      
          await eliminarLicencia(licenciaId);
      
          setLicenciasGuardadas(actual => ({
            ...actual,
            [profesionalId]:
              (actual[profesionalId] || []).filter(
                licencia => licencia.id !== licenciaId
              )
          }));
      
          alert("✅ Licencia eliminada");
      
        } catch (error) {
      
          console.error(error);
      
          alert("Error al eliminar la licencia");
      
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
<hr
  style={{
    margin: "25px 0",
    border: "none",
    borderTop: "1px solid #f0d9e8"
  }}
/>

<h4
  style={{
    margin: "0 0 15px",
    color: "#b05080"
  }}
>
  🌴 Licencias
</h4>

{(licenciasGuardadas[profesional.id] || []).length > 0 && (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginBottom: 18
    }}
  >
    {(licenciasGuardadas[profesional.id] || []).map(licencia => (
      <div
        key={licencia.id}
        style={{
          padding: "10px 12px",
          border: "1px solid #f0d9e8",
          borderRadius: 10,
          background: "#fff8fc"
        }}
      >
        <div style={{ fontWeight: 700 }}>
          📅 {licencia.fecha_desde} → {licencia.fecha_hasta}
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 14,
            color: "#666"
          }}
        >
          {licencia.motivo || "Sin motivo"}
        </div>
        <button
  onClick={() =>
    quitarLicencia(profesional.id, licencia.id)
  }
  style={{
    marginTop: 8,
    padding: "6px 10px",
    border: "none",
    borderRadius: 8,
    background: "#e74c3c",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700
  }}
>
  🗑 Quitar
</button>
      </div>
    ))}
  </div>
)}

{(licenciasGuardadas[profesional.id] || []).length === 0 && (
  <div
    style={{
      marginBottom: 15,
      fontSize: 14,
      color: "#888"
    }}
  >
    No hay licencias registradas.
  </div>
)}

<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10
  }}
>

  <input
    type="date"
    value={licencias[profesional.id]?.desde || ""}
    onChange={e =>
      setLicencias(actual => ({
        ...actual,
        [profesional.id]: {
          ...(actual[profesional.id] || {}),
          desde: e.target.value
        }
      }))
    }
  />

  <input
    type="date"
    value={licencias[profesional.id]?.hasta || ""}
    onChange={e =>
      setLicencias(actual => ({
        ...actual,
        [profesional.id]: {
          ...(actual[profesional.id] || {}),
          hasta: e.target.value
        }
      }))
    }
  />

</div>

<textarea
  rows={2}
  placeholder="Motivo de la licencia..."
  value={licencias[profesional.id]?.motivo || ""}
  onChange={e =>
    setLicencias(actual => ({
      ...actual,
      [profesional.id]: {
        ...(actual[profesional.id] || {}),
        motivo: e.target.value
      }
    }))
  }
  style={{
    width: "100%",
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
    boxSizing: "border-box"
  }}
/>

<button
  onClick={() => guardarNuevaLicencia(profesional.id)}
  style={{
    marginTop: 12,
    padding: "10px 18px",
    border: "none",
    borderRadius: 10,
    background: "#2ecc71",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700
  }}
>
  ➕ Guardar licencia
</button>
    </div>

  ))}

</div>
  
        </div>
  
      </div>
  
    );
  
  }