import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import App from "../src/App.jsx";
// Explicit test-only API fixture. Never imported by production code.
const order = {
  id: "o1",
  symbol: "BTC-USDT",
  side: "buy",
  type: "limit",
  quantity: "0.01",
  price: "60000",
  status: "open",
  filled_quantity: "0",
  created_at: "2026-01-01T00:00:00Z",
};
function mockApi() {
  return {
    login: vi
      .fn()
      .mockResolvedValue({ id: "1", username: "tester", role: "user" }),
    get: vi.fn(async (path) =>
      path === "/api/markets"
        ? [
            {
              symbol: "BTC-USDT",
              base: "BTC",
              quote: "USDT",
              last_price: "62000",
              change_percent: "1.2",
            },
          ]
        : path.startsWith("/api/markets/")
          ? {
              symbol: "BTC-USDT",
              bids: [["61999", "1"]],
              asks: [["62001", "2"]],
              trades: [
                {
                  price: "62000",
                  quantity: "0.1",
                  side: "buy",
                  timestamp: "2026-01-01T00:00:00Z",
                },
              ],
              candles: [
                {
                  time: 1,
                  open: "61000",
                  high: "63000",
                  low: "60000",
                  close: "62000",
                },
              ],
            }
          : path === "/api/portfolio"
            ? {
                balances: [
                  { asset: "USDT", available: "10000", reserved: "0" },
                ],
                valuation_usdt: "10000",
              }
            : [],
    ),
    post: vi.fn().mockResolvedValue(order),
  };
}
async function enter(api) {
  render(<App api={api} />);
  fireEvent.change(screen.getByLabelText("Utilizador"), {
    target: { value: "tester" },
  });
  fireEvent.change(screen.getByLabelText("Palavra-passe"), {
    target: { value: "test-only" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Entrar no terminal" }));
  await screen.findByRole("heading", { name: "Livro de ordens" });
}
test("selecting the current market preserves the loaded chart", async () => {
  const api = mockApi();
  await enter(api);
  await screen.findByRole("img", { name: /Gráfico/ });
  fireEvent.click(screen.getByRole("button", { name: /₿ BTC/ }));
  expect(screen.getByRole("img", { name: /Gráfico/ })).toBeInTheDocument();
});
test("authenticated terminal loads contract data and submits decimal strings for a limit buy", async () => {
  const api = mockApi();
  await enter(api);
  expect(
    await screen.findByRole("img", { name: /Gráfico/ }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Tipo de ordem"), {
    target: { value: "limit" },
  });
  fireEvent.change(screen.getByLabelText("Quantidade (BTC)"), {
    target: { value: "0.01" },
  });
  fireEvent.change(screen.getByLabelText("Preço limite (USDT)"), {
    target: { value: "60000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Comprar BTC" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("/api/orders", {
      symbol: "BTC-USDT",
      side: "buy",
      type: "limit",
      quantity: "0.01",
      price: "60000",
    }),
  );
  expect(
    await screen.findByText("Ordem enviada ao sandbox."),
  ).toBeInTheDocument();
});
test("admin can list demo users and must explicitly confirm sandbox reset", async () => {
  const api = mockApi();
  api.login.mockResolvedValue({
    id: "1",
    username: "admin-test",
    role: "admin",
  });
  const get = api.get;
  api.get = vi.fn((path) =>
    path === "/api/admin/users"
      ? Promise.resolve([{ id: "2", username: "sandbox-user", role: "user" }])
      : get(path),
  );
  await enter(api);
  fireEvent.click(
    screen.getByRole("button", { name: "Carregar utilizadores" }),
  );
  expect(await screen.findByText("sandbox-user")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Repor sandbox" }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar reposição" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("/api/admin/reset"),
  );
});
test("logout returns to login only after requesting server revocation", async () => {
  const api = mockApi();
  api.logout = vi.fn().mockResolvedValue({ ok: true });
  await enter(api);
  fireEvent.click(screen.getByRole("button", { name: "Terminar sessão" }));
  expect(await screen.findByLabelText("Utilizador")).toBeInTheDocument();
  expect(api.logout).toHaveBeenCalledOnce();
});
test("market sell omits price and open orders can be cancelled", async () => {
  const api = mockApi();
  const get = api.get;
  api.get = vi.fn((path) =>
    path === "/api/orders" ? Promise.resolve([order]) : get(path),
  );
  await enter(api);
  await screen.findByRole("img", { name: /Gráfico/ });
  fireEvent.click(screen.getByRole("button", { name: "Vender" }));
  fireEvent.change(screen.getByLabelText("Quantidade (BTC)"), {
    target: { value: "0.02" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Vender BTC" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("/api/orders", {
      symbol: "BTC-USDT",
      side: "sell",
      type: "market",
      quantity: "0.02",
    }),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("/api/orders/o1/cancel"),
  );
});
test("real login failure remains signed out, with clear demo notice", async () => {
  const api = {
    login: vi.fn().mockRejectedValue(new Error("Credenciais inválidas")),
  };
  render(<App api={api} />);
  expect(screen.getByText(/SEM FUNDOS REAIS/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Utilizador"), {
    target: { value: "tester" },
  });
  fireEvent.change(screen.getByLabelText("Palavra-passe"), {
    target: { value: "wrong" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Entrar no terminal" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Credenciais inválidas",
  );
  expect(screen.getByLabelText("Utilizador")).toBeInTheDocument();
  expect(api.login).toHaveBeenCalledWith("tester", "wrong");
});