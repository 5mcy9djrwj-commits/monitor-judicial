import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import db from "./db.js";
import { enviarCorreo } from "./email.js";

import {
  consultarProceso,
  consultarDatosProceso,
} from "./scraper/ramaJudicial.js";

import { iniciarActualizacionAutomatica } from "./jobs/actualizador.js";

dotenv.config();

const app = express();

/*
========================================
CORS PRODUCCIÓN
========================================
*/

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://monitor-judicial-two.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

/*
========================================
JOB AUTOMÁTICO
========================================
*/

iniciarActualizacionAutomatica();

/*
========================================
MIDDLEWARE JWT
========================================
*/

function autenticarUsuario(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token requerido",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const usuario = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido",
    });
  }
}

/*
========================================
TEST
========================================
*/

app.get("/", (req, res) => {
  res.send("Servidor judicial funcionando");
});

/*
========================================
PRUEBA EMAIL
========================================
*/

app.get("/test-email", async (req, res) => {
  try {
    await enviarCorreo(
      "yulianvalencia40@gmail.com",
      "Prueba Monitor Judicial",
      `
Correo de prueba enviado correctamente.

Monitor Judicial funcionando correctamente.
`
    );

    res.json({
      ok: true,
      mensaje: "Correo enviado correctamente",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/*
========================================
REGISTRO
========================================
*/

app.post("/registro", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        error: "Nombre, email y contraseña son obligatorios",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(`
      INSERT INTO usuarios (
        nombre,
        email,
        password
      )
      VALUES (?, ?, ?)
    `).run(
      nombre.trim(),
      email.trim().toLowerCase(),
      passwordHash
    );

    res.json({
      mensaje: "Usuario registrado correctamente",
    });
  } catch (error) {
    console.error(error);

    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "Ese correo ya está registrado",
      });
    }

    res.status(500).json({
      error: "Error registrando usuario",
    });
  }
});

/*
========================================
LOGIN
========================================
*/

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = db
      .prepare(`
        SELECT *
        FROM usuarios
        WHERE email = ?
      `)
      .get(email.trim().toLowerCase());

    if (!usuario) {
      return res.status(401).json({
        error: "Usuario no encontrado",
      });
    }

    const passwordValida = await bcrypt.compare(
      password,
      usuario.password
    );

    if (!passwordValida) {
      return res.status(401).json({
        error: "Contraseña incorrecta",
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    res.json({
      mensaje: "Login correcto",
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error iniciando sesión",
    });
  }
});

/*
========================================
RECUPERAR CONTRASEÑA
========================================
*/

app.post("/recuperar-password", async (req, res) => {
  try {
    const { email } = req.body;

    const usuario = db
      .prepare(`
        SELECT *
        FROM usuarios
        WHERE email = ?
      `)
      .get(email.trim().toLowerCase());

    if (!usuario) {
      return res.json({
        mensaje:
          "Si el correo existe, se enviará un enlace de recuperación",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const expira = new Date(
      Date.now() + 60 * 60 * 1000
    ).toISOString();

    db.prepare(`
      UPDATE usuarios
      SET
        reset_token = ?,
        reset_expira = ?
      WHERE id = ?
    `).run(token, expira, usuario.id);

    const enlace = `https://monitor-judicial-two.vercel.app/reset-password/${token}`;

    await enviarCorreo(
      usuario.email,
      "Recuperación de contraseña - Monitor Judicial",
      `
Hola ${usuario.nombre},

Recibimos una solicitud para recuperar tu contraseña.

Haz clic en este enlace para crear una nueva contraseña:

${enlace}

Este enlace expirará en 1 hora.

Si no solicitaste este cambio puedes ignorar este correo.

Monitor Judicial
`
    );

    res.json({
      mensaje:
        "Si el correo existe, se enviará un enlace de recuperación",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error enviando recuperación de contraseña",
    });
  }
});

/*
========================================
RESET PASSWORD
========================================
*/

app.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    const usuario = db
      .prepare(`
        SELECT *
        FROM usuarios
        WHERE reset_token = ?
      `)
      .get(token);

    if (!usuario) {
      return res.status(400).json({
        error: "Token inválido",
      });
    }

    if (new Date(usuario.reset_expira) < new Date()) {
      return res.status(400).json({
        error: "El enlace expiró",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(`
      UPDATE usuarios
      SET
        password = ?,
        reset_token = NULL,
        reset_expira = NULL
      WHERE id = ?
    `).run(passwordHash, usuario.id);

    res.json({
      mensaje: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error actualizando contraseña",
    });
  }
});

/*
========================================
DATOS PROCESO
========================================
*/

app.get("/datos-proceso/:radicado", autenticarUsuario, async (req, res) => {
  try {
    const { radicado } = req.params;

    console.log("Consultando datos del proceso:", radicado);

    const datos = await consultarDatosProceso(radicado);

    res.json(datos);
  } catch (error) {
    console.error("ERROR DETALLADO EN /datos-proceso:");
    console.error(error);

    res.status(500).json({
      error: "Error consultando datos del proceso",
    });
  }
});

/*
========================================
GUARDAR PROCESO
========================================
*/

app.post("/procesos", autenticarUsuario, async (req, res) => {
  try {
    const {
      radicado,
      proceso,
      demandante,
      demandado,
      juzgado,
    } = req.body;

    const sentencia = db.prepare(`
      INSERT OR IGNORE INTO procesos (
        radicado,
        proceso,
        demandante,
        demandado,
        juzgado,
        usuario_id
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const resultado = sentencia.run(
      radicado,
      proceso,
      demandante,
      demandado,
      juzgado,
      req.usuario.id
    );

    if (resultado.changes > 0) {
      try {
        await enviarCorreo(
          req.usuario.email,
          `Nuevo proceso registrado - ${radicado}`,
          `
Hola ${req.usuario.nombre},

Se registró un nuevo proceso en Monitor Judicial.

Radicado: ${radicado}
Proceso: ${proceso}
Demandante: ${demandante}
Demandado: ${demandado}
Juzgado: ${juzgado}

Monitor Judicial
`
        );
      } catch (correoError) {
        console.error("El proceso se guardó, pero falló el correo:");
        console.error(correoError.message);
      }
    }

    res.json({
      mensaje:
        resultado.changes > 0
          ? "Proceso guardado correctamente"
          : "El proceso ya estaba registrado",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error guardando proceso",
    });
  }
});

/*
========================================
LISTAR PROCESOS
========================================
*/

app.get("/procesos", autenticarUsuario, (req, res) => {
  try {
    const procesos = db
      .prepare(`
        SELECT *
        FROM procesos
        WHERE usuario_id = ?
        ORDER BY id DESC
      `)
      .all(req.usuario.id);

    res.json(procesos);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error listando procesos",
    });
  }
});

/*
========================================
VER ACTUACIONES
========================================
*/

app.get("/procesos/:id/actuaciones", autenticarUsuario, (req, res) => {
  try {
    const { id } = req.params;

    const proceso = db
      .prepare(`
        SELECT *
        FROM procesos
        WHERE id = ? AND usuario_id = ?
      `)
      .get(id, req.usuario.id);

    if (!proceso) {
      return res.status(404).json({
        error: "Proceso no encontrado",
      });
    }

    const actuaciones = db
      .prepare(`
        SELECT *
        FROM actuaciones
        WHERE proceso_id = ?
        ORDER BY fecha DESC
      `)
      .all(id);

    db.prepare(`
      UPDATE actuaciones
      SET nueva = 0
      WHERE proceso_id = ?
    `).run(id);

    res.json(actuaciones);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error obteniendo actuaciones",
    });
  }
});

/*
========================================
CONSULTAR ACTUACIONES
========================================
*/

app.get("/consultar/:radicado", autenticarUsuario, async (req, res) => {
  try {
    const { radicado } = req.params;

    console.log("Consultando actuaciones:", radicado);

    const proceso = db
      .prepare(`
        SELECT *
        FROM procesos
        WHERE radicado = ?
        AND usuario_id = ?
      `)
      .get(radicado, req.usuario.id);

    if (!proceso) {
      return res.status(404).json({
        error: "Proceso no encontrado",
      });
    }

    const actuaciones = await consultarProceso(radicado);

    const insertar = db.prepare(`
      INSERT OR IGNORE INTO actuaciones (
        proceso_id,
        fecha,
        actuacion,
        anotacion,
        fecha_registro,
        nueva,
        categoria
      )
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `);

    let nuevas = 0;

    for (const act of actuaciones) {
      const resultado = insertar.run(
        proceso.id,
        act.fecha,
        act.actuacion,
        act.anotacion,
        act.fecha,
        act.categoria
      );

      if (resultado.changes > 0) {
        nuevas++;

        try {
          await enviarCorreo(
            req.usuario.email,
            `Nueva actuación judicial - ${radicado}`,
            `
Hola ${req.usuario.nombre},

Se detectó una nueva actuación judicial.

Radicado: ${radicado}

Fecha: ${act.fecha}

Categoría: ${act.categoria}

Actuación:
${act.actuacion}

Detalle:
${act.anotacion}

Monitor Judicial
`
          );
        } catch (correoError) {
          console.error("Error enviando correo:");
          console.error(correoError.message);
        }
      }
    }

    res.json({
      mensaje: "Consulta realizada",
      total: actuaciones.length,
      nuevas,
      actuaciones,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error consultando actuaciones",
    });
  }
});

/*
========================================
SERVIDOR
========================================
*/

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Servidor backend activo en puerto ${PORT}`);
});

/*
========================================
KEEP ALIVE
========================================
*/

setInterval(() => {}, 1000);

/*
========================================
CIERRE CONTROLADO
========================================
*/

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Servidor cerrado");
    process.exit(0);
  });
});