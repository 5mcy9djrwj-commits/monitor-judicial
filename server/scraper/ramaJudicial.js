import { chromium } from "playwright";

export async function consultarProceso(radicado) {
  const browser = await chromium.launch({
    headless: true,
    slowMo: 700,
  });

  const page = await browser.newPage();

  await page.goto(
    "https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion",
    { waitUntil: "networkidle" }
  );

  await page.fill(
    'input[placeholder="Ingrese los 23 dígitos del número de Radicación"]',
    radicado
  );

  await page.waitForTimeout(2000);

  await page.getByText("CONSULTAR").click();

  await page.waitForTimeout(8000);

  await page.getByText(radicado).click();

  await page.waitForTimeout(8000);

  await page.getByRole("tab", { name: "Actuaciones" }).click();

  await page.waitForTimeout(10000);

  const filas = await page.locator("tr").allTextContents();

  const actuaciones = [];

  for (const fila of filas) {
    if (
      fila.includes("Fecha de Actuación") ||
      fila.includes("Fecha de consulta") ||
      fila.includes("Fecha de Radicación")
    ) {
      continue;
    }

    const coincideFecha = fila.match(/^(\d{4}-\d{2}-\d{2})/);

    if (coincideFecha) {
      const fecha = coincideFecha[1];

      let resto = fila.replace(fecha, "").trim();

      resto = resto.replace(/\d{4}-\d{2}-\d{2}/g, "").trim();

      const patrones = [
        "Fijacion estado",
        "Notificación por Edicto",
        "Sentencia 2da. instancia confirmada",
        "Recepcion recurso Casación",
        "Presentacion Alegatos Demandante",
        "Presentacion Alegatos Demandado",
        "Auto de Trámite",
        "Recepción memorial",
        "Auto termina proceso por Pago",
        "Auto aprueba liquidación",
        "Auto Mod. Liquid. Credito Presentada",
        "Auto ordena oficiar",
        "Auto ordena correr traslado",
        "Auto requiere",
        "Elaboración de oficios",
        "Auto obedézcase y cúmplase",
        "Recepción expediente",
        "Auto decreta medida cautelar",
        "Auto admite recurso apelación",
        "Reparto del Proceso",
      ];

      let actuacion = resto;
      let anotacion = "";

      for (const patron of patrones) {
        if (resto.startsWith(patron)) {
          actuacion = patron;

          anotacion = resto
            .replace(patron, "")
            .replace(/\d{4}-\d{2}-\d{2}/g, "")
            .replace(/\s+/g, " ")
            .trim();

          anotacion = anotacion
            .replace(/^Casacion/, "Casación ")
            .replace(/^ALEGATOS/, "ALEGATOS ")
            .replace(/^Actuación registrada/, "Actuación registrada ")
            .replace(/^Demandante/, "Demandante ")
            .replace(/^Demandado/, "Demandado ")
            .trim();

          break;
        }
      }

      let categoria = "General";

      const textoClasificar = `${actuacion} ${anotacion}`.toLowerCase();

      if (textoClasificar.includes("sentencia")) {
        categoria = "Sentencia";
      } else if (textoClasificar.includes("recurso")) {
        categoria = "Recurso";
      } else if (textoClasificar.includes("embargo")) {
        categoria = "Medida cautelar";
      } else if (
        textoClasificar.includes("termina proceso") ||
        textoClasificar.includes("terminacion") ||
        textoClasificar.includes("terminación")
      ) {
        categoria = "Terminación";
      } else if (
        textoClasificar.includes("liquidacion") ||
        textoClasificar.includes("liquidación")
      ) {
        categoria = "Liquidación";
      } else if (textoClasificar.includes("memorial")) {
        categoria = "Memorial";
      } else if (textoClasificar.includes("estado")) {
        categoria = "Estado";
      }

      actuaciones.push({
        fecha,
        actuacion,
        anotacion,
        categoria,
      });
    }
  }

  await browser.close();

  return actuaciones;
}

export async function consultarDatosProceso(radicado) {
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu"
  ]
});

  const page = await browser.newPage();

  await page.goto(
    "https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion",
    { waitUntil: "networkidle" }
  );

  await page.fill(
    'input[placeholder="Ingrese los 23 dígitos del número de Radicación"]',
    radicado
  );

  await page.waitForTimeout(2000);

  await page.getByText("CONSULTAR").click();

  await page.waitForTimeout(8000);

  let resultado = page.getByText(radicado);

  if ((await resultado.count()) === 0) {
    console.log("No encontrado en recientes. Buscando en todos los procesos...");

    await page.getByText("Regresar a opciones de Consulta").click();

    await page.waitForTimeout(3000);

    await page.getByText("Todos los Procesos").click();

    await page.waitForTimeout(1000);

    await page.fill(
      'input[placeholder="Ingrese los 23 dígitos del número de Radicación"]',
      radicado
    );

    await page.waitForTimeout(1000);

    await page.getByText("CONSULTAR").click();

    await page.waitForTimeout(12000);

    resultado = page.getByText(radicado);
  }

  await resultado.first().click();

  await page.waitForTimeout(8000);

  const textoDatos = await page.textContent("body");

  let juzgado = "";
  let tipoProceso = "";
  let claseProceso = "";

  const despachoMatch = textoDatos.match(/Despacho:(.*?)Ponente:/);
  if (despachoMatch) {
    juzgado = despachoMatch[1].trim();
  }

  const tipoMatch = textoDatos.match(/Tipo de Proceso:(.*?)Clase de Proceso:/);
  if (tipoMatch) {
    tipoProceso = tipoMatch[1].trim();
  }

  const claseMatch = textoDatos.match(
    /Clase de Proceso:(.*?)Subclase de Proceso:/
  );
  if (claseMatch) {
    claseProceso = claseMatch[1].trim();
  }

  await page.getByText("Sujetos Procesales").last().click();

  await page.waitForTimeout(5000);

  const textoSujetos = await page.textContent("body");

  let demandante = "";
  let demandado = "";

  const demandanteMatch = textoSujetos.match(
    /Demandante(.*?)(Demandado|Politicas de Privacidad|Resultados encontrados)/s
  );

  if (demandanteMatch) {
    demandante = demandanteMatch[1]
      .replace(/Nombre|Tipo|Nombre o Razón Social/g, "")
      .trim();
  }

  const demandadoMatch = textoSujetos.match(
    /Demandado(.*?)(Politicas de Privacidad|Resultados encontrados)/s
  );

  if (demandadoMatch) {
    demandado = demandadoMatch[1]
      .replace(/Nombre|Tipo|Nombre o Razón Social/g, "")
      .trim();
  }

  await browser.close();

  return {
    radicado,
    demandante,
    demandado,
    juzgado,
    tipoProceso,
    claseProceso,
  };
}