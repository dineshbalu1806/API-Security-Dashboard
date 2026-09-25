const puppeteer = require("puppeteer");
const { renderReportHtml } = require("./templates/reportTemplate");

const generateScanReport = async ({ project, scan, findings }) => {
  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.setContent(renderReportHtml({ project, scan, findings }), { waitUntil: "networkidle0" });
    return await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
};

module.exports = { generateScanReport };