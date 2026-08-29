import { useMemo, useState } from "react";

export default function Dashboard({
  turnos,
  servicios,
  profesionales
}) {

  const [periodo, setPeriodo] = useState("mes");

  const hoy = new Date();

  function fechaLocal(fecha) {
    return new Date(`${fecha}T12:00:00`);
  }

  const turnosPeriodo = useMemo(() => {

    const inicioHoy = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );

    return turnos.filter(turno => {

      const fechaTurno = fechaLocal(turno.fecha);

      if (periodo === "hoy") {
        return (
          fechaTurno.getFullYear() === hoy.getFullYear() &&
          fechaTurno.getMonth() === hoy.getMonth() &&
          fechaTurno.getDate() === hoy.getDate()
        );
      }

      if (periodo === "semana") {

        const inicioSemana = new Date(inicioHoy);

        const dia = inicioSemana.getDay();

        const diferencia = dia === 0 ? -6 : 1 - dia;

        inicioSemana.setDate(
          inicioSemana.getDate() + diferencia
        );

        return (
          fechaTurno >= inicioSemana &&
          fechaTurno <= hoy
        );
      }

      if (periodo === "mes") {

        return (
          fechaTurno.getFullYear() === hoy.getFullYear() &&
          fechaTurno.getMonth() === hoy.getMonth()
        );
      }

      if (periodo === "anterior") {

        const mesAnterior = new Date(
          hoy.getFullYear(),
          hoy.getMonth() - 1,
          1
        );

        return (
          fechaTurno.getFullYear() === mesAnterior.getFullYear() &&
          fechaTurno.getMonth() === mesAnterior.getMonth()
        );
      }

      return true;

    });

  }, [turnos, periodo]);


  const completados = turnosPeriodo.filter(
    turno => turno.estado === "completado"
  );


  const facturacion = completados.reduce(
    (total, turno) =>
      total + Number(turno.precio || 0),
    0
  );


  const cantidadAtenciones = completados.length;


  const ticketPromedio =
    cantidadAtenciones > 0
      ? facturacion / cantidadAtenciones
      : 0;


  const turnosAgendados = turnosPeriodo.filter(
    turno =>
      turno.estado === "pendiente" ||
      turno.estado === "confirmado"
  ).length;


  const espontaneas = completados.filter(
    turno => turno.origen === "espontaneo"
  );


  const facturacionEspontaneas = espontaneas.reduce(
    (total, turno) =>
      total + Number(turno.precio || 0),
    0
  );


  const rankingServicios = useMemo(() => {

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

        const servicio = servicios.find(
          s => s.id === id
        );

        return {
          id,
          nombre: servicio?.nombre || "Servicio",
          ...datos
        };

      })
      .sort((a, b) => b.cantidad - a.cantidad);

  }, [completados, servicios]);


  const rendimientoProfesionales = useMemo(() => {

    const mapa = {};

    completados.forEach(turno => {

      if (!turno.profesional_id) return;

      if (!mapa[turno.profesional_id]) {
        mapa[turno.profesional_id] = {
          cantidad: 0,
          facturacion: 0
        };
      }

      mapa[turno.profesional_id].cantidad += 1;

      mapa[turno.profesional_id].facturacion +=
        Number(turno.precio || 0);

    });

    return Object.entries(mapa)
      .map(([id, datos]) => {

        const profesional = profesionales.find(
          p => p.id === id
        );

        return {
          id,
          nombre: profesional?.nombre || "Profesional",
          ...datos
        };

      })
      .sort(
        (a, b) =>
          b.facturacion - a.facturacion
      );

  }, [completados, profesionales]);


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
            onClick={() => setPeriodo(valor)}
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
          subtitulo={dinero(facturacionEspontaneas)}
          icono="🚶"
        />

      </div>


      {/* SERVICIOS */}

      <Seccion titulo="🏆 Servicios más realizados">

        {rankingServicios.length === 0 ? (

          <Vacio />

        ) : (

          rankingServicios.map((item, index) => (

            <Fila
              key={item.id}
              izquierda={
                `${index + 1}. ${item.nombre}`
              }
              derecha={
                `${item.cantidad} · ${dinero(item.facturacion)}`
              }
            />

          ))

        )}

      </Seccion>


      {/* PROFESIONALES */}

      <Seccion titulo="👩‍💼 Rendimiento por profesional">

        {rendimientoProfesionales.length === 0 ? (

          <Vacio />

        ) : (

          rendimientoProfesionales.map(item => (

            <Fila
              key={item.id}
              izquierda={item.nombre}
              derecha={
                `${item.cantidad} atenciones · ${dinero(item.facturacion)}`
              }
            />

          ))

        )}

      </Seccion>

    </div>
  );
}


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


function Seccion({ titulo, children }) {

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
        borderBottom: "1px solid #f4e5ee",
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