import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Dashboard({
  turnos,
  servicios,
  profesionales
}) {

  const [periodo, setPeriodo] = useState("mes");

  const [ocupacion, setOcupacion] = useState(null);
  const [cargandoOcupacion, setCargandoOcupacion] = useState(true);
  const [ocupacionProfesionales, setOcupacionProfesionales] = useState([]);

  const hoy = new Date();

  // =====================================================
  // FECHAS
  // =====================================================

  function fechaLocal(fecha) {
    return new Date(`${fecha}T12:00:00`);
  }


  function formatoFecha(fecha) {

    const year = fecha.getFullYear();

    const month = String(
      fecha.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      fecha.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }


  function obtenerRangoPeriodo() {

    const inicioHoy = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );


    // HOY

    if (periodo === "hoy") {

      return {
        desde: formatoFecha(inicioHoy),
        hasta: formatoFecha(inicioHoy)
      };

    }


    // ESTA SEMANA

    if (periodo === "semana") {

      const inicioSemana = new Date(inicioHoy);
    
      const dia = inicioSemana.getDay();
    
      const diferencia =
        dia === 0
          ? -6
          : 1 - dia;
    
      inicioSemana.setDate(
        inicioSemana.getDate() + diferencia
      );
    
      const finSemana = new Date(inicioSemana);
    
      finSemana.setDate(
        finSemana.getDate() + 6
      );
    
      return {
        desde: formatoFecha(inicioSemana),
        hasta: formatoFecha(finSemana)
      };
    
    }


    // MES ANTERIOR

    if (periodo === "anterior") {

      const inicio = new Date(
        hoy.getFullYear(),
        hoy.getMonth() - 1,
        1
      );

      const fin = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        0
      );

      return {
        desde: formatoFecha(inicio),
        hasta: formatoFecha(fin)
      };

    }


    // ESTE MES

    const inicioMes = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      1
    );

    const finMes = new Date(
      hoy.getFullYear(),
      hoy.getMonth() + 1,
      0
    );

    return {
      desde: formatoFecha(inicioMes),
      hasta: formatoFecha(finMes)
    };

  }


  // =====================================================
  // OCUPACIÓN
  // =====================================================

  useEffect(() => {

    cargarOcupacion();

  }, [periodo, profesionales]);


  async function cargarOcupacion() {

    setCargandoOcupacion(true);

    const { desde, hasta } =
      obtenerRangoPeriodo();

    let minutosDisponibles = 0;
    let minutosOcupados = 0;

    const detalleProfesionales = [];


    for (const profesional of profesionales) {

      if (profesional.activa === false) {
        continue;
      }


      const { data, error } = await supabase.rpc(
        "ocupacion_periodo",
        {
          profesional_id_input: profesional.id,
          fecha_desde_input: desde,
          fecha_hasta_input: hasta
        }
      );


      if (error) {

        console.error(
          "Error cargando ocupación:",
          error
        );

        continue;

      }


      const resultado = data?.[0];

      if (!resultado) {
        continue;
      }


      const disponiblesProfesional = Number(
        resultado.minutos_disponibles || 0
      );

      const ocupadosProfesional = Number(
        resultado.minutos_ocupados || 0
      );


      minutosDisponibles +=
        disponiblesProfesional;

      minutosOcupados +=
        ocupadosProfesional;


      const porcentajeProfesional =
        disponiblesProfesional > 0
          ? (
              ocupadosProfesional /
              disponiblesProfesional
            ) * 100
          : 0;


      detalleProfesionales.push({
        id: profesional.id,
        nombre:
          profesional.nombre ||
          "Profesional",
        minutosDisponibles:
          disponiblesProfesional,
        minutosOcupados:
          ocupadosProfesional,
        porcentaje:
          porcentajeProfesional
      });

    }


    const porcentaje =
      minutosDisponibles > 0
        ? (
            minutosOcupados /
            minutosDisponibles
          ) * 100
        : 0;


    setOcupacion({
      minutosDisponibles,
      minutosOcupados,
      porcentaje
    });


    setOcupacionProfesionales(
      detalleProfesionales
    );


    setCargandoOcupacion(false);

  }


  // =====================================================
  // TURNOS DEL PERÍODO
  // =====================================================

  const turnosPeriodo = useMemo(() => {

    const inicioHoy = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );


    return turnos.filter(turno => {

      const fechaTurno =
        fechaLocal(turno.fecha);


      // HOY

      if (periodo === "hoy") {

        return (
          fechaTurno.getFullYear() ===
            hoy.getFullYear() &&

          fechaTurno.getMonth() ===
            hoy.getMonth() &&

          fechaTurno.getDate() ===
            hoy.getDate()
        );

      }


      // ESTA SEMANA

      if (periodo === "semana") {

        const inicioSemana =
          new Date(inicioHoy);

        const dia =
          inicioSemana.getDay();

        const diferencia =
          dia === 0
            ? -6
            : 1 - dia;

        inicioSemana.setDate(
          inicioSemana.getDate() +
          diferencia
        );


        return (
          fechaTurno >= inicioSemana &&
          fechaTurno <= hoy
        );

      }


      // ESTE MES

      if (periodo === "mes") {

        return (
          fechaTurno.getFullYear() ===
            hoy.getFullYear() &&

          fechaTurno.getMonth() ===
            hoy.getMonth()
        );

      }


      // MES ANTERIOR

      if (periodo === "anterior") {

        const mesAnterior =
          new Date(
            hoy.getFullYear(),
            hoy.getMonth() - 1,
            1
          );


        return (
          fechaTurno.getFullYear() ===
            mesAnterior.getFullYear() &&

          fechaTurno.getMonth() ===
            mesAnterior.getMonth()
        );

      }


      return true;

    });

  }, [turnos, periodo]);


  // =====================================================
  // MÉTRICAS
  // =====================================================

  const completados =
    turnosPeriodo.filter(
      turno =>
        turno.estado === "completado"
    );


  const facturacion =
    completados.reduce(
      (total, turno) =>
        total +
        Number(turno.precio || 0),
      0
    );


  const cantidadAtenciones =
    completados.length;


  const ticketPromedio =
    cantidadAtenciones > 0
      ? facturacion /
        cantidadAtenciones
      : 0;


  const turnosAgendados =
    turnosPeriodo.filter(
      turno =>
        turno.estado === "pendiente" ||
        turno.estado === "confirmado"
    ).length;


  const espontaneas =
    completados.filter(
      turno =>
        turno.origen === "espontaneo"
    );


  const facturacionEspontaneas =
    espontaneas.reduce(
      (total, turno) =>
        total +
        Number(turno.precio || 0),
      0
    );

  // =====================================================
// AUSENCIAS / NO-SHOW
// =====================================================

const ausentes =
turnosPeriodo.filter(
  turno =>
    turno.estado === "ausente"
);


const cantidadAusentes =
ausentes.length;


const valorPerdidoAusencias =
ausentes.reduce(
  (total, turno) =>
    total +
    Number(turno.precio || 0),
  0
);


const turnosConResultado =
turnosPeriodo.filter(
  turno =>
    turno.estado === "completado" ||
    turno.estado === "ausente"
);


const tasaNoShow =
turnosConResultado.length > 0
  ? (
      cantidadAusentes /
      turnosConResultado.length
    ) * 100
  : 0;


  // =====================================================
// AUSENCIAS POR PROFESIONAL
// =====================================================

const ausenciasProfesionales = useMemo(() => {

  const mapa = {};

  profesionales.forEach(profesional => {

    if (profesional.activa === false) {
      return;
    }

    mapa[profesional.id] = {
      id: profesional.id,
      nombre:
        profesional.nombre ||
        "Profesional",
      porcentaje:
        Number(
          profesional.porcentaje || 0
        ),
      ausencias: 0,
      completados: 0,
      valorPerdido: 0,
      ingresoSalonPerdido: 0
    };

  });


  turnosPeriodo.forEach(turno => {

    if (!turno.profesional_id) {
      return;
    }

    const item =
      mapa[turno.profesional_id];

    if (!item) {
      return;
    }


    if (turno.estado === "completado") {

      item.completados += 1;

    }


    if (turno.estado === "ausente") {

      const precio =
        Number(turno.precio || 0);

      const porcentajeSalon =
        100 - item.porcentaje;


      item.ausencias += 1;

      item.valorPerdido +=
        precio;

      item.ingresoSalonPerdido +=
        precio *
        (porcentajeSalon / 100);

    }

  });


  return Object.values(mapa)

    .map(item => {

      const turnosConResultado =
        item.completados +
        item.ausencias;

      const tasa =
        turnosConResultado > 0
          ? (
              item.ausencias /
              turnosConResultado
            ) * 100
          : 0;


      return {
        ...item,
        tasa
      };

    })

    .filter(
      item =>
        item.ausencias > 0
    )

    .sort(
      (a, b) =>
        b.valorPerdido -
        a.valorPerdido
    );

}, [
  turnosPeriodo,
  profesionales
]);
    // =====================================================
// FINANZAS
// =====================================================

const finanzas = useMemo(() => {

  let pagoProfesionales = 0;
  let ingresoSalon = 0;

  completados.forEach(turno => {

    const precio = Number(
      turno.precio || 0
    );

    const profesional =
      profesionales.find(
        p => p.id === turno.profesional_id
      );

    const porcentajeProfesional =
      Number(
        profesional?.porcentaje || 0
      );

    const pagoProfesional =
      precio *
      (porcentajeProfesional / 100);

    const parteSalon =
      precio - pagoProfesional;

    pagoProfesionales +=
      pagoProfesional;

    ingresoSalon +=
      parteSalon;

  });


  return {
    facturacionBruta: facturacion,
    pagoProfesionales,
    ingresoSalon
  };

}

,

[
  completados,
  profesionales,
  facturacion
]);


// =====================================================
// FINANZAS POR PROFESIONAL
// =====================================================

const finanzasProfesionales = useMemo(() => {

  const mapa = {};

  completados.forEach(turno => {

    if (!turno.profesional_id) {
      return;
    }

    const profesional =
      profesionales.find(
        p => p.id === turno.profesional_id
      );

    if (!profesional) {
      return;
    }

    const precio = Number(
      turno.precio || 0
    );

    const porcentaje =
      Number(
        profesional.porcentaje || 0
      );

    const comision =
      precio * (porcentaje / 100);

    const ingresoSalon =
      precio - comision;


    if (!mapa[profesional.id]) {

      mapa[profesional.id] = {
        id: profesional.id,
        nombre:
          profesional.nombre ||
          "Profesional",
        porcentaje,
        atenciones: 0,
        facturacion: 0,
        comision: 0,
        ingresoSalon: 0
      };

    }


    mapa[profesional.id].atenciones += 1;

    mapa[profesional.id].facturacion +=
      precio;

    mapa[profesional.id].comision +=
      comision;

    mapa[profesional.id].ingresoSalon +=
      ingresoSalon;

  });


  return Object.values(mapa)
    .sort(
      (a, b) =>
        b.facturacion -
        a.facturacion
    );

}, [completados, profesionales]);

  // =====================================================
  // RANKING SERVICIOS
  // =====================================================

  const rankingServicios =
    useMemo(() => {

      const mapa = {};


      completados.forEach(turno => {

        if (!mapa[turno.servicio]) {

          mapa[turno.servicio] = {
            cantidad: 0,
            facturacion: 0
          };

        }


        mapa[turno.servicio].cantidad += 1;

        mapa[turno.servicio].facturacion +=
          Number(turno.precio || 0);

      });


      return Object.entries(mapa)

        .map(([id, datos]) => {

          const servicio =
            servicios.find(
              s => s.id === id
            );


          return {
            id,
            nombre:
              servicio?.nombre ||
              "Servicio",
            ...datos
          };

        })

        .sort(
          (a, b) =>
            b.cantidad -
            a.cantidad
        );

    }, [completados, servicios]);


  // =====================================================
  // RENDIMIENTO PROFESIONALES
  // =====================================================

  const rendimientoProfesionales =
    useMemo(() => {

      const mapa = {};


      completados.forEach(turno => {

        if (!turno.profesional_id) {
          return;
        }


        if (
          !mapa[turno.profesional_id]
        ) {

          mapa[turno.profesional_id] = {
            cantidad: 0,
            facturacion: 0
          };

        }


        mapa[
          turno.profesional_id
        ].cantidad += 1;


        mapa[
          turno.profesional_id
        ].facturacion +=
          Number(turno.precio || 0);

      });


      return Object.entries(mapa)

        .map(([id, datos]) => {

          const profesional =
            profesionales.find(
              p => p.id === id
            );


          return {
            id,
            nombre:
              profesional?.nombre ||
              "Profesional",
            ...datos
          };

        })

        .sort(
          (a, b) =>
            b.facturacion -
            a.facturacion
        );

    }, [completados, profesionales]);


  // =====================================================
  // FORMATO DINERO
  // =====================================================

  function dinero(valor) {

    return new Intl.NumberFormat(
      "es-UY",
      {
        style: "currency",
        currency: "UYU",
        maximumFractionDigits: 0
      }
    ).format(valor);

  }


  // =====================================================
  // UI
  // =====================================================

  return (

    <div>

      <h2
        style={{
          margin: "0 0 20px",
          color: "#b05080",
          fontWeight: 800
        }}
      >
        📊 Dashboard
      </h2>


      {/* FILTROS */}

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 22
        }}
      >

        {[
          ["hoy", "Hoy"],
          ["semana", "Esta semana"],
          ["mes", "Este mes"],
          ["anterior", "Mes anterior"]
        ].map(([valor, texto]) => (

          <button
            key={valor}

            onClick={() =>
              setPeriodo(valor)
            }

            style={{
              border: "none",
              borderRadius: 10,
              padding: "9px 14px",
              cursor: "pointer",
              fontWeight: 700,

              background:
                periodo === valor
                  ? "#b05080"
                  : "#fce8f3",

              color:
                periodo === valor
                  ? "#fff"
                  : "#b05080"
            }}
          >
            {texto}
          </button>

        ))}

      </div>


      {/* TARJETAS */}

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(160px, 1fr))",

          gap: 14,
          marginBottom: 28
        }}
      >

        <Tarjeta
          titulo="Facturación"
          valor={dinero(facturacion)}
          icono="💰"
        />


        <Tarjeta
          titulo="Atenciones"
          valor={cantidadAtenciones}
          icono="💅"
        />


        <Tarjeta
          titulo="Ticket promedio"
          valor={dinero(ticketPromedio)}
          icono="🎟️"
        />


        <Tarjeta
          titulo="Agendados"
          valor={turnosAgendados}
          icono="📅"
        />


        <Tarjeta
          titulo="Espontáneas"
          valor={espontaneas.length}
          subtitulo={
            dinero(
              facturacionEspontaneas
            )
          }
          icono="🚶"
        />


        <Tarjeta
          titulo="Horas disponibles"
          valor={
            cargandoOcupacion
              ? "..."
              : `${(
                  (ocupacion?.minutosDisponibles || 0) /
                  60
                ).toFixed(1)} h`
          }
          icono="⏱️"
        />


        <Tarjeta
          titulo="Horas ocupadas"
          valor={
            cargandoOcupacion
              ? "..."
              : `${(
                  (ocupacion?.minutosOcupados || 0) /
                  60
                ).toFixed(1)} h`
          }
          icono="💅"
        />


        <Tarjeta
          titulo="Ocupación"
          valor={
            cargandoOcupacion
              ? "..."
              : `${(
                  ocupacion?.porcentaje || 0
                ).toFixed(1)}%`
          }
          icono="📊"
        />

<Tarjeta
  titulo="Pago a profesionales"
  valor={dinero(
    finanzas.pagoProfesionales
  )}
  icono="👩"
/>

<Tarjeta
  titulo="Ingreso del salón"
  valor={dinero(
    finanzas.ingresoSalon
  )}
  icono="🏠"
/>

<Tarjeta
  titulo="Ausencias"
  valor={cantidadAusentes}
  icono="🚫"
/>

<Tarjeta
  titulo="Tasa de no-show"
  valor={`${tasaNoShow.toFixed(1)}%`}
  icono="📉"
/>

<Tarjeta
  titulo="Valor perdido"
  valor={dinero(
    valorPerdidoAusencias
  )}
  icono="💸"
/>

      </div>


{/* AUSENCIAS POR PROFESIONAL */}

<Seccion titulo="📉 Ausencias por profesional">

  {ausenciasProfesionales.length === 0 ? (

    <div
      style={{
        color: "#999",
        fontSize: 14,
        padding: "8px 0"
      }}
    >
      No hay ausencias en este período.
    </div>

  ) : (

    ausenciasProfesionales.map(item => (

      <div
        key={item.id}
        style={{
          padding: "14px 0",
          borderBottom:
            "1px solid #f4e5ee"
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 16,
            marginBottom: 12
          }}
        >

          <strong
            style={{
              fontSize: 15
            }}
          >
            👩 {item.nombre}
          </strong>


          <strong
            style={{
              color: "#b05080"
            }}
          >
            {item.tasa.toFixed(1)}% no-show
          </strong>

        </div>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12
          }}
        >

          <DatoFinanciero
            titulo="Ausencias"
            valor={item.ausencias}
          />


          <DatoFinanciero
            titulo="Valor bruto perdido"
            valor={dinero(
              item.valorPerdido
            )}
          />


          <DatoFinanciero
            titulo="Ingreso salón perdido"
            valor={dinero(
              item.ingresoSalonPerdido
            )}
            destacado
          />

        </div>

      </div>

    ))

  )}

</Seccion>
      {/* FINANZAS POR PROFESIONAL */}

<Seccion titulo="💰 Finanzas por profesional">

{finanzasProfesionales.length === 0 ? (

  <div
    style={{
      color: "#999",
      fontSize: 14,
      padding: "8px 0"
    }}
  >
    No hay atenciones completadas en este período.
  </div>

) : (

  finanzasProfesionales.map(item => (

    <div
      key={item.id}
      style={{
        padding: "14px 0",
        borderBottom:
          "1px solid #f4e5ee"
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 12
        }}
      >

        <strong
          style={{
            fontSize: 15
          }}
        >
          👩 {item.nombre}
        </strong>

        <span
          style={{
            color: "#777",
            fontSize: 13
          }}
        >
          {item.atenciones}{" "}
          {item.atenciones === 1
            ? "atención"
            : "atenciones"}
        </span>

      </div>


      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12
        }}
      >

        <DatoFinanciero
          titulo="Facturado"
          valor={dinero(
            item.facturacion
          )}
        />

        <DatoFinanciero
          titulo={`Comisión ${item.porcentaje}%`}
          valor={dinero(
            item.comision
          )}
        />

        <DatoFinanciero
          titulo="Para el salón"
          valor={dinero(
            item.ingresoSalon
          )}
          destacado
        />

      </div>

    </div>

  ))

)}

</Seccion>


      {/* OCUPACIÓN POR PROFESIONAL */}

      <Seccion titulo="📊 Ocupación por profesional">

        {cargandoOcupacion ? (

          <div
            style={{
              color: "#999",
              fontSize: 14
            }}
          >
            Calculando ocupación...
          </div>

        ) : ocupacionProfesionales.length === 0 ? (

          <div
            style={{
              color: "#999",
              fontSize: 14
            }}
          >
            No hay profesionales activas.
          </div>

        ) : (

          ocupacionProfesionales.map(item => {

            const horasDisponibles =
              item.minutosDisponibles / 60;

            const horasOcupadas =
              item.minutosOcupados / 60;

            const horasLibres =
              Math.max(
                horasDisponibles -
                  horasOcupadas,
                0
              );


            let indicador = "🔴";

            if (item.porcentaje >= 60) {
              indicador = "🟢";
            } else if (
              item.porcentaje >= 40
            ) {
              indicador = "🟡";
            }


            return (

              <div
                key={item.id}
                style={{
                  padding: "14px 0",
                  borderBottom:
                    "1px solid #f4e5ee"
                }}
              >

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 16,
                    marginBottom: 8
                  }}
                >

                  <strong>
                    {indicador} {item.nombre}
                  </strong>


                  <strong
                    style={{
                      color: "#b05080"
                    }}
                  >
                    {item.porcentaje.toFixed(1)}%
                  </strong>

                </div>


                <div
                  style={{
                    fontSize: 13,
                    color: "#777"
                  }}
                >
                  {horasOcupadas.toFixed(1)} h ocupadas
                  {" · "}
                  {horasDisponibles.toFixed(1)} h disponibles
                  {" · "}
                  {horasLibres.toFixed(1)} h libres
                </div>

              </div>

            );

          })

        )}

      </Seccion>


      {/* SERVICIOS */}

      <Seccion
        titulo="🏆 Servicios más realizados"
      >

        {rankingServicios.length === 0 ? (

          <Vacio />

        ) : (

          rankingServicios.map(
            (item, index) => (

              <Fila
                key={item.id}

                izquierda={
                  `${index + 1}. ${item.nombre}`
                }

                derecha={
                  `${item.cantidad} · ${dinero(
                    item.facturacion
                  )}`
                }
              />

            )
          )

        )}

      </Seccion>


      {/* PROFESIONALES */}

      <Seccion
        titulo="👩‍💼 Rendimiento por profesional"
      >

        {rendimientoProfesionales.length === 0 ? (

          <Vacio />

        ) : (

          rendimientoProfesionales.map(
            item => (

              <Fila
                key={item.id}

                izquierda={
                  item.nombre
                }

                derecha={
                  `${item.cantidad} atenciones · ${dinero(
                    item.facturacion
                  )}`
                }
              />

            )
          )

        )}

      </Seccion>

    </div>

  );
}


// =====================================================
// COMPONENTES
// =====================================================

function Tarjeta({
  titulo,
  valor,
  icono,
  subtitulo
}) {

  return (

    <div
      style={{
        background: "#fff",
        border: "2px solid #f0d9e8",
        borderRadius: 16,
        padding: 18
      }}
    >

      <div
        style={{
          fontSize: 22,
          marginBottom: 8
        }}
      >
        {icono}
      </div>


      <div
        style={{
          fontSize: 12,
          color: "#888",
          fontWeight: 700,
          marginBottom: 4
        }}
      >
        {titulo}
      </div>


      <div
        style={{
          fontSize: 22,
          color: "#b05080",
          fontWeight: 800
        }}
      >
        {valor}
      </div>


      {subtitulo && (

        <div
          style={{
            fontSize: 12,
            color: "#777",
            marginTop: 4
          }}
        >
          {subtitulo}
        </div>

      )}

    </div>

  );

}


function Seccion({
  titulo,
  children
}) {

  return (

    <div
      style={{
        background: "#fff",
        border: "2px solid #f0d9e8",
        borderRadius: 16,
        padding: 20,
        marginBottom: 18
      }}
    >

      <h3
        style={{
          margin: "0 0 14px",
          color: "#b05080",
          fontSize: 16
        }}
      >
        {titulo}
      </h3>


      {children}

    </div>

  );

}


function Fila({
  izquierda,
  derecha
}) {

  return (

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 0",
        borderBottom:
          "1px solid #f4e5ee",
        fontSize: 14
      }}
    >

      <strong>
        {izquierda}
      </strong>


      <span
        style={{
          color: "#777",
          textAlign: "right"
        }}
      >
        {derecha}
      </span>

    </div>

  );

}

function DatoFinanciero({
  titulo,
  valor,
  destacado = false
}) {

  return (

    <div>

      <div
        style={{
          fontSize: 12,
          color: "#888",
          marginBottom: 4
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          fontSize: 17,
          fontWeight: 800,
          color:
            destacado
              ? "#b05080"
              : "#444"
        }}
      >
        {valor}
      </div>

    </div>

  );

}

function Vacio() {

  return (

    <div
      style={{
        color: "#999",
        fontSize: 14,
        padding: "8px 0"
      }}
    >
      No hay atenciones completadas en este período.
    </div>

  );

}