import React, { useState } from "react";
import Terminal from "./Terminal.jsx";
import { createApi } from "./api.js";
const defaultApi = createApi();
export default function App({ api = defaultApi }) {
  const [user, setUser] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      setUser(await api.login(form.get("username"), form.get("password")));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header>
        <a className="brand" href="#">
          <span className="brand-icon">M</span> meridian
          <span className="brand-dot">.</span>
        </a>
        <span className="demo">DEMO / SEM FUNDOS REAIS</span>
        {user ? (
          <div className="account">
            <span>{user.username}</span>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api.logout();
                } catch (err) {
                  setError(
                    "Sessão local terminada; não foi possível confirmar revogação no servidor.",
                  );
                } finally {
                  setUser(null);
                  setBusy(false);
                }
              }}
            >
              Terminar sessão
            </button>
          </div>
        ) : (
          <span className="header-note">Terminal de capacidades · v0.1</span>
        )}
      </header>
      {user ? (
        <Terminal api={api} user={user} />
      ) : (
        <main className="landing">
          <section className="intro">
            <div className="eyebrow">MERCADOS DIGITAIS. CLAREZA TOTAL.</div>
            <h1>
              O próximo movimento
              <br />
              começa com <em>perspetiva.</em>
            </h1>
            <p>
              Um espaço para explorar mercados, testar estratégias e conhecer a
              experiência Meridian. Sem capital real. Sem compromissos.
            </p>
            <div className="orbit" aria-hidden="true">
              <div className="orbit-line" />
              <div className="orbit-line second" />
              <div className="orbit-core">
                M<span>MERIDIAN SANDBOX</span>
              </div>
              <span className="orbit-label">BTC / USDT</span>
              <span className="orbit-label second">ETH / USDT</span>
            </div>
            <div className="principles">
              <span>
                01 <b>Mercados simulados</b>
              </span>
              <span>
                02 <b>Ordens reais no sandbox</b>
              </span>
              <span>
                03 <b>Controlo em tempo real</b>
              </span>
            </div>
          </section>
          <section className="login-card">
            <div className="eyebrow">ACESSO AO SANDBOX</div>
            <h2>
              O seu terminal.
              <br />
              Uma nova perspetiva.
            </h2>
            <p>
              Entre com a conta de demonstração provisionada pelo administrador.
            </p>
            <form onSubmit={login}>
              <label>
                Utilizador
                <input name="username" autoComplete="username" required />
              </label>
              <label>
                Palavra-passe
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              {error && (
                <div role="alert" className="error">
                  {error}
                </div>
              )}
              <button className="primary" disabled={busy}>
                {busy ? "A autenticar…" : "Entrar no terminal"}
              </button>
            </form>
            <small>
              A autenticação é validada pelo servidor. Nenhum acesso é simulado.
              A sessão termina ao recarregar a página.
            </small>
            <div className="login-foot">
              <span className="status-dot" /> Ambiente isolado · Apenas
              demonstração
            </div>
          </section>
        </main>
      )}
      <footer>
        <span>© Meridian · Capability demo</span>
        <span>Sem depósitos. Sem levantamentos. Sem fundos reais.</span>
      </footer>
    </>
  );
}