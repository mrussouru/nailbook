import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

const ROSA = "#b05080";
const NOTA = "Algunas atenciones históricas no tienen registrado el reparto individual. Los totales de la rendición corresponden a los valores guardados al momento de su generación.";
const registrado = valor => valor !== null && valor !== undefined && valor !== "";

export function formatoImporte(valor) {
    if (!registrado(valor) || !Number.isFinite(Number(valor))) return "No registrado";
    const numero = Number(valor);
    return `$${numero.toLocaleString("es-UY", {
        minimumFractionDigits: Number.isInteger(numero) ? 0 : 2,
        maximumFractionDigits: 2
    })}`;
}

// Las fechas de negocio conservan su día calendario, sin conversiones de zona horaria.
export function formatoFecha(valor) {
    const partes = String(valor ?? "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$| )/);
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : "No registrada";
}

export function datosRendicionPdf(rendicion, turnos) {
    return {
        filas: turnos.map(turno => [
            formatoFecha(turno.fecha),
            turno.cliente || "No registrado",
            turno.servicios?.nombre || "No registrado",
            formatoImporte(turno.precio),
            formatoImporte(turno.monto_profesional),
            formatoImporte(turno.monto_salon)
        ]),
        repartoIncompleto: turnos.some(turno =>
            formatoImporte(turno.monto_profesional) === "No registrado" ||
            formatoImporte(turno.monto_salon) === "No registrado"
        ),
        // Fuente de verdad: nunca reemplazar estos valores por sumas de filas.
        totales: [
            ["Facturación", formatoImporte(rendicion.facturacion)],
            ["Total salón", formatoImporte(rendicion.monto_salon)],
            ["Total profesional", formatoImporte(rendicion.monto_profesional)]
        ]
    };
}

export function crearPdfRendicion(rendicion, turnos) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margen = 16;
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const util = ancho - margen * 2;
    const datos = datosRendicionPdf(rendicion, turnos);
    const nombre = rendicion.profesionales?.nombre || "No registrado";
    doc.setProperties({ title: `Rendición de ${nombre}`, author: "Tamy Ayelen" });

    doc.setTextColor(ROSA).setFont("helvetica", "bold").setFontSize(22);
    doc.text("TAMY AYELEN", margen, 24);
    doc.setTextColor("#555555").setFont("helvetica", "normal").setFontSize(12);
    doc.text("Rendición de profesional", margen, 32);
    doc.setDrawColor("#f0d9e8").line(margen, 38, ancho - margen, 38);
    doc.setFontSize(10);
    const profesional = doc.splitTextToSize(`Profesional: ${nombre}`, util);
    doc.text(profesional, margen, 46);
    const periodoY = 46 + profesional.length * 5;
    doc.text(`Período: ${formatoFecha(rendicion.fecha_desde)} – ${formatoFecha(rendicion.fecha_hasta)}`, margen, periodoY);

    autoTable(doc, {
        startY: periodoY + 8,
        margin: { top: 24, bottom: 22, left: margen, right: margen },
        head: [["Fecha", "Cliente", "Servicio", "Importe", "Profesional", "Salón"]],
        body: datos.filas,
        theme: "striped",
        showHead: "everyPage",
        rowPageBreak: "avoid",
        styles: { font: "helvetica", fontSize: 8, cellPadding: 3, overflow: "linebreak", textColor: "#333333" },
        headStyles: { fillColor: ROSA, textColor: "#ffffff", fontStyle: "bold" },
        alternateRowStyles: { fillColor: "#fcf5f9" },
        columnStyles: {
            0: { cellWidth: 23 },
            1: { cellWidth: 31 },
            2: { cellWidth: 43 },
            3: { cellWidth: 27, halign: "right" },
            4: { cellWidth: 27, halign: "right" },
            5: { cellWidth: 27, halign: "right" }
        },
        didParseCell: data => {
            if (data.section === "head" && data.column.index >= 3) data.cell.styles.halign = "right";
        }
    });

    let y = doc.lastAutoTable.finalY + 8;
    // Mantener la aclaración, totales y estado juntos, con espacio reservado al pie.
    doc.setFont("helvetica", "normal").setFontSize(8);
    const nota = datos.repartoIncompleto ? doc.splitTextToSize(NOTA, util) : [];
    const notaAlto = nota.length ? nota.length * 4 + 7 : 0;
    const bloqueAlto = notaAlto + 50 + (rendicion.estado === "pagado" ? 7 : 0);
    if (y + bloqueAlto > alto - 22) {
        doc.addPage();
        y = 26;
    }
    if (nota.length) {
        doc.setTextColor("#666666").text(nota, margen, y);
        y += notaAlto;
    }
    if (!turnos.length) {
        doc.setTextColor("#666666").text("No hay turnos vinculados a esta rendición.", margen, y);
        y += 7;
    }
    datos.totales.forEach(([etiqueta, importe], indice) => {
        const destacado = indice === 2;
        if (destacado) doc.setFillColor("#fcf0f6").roundedRect(margen, y - 6, util, 11, 2, 2, "F");
        doc.setFont("helvetica", destacado ? "bold" : "normal").setFontSize(destacado ? 12 : 10);
        doc.setTextColor(destacado ? ROSA : "#333333");
        doc.text(etiqueta, margen + 4, y);
        doc.text(importe, ancho - margen - 4, y, { align: "right" });
        y += 12;
    });
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor("#555555");
    doc.text(`Estado: ${rendicion.estado === "pagado" ? "Pagada" : "Pendiente"}`, margen, y);
    if (rendicion.estado === "pagado") {
        doc.text(`Fecha de pago: ${formatoFecha(rendicion.fecha_pago)}`, margen, y + 7);
    }

    const paginas = doc.getNumberOfPages();
    for (let pagina = 1; pagina <= paginas; pagina++) {
        doc.setPage(pagina);
        if (pagina > 1) {
            doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(ROSA);
            doc.text("TAMY AYELEN · Rendición de profesional", margen, 15);
        }
        doc.setDrawColor("#f0d9e8").line(margen, alto - 17, ancho - margen, alto - 17);
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor("#777777");
        doc.text("Tamy Ayelen · Rendición generada desde NailBook", margen, alto - 11);
        doc.text(`${pagina} / ${paginas}`, ancho - margen, alto - 11, { align: "right" });
    }

    const slug = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "profesional";
    const fechaArchivo = valor => String(valor ?? "").match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "sin-fecha";
    const nombreArchivo = `rendicion-${slug}-${fechaArchivo(rendicion.fecha_desde)}-a-${fechaArchivo(rendicion.fecha_hasta)}.pdf`;
    return { doc, nombreArchivo };
}
