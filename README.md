# ClinicOS — Split Repos

Independent repositories for the ClinicOS clinic management system.

## Repos

- **clinios-api** — Backend API (Express, Node.js)
- **clinios-web** — Staff portal (React, Vite)
- **clinios-patient-web** — Patient portal (React, Vite)
- **clinios-worker** — Background jobs (Node.js)

## Setup

Each repo is independent. Clone and develop separately:

```bash
# API
cd clinios-api
npm install
npm run dev

# Web (staff)
cd clinios-web
npm install
npm run dev

# Patient Web
cd clinios-patient-web
npm install
npm run dev

# Worker
cd clinios-worker
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` in each repo and configure:
- API: database, Redis, Twilio, Cloudinary
- Web/Patient-web: API endpoint
- Worker: database, Redis, Twilio

## Deployment

Each repo can be deployed independently:

```bash
# Build
npm run build

# Start
npm start (api/worker) or npm run preview (web)
```
"# clinic-os-split" 
