import { useState } from "react";
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

  const [submenuAbierto, setSubmenuAbierto] = useState(null);

  const navegar = (nuevaVista) => {
    setVista(nuevaVista);
    setTurnoSeleccionado(null);
    setMenuAbierto(false);
    setSubmenuAbierto(null);
  };

  // =========================
  // MENÚ DUEÑO
  // =========================

  const accesosPrincipalesDueno = [
    ["dashboard", "📊 Dashboard"],
    ["calendario", "📅 Calendario"],
    ["listado", "📋 Turnos"],
    ["clientes", "👥 Clientes"],
    ["nuevo", "➕ Nuevo turno"]
  ];

  const equipoDueno = [
    ["profesionales", "👩‍🎨 Profesionales"],
    ["servicios", "💅 Servicios"],
    ["disponibilidad", "🗓 Disponibilidad"],
    ["atencion", "🚶 Atención"]
  ];

  // Agenda Tamara.
  // La opción se habilitará en el menú cuando conectemos
  // la vista "agenda-tamara" en PanelInterno.
  const tamaraDueno = [
    ["agenda-tamara", "📅 Mi agenda"],
    ["clientes-tamara", "👩 Mis clientas"]
  ];

  const finanzasDueno = [
    ["liquidaciones", "💰 Producción"],
    ["rendiciones", "📋 Rendiciones"]
  ];

  // =========================
  // MENÚ PROFESIONAL
  // =========================

  const opcionesProfesional = [
    ["calendario", "📅 Mi agenda"],
    ["listado", "📋 Mis turnos"],
    ["atencion", "🚶 Atención"],
    ["liquidaciones", "💰 Mi producción"],
    ["rendiciones", "📋 Mis rendiciones"]
  ];

  const opcionActiva = (opciones) =>
    opciones.some(([v]) => v === vista);

  // =========================
  // ESTILOS
  // =========================

  const botonPrincipal = (activo = false) => ({
    padding: "8px 12px",
    borderRadius: 20,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    background: activo ? "#b05080" : "transparent",
    color: activo ? "#fff" : "#b05080",
    whiteSpace: "nowrap"
  });

  const botonSubmenu = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "11px 14px",
    border: "none",
    background: "#fff",
    cursor: "pointer",
    color: "#b05080",
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: "nowrap"
  };

  const submenuStyle = {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    background: "#fff",
    border: "1px solid #f0d9e8",
    borderRadius: 12,
    boxShadow: "0 8px 25px rgba(0,0,0,.12)",
    overflow: "hidden",
    zIndex: 2000,
    minWidth: 205
  };

  const tituloSeccionMovil = {
    padding: "12px 18px 6px",
    fontSize: 11,
    fontWeight: 800,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: ".7px"
  };

  const botonMovil = (activo = false) => ({
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "12px 18px",
    border: "none",
    background: activo ? "#fdf2f8" : "#fff",
    cursor: "pointer",
    color: "#b05080",
    fontWeight: 600
  });

  // =========================
  // SUBMENÚ ESCRITORIO
  // =========================

  const SubmenuEscritorio = ({
    id,
    label,
    opciones
  }) => {
    const abierto = submenuAbierto === id;
    const activo = opcionActiva(opciones);

    return (
      <div
        style={{
          position: "relative"
        }}
      >
        <button
          onClick={() =>
            setSubmenuAbierto(abierto ? null : id)
          }
          style={botonPrincipal(activo)}
        >
          {label} ▾
        </button>

        {abierto && (
          <div style={submenuStyle}>
            {opciones.map(([v, l]) => (
              <button
                key={v}
                onClick={() => navegar(v)}
                style={{
                  ...botonSubmenu,
                  background:
                    vista === v ? "#fdf2f8" : "#fff"
                }}
                onMouseEnter={(e) => {
                  if (vista !== v) {
                    e.currentTarget.style.background =
                      "#fff7fb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (vista !== v) {
                    e.currentTarget.style.background =
                      "#fff";
                  }
                }}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <header
      style={{
        background: "#fff",
        borderBottom: "2px solid #f0d9e8",
        padding: esMovil ? "10px 16px" : "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        minHeight: esMovil ? 70 : 72,
        position: "relative"
      }}
    >
      {/* LOGO */}

      <img
        src={logo}
        alt="Tamy Ayelen"
        style={{
          width: esMovil ? 85 : 135,
          height: "auto",
          flexShrink: 0
        }}
      />

      {/* =========================
          MÓVIL
      ========================= */}

      {esMovil ? (
        <>
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Abrir menú"
            style={{
              fontSize: 28,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#b05080",
              padding: 6
            }}
          >
            {menuAbierto ? "✕" : "☰"}
          </button>

          {menuAbierto && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 10,
                right: 10,
                maxHeight: "calc(100vh - 90px)",
                overflowY: "auto",
                background: "#fff",
                border: "1px solid #f0d9e8",
                borderRadius: 14,
                boxShadow: "0 8px 25px rgba(0,0,0,.12)",
                zIndex: 2000
              }}
            >
              {esDueno(usuario) && (
                <>
                  <div style={tituloSeccionMovil}>
                    Principal
                  </div>

                  {accesosPrincipalesDueno.map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => navegar(v)}
                      style={botonMovil(vista === v)}
                    >
                      {l}
                    </button>
                  ))}

                  <div style={tituloSeccionMovil}>
                    Equipo
                  </div>

                  {equipoDueno.map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => navegar(v)}
                      style={botonMovil(vista === v)}
                    >
                      {l}
                    </button>
                  ))}

                  <div style={tituloSeccionMovil}>
                    Tamara
                  </div>

                  {tamaraDueno.map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => navegar(v)}
                      style={botonMovil(vista === v)}
                    >
                      {l}
                    </button>
                  ))}

                  <div style={tituloSeccionMovil}>
                    Finanzas
                  </div>

                  {finanzasDueno.map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => navegar(v)}
                      style={botonMovil(vista === v)}
                    >
                      {l}
                    </button>
                  ))}
                </>
              )}

              {esProfesional(usuario) && (
                <>
                  <div style={tituloSeccionMovil}>
                    Mi espacio
                  </div>

                  {opcionesProfesional.map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => navegar(v)}
                      style={botonMovil(vista === v)}
                    >
                      {l}
                    </button>
                  ))}
                </>
              )}

              <div
                style={{
                  height: 1,
                  background: "#f0d9e8",
                  marginTop: 8
                }}
              />

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
                  color: "#777",
                  fontWeight: 600
                }}
              >
                🚪 Salir
              </button>
            </div>
          )}
        </>
      ) : (
        /* =========================
           ESCRITORIO
        ========================= */

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
            flex: 1
          }}
        >
          {esDueno(usuario) && (
            <>
              {accesosPrincipalesDueno.map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => navegar(v)}
                  style={botonPrincipal(vista === v)}
                >
                  {l}
                </button>
              ))}

              <SubmenuEscritorio
                id="equipo"
                label="👩‍🎨 Equipo"
                opciones={equipoDueno}
              />

              <SubmenuEscritorio
                id="tamara"
                label="💇‍♀️ Tamara"
                opciones={tamaraDueno}
              />

              <SubmenuEscritorio
                id="finanzas"
                label="💰 Finanzas"
                opciones={finanzasDueno}
              />
            </>
          )}

          {esProfesional(usuario) &&
            opcionesProfesional.map(([v, l]) => (
              <button
                key={v}
                onClick={() => navegar(v)}
                style={botonPrincipal(vista === v)}
              >
                {l}
              </button>
            ))}

          <button
            onClick={salir}
            style={{
              padding: "8px 12px",
              borderRadius: 20,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#888",
              whiteSpace: "nowrap"
            }}
          >
            Salir
          </button>
        </nav>
      )}
    </header>
  );
}