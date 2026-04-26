The Bakery

A basic restaurant ordering app using one small web server.

## Tech Stack

- Node.js
- Express
- PostgreSQL
- Stripe PaymentIntent creation on the backend, with local manual completion fallback
- Plain HTML, CSS, and JavaScript
- Kitchen dashboard polling every 5 seconds

This version does not use Docker, React, Vite, Prisma, or Socket.IO.

## Requirements

- Node.js 18 or newer
- npm
- PostgreSQL installed and running locally

Create a PostgreSQL database before setup. For example:

```powershell
createdb the_bakery
```

If your PostgreSQL user/password/database are different, update `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/lurexo_uat?schema=public"
JWT_SECRET="change_this_for_production"
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_SERVICE_FEE_PERCENTAGE=4
NODE_ENV="development"
PORT=3001
```

## Setup

From the project root:

```powershell
cd C:\Dev\TheBakery\TheBakery
npm run setup
```

That installs dependencies, creates the database tables, and seeds:

- admin user: `admin`
- password: `admin123`
- sample menu items

## Run

```powershell
npm start
```

Open:

- Customer menu: `http://localhost:3001`
- Kitchen dashboard: `http://localhost:3001/kitchen.html`
- Admin: `http://localhost:3001/admin.html`
- Health check: `http://localhost:3001/health`

Checkout follows the same local pattern as the Lurexo checkout page: the browser creates a pending order and then calls an order completion endpoint with `paymentMethod: "card"`. No Stripe CLI webhook listener is required for local checkout.

## Useful Commands

```powershell
npm run setup
npm start
npm run dev
npm --prefix backend run db:init
npm --prefix backend run db:seed
```

`db:seed` resets orders/menu data and recreates the default admin/menu seed data.
