import { obtenerPeriodo } from "../motores/fechas/periodo";
import { generarRendiciones } from "../motores/rendiciones";
import { useState } from "react";
import {
    calcularResumen,
    calcularTotales
  } from "../motores/liquidaciones";

  export default function Liquidaciones({

    turnos,

    servicios,

    profesionales

}) {

    const [periodo, setPeriodo] = useState("hoy");

    const hoy = new Date().toISOString().slice(0, 10);
    const [fechaBase, setFechaBase] = useState(hoy);
    const [fechaDesde, setFechaDesde] = useState(hoy);
    const [fechaHasta, setFechaHasta] = useState(hoy);

    const periodoSeleccionado = obtenerPeriodo(

      periodo,
  
      fechaBase,
  
      fechaDesde,
  
      fechaHasta
  
  );
  
    const resumen = calcularResumen(

      turnos,
  
      servicios,
  
      profesionales,
  
      fechaBase,
  
      periodo,
  
      fechaDesde,
  
      fechaHasta
  
  );

      const {

        facturacion: totalFacturacion,
      
        profesionales: totalProfesionales,
      
        salon: totalSalon
      
      } = calcularTotales(resumen);

      async function generar() {

        await generarRendiciones(

          resumen,
      
          periodoSeleccionado.desde,
      
          periodoSeleccionado.hasta
      
      );
    
        alert("✅ Rendiciones generadas");
    
    }
      
    return (
      
    
      <div>
  
        <h2
          style={{
            margin: "0 0 20px",
            fontWeight: 800,
            color: "#b05080"
          }}
        >
          📈 Producción
        </h2>
  
        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: 28,
            border: "2px solid #f0d9e8"
          }}
        >
          <div
  style={{
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap"
  }}
>

  {[
    ["hoy", "📅 Hoy"],
    ["semana", "🗓 Semana"],
    ["mes", "📆 Mes"],
    ["personalizado", "📂 Personalizado"]
  ].map(([valor, texto]) => (

    <button
      key={valor}
      onClick={() => setPeriodo(valor)}
      style={{
        padding: "8px 16px",
        borderRadius: 20,
        border: "2px solid #f0d9e8",
        cursor: "pointer",
        background:
          periodo === valor
            ? "#b05080"
            : "#fff",
        color:
          periodo === valor
            ? "#fff"
            : "#b05080",
        fontWeight: 700
      }}
    >
      {texto}
    </button>

  ))}
  {periodo === "personalizado" && (

<div
  style={{
    display: "flex",
    gap: 15,
    marginTop: 20,
    alignItems: "center",
    flexWrap: "wrap"
  }}
>

  <div>
    <label>Desde</label>

    <input
      type="date"
      value={fechaDesde}
      onChange={e => setFechaDesde(e.target.value)}
    />
  </div>

  <div>
    <label>Hasta</label>

    <input
      type="date"
      value={fechaHasta}
      onChange={e => setFechaHasta(e.target.value)}
    />
  </div>

</div>

)}

</div>
            <div
  style={{
    background: "#fff7fb",
    border: "2px solid #f0d9e8",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24
  }}
>

<div
  style={{
    fontWeight: 700,
    color: "#b05080",
    marginBottom: 16
  }}
>

  {periodo === "hoy" && `📅 Hoy (${fechaBase})`}

  {periodo === "semana" && "🗓 Esta semana"}

  {periodo === "mes" && "📆 Este mes"}

  {periodo === "personalizado" && "📂 Período personalizado"}

</div>

</div>

<div
  style={{
    marginBottom: 20
  }}
>
  <button
    onClick={generar}
    style={{
      padding: "10px 18px",
      border: "none",
      borderRadius: 10,
      background: "#2ecc71",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700
    }}
  >
    💾 Generar rendiciones
  </button>
</div>

<div
  style={{
    background: "#fff7fb",
    border: "2px solid #f0d9e8",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24
  }}
>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 12
    }}
  >
    <span>💵 Producción</span>

    <strong>
      ${totalFacturacion.toLocaleString("es-UY")}
    </strong>

  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 12
    }}
  >
    <span>🏠 Corresponde al salón</span>

    <strong>
      ${totalSalon.toLocaleString("es-UY")}
    </strong>

  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between"
    }}
  >
    <span>👩 Corresponde a profesionales</span>

    <strong>
      ${totalProfesionales.toLocaleString("es-UY")}
    </strong>

  </div>

</div>
          <h3 style={{ marginTop: 0 }}>
          Producción por profesional
          </h3>
  
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16
            }}
          >
  
            {resumen.map(item => {
  
              const porcentaje = Number(item.profesional.porcentaje || 0);
  
              const montoProfesional =
                item.facturacion * (porcentaje / 100);
  
              const montoSalon =
                item.facturacion - montoProfesional;
  
              return (
  
                <div
                  key={item.profesional.id}
                  style={{
                    border: "2px solid #f0d9e8",
                    borderRadius: 16,
                    padding: 20,
                    background: "#fff"
                  }}
                >
  
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
  
                    <div>
  
                      <h3
                        style={{
                          margin: 0,
                          color: item.profesional.color || "#b05080"
                        }}
                      >
                        👩 {item.profesional.nombre}
                      </h3>
  
                      <div
                        style={{
                          marginTop: 6,
                          color: "#777",
                          fontSize: 14
                        }}
                      >
                        {item.cantidadTurnos} turno{item.cantidadTurnos !== 1 ? "s" : ""}
                      </div>
  
                    </div>
  
                    <div
                      style={{
                        textAlign: "right"
                      }}
                    >
  
                      <div
                        style={{
                          fontSize: 13,
                          color: "#999"
                        }}
                      >
                        Facturación
                      </div>
  
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 800,
                          color: "#b05080"
                        }}
                      >
                        ${item.facturacion.toLocaleString("es-UY")}
                      </div>
  
                      <div
                        style={{
                          marginTop: 12,
                          fontSize: 13,
                          color: "#666"
                        }}
                      >
                        Salón ({100 - porcentaje}%)
                      </div>
  
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#444"
                        }}
                      >
                        ${montoSalon.toLocaleString("es-UY")}
                      </div>
  
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          color: "#666"
                        }}
                      >
                        Profesional ({porcentaje}%)
                      </div>
  
                      <div
                        style={{
                          fontWeight: 700,
                          color: item.profesional.color || "#b05080"
                        }}
                      >
                        ${montoProfesional.toLocaleString("es-UY")}
                      </div>
  
                    </div>
  
                  </div>
  
                </div>
  
              );
  
            })}
  
          </div>
  
        </div>
  
      </div>
  
    );
  
  }