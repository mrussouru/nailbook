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
  const [esMovil, setEsMovil] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 700 : false
  );

  // Detectar cambio de tamaño
  useEffect(() => {
    const detectarTamano = () => {
      setEsMovil(window.innerWidth <= 700);
    };

    detectarTamano();

    window.addEventListener("resize", detectarTamano);

    return () => {
      window.removeEventListener("resize", detectarTamano);
    };
  }, []);

  // Cargar horarios y licencias
  useEffect(() => {
    async function cargar() {
      const estadoHorarios = {};
      const estadoLicencias = {};

      for (const profesional of profesionales) {
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
          hasta: dia === 6 ? "14:00" : "19:00",

          ...(actual[profesionalId]?.[dia] || {}),

          [campo]: valor
        }
      }
    }));
  }

  async function guardar(profesionalId) {
    try {
      const horariosBD =
        await cargarHorariosProfesional(profesionalId);

      const mapa = {};

      horariosBD.forEach(h => {
        mapa[h.dia_semana] = {
          activo: h.activo,
          desde: h.hora_inicio,
          hasta: h.hora_fin
        };
      });

      Object.entries(
        horarios[profesionalId] || {}
      ).forEach(([dia, horario]) => {
        mapa[dia] = horario;
      });

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

      const licenciasActualizadas =
        await cargarLicencias(profesionalId);

      setLicenciasGuardadas(actual => ({
        ...actual,
        [profesionalId]: licenciasActualizadas
      }));

      setLicencias(actual => ({
        ...actual,
        [profesionalId]: {
          desde: "",
          hasta: "",
          motivo: ""
        }
      }));

      alert("✅ Licencia guardada");
    } catch (error) {
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

  const estiloInputHora = {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: esMovil ? "9px 8px" : "7px 10px",
    border: "1px solid #ddd",
    borderRadius: 9,
    background: "#fff",
    fontSize: esMovil ? 16 : 14
  };

  const estiloInputFecha = {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: 9,
    background: "#fff",
    fontSize: esMovil ? 16 : 14
  };

  return (
    <div>
      <h2
        style={{
          margin: "0 0 20px",
          color: "#b05080",
          fontWeight: 800,
          fontSize: esMovil ? 25 : 28
        }}
      >
        🗓 Disponibilidad
      </h2>

      <div
        style={{
          background: "#fff",
          border: "2px solid #f0d9e8",
          borderRadius: 18,
          padding: esMovil ? 10 : 28,
          boxSizing: "border-box",
          width: "100%"
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
                padding: esMovil ? 14 : 20,
                background: "#fff",
                boxSizing: "border-box",
                width: "100%",
                minWidth: 0
              }}
            >
              <h3
                style={{
                  margin: "0 0 8px",
                  color: profesional.color || "#b05080",
                  fontSize: esMovil ? 21 : 20
                }}
              >
                👩 {profesional.nombre}
              </h3>

              {/* HORARIOS */}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: esMovil ? 8 : 10,
                  marginTop: 15
                }}
              >
                {dias.map((dia, index) => {
                  const numeroDia = index + 1;

                  const horario =
                    horarios[profesional.id]?.[numeroDia];

                  const activo =
                    horario?.activo ?? true;

                  const desde =
                    horario?.desde ?? "09:00";

                  const hasta =
                    horario?.hasta ??
                    (index === 5 ? "14:00" : "19:00");

                  return (
                    <div
                      key={dia}
                      style={{
                        display: esMovil ? "block" : "grid",

                        gridTemplateColumns: esMovil
                          ? undefined
                          : "120px 60px minmax(110px, 1fr) minmax(110px, 1fr)",

                        gap: 10,
                        alignItems: "center",

                        padding: esMovil
                          ? "12px"
                          : "2px 0",

                        border: esMovil
                          ? "1px solid #f0d9e8"
                          : "none",

                        borderRadius: esMovil ? 12 : 0,

                        background: esMovil
                          ? "#fffafd"
                          : "transparent"
                      }}
                    >
                      {/* Día + activo */}

                      <div
                        style={{
                          display: esMovil
                            ? "flex"
                            : "contents",

                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: esMovil ? 10 : 0
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#33252d"
                          }}
                        >
                          {dia}
                        </div>

                        <input
                          type="checkbox"
                          checked={activo}
                          onChange={e =>
                            cambiarHorario(
                              profesional.id,
                              numeroDia,
                              "activo",
                              e.target.checked
                            )
                          }
                          style={{
                            width: 20,
                            height: 20,
                            cursor: "pointer"
                          }}
                        />
                      </div>

                      {/* Horas */}

                      <div
                        style={
                          esMovil
                            ? {
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(0, 1fr) 20px minmax(0, 1fr)",
                                gap: 8,
                                alignItems: "end"
                              }
                            : {
                                display: "contents"
                              }
                        }
                      >
                        <div>
                          {esMovil && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#888",
                                marginBottom: 4,
                                fontWeight: 700
                              }}
                            >
                              Desde
                            </div>
                          )}

                          <input
                            type="time"
                            value={desde}
                            disabled={!activo}
                            onChange={e =>
                              cambiarHorario(
                                profesional.id,
                                numeroDia,
                                "desde",
                                e.target.value
                              )
                            }
                            style={{
                              ...estiloInputHora,
                              opacity: activo ? 1 : 0.5
                            }}
                          />
                        </div>

                        {esMovil && (
                          <div
                            style={{
                              textAlign: "center",
                              paddingBottom: 10,
                              color: "#aaa"
                            }}
                          >
                            →
                          </div>
                        )}

                        <div>
                          {esMovil && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#888",
                                marginBottom: 4,
                                fontWeight: 700
                              }}
                            >
                              Hasta
                            </div>
                          )}

                          <input
                            type="time"
                            value={hasta}
                            disabled={!activo}
                            onChange={e =>
                              cambiarHorario(
                                profesional.id,
                                numeroDia,
                                "hasta",
                                e.target.value
                              )
                            }
                            style={{
                              ...estiloInputHora,
                              opacity: activo ? 1 : 0.5
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => guardar(profesional.id)}
                style={{
                  marginTop: 18,
                  width: esMovil ? "100%" : "auto",
                  padding: "11px 18px",
                  border: "none",
                  borderRadius: 10,
                  background: "#b05080",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14
                }}
              >
                💾 Guardar horario
              </button>

              {/* LICENCIAS */}

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
                  color: "#b05080",
                  fontSize: 18
                }}
              >
                🌴 Licencias
              </h4>

              {(licenciasGuardadas[profesional.id] || [])
                .length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 18
                  }}
                >
                  {(licenciasGuardadas[profesional.id] || [])
                    .map(licencia => (
                      <div
                        key={licencia.id}
                        style={{
                          padding: "10px 12px",
                          border:
                            "1px solid #f0d9e8",
                          borderRadius: 10,
                          background: "#fff8fc"
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            overflowWrap: "anywhere"
                          }}
                        >
                          📅 {licencia.fecha_desde} →{" "}
                          {licencia.fecha_hasta}
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 14,
                            color: "#666"
                          }}
                        >
                          {licencia.motivo ||
                            "Sin motivo"}
                        </div>

                        <button
                          onClick={() =>
                            quitarLicencia(
                              profesional.id,
                              licencia.id
                            )
                          }
                          style={{
                            marginTop: 8,
                            padding: "7px 11px",
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

              {(licenciasGuardadas[profesional.id] || [])
                .length === 0 && (
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

              {/* NUEVA LICENCIA */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: esMovil
                    ? "1fr"
                    : "1fr 1fr",
                  gap: 10
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#777",
                      marginBottom: 4
                    }}
                  >
                    Desde
                  </div>

                  <input
                    type="date"
                    value={
                      licencias[profesional.id]?.desde ||
                      ""
                    }
                    onChange={e =>
                      setLicencias(actual => ({
                        ...actual,
                        [profesional.id]: {
                          ...(actual[
                            profesional.id
                          ] || {}),
                          desde: e.target.value
                        }
                      }))
                    }
                    style={estiloInputFecha}
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#777",
                      marginBottom: 4
                    }}
                  >
                    Hasta
                  </div>

                  <input
                    type="date"
                    value={
                      licencias[profesional.id]?.hasta ||
                      ""
                    }
                    onChange={e =>
                      setLicencias(actual => ({
                        ...actual,
                        [profesional.id]: {
                          ...(actual[
                            profesional.id
                          ] || {}),
                          hasta: e.target.value
                        }
                      }))
                    }
                    style={estiloInputFecha}
                  />
                </div>
              </div>

              <textarea
                rows={2}
                placeholder="Motivo de la licencia..."
                value={
                  licencias[profesional.id]?.motivo || ""
                }
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
                  boxSizing: "border-box",
                  resize: "vertical",
                  fontSize: 16
                }}
              />

              <button
                onClick={() =>
                  guardarNuevaLicencia(profesional.id)
                }
                style={{
                  marginTop: 12,
                  width: esMovil ? "100%" : "auto",
                  padding: "11px 18px",
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