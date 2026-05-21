import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [usuario, setUsuario] = useState(
    JSON.parse(localStorage.getItem("usuario")) || null
  );

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [emailRecuperacion, setEmailRecuperacion] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [radicado, setRadicado] = useState("");
  const [proceso, setProceso] = useState("");
  const [demandante, setDemandante] = useState("");
  const [demandado, setDemandado] = useState("");
  const [juzgado, setJuzgado] = useState("");

  const [procesos, setProcesos] = useState([]);
  const [actuaciones, setActuaciones] = useState([]);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);

  const rutaActual = window.location.pathname;
  const esResetPassword = rutaActual.startsWith("/reset-password/");

  const resetToken = esResetPassword
    ? rutaActual.split("/reset-password/")[1]
    : "";

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  /*
  ========================================
  REGISTRO
  ========================================
  */

  const registrarse = async () => {
    try {
      await axios.post(`${API}/registro`, {
        nombre,
        email,
        password,
      });

      alert("Usuario registrado correctamente");
    } catch (error) {
      alert(error.response?.data?.error || "Error registrando usuario");
    }
  };

  /*
  ========================================
  LOGIN
  ========================================
  */

  const iniciarSesion = async () => {
    try {
      const respuesta = await axios.post(`${API}/login`, {
        email,
        password,
      });

      localStorage.setItem("token", respuesta.data.token);

      localStorage.setItem(
        "usuario",
        JSON.stringify(respuesta.data.usuario)
      );

      setToken(respuesta.data.token);
      setUsuario(respuesta.data.usuario);
    } catch (error) {
      alert(error.response?.data?.error || "Error iniciando sesión");
    }
  };

  /*
  ========================================
  RECUPERAR PASSWORD
  ========================================
  */

  const solicitarRecuperacion = async () => {
    try {
      await axios.post(`${API}/recuperar-password`, {
        email: emailRecuperacion,
      });

      alert(
        "Si el correo existe recibirás un enlace de recuperación"
      );

      setModoRecuperar(false);
      setEmailRecuperacion("");
    } catch (error) {
      alert(
        error.response?.data?.error ||
          "Error enviando recuperación"
      );
    }
  };

  /*
  ========================================
  RESET PASSWORD
  ========================================
  */

  const actualizarPassword = async () => {
    if (!nuevaPassword || !confirmarPassword) {
      alert("Completa ambos campos");
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    try {
      await axios.post(`${API}/reset-password`, {
        token: resetToken,
        password: nuevaPassword,
      });

      alert("Contraseña actualizada correctamente");

      window.history.pushState({}, "", "/");
      window.location.reload();
    } catch (error) {
      alert(
        error.response?.data?.error ||
          "Error actualizando contraseña"
      );
    }
  };

  /*
  ========================================
  CERRAR SESION
  ========================================
  */

  const cerrarSesion = () => {
    localStorage.clear();

    setToken("");
    setUsuario(null);
  };

  /*
  ========================================
  OBTENER PROCESOS
  ========================================
  */

  const obtenerProcesos = async () => {
    try {
      const respuesta = await axios.get(
        `${API}/procesos`,
        authHeaders
      );

      setProcesos(respuesta.data);
    } catch (error) {
      console.error(error);
    }
  };

  /*
  ========================================
  BUSCAR DATOS PROCESO
  ========================================
  */

  const buscarDatosProceso = async () => {
    try {
      const respuesta = await axios.get(
        `${API}/datos-proceso/${radicado}`,
        authHeaders
      );

      setProceso(
        `${respuesta.data.tipoProceso} - ${respuesta.data.claseProceso}`
      );

      setDemandante(respuesta.data.demandante);
      setDemandado(respuesta.data.demandado);
      setJuzgado(respuesta.data.juzgado);
    } catch (error) {
      alert("No se pudieron cargar los datos del proceso");
    }
  };

  /*
  ========================================
  GUARDAR PROCESO
  ========================================
  */

  const guardarProceso = async () => {
    try {
      await axios.post(
        `${API}/procesos`,
        {
          radicado,
          proceso,
          demandante,
          demandado,
          juzgado,
        },
        authHeaders
      );

      alert("Proceso guardado correctamente");

      obtenerProcesos();

      setRadicado("");
      setProceso("");
      setDemandante("");
      setDemandado("");
      setJuzgado("");
    } catch (error) {
      alert("Error guardando proceso");
    }
  };

  /*
  ========================================
  VER ACTUACIONES
  ========================================
  */

  const verActuaciones = async (proceso) => {
    try {
      if (procesoSeleccionado === proceso.id) {
        setProcesoSeleccionado(null);
        setActuaciones([]);
        return;
      }

      const respuesta = await axios.get(
        `${API}/procesos/${proceso.id}/actuaciones`,
        authHeaders
      );

      setActuaciones(respuesta.data);
      setProcesoSeleccionado(proceso.id);
    } catch (error) {
      alert("Error cargando actuaciones");
    }
  };

  /*
  ========================================
  ACTUALIZAR PROCESO
  ========================================
  */

  const actualizarProceso = async (proceso) => {
    try {
      await axios.get(
        `${API}/consultar/${proceso.radicado}`,
        authHeaders
      );

      alert("Proceso actualizado correctamente");
    } catch (error) {
      alert("Error actualizando proceso");
    }
  };

  useEffect(() => {
    if (token) {
      obtenerProcesos();
    }
  }, [token]);

  /*
  ========================================
  RESET PASSWORD VIEW
  ========================================
  */

  if (esResetPassword) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Restablecer contraseña</h1>

          <div className="auth-grid">
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
            />

            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
            />
          </div>

          <div className="auth-actions">
            <button
              className="btn btn-primary"
              onClick={actualizarPassword}
            >
              Guardar nueva contraseña
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
  ========================================
  LOGIN VIEW
  ========================================
  */

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Monitor Judicial</h1>

          {!modoRecuperar ? (
            <>
              <div className="auth-grid">
                <input
                  placeholder="Nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />

                <input
                  placeholder="Correo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="auth-actions">
                <button
                  className="btn btn-outline"
                  onClick={registrarse}
                >
                  Registrarse
                </button>

                <button
                  className="btn btn-primary"
                  onClick={iniciarSesion}
                >
                  Iniciar sesión
                </button>
              </div>

              <button
                className="link-button"
                onClick={() => setModoRecuperar(true)}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </>
          ) : (
            <>
              <p className="muted">
                Ingresa tu correo y te enviaremos un enlace para
                recuperar tu contraseña.
              </p>

              <div className="auth-grid">
                <input
                  placeholder="Correo registrado"
                  value={emailRecuperacion}
                  onChange={(e) =>
                    setEmailRecuperacion(e.target.value)
                  }
                />
              </div>

              <div className="auth-actions">
                <button
                  className="btn btn-primary"
                  onClick={solicitarRecuperacion}
                >
                  Enviar enlace
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => setModoRecuperar(false)}
                >
                  Volver al login
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    );
  }

  /*
  ========================================
  PANEL PRINCIPAL
  ========================================
  */

  return (
    <main className="page">
      <div className="container">
        <header className="topbar">
          <div>
            <h1>Monitor Judicial</h1>
            <p>
              Bienvenido <strong>{usuario?.nombre}</strong>
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </header>

        <section className="card">
          <h2>Agregar proceso</h2>

          <div className="form-layout">
            <input
              placeholder="Radicado"
              value={radicado}
              onChange={(e) => setRadicado(e.target.value)}
            />

            <button
              className="btn btn-primary"
              onClick={buscarDatosProceso}
            >
              Buscar datos
            </button>

            <input
              placeholder="Proceso"
              value={proceso}
              onChange={(e) => setProceso(e.target.value)}
            />

            <input
              placeholder="Demandante"
              value={demandante}
              onChange={(e) => setDemandante(e.target.value)}
            />

            <input
              placeholder="Demandado"
              value={demandado}
              onChange={(e) => setDemandado(e.target.value)}
            />

            <input
              placeholder="Juzgado"
              value={juzgado}
              onChange={(e) => setJuzgado(e.target.value)}
            />
          </div>

          <div className="save-row">
            <button
              className="btn btn-secondary"
              onClick={guardarProceso}
            >
              Guardar proceso
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Mis procesos</h2>

            <button
              className="btn btn-outline"
              onClick={obtenerProcesos}
            >
              Actualizar lista
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Radicado</th>
                  <th>Proceso</th>
                  <th>Demandante</th>
                  <th>Demandado</th>
                  <th>Juzgado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {procesos.map((item) => (
                  <tr key={item.id}>
                    <td>{item.radicado}</td>
                    <td>{item.proceso}</td>
                    <td>{item.demandante}</td>
                    <td>{item.demandado}</td>
                    <td>{item.juzgado}</td>

                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-outline small"
                          onClick={() => verActuaciones(item)}
                        >
                          Ver actuaciones
                        </button>

                        <button
                          className="btn btn-primary small"
                          onClick={() => actualizarProceso(item)}
                        >
                          Actualizar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {procesos.length === 0 && (
              <div className="empty">
                No tienes procesos guardados
              </div>
            )}
          </div>
        </section>

        {procesoSeleccionado && (
          <section className="card">
            <h2>Actuaciones judiciales</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Detalle</th>
                  </tr>
                </thead>

                <tbody>
                  {actuaciones.map((act) => (
                    <tr key={act.id}>
                      <td>{act.fecha}</td>

                      <td>
                        <strong>{act.actuacion}</strong>

                        {act.nueva === 1 && (
                          <span className="badge">NUEVO</span>
                        )}

                        <br />

                        <span className="muted">
                          {act.anotacion}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default App;