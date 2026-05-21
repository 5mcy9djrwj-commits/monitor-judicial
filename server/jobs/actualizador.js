import cron from "node-cron";
import db from "../db.js";
import { consultarProceso } from "../scraper/ramaJudicial.js";
import { enviarCorreo } from "../email.js";
import fs from "fs";

export function iniciarActualizacionAutomatica() {
    console.log("Actualizador automático cargado correctamente");
  cron.schedule("0 8,12,15,18 * * *", async () => {
    console.log("Iniciando actualización automática de procesos...");
const ahora = new Date().toISOString();

fs.appendFileSync(

  "actualizaciones.log",

  `\n[${ahora}] Inicio actualización automática`

);
    const procesos = db.prepare("SELECT * FROM procesos").all();

    for (const proceso of procesos) {
      try {
        console.log("Actualizando proceso:", proceso.radicado);

        const actuaciones = await consultarProceso(proceso.radicado);

        const insertarActuacion = db.prepare(`
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
          const resultado = insertarActuacion.run(
            proceso.id,
            act.fecha,
            act.actuacion,
            act.anotacion,
            act.fecha,
            act.categoria
          );

          if (resultado.changes > 0) {
            nuevas++;
            await enviarCorreo(
  proceso.usuario_email,
  `Nueva actuación judicial - ${proceso.radicado}`,
  `
Hola ${proceso.usuario_nombre},

Se detectó una nueva actuación judicial.

Radicado: ${proceso.radicado}
Fecha: ${act.fecha}
Categoría: ${act.categoria}
Actuación: ${act.actuacion}

Detalle:
${act.anotacion}

Monitor Judicial
`
);
          }
        }

        console.log(
          `Proceso ${proceso.radicado} actualizado. Nuevas actuaciones: ${nuevas}`
        );
        fs.appendFileSync(

  "actualizaciones.log",

  `\nProceso ${proceso.radicado} actualizado`

);
      } catch (error) {
        console.error("Error actualizando proceso:", proceso.radicado);
        console.error(error);
      }
    }

    console.log("Actualización automática finalizada.");
  });
  fs.appendFileSync(
  "actualizaciones.log",

  `\n[${new Date().toISOString()}] Fin actualización automática\n`
);
}