# CRM SaaS

Pilnas backendas (Node.js + TypeScript + Prisma + PostgreSQL) ir frontendas (React + Vite) multi-tenant CRM sistemai.

## Greitas paleidimas su Docker

```bash
docker-compose up --build
```

- Backend: http://localhost:4000/health
- Frontend: http://localhost:5173

## Development režimas (be Docker)

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Backend pasiekiamas per `http://localhost:4000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend pasiekiamas per `http://localhost:5173`.

## Pagrindinės funkcijos

- Registracija su organizacijos sukūrimu.
- Auth (JWT), roles: admin / manager / user.
- Organizacijos nustatymai (planas, timezone, domenas).
- Integracijos: PrestaShop (URL + API key), SMTP (nustatymai).
- Kontaktai, deal'ai, veiklos (activities).
- Komandos valdymas (users CRUD organizacijos viduje).
- Analytics (pipeline ir veiklų santrauka).
- AI lead scoring endpoint'as ir UI.
- Audit log'ai backend'e.
