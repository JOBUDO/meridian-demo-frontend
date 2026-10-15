import { test, expect } from "@playwright/test";
// EXPLICIT TEST-ONLY HTTP MOCKS: these are never bundled into production.
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`sandbox UI test-only API mocks ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const requests = [];
    let cancelled = false,
      placed = false;
    const order = {
      id: "test-order",
      symbol: "BTC-USDT",
      side: "buy",
      type: "limit",
      quantity: "0.01",
      price: "60000",
      status: "open",
      filled_quantity: "0",
      created_at: "2026-01-01T00:00:00Z",
    };
    await page.route("http://127.0.0.1:8000/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      requests.push({
        path,
        method: req.method(),
        body: req.postDataJSON(),
        authorization: req.headers().authorization,
      });
      let body;
      if (path === "/api/auth/login")
        body = {
          token: "test-only-memory-token",
          user: { id: "test-user", username: "test-only", role: "user" },
        };
      else if (path === "/api/auth/logout") body = { ok: true };
      else if (path === "/api/markets")
        body = [
          {
            symbol: "BTC-USDT",
            base: "BTC",
            quote: "USDT",
            last_price: "62000",
            change_percent: "1.24",
          },
          {
            symbol: "ETH-USDT",
            base: "ETH",
            quote: "USDT",
            last_price: "3200",
            change_percent: "-0.43",
          },
        ];
      else if (path.startsWith("/api/markets/"))
        body = {
          symbol: path.split("/").pop(),
          bids: Array.from({ length: 7 }, (_, i) => [
            String(61990 - i * 10),
            "0.125",
          ]),
          asks: Array.from({ length: 7 }, (_, i) => [
            String(62010 + i * 10),
            "0.225",
          ]),
          trades: Array.from({ length: 5 }, (_, i) => ({
            price: "62000",
            quantity: "0.02",
            side: i % 2 ? "sell" : "buy",
            timestamp: "2026-01-01T12:00:00Z",
          })),
          candles: Array.from({ length: 50 }, (_, i) => ({
            time: i,
            open: String(60000 + i * 40),
            high: String(60300 + i * 40),
            low: String(59800 + i * 40),
            close: String(60000 + i * 40 + (i % 3 ? 150 : -100)),
          })),
        };
      else if (path === "/api/portfolio")
        body = {
          valuation_usdt: "12500",
          balances: [
            { asset: "USDT", available: "9500", reserved: "600" },
            { asset: "BTC", available: "0.04", reserved: "0" },
            { asset: "ETH", available: "0.5", reserved: "0" },
          ],
        };
      else if (path.endsWith("/cancel")) {
        cancelled = true;
        body = { ...order, status: "cancelled" };
      } else if (path === "/api/orders" && req.method() === "POST") {
        placed = true;
        body = order;
      } else if (path === "/api/orders")
        body = placed
          ? [{ ...order, status: cancelled ? "cancelled" : "open" }]
          : [];
      else throw new Error(`Unmocked test path ${path}`);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body),
      });
    });
    await page.goto("./");
    await expect(page.getByText("DEMO / SEM FUNDOS REAIS")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /O próximo movimento/ }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("landing-test-only.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByLabel("Utilizador").fill("test-only");
    await page.getByLabel("Palavra-passe").fill("test-only-not-a-real-account");
    await page.getByRole("button", { name: "Entrar no terminal" }).click();
    await expect(page.getByRole("img", { name: /Gráfico/ })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("terminal-test-only.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByLabel("Tipo de ordem").selectOption("limit");
    await page.getByLabel("Preço limite (USDT)").fill("60000");
    await page.getByLabel("Quantidade (BTC)").fill("0.01");
    await page.getByRole("button", { name: "Comprar BTC" }).click();
    await expect(page.getByText("Ordem enviada ao sandbox.")).toBeVisible();
    expect(
      requests.find((r) => r.path === "/api/orders" && r.method === "POST")
        .body,
    ).toEqual({
      symbol: "BTC-USDT",
      side: "buy",
      type: "limit",
      quantity: "0.01",
      price: "60000",
    });
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(
      page.getByRole("cell", { name: "Cancelada", exact: true }),
    ).toBeVisible();
    expect(
      requests.find((r) => r.path === "/api/portfolio").authorization,
    ).toBe("Bearer test-only-memory-token");
    expect(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
    ).toBe(0);
    await page.getByRole("button", { name: "Terminar sessão" }).click();
    await expect(page.getByLabel("Utilizador")).toBeVisible();
    expect(errors).toEqual([]);
  });
}