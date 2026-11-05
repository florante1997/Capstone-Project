# Campus Shelf — MERN Capstone

A responsive community item catalog built with React, Express, and MongoDB Atlas. Guests can browse and search; registered members can submit and track requests; the administrator can manage items and approve or decline requests.

## Features

- Role-aware access enforced by the API: guest, member, administrator.
- Public item catalog with search and category filtering.
- Member registration and login with hashed passwords and expiring JWT sessions.
- Administrator-only item create, update, and delete operations.
- Member requests and administrator approval/decline; stock is updated transactionally on approval.
- Request validation, protected API routes, login rate limiting, and clear responsive instructions.
- MongoDB collections: `users`, `items`, and `orders`.

## Run locally

Requirements: Node.js LTS, npm, and a MongoDB Atlas database.

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and a unique `ADMIN_USERNAME` / `ADMIN_PASSWORD` (at least 12 characters). Never commit `.env`.
3. In the project root, run `npm install`.
4. Run `npm run dev`, then open the Vite URL shown in the terminal (normally `http://localhost:5173`).
5. Sign in with the administrator values you set. Registering through the website only creates a member.

The first server start creates the administrator only when no administrator exists. Once created, changing the environment variables will not silently replace the existing account.
To populate an empty database with sample catalog items, run `npm run seed:demo -w server` from the project root after setting up `server/.env`. This command never overwrites an existing catalog.

## Checks

- `npm test` — API health and not-found smoke tests.
- `npm run build` — production frontend build.

The database-backed flows require the Atlas URI and an Atlas network access rule for the machine or hosting provider running the API. Atlas deployments must support transactions for approval to safely reserve stock.

## Deploy for instructor review

This project is not automatically published by the local development server. To create a public demo, push the project to the supplied GitHub repository, deploy the `server` workspace to Render (Node web service, build command `npm install`, start command `npm start`), and deploy `client` to Vercel (framework Vite, root directory `client`, build command `npm run build`, output directory `dist`).

Set these server environment variables in Render:

- `MONGODB_URI` — your Atlas connection string; keep it private.
- `JWT_SECRET` — a new random secret (32+ characters).
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` — your private administrator account credentials.
- `API_CORS_ORIGIN` — the exact Vercel website origin, e.g. `https://your-site.vercel.app`.
- `NODE_ENV=production`

Set `VITE_API_URL` in Vercel to the deployed Render API URL followed by `/api`, e.g. `https://your-api.onrender.com/api`, then redeploy the frontend. Add the Render service's public IP range to Atlas network access as required by your provider. Give the instructor the Vercel website URL; create a separate member account for a member demonstration, or let the instructor browse as a guest. Do not share administrator credentials.

## Security note

Credentials pasted into chat or other shared surfaces should be considered exposed. Rotate the Atlas database password and replace any administrator password that has been disclosed before deployment. Put only the replacement credentials in local/deployment secrets; never in source code, screenshots, or the GitHub repository.
