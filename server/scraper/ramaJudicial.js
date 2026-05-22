import { chromium } from "playwright";

const URL =
  "https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion";

export async function consultarDatosProceso(radicado) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ],
  });

  try {
    const page = await browser.newPage();

    console.log("Consultando proceso:", radicado);

    await page.goto(URL, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    await page.waitForTimeout(4000);

    // Input radicado
    await page.fill('input[type="text"]', radicado);

    await page.waitForTimeout(1000);

    // Botón buscar
    await page.click('button[type="submit"]');

    await page.waitForTimeout(8000);

    // Verificar resultados
    const existeProceso = await page.locator("table").count();

    if (!existeProceso) {
      throw new Error("No se encontraron resultados");
    }

    // Extraer datos básicos
    const proceso = await page.locator("table tbody tr").first();

    const texto = await proceso.innerText();

    console.log("Resultado encontrado");

    return {
      exito: true,
      datos: {
        radicado,
        informacion: texto,
      },
    };
  } catch (error) {
    console.error("ERROR SCRAPER RAMA JUDICIAL:");
    console.error(error);

    return {
      exito: false,
      error: error.message,
    };
  } finally {
    await browser.close();
  }
}