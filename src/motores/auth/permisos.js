export function esDueno(usuario) {
    return usuario?.rol === "dueno";
}

export function esProfesional(usuario) {
    return usuario?.rol === "profesional";
}

export function esRecepcion(usuario) {
    return usuario?.rol === "recepcion";
}