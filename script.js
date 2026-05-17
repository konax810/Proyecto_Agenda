const SERVIDOR = 'https://proyectoagenda-production.up.railway.app';

//Código para mostrar el nombre del ususario
window.onload = () => {
    const usuarioActivo = localStorage.getItem('usuarioAgenda');
    const pantallaLogin = document.getElementById('pantallaLogin');
    const nombreDisplay = document.getElementById('nombreUserDisplay');

    if (usuarioActivo) {
        // ✅ HAY USUARIO: Entramos a la agenda
        if (pantallaLogin) pantallaLogin.style.display = 'none';
        if (nombreDisplay) nombreDisplay.innerText = "👤 " + usuarioActivo;
        
        // Llamamos a la función del Día 10 para cargar solo MIS contactos
        filtrar('General'); 
        actualizarGruposDinamicos();
    } else {
        // ❌ NO HAY USUARIO: Bloqueo total
        if (pantallaLogin) pantallaLogin.style.display = 'flex';
        if (nombreDisplay) nombreDisplay.innerText = ""; // Queda vacío
        
        // Limpiamos la lista para que nadie vea contactos de otros de fondo
        const lista = document.getElementById('listaContactos');
        if (lista) lista.innerHTML = "";
    }
    
    if (typeof volverAlInicio === 'function') volverAlInicio(); 
};

//Código para mostrar el nombre del ususario

const DICCIONARIO_ICONOS = {
    "SENA": "🎓", "Universidad": "🏛️", "Gym": "💪", "Familia": "🏠", "Trabajo": "💼", "General": "👥"
};

function toggleDarkMode() {
    const body = document.body;
    const btn = document.querySelector('.switch-dark');
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        btn.innerHTML = "🌙 Modo Oscuro";
    } else {
        body.setAttribute('data-theme', 'dark');
        btn.innerHTML = "☀️ Modo Claro";
    }
}

//código para el ojito haga bien las cosas  
function togglePassword() {
    const input = document.getElementById('inputPass');
    const btn = document.getElementById('btnOjo');
    
    // Si el input está en modo puntos, lo pasamos a texto y cambiamos el icono
    if (input.type === "password") {
        input.type = "text";
        btn.innerText = "🔒"; // Icono de candado (indica que puedes ocultar)
    } else {
        input.type = "password";
        btn.innerText = "👁️"; // Icono de ojo (indica que puedes ver)
    }
}

//Código para mostrar el nombre del ususario
// --- ESTA ES LA ÚNICA VERSIÓN QUE DEBE EXISTIR ---
async function loguearUsuario() {
    const inputUser = document.getElementById('inputUsuario').value;
    const inputPass = document.getElementById('inputPass').value;

    // 1. NORMALIZACIÓN (Limpieza de signos y espacios)
    let userLimpio = inputUser.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const passLimpia = inputPass.trim();

    // 2. VALIDACIÓN DE LONGITUD
    if (userLimpio.length < 3 || passLimpia.length < 6 || passLimpia.length > 25) {
        alert("⚠️ Usuario (mín. 3 letras) y Clave (entre 6 y 25 caracteres)");
        return;
    }

    // 3. VALIDACIÓN: al menos una letra en el usuario
    if (!/[a-z]/.test(userLimpio)) {
        alert("⚠️ El usuario debe contener al menos una letra. Ejemplo: sebas123");
        return;
    }

    try {
        // 3. COMUNICACIÓN CON EL SERVIDOR
        const respuesta = await fetch(`${SERVIDOR}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: userLimpio, clave: passLimpia })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            // Guardamos la sesión
            localStorage.setItem('usuarioAgenda', userLimpio);
            localStorage.setItem('passAgenda', passLimpia);
            
            alert("✅ " + datos.mensaje + ": " + userLimpio);
            
            // 4. RECARGA DEL SISTEMA
            location.reload(); 
        } else {
            // Si el servidor rechaza (por ejemplo, clave sin números)
            alert("❌ " + (datos.mensaje || "Error al ingresar"));
        }

    } catch (error) {
        console.error("Fallo de conexión:", error);
        alert("❌ Error de conexión: Asegúrate de que el servidor esté corriendo.");
    }
}
//Código para mostrar el nombre del ususario

function cerrarSesion() {
    localStorage.removeItem('usuarioAgenda');
    localStorage.removeItem('passAgenda');
    
    // Oculta toda la app
    document.querySelector('.contenedor-principal').style.display = 'none';
    
    // Limpia campos del login
    document.getElementById('inputUsuario').value = '';
    document.getElementById('inputPass').value = '';
    
    // Muestra el login
    document.getElementById('pantallaLogin').style.display = 'flex';
    
    // Limpia el panel derecho
    document.getElementById('detalleContactoVisor').style.display = 'none';
    document.getElementById('formularioAgenda').style.display = 'none';
    document.getElementById('vistaEstadoVacio').style.display = 'flex';
    document.getElementById('nombreUserDisplay').innerText = "Invitado";
    
    // SIN location.reload()
}

function volverAlInicio() {
    document.getElementById('formularioAgenda').reset();
    filtrar('General');
    // Escondemos el formulario
    document.getElementById('formularioAgenda').style.display = 'none';
    document.getElementById('detalleContactoVisor').style.display = 'none';
    // Volvemos a mostrar el mensaje de "Selecciona un contacto..."
    document.getElementById('vistaEstadoVacio').style.display = 'flex';
    document.getElementById('tituloLista').innerText = "Todos los Contactos";
}

function mostrarFormulario() {
    // Escondemos el mensaje de invitación y el visor
    document.getElementById('vistaEstadoVacio').style.display = 'none';
    document.getElementById('detalleContactoVisor').style.display = 'none';

    // Mostramos el formulario
    document.getElementById('formularioAgenda').style.display = 'block';
}

async function actualizarGruposDinamicos() {
    try {
        const usuarioActual = document.getElementById('nombreUserDisplay').innerText.replace("👤", "").trim().toLowerCase() || "sebastian";
        const res = await fetch(`${SERVIDOR}/contactos?usuarioOwner=${usuarioActual}`);
        const contactos = await res.json();
        let gruposBase = ["General"];
        let gruposDeBD = contactos.map(c => c.grupo);
        let todosLosGrupos = [...new Set([...gruposBase, ...gruposDeBD])];
        let listaFinal = todosLosGrupos.filter(g => g !== "General").sort();
        listaFinal.unshift("General");

        const listaUL = document.getElementById('listaCategoriasDinamica');
        listaUL.innerHTML = ""; 

        listaFinal.forEach(g => {
            if(g) {
                const li = document.createElement('li');
                li.style = "padding:12px; cursor:pointer; border-radius:8px; margin-bottom:5px; transition: 0.3s; display: flex; align-items: center; gap: 10px;";
                li.innerHTML = `<span>${DICCIONARIO_ICONOS[g] || "📂"}</span> ${g}`;
                li.onclick = () => {
                    document.getElementById('tituloLista').innerText = "Contactos: " + g;
                    filtrar(g);
                };
                li.onmouseover = () => { li.style.background = "var(--btn-action)"; li.style.color = "white"; };
                li.onmouseout = () => { li.style.background = "transparent"; li.style.color = "inherit"; };
                listaUL.appendChild(li);
            }
        });

        // --- NUEVO: Llena el datalist del formulario ---
        const datalist = document.getElementById('sugerenciasGrupos');
        if (datalist) {
            datalist.innerHTML = listaFinal
                .map(g => `<option value="${g}">`)
                .join('');
        }

    } catch (e) { console.error("Error al cargar categorías:", e); }
}

function filtrar(cat) {
    const display = document.getElementById('nombreUserDisplay');
    // Limpiamos el nombre para que el servidor lo entienda
    const usuarioActual = display.innerText.replace("👤", "").trim().toLowerCase() || "sebastian";
    
    const listaContenedor = document.getElementById('listaContactos');
    listaContenedor.innerHTML = "<p style='padding:20px; opacity:0.5;'>Cargando...</p>";

    // IMPORTANTE: Asegúrate de que la URL sea exactamente la que configuraste en tu server.js
    fetch(`${SERVIDOR}/contactos?grupo=${cat}&usuarioOwner=${usuarioActual}`)
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) {
                listaContenedor.innerHTML = "<p style='padding:20px;'>No hay contactos en este grupo.</p>";
            } else {
                renderizarContactos(data); // <--- Verifica que esta función exista abajo
            }
        })
        .catch(err => {
            console.error("Error:", err);
            listaContenedor.innerHTML = "<p style='color:red;'>Error de conexión</p>";
        });
}

async function cargarContactos(grupo = 'General') {
    // 1. Obtenemos el usuario del badge (o sebastian por defecto)
    const badge = document.getElementById('nombreUserDisplay');
    const usuarioActual = (badge && badge.innerText.trim() !== "") 
                          ? badge.innerText.replace("👤", "").trim().toLowerCase()
                          : "sebastian";

    try {
        // 2. Pedimos los contactos al servidor filtrando por dueño y grupo
        const url = `${SERVIDOR}/contactos?usuario=${usuarioActual}&grupo=${grupo}`;
        const respuesta = await fetch(url);
        const contactos = await respuesta.json();

        // 3. Usamos tu función existente para dibujarlos en la pantalla
        renderizarContactos(contactos);

        // 4. Actualizamos el título de la columna central
        const titulo = document.getElementById('tituloLista');
        if (titulo) {
            titulo.innerText = grupo === 'General' ? "Todos los Contactos" : `Contactos: ${grupo}`;
        }

    } catch (error) {
        console.error("❌ Error al cargar contactos:", error);
    }
}

function renderizarContactos(contactos) {
    const cont = document.getElementById('listaContactos');
    cont.innerHTML = "";
    
    contactos.forEach(c => {
        // Buscamos en 'nombre' (nuevo) o 'nombreContacto' (viejo)
        const nombreReal = c.nombre || c.nombreContacto || "Sin Nombre";
        const telefonoReal = c.telefono || c.telefonoContacto || "Sin Teléfono";
        const apodoReal = c.apodo || c.apodoContacto || "";
        
        const nombreAMostrar = apodoReal.trim() !== "" ? apodoReal : nombreReal;
        
        const div = document.createElement('div');
        div.className = "tarjeta-contacto-bloque";
        div.innerHTML = `
            <div>
                <b>${nombreAMostrar}</b><br>
                <small>${nombreReal !== nombreAMostrar ? nombreReal : telefonoReal}</small>
            </div>
            <span>${DICCIONARIO_ICONOS[c.grupo] || "📂"}</span>
        `;
        
        div.onclick = () => mostrarDetalle(c);
        cont.appendChild(div);
    });
}

function mostrarDetalle(c) {
    //En movil hacemos scroll hacia arriba para ver detalles
    if (window.innerWidth <= 768) {
        window.scrollTo({ top:0, behavior: 'smooth'});
    }

    // 1. Ocultamos lo que necesitamos ver
    document.getElementById('vistaEstadoVacio').style.display = 'none';
    document.getElementById('formularioAgenda').style.display = 'none';
    
    // 2. Localizamos y mostramos el visor de detalles
    const visor = document.getElementById('detalleContactoVisor');
    visor.style.display = 'block';
    
    // 3. Inyectamos la información con el estilo de óvalo integrado
    visor.innerHTML = `
        <div class="detalle-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
                <h2 style="margin:0; color: var(--btn-action); font-size: 24px;">
                    ${c.nombre || c.nombreContacto || 'Sin Nombre'}
                </h2>
                ${(c.apodo || c.apodoContacto) ? `<p style="margin:4px 0 0 0; font-size: 0.9rem; color: var(--text-secondary);">⭐ ${c.apodo || c.apodoContacto}</p>` : ''}
            </div>
            <span class="badge-${(c.grupo || 'general').toLowerCase().replace(/\s+/g, '')}" 
                style="color: white; padding: 4px 14px; border-radius: 50px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; background-color: #6366f1;">
                ${(c.grupo || 'General').toUpperCase()}
            </span>
        </div>
        
        <hr style="border:0; border-top:1px solid var(--border-color); margin: 15px 0;">
        
        <div class="info-grid" style="display: flex; flex-direction: column; gap: 12px;">
            <p style="margin:0;">📧 <b>Correo:</b> ${c.correo || c.correoContacto || 'No registrado'}</p>
            <p style="margin:0;">📞 <b>Teléfono:</b> ${c.telefono || c.telefonoContacto || 'Sin teléfono'}</p>
            <div style="margin-top: 10px;">
                <p style="margin-bottom: 8px;">📝 <b>Notas:</b></p>
                <div class="notas-visor" style="background: rgba(0,0,0,0.03); padding: 12px; border-radius: 8px; font-size: 0.9rem; line-height: 1.4; border-left: 4px solid var(--btn-action);">
                    ${c.notas || c.notasContacto || 'Sin notas adicionales.'}
                </div>
            </div>
        </div>
        
        <div style="margin-top: 30px; display: flex; gap: 10px;">
            <button class="btn-secundario" onclick="volverAlInicio()" style="cursor:pointer; padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main);">
                Cerrar Detalle
            </button>
            <button onclick='prepararEdicion(${JSON.stringify(c)})' style="cursor:pointer; padding: 8px 16px; border-radius: 6px; border: none; background: var(--btn-action); color: white; font-weight: bold;">
                ✏️ Editar
            </button>
            <button onclick="eliminarContacto('${c._id}')" style="cursor:pointer; padding: 8px 16px; border-radius: 6px; border: none; background: #e53e3e; color: white; font-weight: bold;">
                🗑️ Eliminar
            </button>
        </div>
    `;
}

async function eliminarContacto(id) {
    const confirmar = confirm("⚠️ ¿Estás seguro de que quieres eliminar este contacto?");
    if (!confirmar) return;

    try {
        const respuesta = await fetch(`${SERVIDOR}/contactos/${id}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            alert("🗑️ Contacto eliminado con éxito.");
            volverAlInicio();
            await actualizarGruposDinamicos();
            await cargarContactos('General');
        } else {
            alert("❌ No se pudo eliminar el contacto.");
        }
    } catch (error) {
        console.error("Error al eliminar:", error);
        alert("❌ Error de conexión.");
    }
}

function prepararEdicion(c) {
    document.getElementById('nombreContacto').value = c.nombre || '';
    document.getElementById('apodoContacto').value = c.apodo || '';
    document.getElementById('telefonoContacto').value = c.telefono || '';
    document.getElementById('correoContacto').value = c.correo || '';
    document.getElementById('grupoContacto').value = c.grupo || 'General';
    document.getElementById('notasContacto').value = c.notas || '';

    mostrarFormulario();
    window.idContactoEnEdicion = c._id;
    document.querySelector('#formularioAgenda .btn-nuevo').innerText = "💾 Actualizar Contacto";
}

// ESTA ES TU FUNCIÓN PRINCIPAL DE GUARDADO
async function confirmarGuardado() {
    const formulario = document.getElementById('formularioAgenda');
    
    const usuarioActualRaw = document.getElementById('nombreUserDisplay').innerText;
    const usuarioActual = usuarioActualRaw.replace("👤", "").trim().toLowerCase() || "sebastian";

    const nombreRaw = document.getElementById('nombreContacto').value.trim().replace(/\s+/g, ' ');
    const nombre = nombreRaw.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    const telefonoRaw = document.getElementById('telefonoContacto').value.trim();
    const correoRaw = document.getElementById('correoContacto').value.trim();
    const apodo = document.getElementById('apodoContacto').value.trim();
    const grupoRaw = document.getElementById('grupoContacto').value.trim();

    // Solo validar si escribió algo, si está vacío usar "General" por defecto
    if (grupoRaw !== "" && grupoRaw.length < 2) {
        alert("⚠️ El nombre del grupo debe tener al menos 2 caracteres.");
        return;
    }
    if (grupoRaw !== "" && /^\d+$/.test(grupoRaw)) {
        alert("⚠️ El grupo no puede ser solo números.");
        return;
    }

    const NORMALIZAR_GRUPOS = {
        "sena": "SENA", "gym": "Gym", "general": "General",
        "universidad": "Universidad", "musica": "Música", "música": "Música"
    };

    const grupoNormalizado = NORMALIZAR_GRUPOS[grupoRaw.toLowerCase()] || 
                            (grupoRaw.charAt(0).toUpperCase() + grupoRaw.slice(1).toLowerCase());
    const grupo = grupoNormalizado || "General";
    const notas = document.getElementById('notasContacto').value.trim();

    const telefonoLimpio = telefonoRaw.replace(/\D/g, '').replace(/^57/, ''); 
    const correoLimpio = correoRaw.toLowerCase().trim();

    if (correoLimpio !== "") {
        const regexCorreo = /^[a-zA-Z0-9]([a-zA-Z0-9._%+-]*(?!\.\.))[a-zA-Z0-9]@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (correoLimpio.includes('..')) {
            alert("🚫 El correo no puede tener puntos seguidos.");
            return;
        }
        if (!regexCorreo.test(correoLimpio)) {
            alert("🚫 El correo no es válido. Ejemplo correcto: usuario@gmail.com");
            return;
        }
        if (!regexCorreo.test(correoLimpio)) {
            alert("🚫 El correo no es válido. Ejemplo correcto: usuario@gmail.com");
            return;
        }
    }

    if (nombre === "") {
        alert("⚠️ Error: El nombre no puede estar vacío.");
        return;
    }

    // --- NUEVO: límite de caracteres y sin emojis ---
    if (nombre.length > 50) {
        alert("⚠️ El nombre no puede tener más de 50 caracteres.");
        return;
    }
    if (/[\u{1F000}-\u{1FFFF}]/u.test(nombre)) {
        alert("⚠️ El nombre no puede contener emojis.");
        return;
    }

    if (telefonoLimpio === "") {
        alert("⚠️ Error: El campo de teléfono no puede estar vacío.");
        return; 
    }

    const datos = { 
        nombre, apodo, 
        correo: correoLimpio || undefined, 
        telefono: telefonoLimpio,
        grupo, notas, 
        usuarioOwner: usuarioActual 
    };

    // --- MODO EDICIÓN ---
    if (window.idContactoEnEdicion) {
        try {
            const respuesta = await fetch(`${SERVIDOR}/contactos/${window.idContactoEnEdicion}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            if (respuesta.ok) {
                alert("✅ Contacto actualizado con éxito.");
                window.idContactoEnEdicion = null;
                document.querySelector('#formularioAgenda .btn-nuevo').innerText = "Guardar en MongoDB";
                formulario.reset();
                volverAlInicio();
                await actualizarGruposDinamicos();
                await cargarContactos('General');
            } else {
                const resultado = await respuesta.json();
                if (resultado.code === 11000) {
                    alert("🚫 Ya tienes un contacto con ese teléfono o correo.");
                } else {
                    alert("❌ No se pudo actualizar: " + (resultado.mensaje || ""));
                }
            }
        } catch(e) {
            alert("❌ Error de conexión.");
        }
        return;
    }

    // --- MODO CREACIÓN NORMAL ---
    try {
        const respuesta = await fetch(`${SERVIDOR}/guardar`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(datos)
        });
        
        const resultado = await respuesta.json();
        
        if (respuesta.ok) {
            const grupoGuardado = grupo;
            alert("✅ ¡Contacto guardado con éxito!");
            formulario.reset(); 
            volverAlInicio();   
            await actualizarGruposDinamicos();
            await cargarContactos(grupoGuardado);
        } else {
            if (resultado.code === 11000) {
                alert("🚫 Error: Ya tienes un contacto registrado con este número de teléfono o correo.");
            } else if (resultado.error && resultado.error.includes("shorter than")) {
                alert("⚠️ El número de teléfono es muy corto. Por favor, verifica.");
            } else {
                alert("⚠️ Ups! Algo salió mal: " + (resultado.mensaje || "Error al procesar"));
            }
        }
    } catch (e) { 
        alert("❌ Error de conexión con el servidor."); 
    }
}

// --- BÚSQUEDA GLOBAL MEJORADA ---
document.getElementById('buscador').addEventListener('input', async (e) => {
    const termino = e.target.value.toLowerCase();
    const nombreDisplay = document.getElementById('nombreUserDisplay').innerText;
    const usuarioActual = nombreDisplay.replace("👤 ", "").trim() || "sebastian";

    // 1. Si el buscador se vacía, volvemos a la vista General (o la que prefieras)
    if (termino === "") {
        document.getElementById('tituloLista').innerText = "Todos los Contactos";
        filtrar('General'); 
        return;
    }

    try {
        // 2. Pedimos TODOS los contactos del usuario al servidor
        const respuesta = await fetch(`${SERVIDOR}/contactos?usuarioOwner=${usuarioActual.toLowerCase()}`);
        const todosLosContactos = await respuesta.json();

        // 3. Filtramos en el cliente para no saturar el servidor
        const filtrados = todosLosContactos.filter(c => {
            const nombre = c.nombre ? c.nombre.toLowerCase() : "";
            const apodo = c.apodo ? c.apodo.toLowerCase() : "";
            const telefono = c.telefono ? c.telefono : "";
            
            return nombre.includes(termino) || apodo.includes(termino) || telefono.includes(termino);
        });

        // 4. Mostramos los resultados con tu diseño de siempre
        document.getElementById('tituloLista').innerText = `Resultados para: "${termino}" (${filtrados.length})`;
        renderizarContactos(filtrados);

    } catch (error) {
        console.error("Error en búsqueda global:", error);
    }
});

// --- CORRECCIÓN DE CARGA FINAL ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Limpiamos el buscador
    const inputB = document.getElementById('buscador');
    if(inputB) inputB.value = "";

    // 2. ELIMINAMOS EL EVENTO ADDEVENTLISTENER QUE ESTABA AQUÍ
    // Porque ya tienes la "BÚSQUEDA GLOBAL MEJORADA" arriba (línea 504)

    // 3. Forzamos la carga de contactos de Sebastian
    const user = localStorage.getItem('usuarioAgenda') || "sebastian";
    const display = document.getElementById('nombreUserDisplay');
    if(display) display.innerText = "👤 " + user;
    
    // 4. Cargamos la lista inicial
    setTimeout(() => {
        actualizarGruposDinamicos(); // Esta es la que llena la lista de categorías
        filtrar('General');
    }, 500);
});