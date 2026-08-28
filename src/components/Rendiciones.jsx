import { useEffect, useState } from "react";

import {
    cargarRendiciones,
    marcarComoPagada,
    cargarDetalleRendicion,
    hayTurnosSinRendicion
} from "../motores/rendiciones";

import { generarRendicionesPendientes } from "../motores/rendiciones/generarPendientes";
import { useUsuario } from "../context/UsuarioContext";
import { esDueno } from "../motores/auth";


export default function Rendiciones() {

    const { usuario } = useUsuario();
    const puedeAdministrar = esDueno(usuario);
    const [rendiciones, setRendiciones] = useState([]);
    const [rendicionSeleccionada, setRendicionSeleccionada] = useState(null);
    const [detalle, setDetalle] = useState([]);
    const [hayPendientes, setHayPendientes] = useState(false);

    const [filtroEstado, setFiltroEstado] = useState("todas");
    const [filtroProfesional, setFiltroProfesional] = useState("todas");


    useEffect(() => {

        async function cargar() {

            const datos = await cargarRendiciones();

            setRendiciones(datos);

            const pendientes = await hayTurnosSinRendicion();

            setHayPendientes(pendientes);

        }

        cargar();

    }, []);


    async function pagar(id) {

        await marcarComoPagada(id);

        const datos = await cargarRendiciones();

        setRendiciones(datos);

    }


    async function abrirDetalle(r) {

        setRendicionSeleccionada(r);

        const datos = await cargarDetalleRendicion(r);

        setDetalle(datos);

    }


    // ==========================================
    // FILTROS
    // ==========================================

    const rendicionesFiltradas = rendiciones.filter(r => {

        const cumpleEstado =
            filtroEstado === "todas" ||
            r.estado === filtroEstado;

        const cumpleProfesional =
            filtroProfesional === "todas" ||
            r.profesional_id === filtroProfesional;

        return cumpleEstado && cumpleProfesional;

    });


    // Profesionales que aparecen en las rendiciones
    const profesionalesDisponibles = Array.from(

        new Map(

            rendiciones.map(r => [

                r.profesional_id,

                {
                    id: r.profesional_id,
                    nombre: r.profesionales?.nombre
                }

            ])

        ).values()

    );


    return (

        <>

            <div>

                <h2
                    style={{
                        color: "#b05080",
                        marginBottom: 20
                    }}
                >
                    📋 Rendiciones
                </h2>


                {/* ==========================================
                    GENERAR RENDICIONES PENDIENTES
                ========================================== */}

                {puedeAdministrar && (
                    hayPendientes ? (

                    <div
                        style={{
                            border: "2px solid #f0d9e8",
                            borderRadius: 16,
                            padding: 20,
                            marginBottom: 24,
                            background: "#fff"
                        }}
                    >

                        <h3
                            style={{
                                marginTop: 0,
                                color: "#b05080"
                            }}
                        >
                            💰 Rendiciones pendientes
                        </h3>

                        <p
                            style={{
                                color: "#666"
                            }}
                        >
                            Genera automáticamente las rendiciones de todos los turnos pendientes.
                        </p>

                        <button
                            onClick={async () => {

                                await generarRendicionesPendientes();

                                const datos =
                                    await cargarRendiciones();

                                setRendiciones(datos);

                                const pendientes =
                                    await hayTurnosSinRendicion();

                                setHayPendientes(pendientes);

                                alert(
                                    "✅ Rendiciones generadas correctamente"
                                );

                            }}
                            style={{
                                padding: "10px 18px",
                                border: "none",
                                borderRadius: 10,
                                background: "#22c55e",
                                color: "#fff",
                                cursor: "pointer",
                                fontWeight: 700
                            }}
                        >
                            💰 Generar rendiciones pendientes
                        </button>

                    </div>

                ) : (

                    <div
                        style={{
                            border: "2px solid #d1fae5",
                            borderRadius: 16,
                            padding: 20,
                            marginBottom: 24,
                            background: "#f0fdf4",
                            color: "#166534",
                            fontWeight: 700
                        }}
                    >
                        ✅ No hay turnos pendientes de rendir.
                    </div>

            ))}


                {/* ==========================================
                    FILTROS DE RENDICIONES
                ========================================== */}

                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 20,
                        alignItems: "center"
                    }}
                >

                    <select
                        value={filtroEstado}
                        onChange={e =>
                            setFiltroEstado(e.target.value)
                        }
                        style={{
                            padding: "9px 14px",
                            borderRadius: 10,
                            border: "2px solid #f0d9e8",
                            background: "#fff",
                            color: "#555",
                            cursor: "pointer"
                        }}
                    >

                        <option value="todas">
                            📋 Todas
                        </option>

                        <option value="pendiente">
                            🟡 Pendientes
                        </option>

                        <option value="pagado">
                            🟢 Pagadas
                        </option>

                    </select>

                {puedeAdministrar && (
                    <select
                        value={filtroProfesional}
                        onChange={e =>
                            setFiltroProfesional(e.target.value)
                        }
                        style={{
                            padding: "9px 14px",
                            borderRadius: 10,
                            border: "2px solid #f0d9e8",
                            background: "#fff",
                            color: "#555",
                            cursor: "pointer"
                        }}
                    >

                        <option value="todas">
                            👩 Todas las profesionales
                        </option>

                        {profesionalesDisponibles.map(p => (

                            <option
                                key={p.id}
                                value={p.id}
                            >
                                {p.nombre}
                            </option>

                        ))}

                    </select>
                )}    

                </div>


                {/* ==========================================
                    LISTADO DE RENDICIONES
                ========================================== */}

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16
                    }}
                >

                    {rendicionesFiltradas.length === 0 && (

                        <div
                            style={{
                                color: "#888"
                            }}
                        >
                            No hay rendiciones para los filtros seleccionados.
                        </div>

                    )}


                    {rendicionesFiltradas.map(r => (

                        <div
                            key={r.id}
                            onClick={() => abrirDetalle(r)}
                            style={{
                                border: "2px solid #f0d9e8",
                                borderRadius: 16,
                                padding: 20,
                                background: "#fff",
                                cursor: "pointer"
                            }}
                        >

                            <h3
                                style={{
                                    margin: 0,
                                    color:
                                        r.profesionales?.color ||
                                        "#b05080"
                                }}
                            >
                                👩 {r.profesionales?.nombre}
                            </h3>


                            <p>

                                {r.fecha_desde}
                                {" → "}
                                {r.fecha_hasta}

                            </p>


                            <p>

                                Facturación:

                                <strong>

                                    {" "}

                                    ${Number(
                                        r.facturacion
                                    ).toLocaleString("es-UY")}

                                </strong>

                            </p>


                            <p>

                                Salón:

                                <strong>

                                    {" "}

                                    ${Number(
                                        r.monto_salon
                                    ).toLocaleString("es-UY")}

                                </strong>

                            </p>


                            <p>

                                Profesional:

                                <strong>

                                    {" "}

                                    ${Number(
                                        r.monto_profesional
                                    ).toLocaleString("es-UY")}

                                </strong>

                            </p>


                            <div
    style={{
        marginTop: 12
    }}
>

    {r.estado === "pagado" ? (

        <div
            style={{
                color: "#2ecc71",
                fontWeight: 700
            }}
        >

            🟢 Pagada

            <br />

            <small>
                {r.fecha_pago}
            </small>

        </div>

    ) : puedeAdministrar ? (

        <button
            onClick={(e) => {

                e.stopPropagation();

                pagar(r.id);

            }}
            style={{
                padding: "8px 14px",
                border: "none",
                borderRadius: 8,
                background: "#2ecc71",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700
            }}
        >

            ✔ Marcar como pagada

        </button>

    ) : (

        <div
            style={{
                color: "#d99a00",
                fontWeight: 700
            }}
        >
            🟡 Pendiente
        </div>

    )}

</div>

                        </div>

                    ))}

                </div>

            </div>


            {/* ==========================================
                DETALLE DE RENDICIÓN
            ========================================== */}

            {rendicionSeleccionada && (

                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        right: 0,
                        width: 420,
                        height: "100vh",
                        background: "#fff",
                        borderLeft: "2px solid #f0d9e8",
                        padding: 25,
                        overflowY: "auto",
                        boxShadow:
                            "-5px 0 20px rgba(0,0,0,.15)",
                        zIndex: 9999,
                        boxSizing: "border-box"
                    }}
                >

                    <button
                        onClick={() => {

                            setRendicionSeleccionada(null);

                            setDetalle([]);

                        }}
                        style={{
                            float: "right",
                            border: "none",
                            background: "transparent",
                            fontSize: 24,
                            cursor: "pointer"
                        }}
                    >
                        ✕
                    </button>


                    <h2
                        style={{
                            color: "#b05080"
                        }}
                    >
                        📋 Rendición
                    </h2>


                    <h3>

                        {rendicionSeleccionada
                            .profesionales?.nombre}

                    </h3>


                    <p>

                        {rendicionSeleccionada.fecha_desde}

                        {" → "}

                        {rendicionSeleccionada.fecha_hasta}

                    </p>


                    <hr />


                    <h3>
                        Turnos
                    </h3>


                    {detalle.map(turno => (

                        <div
                            key={turno.id}
                            style={{
                                marginBottom: 18,
                                paddingBottom: 12,
                                borderBottom:
                                    "1px solid #eee"
                            }}
                        >

                            <strong>

                                {turno.fecha}
                                {" - "}
                                {turno.hora}

                            </strong>

                            <br />

                            👤 {turno.cliente}

                            <br />

                            💅 {turno.servicios?.nombre}

                            <br />

                            💵 ${Number(
                                turno.servicios?.precio || 0
                            ).toLocaleString("es-UY")}

                        </div>

                    ))}


                    <hr />


                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 15,
                            paddingBottom: 25
                        }}
                    >

                        <strong>
                            Total
                        </strong>

                        <strong>

                            ${Number(
                                rendicionSeleccionada.facturacion
                            ).toLocaleString("es-UY")}

                        </strong>

                    </div>

                </div>

            )}

        </>

    );

}