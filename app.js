let experiencias = [];
let reservas = [];
let categoriaActual = "todas";
let ordenPrecioAsc = false;

// Catálogo 
const catalogo = document.querySelector("#catalogo");
const contador = document.querySelector("#contador");
const botonesFiltro = document.querySelectorAll("[data-categoria]");
const buscador = document.querySelector("#buscador");
const filtroPrecio = document.querySelector("#filtroPrecio");
const ordenarPrecio = document.querySelector("#ordenarPrecio");

// Reservas
const listaReservas = document.querySelector("#listaReservas");
const totalPersonas = document.querySelector("#totalPersonas");
const totalMonto = document.querySelector("#totalMonto");
const btnVaciar = document.querySelector("#btnVaciar");
const mensajeFeedback = document.querySelector("#mensajeFeedback");

// Modal Confirmaciones
const modalConfirmar = document.querySelector("#modalConfirmar");
const btnCancelarVaciar = document.querySelector("#btnCancelarVaciar");
const btnConfirmarVaciar = document.querySelector("#btnConfirmarVaciar");

// Modal Sin Reservas
const modalVacioTiempo = document.querySelector("#modalVacioTiempo");
const btnCerrarAviso = document.querySelector("#btnCerrarAviso");
const contadorTiempo = document.querySelector("#contadorTiempo");

let temporizadorModal = null;
let intervaloContador = null;

// Cargar experiencias 
async function cargarExperiencias() {
    try {
        const respuesta = await fetch("./data/experiencias.json");
        if (!respuesta.ok) throw new Error("No se pudo cargar la información de experiencias.");
        experiencias = await respuesta.json();
        aplicarFiltros();
    } catch (error) {
        contador.textContent = "Error al cargar los datos";
        mostrarMensaje("Error al conectar con la fuente de datos local.", "error");
        console.error(error);
    }
}

// Mostrar notificaciones
function mostrarMensaje(texto, tipo = "exito") {
    mensajeFeedback.textContent = texto;
    mensajeFeedback.className = `mensaje-feedback ${tipo}`;
    
    setTimeout(() => {
        mensajeFeedback.className = "mensaje-feedback oculto";
    }, 4000);
}

// Filtrar y ordenar experiencias
function obtenerResultados() {
    const texto = buscador.value.trim().toLowerCase();
    const precioMax = parseFloat(filtroPrecio.value);

    let resultados = experiencias.filter(exp => {
        const coincideCategoria = categoriaActual === "todas" || exp.categoria === categoriaActual;
        const coincideNombre = exp.nombre.toLowerCase().includes(texto);
        const coincidePrecio = isNaN(precioMax) || exp.precio <= precioMax;

        return coincideCategoria && coincideNombre && coincidePrecio;
    });

    if (ordenPrecioAsc) {
        resultados.sort((a, b) => a.precio - b.precio);
    }

    return resultados;
}

// Actualiza experiencias
function aplicarFiltros() {
    const resultados = obtenerResultados();
    mostrarExperiencias(resultados);
}

// Renderización de las tarjetas
function mostrarExperiencias(lista) {
    if (lista.length === 0) {
        catalogo.innerHTML = `<p class="sin-resultados">No se encontraron experiencias que coincidan con los filtros.</p>`;
        contador.textContent = "0 experiencias encontradas";
        return;
    }

    catalogo.innerHTML = lista.map(exp => `
        <article class="tarjeta">
            <div class="imagen">${exp.icono}</div>
            <div class="informacion">
                <span class="etiqueta">${exp.categoria}</span>
                <h3>${exp.nombre}</h3>
                <p class="precio">$${exp.precio} MXN</p>
                <p class="cupo">Cupo disponible: ${exp.cupo}</p>
                <div class="acciones-tarjeta">
                    <input type="number" id="cantidad-${exp.id}" class="input-personas" min="1" max="${exp.cupo}" value="1">
                    <button class="btn-reservar" data-id="${exp.id}">
                        <span class="icono-mas">+</span>
                    </button>
                </div>
            </div>
        </article>
    `).join("");

    contador.textContent = `${lista.length} experiencia${lista.length !== 1 ? "s" : ""} encontrada${lista.length !== 1 ? "s" : ""}`;
    asignarEventosReservar();
}

// Asigna listener a los botones de reserva recién creados
function asignarEventosReservar() {
    document.querySelectorAll(".btn-reservar").forEach(boton => {
        boton.addEventListener("click", () => {
            const id = Number(boton.dataset.id);
            agregarReserva(id);
        });
    });
}

// Agrega las reservas
function agregarReserva(id) {
    const experiencia = experiencias.find(e => e.id === id);
    const inputCantidad = document.querySelector(`#cantidad-${id}`);
    const cantidadIngresada = Number(inputCantidad.value);

    if (isNaN(cantidadIngresada) || cantidadIngresada < 1) {
        mostrarMensaje("Por favor, ingresa una cantidad válida de personas.", "error");
        return;
    }

    const reservaExistente = reservas.find(r => r.experienciaId === id);
    const cantidadActual = reservaExistente ? reservaExistente.cantidad : 0;
    const nuevaCantidadTotal = cantidadActual + cantidadIngresada;

    if (nuevaCantidadTotal > experiencia.cupo) {
        mostrarMensaje(`La cantidad supera el cupo máximo disponible (${experiencia.cupo}).`, "error");
        return;
    }

    if (reservaExistente) {
        reservaExistente.cantidad = nuevaCantidadTotal;
        reservaExistente.subtotal = nuevaCantidadTotal * experiencia.precio;
    } else {
        reservas.push({
            experienciaId: id,
            nombre: experiencia.nombre,
            precio: experiencia.precio,
            cantidad: cantidadIngresada,
            subtotal: cantidadIngresada * experiencia.precio,
            cupoMax: experiencia.cupo
        });
    }

    mostrarMensaje(`Se agregó "${experiencia.nombre}" a tu reservación.`, "exito");
    mostrarReservas();
}

// Renderizar experiencias reservadas
function mostrarReservas() {
    if (reservas.length === 0) {
        listaReservas.innerHTML = `<p class="sin-reservas">No hay experiencias seleccionadas.</p>`;
        totalPersonas.textContent = "0";
        totalMonto.textContent = "$0 MXN";
        return;
    }

    listaReservas.innerHTML = reservas.map(r => `
        <article class="item-reserva">
            <div class="item-reserva-info">
                <h4>${r.nombre}</h4>
                <p>$${r.precio} MXN c/u - Subtotal: <strong>$${r.subtotal} MXN</strong></p>
            </div>
            <div class="item-reserva-acciones">
                <div class="controles-cantidad">
                    <button class="btn-cantidad" onclick="cambiarCantidadReserva(${r.experienciaId}, -1)">-</button>
                    <span><strong>${r.cantidad}</strong></span>
                    <button class="btn-cantidad" onclick="cambiarCantidadReserva(${r.experienciaId}, 1)">+</button>
                </div>
                <button class="btn-eliminar" onclick="eliminarReserva(${r.experienciaId})">Eliminar</button>
            </div>
        </article>
    `).join("");

    const totalPersonasSum = reservas.reduce((acc, r) => acc + r.cantidad, 0);
    const totalMontoSum = reservas.reduce((acc, r) => acc + r.subtotal, 0);

    totalPersonas.textContent = totalPersonasSum;
    totalMonto.textContent = `$${totalMontoSum} MXN`;
}

// Cambia la cantidad de personas de la reserva
window.cambiarCantidadReserva = function(id, cambio) {
    const reserva = reservas.find(r => r.experienciaId === id);
    if (!reserva) return;

    const nuevaCantidad = reserva.cantidad + cambio;

    if (nuevaCantidad > reserva.cupoMax) {
        mostrarMensaje(`No puedes superar el cupo disponible (${reserva.cupoMax} personas).`, "error");
        return;
    }

    if (nuevaCantidad <= 0) {
        eliminarReserva(id);
        return;
    }

    reserva.cantidad = nuevaCantidad;
    reserva.subtotal = nuevaCantidad * reserva.precio;
    mostrarReservas();
};

// Elimina Reserva 
window.eliminarReserva = function(id) {
    const reserva = reservas.find(r => r.experienciaId === id);
    reservas = reservas.filter(r => r.experienciaId !== id);
    if (reserva) {
        mostrarMensaje(`Se eliminó "${reserva.nombre}" de la reservación.`, "exito");
    }
    mostrarReservas();
};

// Modal sin Reserva
function abrirModalPorTiempo(segundos = 3) {
    let tiempoRestante = segundos;
    contadorTiempo.textContent = tiempoRestante;
    modalVacioTiempo.classList.remove("oculto");

    clearInterval(intervaloContador);
    clearTimeout(temporizadorModal);

    intervaloContador = setInterval(() => {
        tiempoRestante--;
        contadorTiempo.textContent = tiempoRestante;
        if (tiempoRestante <= 0) {
            clearInterval(intervaloContador);
        }
    }, 1000);

    temporizadorModal = setTimeout(() => {
        modalVacioTiempo.classList.add("oculto");
    }, segundos * 1000);
}

// Cierra el Modal sin Reserva
function cerrarModalPorTiempo() {
    modalVacioTiempo.classList.add("oculto");
    clearInterval(intervaloContador);
    clearTimeout(temporizadorModal);
}

// Listener al Presionar el Botón de Vaciar
btnVaciar.addEventListener("click", () => {
    if (reservas.length === 0) {
        abrirModalPorTiempo(3);
    } else {
        modalConfirmar.classList.remove("oculto");
    }
});

btnCerrarAviso.addEventListener("click", cerrarModalPorTiempo);

// Confirmación de vaciar reservas
btnCancelarVaciar.addEventListener("click", () => {
    modalConfirmar.classList.add("oculto");
});

btnConfirmarVaciar.addEventListener("click", () => {
    reservas = [];
    mostrarReservas();
    modalConfirmar.classList.add("oculto");
    mostrarMensaje("Se ha vaciado la reservación.", "exito");
});

// Evnts. para los filtros y controles
botonesFiltro.forEach(boton => {
    boton.addEventListener("click", () => {
        botonesFiltro.forEach(b => b.classList.remove("activo"));
        boton.classList.add("activo");
        categoriaActual = boton.dataset.categoria;
        aplicarFiltros();
    });
});

buscador.addEventListener("input", aplicarFiltros);
filtroPrecio.addEventListener("input", aplicarFiltros);

ordenarPrecio.addEventListener("click", () => {
    ordenPrecioAsc = !ordenPrecioAsc;
    ordenarPrecio.textContent = ordenPrecioAsc ? "Orden Normal" : "Menor precio";
    aplicarFiltros();
});

cargarExperiencias();