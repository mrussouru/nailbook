import {
    calcularResumen,
    calcularTotales
  } from "../motores/liquidaciones";

export default function Liquidaciones({

    turnos,
  
    servicios,
  
    profesionales,
  
    fecha
  
  }) {
  
    const resumen = calcularResumen(

        turnos,
      
        servicios,
      
        profesionales,
      
        fecha
      
      );

      const {

        facturacion: totalFacturacion,
      
        profesionales: totalProfesionales,
      
        salon: totalSalon
      
      } = calcularTotales(resumen);
      
    return (
  
      <div>
  
        <h2
          style={{
            margin: "0 0 20px",
            fontWeight: 800,
            color: "#b05080"
          }}
        >
          💰 Liquidaciones
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
    📅 {fecha}
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 12
    }}
  >
    <span>💵 Facturación</span>

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
    <span>🏠 Salón</span>

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
    <span>👩 Profesionales</span>

    <strong>
      ${totalProfesionales.toLocaleString("es-UY")}
    </strong>

  </div>

</div>
          <h3 style={{ marginTop: 0 }}>
            Resumen diario
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