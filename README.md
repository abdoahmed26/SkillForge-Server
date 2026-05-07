# SkillForge Server

SkillForge Server is the NestJS backend for the SkillForge platform. It provides the REST API, realtime gateways, authentication, session scheduling, review workflows, analytics, and gamification services used by the React client.

This README is a developer guide for running and maintaining the backend application. For the product overview, use the root repository README.

## Contents

- [Technology Stack](#technology-stack)
- [Application Structure](#application-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Database Migrations](#database-migrations)
- [API Documentation](#api-documentation)
- [Runtime Behavior](#runtime-behavior)
- [Feature Modules](#feature-modules)
- [Realtime Namespaces](#realtime-namespaces)
- [Quality Checklist](#quality-checklist)
- [Troubleshooting](#troubleshooting)

## Technology Stack

| Area | Tools |
| --- | --- |
| Framework | NestJS 11, TypeScript |
| Database | PostgreSQL, TypeORM |
| Authentication | JWT, Passport, bcrypt, HTTP-only refresh cookies |
| Realtime | Socket.io, Nest WebSockets |
| Events | EventEmitter2 |
| API docs | Swagger / OpenAPI |
| File uploads | Cloudinary |
| Email | Nodemailer |
| Scheduling | Nest Schedule |
| Validation | class-validator, class-transformer |
| Testing | Jest, Supertest |

## Application Structure

```text
Server/
  src/
    analytics/        Analytics and reporting endpoints
    auth/             Login, registration, refresh, password reset, mail
    chat/             Conversations, messages, and chat gateway
    common/           Shared guards, decorators, filters, and utilities
    config/           Environment and database configuration
    gamification/     Achievements, points, streaks, and realtime progress
    matching/         Match discovery, requests, scoring, and gateway
    migrations/       TypeORM database migrations
    notifications/    Notification persistence and realtime delivery
    reviews/          Session reviews and user review summaries
    sessions/         Availability, booking, lifecycle, and gateway
    skills/           Skill catalog and user skill management
    users/            Profiles, search, public profile data, and uploads
```

## Local Setup

Install dependencies:

```bash
npm install
```

Create `Server/.env`:

```env
PORT=3000
API_VERSION=api/v1
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=skillforge

JWT_SECRET=change_me
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=change_me_refresh
JWT_REFRESH_EXPIRY=7d

CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER_NAME=skillforge

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM="SkillForge <your_email@gmail.com>"
```

Run database migrations:

```bash
npm run migration
```

Start the development server:

```bash
npm run start:dev
```

By default, the API runs at:

```text
http://localhost:3000/api/v1
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | Yes | HTTP server port. Defaults to `3000` when not provided. |
| `API_VERSION` | Yes | Global REST prefix, usually `api/v1`. |
| `NODE_ENV` | No | Runtime environment name. |
| `FRONTEND_URL` | Yes | Client origin used for CORS and password reset links. |
| `DB_HOST` | Yes | PostgreSQL host. |
| `DB_PORT` | Yes | PostgreSQL port. |
| `DB_USER` | Yes | PostgreSQL username. |
| `DB_PASSWORD` | Yes | PostgreSQL password. |
| `DB_NAME` | Yes | PostgreSQL database name. |
| `JWT_SECRET` | Yes | Access token signing secret. |
| `JWT_ACCESS_EXPIRY` | Yes | Access token lifetime, for example `15m`. |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret. |
| `JWT_REFRESH_EXPIRY` | Yes | Refresh token lifetime, for example `7d`. |
| `CLOUDINARY_NAME` | Yes | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret. |
| `CLOUDINARY_FOLDER_NAME` | Yes | Folder used for uploaded SkillForge assets. |
| `MAIL_HOST` | Yes | SMTP host used by Nodemailer. |
| `MAIL_PORT` | Yes | SMTP port, usually `587` for TLS upgrade. |
| `MAIL_SECURE` | Yes | Use `true` for implicit TLS, otherwise `false`. |
| `MAIL_USER` | Yes | SMTP username. |
| `MAIL_PASS` | Yes | SMTP password or provider app password. |
| `MAIL_FROM` | Yes | Sender name and address for system emails. |

`MAIL_USER` and `MAIL_PASS` are the preferred email variables. The mail service also supports `USER` and `PASS` as a local fallback, but new environments should use the explicit `MAIL_*` names.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run start` | Start the Nest application once. |
| `npm run start:dev` | Start the development server with file watching. |
| `npm run start:debug` | Start the development server with the Node debugger. |
| `npm run build` | Compile the application into `dist/`. |
| `npm run start:prod` | Run the compiled production build from `dist/main`. |
| `npm run lint` | Run ESLint and apply automatic fixes. |
| `npm run format` | Format source and test files with Prettier. |
| `npm run test` | Run unit tests. |
| `npm run test:watch` | Run unit tests in watch mode. |
| `npm run test:cov` | Run unit tests with coverage. |
| `npm run test:e2e` | Run end-to-end tests with the e2e Jest config. |
| `npm run generate` | Generate a new TypeORM migration from entity changes. |
| `npm run migration` | Run pending TypeORM migrations. |
| `npm run revert` | Revert the latest TypeORM migration. |

## Database Migrations

TypeORM uses `src/config/db.ts` as its data source configuration.

Run pending migrations:

```bash
npm run migration
```

Generate a migration after changing entities:

```bash
npm run generate
```

Revert the latest migration:

```bash
npm run revert
```

The backend is expected to run from migrations, not automatic schema synchronization. Keep entity changes and migrations together in the same change set.

## API Documentation

Swagger documentation is available while the server is running:

```text
http://localhost:3000/api/docs
```

REST endpoints are served under the configured API prefix. In local development, the default prefix is:

```text
/api/v1
```

## Runtime Behavior

### Authentication

- Access tokens are issued as JWTs.
- Refresh tokens are stored in an HTTP-only cookie.
- The refresh cookie is scoped to the API auth path.
- Protected REST routes use JWT guards.
- WebSocket gateways validate JWTs with the configured access token secret.

### Password Reset

- `POST /auth/forgot-password` accepts an email address.
- The server creates a password reset token, stores a hashed version, and sends a reset link with Nodemailer.
- The reset link points to the client reset page using `FRONTEND_URL`.
- `POST /auth/reset-password` accepts the token from the reset link and the new password.
- Reset tokens expire after one hour and are cleared after successful use.

### Uploads

Profile and media uploads are stored through Cloudinary. Make sure all Cloudinary variables are present before testing avatar or profile image flows.

### CORS and Cookies

The backend expects the frontend origin to match `FRONTEND_URL`. The client sends authenticated API calls with credentials, so mismatched ports or protocols can break refresh-token behavior.

## Feature Modules

| Module | Responsibility |
| --- | --- |
| `auth` | Registration, login, refresh, logout, password update, forgot password, reset password, and email delivery. |
| `users` | Profile data, public profiles, avatar uploads, and user search. |
| `skills` | Skill catalog, user skills, skill levels, and learning goals. |
| `matching` | Discovery, match requests, acceptance, rejection, compatibility, and realtime match updates. |
| `sessions` | Availability, booking, session status, completion, and session realtime events. |
| `chat` | Conversations, messages, read state, typing, and chat realtime events. |
| `notifications` | Notification storage, delivery, read state, and realtime updates. |
| `reviews` | Session reviews, ratings, and profile review visibility. |
| `analytics` | User and platform metrics for dashboard views. |
| `gamification` | Achievements, points, streaks, progress, and realtime gamification updates. |

## Realtime Namespaces

The server exposes Socket.io gateways for realtime product flows:

| Namespace | Purpose |
| --- | --- |
| `/matching` | Match discovery, requests, and match lifecycle updates. |
| `/sessions` | Session booking, reminders, status changes, and completion updates. |
| `/chat` | Messages, typing indicators, read receipts, and conversation updates. |
| `/notifications` | User notifications and unread count changes. |
| `/gamification` | Achievement unlocks, point changes, streak updates, and progress events. |

## Quality Checklist

Before opening a backend pull request, run the checks that match the change:

```bash
npm run build
npm run test
npm run test:e2e
```

For formatting or lint-only changes:

```bash
npm run lint
npm run format
```

Note that both lint and format scripts modify files automatically.

## Troubleshooting

### PowerShell blocks npm

If PowerShell blocks `npm.ps1`, call npm through `npm.cmd`:

```powershell
npm.cmd run start:dev
npm.cmd run migration
```

### Database connection fails

Confirm PostgreSQL is running and that `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` match your local database. This project uses `DB_USER`, not `DB_USERNAME`.

### Tables or columns are missing

Run migrations:

```bash
npm run migration
```

If you changed entities, generate and review a migration before running it:

```bash
npm run generate
```

### Login works but refresh fails

Check that:

- `FRONTEND_URL` exactly matches the client origin.
- The client `VITE_API_URL` points to the same backend.
- Requests are sent with credentials enabled.
- The API prefix matches `API_VERSION`.

### Password reset emails do not arrive

Check that:

- `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASS`, and `MAIL_FROM` are set.
- Gmail accounts use an app password, not the normal account password.
- `FRONTEND_URL` points to the running client.
- The message is not in spam or blocked by the provider.

### Uploads fail

Confirm `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLOUDINARY_FOLDER_NAME` are set and valid.
