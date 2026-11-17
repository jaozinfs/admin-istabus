# admin-istabus

CRM admin **aparte** do InstaBuss. Front (Vite) + API (Nest) no **mesmo deploy Vercel**, banco no **Render Postgres** (`instabuss-db`).

Padrão de `vercel.json` espelhado do [mmveiculos](https://github.com/jaozinfs/mmveiculos).

## Segurança

1. `ADMIN_ACCESS_SECRET` → header `X-Admin-Secret` em **toda** request
2. JWT (`ADMIN_JWT_SECRET`) após login
3. Bootstrap único (`ADMIN_BOOTSTRAP_SECRET`) gera user/senha **uma vez** (bcrypt no banco)

## Deploy Vercel

1. Importe o repo: [vercel.com/new](https://vercel.com/new)
2. Framework **Vite** (já no `vercel.json`)
3. Cole as env vars (valores em `.env.vercel.local` na sua máquina — **não** vai pro Git):

| Key | Origem |
|-----|--------|
| `DATABASE_URL` | Render CLI → Postgres `instabuss-db` external (+ `sslmode=require`) |
| `ADMIN_ACCESS_SECRET` | gerado |
| `ADMIN_JWT_SECRET` | gerado |
| `ADMIN_BOOTSTRAP_SECRET` | gerado |
| `FRONTEND_URL` | URL do projeto Vercel (ex. `https://admin-istabus.vercel.app`) |
| `DATABASE_SSL` | `true` |

4. Deploy → abra o site → cole o access secret → bootstrap → login

## Local

```bash
# API (aponta pro mesmo DATABASE_URL do Render)
cd backend && cp .env.example .env && npm install && npm run start:dev

# Web
cd frontend && cp .env.example .env && npm install && npm run dev
```

## API

| Rota | Auth |
|------|------|
| `GET /api/auth/status` | secret |
| `POST /api/auth/bootstrap` | secret + bootstrap |
| `POST /api/auth/login` | secret |
| `GET /api/accounts*` | secret + JWT |
| `PATCH /api/accounts/plan` | secret + JWT |
| `GET /api/usage/daily` | secret + JWT |
