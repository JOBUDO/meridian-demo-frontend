import React, { useState } from "react";
export default function Admin({ api, onReset }) {
  const [users, setUsers] = useState(null),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      setUsers(await api.get("/api/admin/users"));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.post("/api/admin/reset");
      setConfirm(false);
      setNotice("Sandbox reposto pelo servidor.");
      await onReset();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel admin">
      <div className="panel-title">
        <h2>Administração do sandbox</h2>
        <span className="pill">ADMIN</span>
      </div>
      <div className="admin-actions">
        <button disabled={busy} onClick={load}>
          Carregar utilizadores
        </button>
        <button disabled={busy} onClick={() => setConfirm(true)}>
          Repor sandbox
        </button>
        <p>
          Contas de demonstração. As permissões são verificadas pelo servidor.
        </p>
      </div>
      {confirm && (
        <div
          className="admin-actions"
          role="group"
          aria-label="Confirmar reposição"
        >
          <p>Repor todos os saldos e remover todas as ordens do sandbox?</p>
          <button disabled={busy} onClick={reset}>
            Confirmar reposição
          </button>
          <button disabled={busy} onClick={() => setConfirm(false)}>
            Manter dados
          </button>
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {users && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Utilizador</th>
                <th>Perfil</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <p className="empty">Sem utilizadores.</p>}
        </div>
      )}
    </section>
  );
}