import React, { useEffect, useState } from "react";
import Admin from "./Admin.jsx";
const n = (value, digits = 2) =>
  Number(value).toLocaleString("pt-PT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
function Chart({ candles }) {
  if (!candles.length) return <p className="empty">Sem velas disponíveis.</p>;
  const lows = candles.map((c) => Number(c.low)),
    highs = candles.map((c) => Number(c.high));
  const low = Math.min(...lows),
    high = Math.max(...highs),
    range = high - low || 1,
    y = (v) => 220 - ((Number(v) - low) / range) * 190;
  return (
    <svg
      className="chart"
      viewBox="0 0 720 250"
      role="img"
      aria-label="Gráfico de velas do mercado simulado"
    >
      <defs>
        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#b9ed87" stopOpacity=".12" />
          <stop offset="1" stopColor="#b9ed87" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[30, 78, 126, 174, 222].map((v) => (
        <g key={v}>
          <line
            x1="0"
            x2="655"
            y1={v}
            y2={v}
            stroke="#252e31"
            strokeDasharray="3 5"
          />
          <text x="663" y={v + 4} fill="#7d8b8c" fontSize="10">
            {n(high - ((v - 30) / 192) * range, 0)}
          </text>
        </g>
      ))}
      {candles.map((c, i) => {
        const x = 15 + (i * 620) / candles.length,
          up = Number(c.close) >= Number(c.open);
        return (
          <g key={`${c.time}-${i}`} stroke={up ? "#b9ed87" : "#ef9a99"}>
            <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} />
            <rect
              x={x - 3}
              y={Math.min(y(c.open), y(c.close))}
              width="6"
              height={Math.max(2, Math.abs(y(c.open) - y(c.close)))}
              fill={up ? "#b9ed87" : "#ef9a99"}
            />
          </g>
        );
      })}
      <text x="10" y="247" fill="#7d8b8c" fontSize="10">
        Histórico determinístico · velas do sandbox
      </text>
    </svg>
  );
}
export default function Terminal({ api, user }) {
  const [markets, setMarkets] = useState([]),
    [symbol, setSymbol] = useState("BTC-USDT"),
    [detail, setDetail] = useState(null),
    [portfolio, setPortfolio] = useState(null),
    [orders, setOrders] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [side, setSide] = useState("buy"),
    [type, setType] = useState("market"),
    [quantity, setQuantity] = useState(""),
    [price, setPrice] = useState("");
  const market = markets.find((m) => m.symbol === symbol),
    base = market?.base || symbol.split("-")[0];
  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const [m, d, p, o] = await Promise.all([
        api.get("/api/markets"),
        api.get(`/api/markets/${encodeURIComponent(symbol)}`),
        api.get("/api/portfolio"),
        api.get("/api/orders"),
      ]);
      setMarkets(m);
      setDetail(d);
      setPortfolio(p);
      setOrders(o);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    async function load() {
      if (active) await refresh();
    }
    load();
    return () => {
      active = false;
    };
  }, [symbol]);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (
      !/^(?:\d+\.?\d*|\.\d+)$/.test(quantity) ||
      Number(quantity) <= 0 ||
      (type === "limit" &&
        (!/^(?:\d+\.?\d*|\.\d+)$/.test(price) || Number(price) <= 0))
    ) {
      setError("Indique valores positivos válidos.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/orders", {
        symbol,
        side,
        type,
        quantity,
        ...(type === "limit" ? { price } : {}),
      });
      setQuantity("");
      setNotice("Ordem enviada ao sandbox.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="terminal">
      <div className="terminal-top">
        <div>
          <div className="eyebrow">A SUA PERSPETIVA DO MERCADO</div>
          <h1>
            Terminal de negociação<span className="live-tag">SANDBOX</span>
          </h1>
        </div>
        <button disabled={loading || busy} onClick={refresh}>
          {loading ? "A atualizar…" : "↻ Atualizar dados"}
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <button onClick={refresh}>Tentar novamente</button>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <div className="market-strip">
        {markets.map((m) => (
          <button
            key={m.symbol}
            className={symbol === m.symbol ? "market selected" : "market"}
            disabled={loading || busy}
            aria-pressed={symbol === m.symbol}
            onClick={() => {
              if (symbol === m.symbol) return;
              setDetail(null);
              setSymbol(m.symbol);
            }}
          >
            <span className="coin">{m.base === "BTC" ? "₿" : "Ξ"}</span>
            <span>
              <b>
                {m.base}
                <small> / {m.quote}</small>
              </b>
              <strong>
                {n(m.last_price)} <small>USDT</small>
              </strong>
            </span>
            <span
              className={
                Number(m.change_percent) >= 0 ? "positive" : "negative"
              }
            >
              {Number(m.change_percent) >= 0 ? "+" : ""}
              {n(m.change_percent)}%
            </span>
          </button>
        ))}
        {!markets.length && (
          <span className="empty">
            {loading ? "A carregar mercados…" : "Sem mercados disponíveis."}
          </span>
        )}
      </div>
      <div className="trading-grid">
        <section className="panel chart-panel">
          <div className="panel-title">
            <h2>
              {symbol.replace("-", " / ")}{" "}
              <span className="muted">· Visão geral</span>
            </h2>
            <span className="pill">Velas · sandbox</span>
          </div>
          <div className="price-head">
            <strong>{market ? n(market.last_price) : "—"}</strong>
            <span>
              USDT <small>Preço simulado</small>
            </span>
          </div>
          {detail ? (
            <Chart candles={detail.candles} />
          ) : (
            <div className="empty">
              {loading ? "A carregar gráfico…" : "Gráfico indisponível."}
            </div>
          )}
          <div className="chart-foot">
            <span className="status-dot" /> Dados determinísticos do servidor{" "}
            <span>Atualização manual</span>
          </div>
        </section>
        <section className="panel book">
          <div className="panel-title">
            <h2>Livro de ordens</h2>
            <span className="muted">{base}</span>
          </div>
          <div className="book-head">
            <span>Preço (USDT)</span>
            <span>Quantidade</span>
          </div>
          {detail?.asks
            .slice(0, 7)
            .reverse()
            .map(([p, q], i) => (
              <div className="book-row negative" key={"a" + i}>
                <span>{n(p)}</span>
                <span>{q}</span>
                <i style={{ width: `${25 + i * 8}%` }} />
              </div>
            ))}
          <div className="mid-price">
            {market ? n(market.last_price) : "—"} <small>USDT</small>
          </div>
          {detail?.bids.slice(0, 7).map(([p, q], i) => (
            <div className="book-row positive" key={"b" + i}>
              <span>{n(p)}</span>
              <span>{q}</span>
              <i style={{ width: `${25 + i * 8}%` }} />
            </div>
          ))}
          {detail && !detail.asks.length && !detail.bids.length && (
            <p className="empty">Livro vazio.</p>
          )}
        </section>
        <section className="panel ticket">
          <div className="panel-title">
            <h2>Nova ordem</h2>
            <span className="muted">SPOT DEMO</span>
          </div>
          <div className="segmented">
            <button
              className={side === "buy" ? "active buy" : ""}
              onClick={() => setSide("buy")}
            >
              Comprar
            </button>
            <button
              className={side === "sell" ? "active sell" : ""}
              onClick={() => setSide("sell")}
            >
              Vender
            </button>
          </div>
          <form onSubmit={submit}>
            <label>
              Tipo de ordem
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="market">Mercado</option>
                <option value="limit">Limite</option>
              </select>
            </label>
            {type === "limit" && (
              <label>
                Preço limite (USDT)
                <input
                  inputMode="decimal"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </label>
            )}
            <label>
              Quantidade ({base})
              <input
                inputMode="decimal"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
              />
            </label>
            <div className="ticket-info">
              <span>Execução</span>
              <b>
                {type === "market" ? "Liquidez do sandbox" : "Ao preço limite"}
              </b>
            </div>
            <p className="muted ticket-description">
              {type === "market"
                ? "O preço final é determinado pelo servidor."
                : "Ordens em aberto reservam o saldo necessário."}
            </p>
            <button
              className={side === "buy" ? "primary" : "primary sell-button"}
              disabled={busy || loading || !detail}
            >
              {busy
                ? "A enviar…"
                : `${side === "buy" ? "Comprar" : "Vender"} ${base}`}
            </button>
            <small className="ticket-warning">
              Apenas saldos virtuais. Não representa uma operação financeira
              real.
            </small>
          </form>
        </section>
        <section className="panel trades">
          <div className="panel-title">
            <h2>Últimas transações</h2>
            <span className="muted">SIMULADAS</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Preço (USDT)</th>
                  <th>Quantidade</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {detail?.trades.slice(0, 7).map((t, i) => (
                  <tr key={i}>
                    <td className={t.side === "buy" ? "positive" : "negative"}>
                      {n(t.price)}
                    </td>
                    <td>{t.quantity}</td>
                    <td>{new Date(t.timestamp).toLocaleTimeString("pt-PT")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detail && !detail.trades.length && (
            <p className="empty">Sem transações.</p>
          )}
        </section>
        <section className="panel balances">
          <div className="panel-title">
            <h2>Os seus ativos</h2>
            <span className="muted">CARTEIRA VIRTUAL</span>
          </div>
          <div className="valuation">
            {portfolio ? n(portfolio.valuation_usdt) : "—"} <small>USDT</small>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Disponível</th>
                  <th>Reservado</th>
                </tr>
              </thead>
              <tbody>
                {portfolio?.balances.map((b) => (
                  <tr key={b.asset}>
                    <td>
                      <b>{b.asset}</b>
                    </td>
                    <td>{b.available}</td>
                    <td>{b.reserved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {portfolio && !portfolio.balances.length && (
            <p className="empty">Sem saldos.</p>
          )}
        </section>
      </div>
      <section className="panel orders">
        <div className="panel-title">
          <h2>As suas ordens</h2>
          <span className="muted">{orders.length} REGISTOS</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mercado</th>
                <th>Lado / Tipo</th>
                <th>Quantidade</th>
                <th>Preço</th>
                <th>Executado</th>
                <th>Estado</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.symbol}</td>
                  <td className={o.side === "buy" ? "positive" : "negative"}>
                    {o.side === "buy" ? "Compra" : "Venda"} /{" "}
                    {o.type === "market" ? "Mercado" : "Limite"}
                  </td>
                  <td>{o.quantity}</td>
                  <td>{o.price ?? "Mercado"}</td>
                  <td>{o.filled_quantity}</td>
                  <td>
                    {{
                      open: "Aberta",
                      filled: "Executada",
                      cancelled: "Cancelada",
                    }[o.status] || o.status}
                  </td>
                  <td>
                    {o.status === "open" && (
                      <button
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          setError("");
                          try {
                            await api.post(
                              `/api/orders/${encodeURIComponent(o.id)}/cancel`,
                            );
                            setNotice("Ordem cancelada. Reserva libertada.");
                            await refresh();
                          } catch (err) {
                            setError(err.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!orders.length && (
          <div className="empty">
            Ainda não tem ordens. O seu próximo movimento começa aqui.
          </div>
        )}
      </section>
      {user.role === "admin" && <Admin api={api} onReset={refresh} />}
    </main>
  );
}
