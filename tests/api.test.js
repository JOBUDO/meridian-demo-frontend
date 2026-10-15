import { expect, test, vi } from "vitest";
import { createApi } from "../src/api.js";
test("logout revokes server session and clears in-memory bearer", async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ token: "test-token", user: { id: "1" } }),
  });
  const api = createApi("http://localhost:8000", fetcher);
  await api.login("test", "test-only");
  await api.logout();
  await api.get("/api/markets");
  expect(fetcher.mock.calls[1][0]).toBe(
    "http://localhost:8000/api/auth/logout",
  );
  expect(fetcher.mock.calls[1][1].headers.Authorization).toBe(
    "Bearer test-token",
  );
  expect(fetcher.mock.calls[2][1].headers.Authorization).toBeUndefined();
});
test("HTTP errors preserve backend detail and status", async () => {
  const api = createApi("http://localhost:8000", async () => ({
    ok: false,
    status: 401,
    json: async () => ({ detail: "Sessão expirada" }),
  }));
  await expect(api.get("/api/portfolio")).rejects.toMatchObject({
    message: "Sessão expirada",
    status: 401,
  });
});
test("login uses real HTTP contract and keeps bearer only in client memory", async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      token: "test-token",
      user: { id: "1", username: "tester", role: "user" },
    }),
  });
  const api = createApi("http://localhost:8000", fetcher);
  await api.login("tester", "test-only");
  expect(fetcher).toHaveBeenCalledWith(
    "http://localhost:8000/api/auth/login",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ username: "tester", password: "test-only" }),
    }),
  );
  await api.get("/api/portfolio");
  expect(fetcher.mock.calls[1][1].headers.Authorization).toBe(
    "Bearer test-token",
  );
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});