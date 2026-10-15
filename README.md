# Meridian · frontend capability demo

Interface original em português para uma demonstração isolada de negociação. **DEMO / SEM FUNDOS REAIS**: sem depósitos, levantamentos, custódia, serviços bancários, registo público ou dinheiro real.

## Executar localmente

Requer Node.js compatível com Vite 8 (20.19+ ou 22.12+; validado com Node 26) e npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Abrir `http://127.0.0.1:5173/meridian-demo-frontend/`. O backend deve estar disponível no endereço público `VITE_API_BASE_URL` (por omissão, `http://127.0.0.1:8000`).

## Verificação

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

Vitest: 9 unit tests. Playwright: 2 mock-browser tests at 1440px and 390px. All passing.