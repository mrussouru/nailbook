import { useEffect, useState } from "react";
import {
    cargarRendiciones,
    marcarComoPagada,
    cargarDetalleRendicion
} from "../motores/rendiciones";

export default function Rendiciones() {

    const [rendiciones, setRendiciones] = useState([]);
    const [rendicionSeleccionada, setRendicionSeleccionada] = useState(null);
    const [detalle, setDetalle] = useState([]);

    useEffect(() => {

        async function cargar() {

            const datos = await cargarRendiciones();

            setRendiciones(datos);

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

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16
                    }}
                >

                    {rendiciones.length === 0 && (

                        <div
                            style={{
                                color: "#888"
                            }}
                        >
                            No hay rendiciones registradas.
                        </div>

                    )}

                    {rendiciones.map(r => (

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
                                    color: r.profesionales?.color || "#b05080"
                                }}
                            >
                                👩 {r.profesionales?.nombre}
                            </h3>

                            <p>

                                {r.fecha_desde} → {r.fecha_hasta}

                            </p>

                            <p>

                                Facturación:
                                <strong>

                                    {" "}
                                    ${Number(r.facturacion).toLocaleString("es-UY")}

                                </strong>

                            </p>

                            <p>

                                Salón:
                                <strong>

                                    {" "}
                                    ${Number(r.monto_salon).toLocaleString("es-UY")}

                                </strong>

                            </p>

                            <p>

                                Profesional:
                                <strong>

                                    {" "}
                                    ${Number(r.monto_profesional).toLocaleString("es-UY")}

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

                                ) : (

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

                                )}

                            </div>

                        </div>

                    ))}

                </div>

            </div>

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
                        boxShadow: "-5px 0 20px rgba(0,0,0,.15)",
                        zIndex: 9999
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

                        {rendicionSeleccionada.profesionales?.nombre}

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
                                borderBottom: "1px solid #eee"
                            }}
                        >

                            <strong>

                                {turno.fecha} - {turno.hora}

                            </strong>

                            <br />

                            👤 {turno.cliente}

                            <br />

                            💅 {turno.servicios?.nombre}

                            <br />

                            💵 ${Number(turno.servicios?.precio || 0).toLocaleString("es-UY")}

                        </div>

                    ))}

                    <hr />

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 15
                        }}
                    >

                        <strong>

                            Total

                        </strong>

                        <strong>

                            ${Number(rendicionSeleccionada.facturacion).toLocaleString("es-UY")}

                        </strong>

                    </div>

                </div>

            )}

        </>

    );

}