const { appendFile } = require("fs");
const http = require("http");
const mongoose = require("mongoose");

// 1. CONFIGURACIÓN DINÁMICA DE BASE DE DATOS Y PUERTO
const url = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/Agenda2026";
const hostname = "0.0.0.0";

const express = require('express');
const app = express();
// RAILWAY TE ASIGNA EL PUERTO AUTOMÁTICAMENTE, SI NO, USA EL 3000
const port = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}/`);
});

mongoose
  .connect(url, {serverSelectionTimeoutMS: 2000}) //solo busca 2 segundos y sigue
  .then(() => console.log("✅ Conectado"))
  .catch((err) => console.error("⚠️ Mongo local no disponible en la nube, pero el servidor sigue vivo.", err));

const contactoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, maxlength: 70 },
  apodo: { type: String, maxlength: 30 },
  telefono: { 
    type: String, 
    required: true, 
    minlength: 7,  // Evita números incompletos
    maxlength: 15  // Evita que peguen textos gigantes en el campo de número
    },
  correo: { 
    type: String, 
    sparse: true, 
    lowercase: true, 
    trim: true,
    maxlength: 100 
  }, 
  notas: { type: String, maxlength: 1000 },
  grupo: { type: String, default: "General", maxlength: 25 },
// Cambia usuarioID por usuarioOwner para que coincida con tu script.js
  usuarioOwner: { type: String, default: "sebastian" }, 
});

const Contacto = mongoose.model("Contacto", contactoSchema);

// Esto evita que el servidor se apague si hay duplicados viejos en Compass
Contacto.createIndexes().catch(err => {
    console.log("⚠️ Nota sobre índices controlada.");
});

const server = http.createServer(async (req, res) => {
    // 1. CONFIGURACIÓN DE CABECERAS (CORS)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // 2. RUTA: LOGIN
    if (req.method === "POST" && req.url === "/login") {
        let body = "";
        req.on("data", (chunk) => { body += chunk.toString(); });
        req.on("end", async () => {
            try {
                const { usuario, clave } = JSON.parse(body);

                // Validación de formato
                if (clave.length < 6 || clave.length > 25 || !/\d/.test(clave)) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ mensaje: "La clave debe tener entre 6 y 25 caracteres y 1 número" }));
                }

                // Buscar si el usuario ya existe en la DB
                const usuarioExistente = await Contacto.findOne({ 
                    usuarioOwner: { $regex: new RegExp(`^${usuario}$`, 'i') } 
                });

                if (usuarioExistente) {
                    // Usuario conocido — verificar que la clave guardada coincida
                    const claveGuardada = await mongoose.connection.db
                        .collection('usuarios')
                        .findOne({ nombre: usuario.toLowerCase() });

                    if (claveGuardada && claveGuardada.clave !== clave) {
                        res.writeHead(401, { "Content-Type": "application/json" });
                        return res.end(JSON.stringify({ mensaje: "Contraseña incorrecta" }));
                    }
                }

                // Guardar o actualizar usuario en colección 'usuarios'
                await mongoose.connection.db.collection('usuarios').updateOne(
                    { nombre: usuario.toLowerCase() },
                    { $set: { nombre: usuario.toLowerCase(), clave: clave } },
                    { upsert: true }
                );

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ mensaje: "Bienvenido", usuario }));

            } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ mensaje: "Datos de login inválidos" }));
            }
        });
        return //Detiene la ejecución para que no pase la ruta de abajo
    }

    // 4. RUTA: GUARDAR CONTACTO
    else if (req.method === "POST" && req.url === "/guardar") {
        let body = "";
        req.on("data", (chunk) => { body += chunk.toString(); });
        req.on("end", async () => {
            try {
                const datos = JSON.parse(body);

                // --- VALIDACIÓN DE DUPLICADOS POR USUARIO ---
                const duplicado = await Contacto.findOne({
                    usuarioOwner: { $regex: new RegExp(`^${datos.usuarioOwner}$`, 'i') },
                    $or: [
                        { telefono: datos.telefono },
                        ...(datos.correo ? [{ correo: datos.correo }] : [])
                    ]
                });

                if (duplicado) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ code: 11000, mensaje: "Ya tienes un contacto con ese teléfono o correo." }));
                }
                // --- FIN VALIDACIÓN ---

                const nuevoContacto = new Contacto(datos);
                await nuevoContacto.save();

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ mensaje: "Contacto guardado y protegido" }));
            } catch (err) {
                console.log("❌ Error al guardar:", err.message);
                
                // --- AJUSTE AQUÍ ---
                res.writeHead(400, { "Content-Type": "application/json" });
                if (err.code === 11000) {
                    res.end(JSON.stringify({ code: 11000, mensaje: "El teléfono o correo ya existen" }));
                } else {
                    res.end(JSON.stringify({ mensaje: "No se pudo guardar", error: err.message }));
                }
            }
        });
        return;
    }

    
    // 5. RUTA: OBTENER CONTACTOS
    else if (req.method === "GET" && req.url.startsWith("/contactos")) {
        try{
            const urlParams = new URL(req.url, `http://${hostname}:${port}`);
            const grupo = urlParams.searchParams.get("grupo");
            const usuarioLogueado = urlParams.searchParams.get("usuarioOwner") || urlParams.searchParams.get("usuario");  

            // Filtro "inteligente": busca en usuarioOwner O en usuarioID, ignorando mayúsculas
            let filtro = {
                $or: [
                    { usuarioOwner: { $regex: new RegExp(`^${usuarioLogueado}$`, 'i') } },
                    { usuarioID: { $regex: new RegExp(`^${usuarioLogueado}$`, 'i') } }
                ]
            };

            if (grupo && grupo !== "General") {
                filtro.grupo = grupo;
            }

            const contactos = await Contacto.find(filtro);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(contactos));
        } catch (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({mensaje: "Error al obtener contactos", error: err.message}));
        }
        return;
    }

        // 4.5 RUTA: OBTENER UN CONTACTO POR ID
    else if (req.method === "GET" && req.url.startsWith("/contactos/")) {
        const id = req.url.split("/")[2];
        try {
            const contacto = await Contacto.findById(id);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(contacto));
        } catch (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ mensaje: "Error al obtener contacto" }));
        }
    }

    // 5. RUTA: ELIMINAR CONTACTO
    else if (req.method === "DELETE" && req.url.startsWith("/contactos/")) {
        const id = req.url.split("/")[2]; // Extrae el ID de la URL
        try {
            await Contacto.findByIdAndDelete(id);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ mensaje: "Contacto eliminado correctamente" }));
        } catch (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ mensaje: "Error al eliminar" }));
        }
    }

    // 6. RUTA: ACTUALIZAR CONTACTO (EDITAR)
    else if (req.method === "PUT" && req.url.startsWith("/contactos/")) {
            const id = req.url.split("/")[2];
            let body = "";
            req.on("data", chunk => { body += chunk.toString(); });
            req.on("end", async () => {
                try {
                    const datosActualizados = JSON.parse(body);
                    await Contacto.findByIdAndUpdate(id, datosActualizados, { runValidators: true });
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ mensaje: "Contacto actualizado" }));
                } catch (err) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    if (err.code === 11000) {
                        res.end(JSON.stringify({ code: 11000, mensaje: "El teléfono o correo ya existen" }));
                    } else {
                        res.end(JSON.stringify({ mensaje: "Error al actualizar", error: err.message }));
                    }
            }
        });
        }

    // 7. RUTA NO ENCONTRADA / CONTROL PRINCIPAL
    else {
        // Si entra a la página principal limpia de Railway, avisa que el backend funciona
        if (req.url === "/" || req.url === ""){
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({
                estado: "ONLINE",
                proyecto: "Backend Agend 2026 - Universidad Surcolombiana",
                mensaje: "¡Servidor API y Base de Datos conectados con éxito en la nube!"
            }));
        }

        //Para cualquier otra ruta loca que escriban
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ mensaje: "Ruta no encontrada" }));
    }
});

    // Finalizar con el listen
    server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});