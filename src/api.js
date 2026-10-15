export function createApi(
  base = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  fetcher = (...args) => fetch(...args),
) {
  let token = null;
  async function request(path, method = "GET", body) {
    const response = await fetcher(`${base.replace(/\/$/, "")}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Pedido inválido. Verifique os dados.",
      );
      error.status = response.status;
      throw error;
    }
    return data;
  }
  return {
    async logout() {
      try {
        return await request("/api/auth/logout", "POST");
      } finally {
        token = null;
      }
    },
    get: (path) => request(path),
    post: (path, body) => request(path, "POST", body),
    async login(username, password) {
      const data = await request("/api/auth/login", "POST", {
        username,
        password,
      });
      if (!data.token || !data.user)
        throw new Error("Resposta de autenticação inválida.");
      token = data.token;
      return data.user;
    },
  };
}