import { chromium } from "playwright";

const URL =
  "https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion";

const launchOptions = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-web-security",
    "--disable-features=IsolateOrigins,site-per-process",
  ],
};

export async function consultarDatosProceso(radicado) {
  const browser = await chromium.launch(launchOptions);

  try {
    const page = await browser.newPage();

    await page.goto(URL, {
      waitUntil: "networkidle",
      timeout: 120000,
    });

    await page.waitForTimeout(3000);

    await page.locator("input").first().fill(radicado);
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: /consultar|buscar/i }).click();
    await page.waitForTimeout(8000);

    const textoPagina = await page.locator("body").innerText();

    if (
      textoPagina.toLowerCase().includes("no se encontraron") ||
      textoPagina.toLowerCase().includes("sin resultados")
    ) {
      throw new Error("Proceso no encontrado");
    }

    const filas = await page.locator("table tbody tr").all();

    if (filas.length === 0) {
      throw new Error("No se encontraron datos del proceso");
    }

    const primeraFila = filas[0];
    const celdas = await primeraFila.locator("td").allInnerTexts();

    const textoCompleto = celdas.join(" | ");

    return {
      radicado,
      proceso: celdas[1] || "Proceso judicial",
      demandante: celdas[2] || "No identificado",
      demandado: celdas[3] || "No identificado",
      juzgado: celdas[4] || textoCompleto || "No identificado",
    };
  } finally {
    await browser.close();
  }
}

export async function consultarProceso(radicado) {
  const browser = await chromium.launch(launchOptions);

  try {
    const page = await browser.newPage();

    await page.goto(URL, {
      waitUntil: "networkidle",
      timeout: 120000,
    });

    await page.waitForTimeout(3000);

    await page.locator("input").first().fill(radicado);
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: /consultar|buscar/i }).click();
    await page.waitForTimeout(8000);

    const filas = await page.locator("table tbody tr").all();

    if (filas.length === 0) {
      throw new Error("No se encontraron actuaciones");
    }

    const actuaciones = [];

    for (const fila of filas) {
      const celdas = await fila.locator("td").allInnerTexts();

      actuaciones.push({
        fecha: celdas[0] || new Date().toISOString().slice(0, 10),
        actuacion: celdas[1] || celdas.join(" "),
        anotacion: celdas.slice(2).join(" | ") || "",
        categoria: "Actuación judicial",
      });
    }

    return actuaciones;
  } finally {
    await browser.close();
  }
}