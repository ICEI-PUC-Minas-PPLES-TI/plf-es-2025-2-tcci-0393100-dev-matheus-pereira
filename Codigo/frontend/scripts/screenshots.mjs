/**
 * Captura screenshots de todas as páginas do frontend.
 *
 * Pré-requisitos:
 *   1. npm run screenshots:install   (só na primeira vez — baixa o Chromium)
 *   2. Subir o app com mock:         npm run dev:screenshots
 *   3. Em outro terminal:           npm run screenshots
 *
 * Variáveis opcionais:
 *   SCREENSHOT_BASE_URL  (padrão: http://localhost:5173)
 *   SCREENSHOT_DIR       (padrão: screenshots)
 *   SCREENSHOT_VIEWPORT  (padrão: 1440x900)
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BASE_URL = (process.env.SCREENSHOT_BASE_URL ?? "http://localhost:5173").replace(/\/$/, "");
const OUT_DIR = path.resolve(ROOT, process.env.SCREENSHOT_DIR ?? "screenshots");
const [VIEWPORT_W, VIEWPORT_H] = (process.env.SCREENSHOT_VIEWPORT ?? "1440x900")
  .split("x")
  .map((n) => Number.parseInt(n, 10));

const AUTH_KEYS = {
  token: "sgi_token",
  display: "sgi_user_display",
  login: "sgi_user_login",
  profile: "sgi_user_profile",
};

const PUBLIC_ROUTES = [
  { path: "/", name: "00-landing" },
  { path: "/login", name: "01-login" },
];

const PROTECTED_ROUTES = [
  { path: "/dashboard", name: "10-dashboard" },
  { path: "/clientes", name: "11-clientes" },
  { path: "/inadimplentes", name: "12-inadimplentes" },
  { path: "/servicos", name: "13-servicos" },
  { path: "/reforma-tributaria", name: "15-reforma-tributaria" },
  { path: "/usuarios/cadastro", name: "16-usuarios-cadastro" },
];

const RELATORIO_TABS = [
  "Ranking Devedores",
  "Extrato por Cliente",
  "Inadimplência por Período",
  "Pagamentos Recebidos",
  "Aging",
  "Efetividade Cobrança",
];

const USUARIOS_TABS = ["Cadastros pendentes", "Contas ativas"];

function slugify(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function assertServerUp() {
  try {
    const res = await fetch(BASE_URL, { redirect: "manual" });
    if (!res.ok && res.status >= 500) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (error) {
    console.error(`\nErro: não foi possível acessar ${BASE_URL}`);
    console.error("Suba o app antes de rodar os screenshots, por exemplo:");
    console.error("  npm run dev:screenshots\n");
    throw error;
  }
}

function seedAuthInPage({ keys, profile }) {
  const isProprietaria = profile === "PROPRIETARIA";
  window.localStorage.setItem(keys.token, "screenshot-session");
  window.localStorage.setItem(keys.display, isProprietaria ? "Proprietária" : "Responsável Financeiro");
  window.localStorage.setItem(keys.login, isProprietaria ? "proprietaria" : "financeiro");
  window.localStorage.setItem(keys.profile, profile);
}

async function ensureAuth(page) {
  const url = page.url();
  if (!url.startsWith(BASE_URL)) return;
  await page.evaluate(seedAuthInPage, { keys: AUTH_KEYS, profile: "PROPRIETARIA" });
}

async function waitForPageReady(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main.main-content").first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(900);
}

async function capture(page, fileName) {
  const filePath = path.join(OUT_DIR, `${fileName}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  ✓ ${path.relative(ROOT, filePath)}`);
}

async function captureRoute(page, route, { auth = false } = {}) {
  await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "domcontentloaded" });
  if (auth) await ensureAuth(page);
  await waitForPageReady(page);
  if (auth) await ensureAuth(page);
  await capture(page, route.name);
}

async function captureTabs(page, { pageSelector, tabLabels, namePrefix }) {
  await page.goto(`${BASE_URL}${pageSelector.path}`, { waitUntil: "domcontentloaded" });
  await ensureAuth(page);
  await waitForPageReady(page);
  await ensureAuth(page);

  const tabLocator = page.locator(`${pageSelector.root} [role="tab"]`);
  try {
    await tabLocator.first().waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    console.warn(`  ! Abas não encontradas em ${pageSelector.path}; capturando estado atual da página.`);
    await capture(page, `${namePrefix}-pagina`);
    return;
  }

  for (const label of tabLabels) {
    const tab = tabLocator.filter({ hasText: label }).first();
    if ((await tab.count()) === 0) {
      console.warn(`  ! Aba não encontrada: ${label}`);
      continue;
    }
    await tab.click({ timeout: 15_000 });
    await waitForPageReady(page);
    await ensureAuth(page);
    await capture(page, `${namePrefix}-${slugify(label)}`);
  }
}

async function main() {
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Saída:    ${OUT_DIR}`);
  console.log(`Viewport: ${VIEWPORT_W}x${VIEWPORT_H}`);
  console.log("Dica: suba o app com mock usando: npm run dev:screenshots\n");

  await assertServerUp();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const publicContext = await browser.newContext({
      viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
      locale: "pt-BR",
    });
    const publicPage = await publicContext.newPage();

    console.log("Páginas públicas:");
    for (const route of PUBLIC_ROUTES) {
      await captureRoute(publicPage, route);
    }
    await publicContext.close();

    const authContext = await browser.newContext({
      viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
      locale: "pt-BR",
    });
    await authContext.addInitScript(seedAuthInPage, {
      keys: AUTH_KEYS,
      profile: "PROPRIETARIA",
    });
    const authPage = await authContext.newPage();

    console.log("\nPáginas autenticadas:");
    for (const route of PROTECTED_ROUTES) {
      await captureRoute(authPage, route, { auth: true });
    }

    console.log("\nAbas de Relatórios:");
    await captureTabs(authPage, {
      pageSelector: { path: "/relatorios", root: ".page-relatorios" },
      tabLabels: RELATORIO_TABS,
      namePrefix: "14-relatorios",
    });

    console.log("\nAbas de Usuários:");
    await captureTabs(authPage, {
      pageSelector: { path: "/usuarios", root: ".page-usuarios" },
      tabLabels: USUARIOS_TABS,
      namePrefix: "17-usuarios",
    });

    await authContext.close();
  } finally {
    await browser.close();
  }

  const count = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".png")).length;
  console.log(`\nConcluído: ${count} screenshot(s) em ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
