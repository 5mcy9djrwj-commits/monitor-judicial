import Database from "better-sqlite3";

const db = new Database("procesos.db");

db.prepare(`
CREATE TABLE IF NOT EXISTS procesos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  radicado TEXT UNIQUE,
  proceso TEXT,
  demandante TEXT,
  demandado TEXT,
  juzgado TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS actuaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proceso_id INTEGER,
  fecha TEXT,
  actuacion TEXT,
  anotacion TEXT,
  fecha_registro TEXT,
  nueva INTEGER DEFAULT 1,
  categoria TEXT
)
`).run();

try {
  db.prepare(`
    ALTER TABLE actuaciones
    ADD COLUMN nueva INTEGER DEFAULT 1
  `).run();
} catch (error) {
  // ya existe
}

try {
  db.prepare(`
    ALTER TABLE actuaciones
    ADD COLUMN categoria TEXT
  `).run();
} catch (error) {
  // ya existe
}

db.prepare(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_actuaciones_unicas
  ON actuaciones (proceso_id, fecha, actuacion, anotacion)
`).run();
db.prepare(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT,
  email TEXT UNIQUE,
  password TEXT
)
`).run();

try {
  db.prepare(`
    ALTER TABLE procesos
    ADD COLUMN usuario_id INTEGER
  `).run();
} catch (error) {
  // ya existe
}

db.prepare(`
CREATE TABLE IF NOT EXISTS alertas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  proceso_id INTEGER,
  asunto TEXT,
  mensaje TEXT,
  enviada INTEGER DEFAULT 0,
  fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP
)
`).run();
try {
  db.prepare(`
    ALTER TABLE usuarios
    ADD COLUMN reset_token TEXT
  `).run();
} catch (error) {}

try {
  db.prepare(`
    ALTER TABLE usuarios
    ADD COLUMN reset_expira TEXT
  `).run();
} catch (error) {}

export default db;