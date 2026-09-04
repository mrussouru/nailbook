import { useUsuario } from "../context/UsuarioContext";
import { esDueno, esProfesional } from "../motores/auth";

export default function Header({
  logo,
  esMovil,
  menuAbierto,
  setMenuAbierto,
  vista,
  setVista,
  setTurnoSeleccionado,
  salir
}) {

  const { usuario } = useUsuario();

  const opcionesDueno = [
    ["dashboard", "📊 Dashboard"],
    ["calendario", "📅 Calendario"],
   // ["recordatorios", "📲 Recordatorios"],
    ["listado", "📋 Turnos"],
    ["clientes", "👥 Clientes"],
    ["nuevo", "➕ Nuevo turno"],
    ["profesionales", "👩‍🎨 Profesionales"],
    ["servicios", "💅 Servicios"],
    ["atencion", "🚶 Atención"],
    ["liquidaciones", "💰 Producción"],
    ["disponibilidad", "🗓 Disponibilidad"],
    ["rendiciones", "📋 Rendiciones"]
  ];

  const opcionesProfesional = [
    ["calendario", "📅 Mi agenda"],
    ["listado", "📋 Mis turnos"],
    ["atencion", "🚶 Atención"],
    ["liquidaciones", "💰 Mi producción"],
    ["rendiciones", "📋 Mis rendiciones"]
  ];

  const opciones = esDueno(usuario)
    ? opcionesDueno
    : esProfesional(usuario)
      ? opcionesProfesional
      : [];

  return (
    <header
      style={{
        background: "#fff",
        borderBottom: "2px solid #f0d9e8",
        padding: esMovil ? "10px 16px" : "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: esMovil ? 70 : 72,
        position: "relative"
      }}
    >

      <img
        src={logo}
        alt="Tamy Ayelen"
        style={{
          width: esMovil ? 85 : 150,
          height: "auto"
        }}
      />

      {esMovil ? (

        <>
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            style={{
              fontSize: 28,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#b05080"
            }}
          >
            ☰
          </button>

          {menuAbierto && (

            <div
              style={{
                position: "absolute",
                top: 70,
                right: 10,
                background: "#fff",
                border: "1px solid #f0d9e8",
                borderRadius: 12,
                boxShadow: "0 8px 25px rgba(0,0,0,.12)",
                overflow: "hidden",
                zIndex: 1000,
                minWidth: 220
              }}
            >

              {opciones.map(([v, l]) => (

                <button
                  key={v}
                  onClick={() => {
                    setVista(v);
                    setTurnoSeleccionado(null);
                    setMenuAbierto(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 18px",
                    border: "none",
                    background: vista === v ? "#fdf2f8" : "#fff",
                    cursor: "pointer",
                    color: "#b05080",
                    fontWeight: 600
                  }}
                >
                  {l}
                </button>

              ))}

              <hr style={{ margin: 0 }} />

              <button
                onClick={salir}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 18px",
                  border: "none",
                  background: "#fff",
                  cursor: "pointer",
                  color: "#777"
                }}
              >
                Salir
              </button>

            </div>

          )}

        </>

      ) : (

        <nav
          style={{
            display: "flex",
            gap: 6
          }}
        >

          {opciones.map(([v, l]) => (

            <button
              key={v}
              onClick={() => {
                setVista(v);
                setTurnoSeleccionado(null);
              }}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                background: vista === v ? "#b05080" : "transparent",
                color: vista === v ? "#fff" : "#b05080"
              }}
            >
              {l}
            </button>

          ))}

          <button
            onClick={salir}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#888"
            }}
          >
            Salir
          </button>

        </nav>

      )}

    </header>
  );

}