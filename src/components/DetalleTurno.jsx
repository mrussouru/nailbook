export default function DetalleTurno(props) {

  const {
    turnoSeleccionado,
    setTurnoSeleccionado,
    servicioInfo,
    cambiarEstado,
    eliminarTurno,
    manana,
    setMsgPreview,
    generarMensajeWA,
    estadoColor,
    estadoLabel,
    parseDate
  } = props;


  return (

    <div>

      <button
        onClick={() => setTurnoSeleccionado(null)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#b05080',
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: 16
        }}
      >
        ← Volver
      </button>


      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          padding: 28,
          border: '2px solid #f0d9e8'
        }}
      >

        {/* CABECERA */}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 20
          }}
        >

          <div>

            <h2
              style={{
                margin: '0 0 4px',
                fontSize: 22,
                fontWeight: 800
              }}
            >
              {turnoSeleccionado.cliente}
            </h2>

            <div
              style={{
                color: '#888',
                fontSize: 14
              }}
            >
              📞 {turnoSeleccionado.telefono || 'Sin teléfono'}
            </div>

          </div>


          <span
            style={{
              background:
                estadoColor[turnoSeleccionado.estado],
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              color: '#555'
            }}
          >
            {estadoLabel[turnoSeleccionado.estado]}
          </span>

        </div>


        {/* DATOS DEL TURNO */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            marginBottom: 20
          }}
        >

          {[
            [
              '📅 Fecha',
              parseDate(
                turnoSeleccionado.fecha
              ).toLocaleDateString(
                'es-AR',
                {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                }
              )
            ],

            [
              '⏰ Hora',
              turnoSeleccionado.hora
            ],

            [
              '💅 Servicio',
              servicioInfo(
                turnoSeleccionado.servicio
              )?.nombre
            ],

            [
              '💵 Precio',
              `$${Number(
                servicioInfo(
                  turnoSeleccionado.servicio
                )?.precio
              ).toLocaleString('es-AR')}`
            ]

          ].map(([l, v]) => (

            <div
              key={l}
              style={{
                background: '#fdf6f8',
                borderRadius: 10,
                padding: '10px 14px'
              }}
            >

              <div
                style={{
                  fontSize: 12,
                  color: '#b05080',
                  fontWeight: 700
                }}
              >
                {l}
              </div>

              <div
                style={{
                  fontWeight: 600,
                  fontSize: 15
                }}
              >
                {v}
              </div>

            </div>

          ))}


          {turnoSeleccionado.nota && (

            <div
              style={{
                background: '#fdf6f8',
                borderRadius: 10,
                padding: '10px 14px',
                gridColumn: '1/-1'
              }}
            >

              <div
                style={{
                  fontSize: 12,
                  color: '#b05080',
                  fontWeight: 700
                }}
              >
                📝 Nota
              </div>

              <div
                style={{
                  fontSize: 14
                }}
              >
                {turnoSeleccionado.nota}
              </div>

            </div>

          )}

        </div>


        {/* RECORDATORIO WHATSAPP */}

        {turnoSeleccionado.fecha === manana &&
          turnoSeleccionado.estado !== 'cancelado' &&
          turnoSeleccionado.estado !== 'ausente' &&
          !turnoSeleccionado.recordatorio_enviado && (

          <div
            style={{
              background: '#f0faf4',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 16,
              border: '1px solid #c8e6c9'
            }}
          >

            <div
              style={{
                fontWeight: 700,
                color: '#1a7a40',
                marginBottom: 8
              }}
            >
              📲 Este turno es mañana
            </div>


            <button
              onClick={() => {

                const s =
                  servicioInfo(
                    turnoSeleccionado.servicio
                  );

                setMsgPreview({
                  turno: turnoSeleccionado,
                  mensaje:
                    generarMensajeWA(
                      turnoSeleccionado,
                      s
                    )
                });

              }}

              style={{
                background: '#25d366',
                color: '#fff',
                border: 'none',
                borderRadius: 20,
                padding: '8px 20px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Enviar recordatorio por WhatsApp
            </button>

          </div>

        )}


        {/* ESTADOS */}

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap'
          }}
        >

          {[
            'confirmado',
            'pendiente',
            'completado',
            'cancelado',
            'ausente'
          ]
            .filter(
              e =>
                e !== turnoSeleccionado.estado
            )
            .map(e => (

              <button
                key={e}

                onClick={() =>
                  cambiarEstado(
                    turnoSeleccionado.id,
                    e
                  )
                }

                style={{
                  background:
                    estadoColor[e] || '#fff0f0',
                  border: 'none',
                  borderRadius: 20,
                  padding: '7px 16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#555'
                }}
              >
                {e === 'ausente'
                  ? 'Marcar como no se presentó'
                  : `Marcar como ${
                      estadoLabel[e]?.toLowerCase()
                    }`
                }
              </button>

            ))}


          <button
            onClick={() =>
              eliminarTurno(
                turnoSeleccionado.id
              )
            }

            style={{
              background: '#fff0f0',
              border: 'none',
              borderRadius: 20,
              padding: '7px 16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13,
              color: '#c0392b',
              marginLeft: 'auto'
            }}
          >
            🗑 Eliminar
          </button>

        </div>

      </div>

    </div>

  );

}