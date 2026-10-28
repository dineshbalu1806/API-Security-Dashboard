const puppeteer = require("puppeteer");
const puppeteerCore = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const { renderReportHtml } = require("./templates/reportTemplate");

const generateScanReport = async ({ project, scan, findings }) => {
  const browser = process.env.VERCEL
    ? await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })
    : await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.setContent(renderReportHtml({ project, scan, findings }), { waitUntil: "networkidle0" });
    return await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
};

module.exports = { generateScanReport };