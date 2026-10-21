# GlobalCart — Master Project Log

## 1. Project Metadata

- Project name: GlobalCart
- Project type: Full-stack multinational e-commerce application
- Database: CockroachDB
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- ORM: Prisma
- Styling: Tailwind CSS (planned)
- UI inspiration: Amazon/Flipkart-style shopping experience
- Original branding: GlobalCart
- Development environment: Windows, VS Code, PowerShell
- Project path: C:\Projects\GlobalCart
- Version: 0.1
- Start date: 2026-10-20
- Current phase: Phase 1 — Project setup
- Overall status: IN PROGRESS

## 2. Objective

Build a database-backed e-commerce platform supporting customers, products,
vendors, suppliers, warehouses, inventory, orders, payments, logistics,
returns, reviews, loyalty rewards, personalized offers, subscriptions,
and business analytics.

Demonstrate CockroachDB transactions, relational integrity, concurrency
handling, indexing, SQL analytics, and distributed database concepts.

## 3. Environment Verification

| Tool | Verified version/status |
|---|---|
| Node.js | v24.16.0 |
| npm | 11.13.0 |
| Git | 2.51.0.windows.1 |
| VS Code | In use |
| PowerShell | In use |
| Project directory | C:\Projects\GlobalCart |
| CockroachDB | Not configured |

## 4. Planned Project Structure

- frontend/ — React application
- backend/ — Express REST API
- docs/MASTER_LOG.md — master progress log
- docs/REQUIREMENTS.md — detailed requirements
- docs/DATABASE_DESIGN.md — schema and relationships
- docs/API_DOCUMENTATION.md — API specifications
- docs/TESTING_LOG.md — test results
- docs/database/ — database notes
- docs/api/ — API notes
- docs/testing/ — testing evidence

## 5. Application Pages

### Public storefront
- Home page
- Product catalogue and search
- Product details
- Category navigation and deals
- Sign-up and sign-in

### Customer portal
- Dashboard and profile
- Cart and checkout
- Wishlist
- Addresses
- Order history and tracking
- Payment history
- Returns and refunds
- Product reviews and ratings
- Loyalty rewards and points
- Personalized offers
- Subscriptions
- Logout

### Admin portal
- Analytics dashboard
- Product and category management
- Vendor and supplier management
- Warehouse and inventory management
- Order processing
- Payments and refunds
- Returns and reviews moderation
- Logistics and shipments
- Customer management
- Loyalty, offers, subscriptions, and reports

## 6. Planned Database Entities

Identity:
- users
- customer_profiles
- addresses

Catalogue:
- categories
- products
- vendors
- suppliers
- supplier_products

Inventory:
- warehouses
- inventory

Shopping and orders:
- carts
- cart_items
- wishlists
- wishlist_items
- orders
- order_items

Payments and fulfilment:
- payments
- refunds
- returns
- return_items
- logistics_providers
- shipments

Customer engagement:
- reviews
- loyalty_accounts
- loyalty_transactions
- offers
- customer_offers
- subscription_plans
- subscriptions

Final columns, constraints, indexes, foreign keys, and migrations will be
documented after schema design.

## 7. Requirements Tracker

| ID | Requirement | Status |
|---|---|---|
| R01 | Create project folders and initialize Git | IN PROGRESS |
| R02 | Create master log and project documentation | IN PROGRESS |
| R03 | Scaffold React frontend | NOT STARTED |
| R04 | Build storefront interface | NOT STARTED |
| R05 | Create Express backend | NOT STARTED |
| R06 | Configure CockroachDB connection | NOT STARTED |
| R07 | Design schema and migrations | NOT STARTED |
| R08 | Implement authentication and authorization | NOT STARTED |
| R09 | Implement catalogue, cart, and wishlist | NOT STARTED |
| R10 | Implement transactional checkout and inventory | NOT STARTED |
| R11 | Implement payment simulation | NOT STARTED |
| R12 | Implement vendors, suppliers, and warehouses | NOT STARTED |
| R13 | Implement logistics, returns, and reviews | NOT STARTED |
| R14 | Implement loyalty, offers, and subscriptions | NOT STARTED |
| R15 | Implement admin analytics | NOT STARTED |
| R16 | Test and document end-to-end workflows | NOT STARTED |

## 8. Implementation Roadmap

1. Project setup and documentation
2. CockroachDB setup, schema, migrations, and seed data
3. Backend foundation and authentication
4. Frontend foundation and customer authentication pages
5. Catalogue, cart, checkout, orders, and payments
6. Inventory, vendors, suppliers, logistics, and returns
7. Reviews, loyalty, offers, and subscriptions
8. Analytics and advanced database demonstrations
9. Testing, polish, documentation, and final presentation

## 9. Technical Decisions

- CockroachDB will be the primary application database.
- The frontend will access the database through the backend API only.
- Prisma will manage schema migrations and typed database access.
- Passwords will be stored as secure hashes, never plaintext.
- Admin authorization will be enforced by the backend.
- Payment processing will initially be simulated; no real card details will be stored.
- Order and inventory updates must be transactionally consistent.
- Local development will not be presented as proof of multi-region deployment.
- The interface will use original GlobalCart branding and familiar shopping UX.

## 10. Development Journal

### 2026-10-20 — Initial setup
- Verified Node.js v24.16.0.
- Verified npm 11.13.0.
- Verified Git 2.51.0.windows.1.
- Confirmed working directory: C:\Projects\GlobalCart.
- Defined application portals, technology stack, database entities, and roadmap.
- Application code and database migrations have not yet been implemented.
- Current task: create folders and master project documentation.

## 11. Testing Log

No application tests have been run yet.

For each test, record:
- Date and test ID
- Purpose and setup
- Command or test steps
- Expected result
- Actual result
- PASS or FAIL
- Relevant evidence and any fixes

## 12. Current State and Next Actions

1. Verify project folders and Git initialization.
2. Create README.md, .gitignore, and the supporting documentation files.
3. Scaffold the React frontend and run it locally.
4. Build the first storefront pages.
5. Initialize the Express backend.
6. Select and configure the CockroachDB development environment.
7. Design the schema, create migrations, and verify connectivity.

## 13. Status Definitions

- NOT STARTED: not attempted.
- IN PROGRESS: currently being implemented.
- IMPLEMENTED: code exists but verification is incomplete.
- VERIFIED: acceptance criteria passed and evidence is recorded.
- BLOCKED: waiting on a dependency or fix.

Update this master log after every meaningful milestone. Record actual results;
do not mark planned or untested features as complete.

## Development Journal — 2026-10-20

### Frontend Scaffold and Dependency Setup
- Created the React + TypeScript frontend using Vite in `frontend/`.
- Installed frontend dependencies successfully using the npm mirror for improved download performance.
- Installed application libraries: React Router DOM, Lucide React, and Axios.
- Verified installed dependencies with `npm ls --depth=0`; no missing dependencies were reported.
- Verified the production build twice using `npm run build`; TypeScript compilation and Vite production bundling succeeded.
- Production output generated in `frontend/dist/`.
- Environment verified: Node.js v24.16.0, npm 11.13.0, React 19.3.1, Vite 8.3.4, TypeScript 6.0.3.
- Current status: frontend foundation verified; custom GlobalCart storefront and backend are still pending.
- Next action: start the Vite development server, verify local access, then implement the storefront UI.

## Development Journal — 2026-10-20

### Backend API Foundation — Verified
- Created the backend TypeScript configuration.
- Added the initial Express API server at `backend/src/server.ts`.
- Configured JSON request parsing, CORS, environment loading, and a JSON 404 response.
- Added `GET /api/health`, returning the service name, status, and timestamp.
- `npm run build` completed successfully.
- `npm run dev` started the API at `http://localhost:4000`.
- Confirmed the health endpoint returned `status: ok` and `service: GlobalCart API`.

### Backend Dependency Status
- Runtime dependencies and TypeScript tooling are installed and listed in the backend package manifest.
- `package-lock.json` exists.
- Prisma Client and Prisma CLI installation remains blocked by repeated network connection resets.
- CockroachDB is not connected yet; no database-backed workflow has been verified.

### Next Milestones
1. Resolve Prisma installation and configure CockroachDB.
2. Design and validate the relational schema.
3. Implement authentication, authorization, catalog, inventory, cart, checkout, orders, payments, shipping, returns, reviews, loyalty, and admin APIs.
4. Test API workflows and database transactions.
5. Integrate the frontend with the verified backend APIs.

## Development Journal — 2026-10-20

### GlobalCart Prisma Schema — Verified
- Installed Prisma CLI and Prisma Client at version 6.19.3.
- Configured Prisma for the CockroachDB provider.
- Defined 23 database models covering users, addresses, categories, vendors, products, product images, warehouses, inventory, carts, wishlists, orders, payments, shipments, returns, refunds, reviews, offers, and loyalty.
- Configured UUID identifiers, relations, indexes, uniqueness constraints, decimal monetary fields, and status enums.
- `npx prisma format` completed successfully.
- `npx prisma validate` confirmed the schema is valid.
- `npx prisma generate` successfully generated the client at `backend/src/generated/prisma`.
- `npm run build` passed after client generation.
- `GET /api/health` returned `status: ok`.
- Database connection and migration remain pending; schema validation does not establish a live database connection.

## Development Journal — 2026-10-21

### CockroachDB Cloud and Initial Database Migration — Verified
- Created the `globalcart-dev` CockroachDB Cloud cluster in Google Cloud, Mumbai (`asia-south1`).
- Configured the backend database connection through `backend/.env` and downloaded the CockroachDB CA certificate to `%APPDATA%\postgresql\root.crt`.
- Verified a successful database connection using the Node.js PostgreSQL driver.
- Confirmed all 23 GlobalCart tables exist in the `public` schema.
- Generated the initial migration at `backend/prisma/migrations/0001_init/migration.sql`.
- Recovered the failed initial migration caused by CockroachDB's schema lock on the `User` table.
- Applied the missing indexes and foreign-key constraints without dropping or recreating the existing tables.
- Verified the database schema diff is empty.
- Marked migration `0001_init` as applied after verifying the schema matched the Prisma datamodel.
- Restored and verified `schema_locked = true` on the `User` table.
- `npx prisma validate` passed.
- `npx prisma generate` passed using Prisma Client 6.19.3.
- `npm run build` passed.
- `npx prisma migrate status` confirmed: `Database schema is up to date!`.
- Current status: CockroachDB connection, 23-model schema, initial migration history, Prisma Client generation, and backend compilation verified.
- Next action: implement the database access layer and begin backend authentication workflows.


## Development Journal — 2026-10-21

### Authentication Module — Verified

- Created a reusable Prisma Client module at `backend/src/lib/prisma.ts`.
- Added a database-backed health endpoint at `GET /api/health/database`.
- Added Zod validation schemas for registration and login.
- Implemented registration with bcrypt password hashing and duplicate-email handling.
- Implemented login with password verification and one-hour JWTs.
- Added JWT verification utilities and authentication middleware.
- Added authentication routes:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Verified TypeScript builds successfully using `npm run build`.
- Verified registration creates a customer account in CockroachDB.
- Verified login returns a JWT without exposing the password hash.
- Verified the authenticated profile endpoint returns the database-backed user profile.
- Verified unauthenticated profile access returns HTTP 401.
- Verified incorrect credentials return HTTP 401.
- Verified duplicate registration returns HTTP 409.
- Current status: Core authentication flow tested successfully against the development database.
- Remaining security work: rate limiting, email verification, token lifecycle management, and further production hardening.
- Next action: implement product catalog and category APIs.


## Development Journal — 2026-10-21

### Demo Catalog Seeding and API Verification — Verified

- Seeded 5 categories, including 2 top-level categories and 3 subcategories.
- Seeded 2 demo vendors and 1 demo warehouse (`DEMO-MUM-01`).
- Seeded 4 fictional active products, product images, and inventory records.
- Verified GET /api/categories returns the expected category hierarchy.
- Verified GET /api/products returns all 4 active demo products.
- Verified product search using the headphones query.
- Verified category filtering using the accessories category.
- Verified ascending price sorting.
- Verified individual product lookup by slug, including category, vendor, image, and stock.
- Verified price-range filtering for $10–$30.
- Verified pagination with 2 products per page and 4 total products.
- Verified invalid price ranges return HTTP 400.
- Verified unknown products return HTTP 404.
- Current status: Demo seeding and catalog API scenarios listed above passed.
- Next action: Implement authenticated cart management with database-backed cart items.


## Development Journal — 2026-10-21

### Authenticated Cart API — Verified

- Implemented cart request validation with Zod schemas.
- Added authenticated cart endpoints for retrieval, adding items, updating quantities, removing individual items, and clearing the cart.
- Registered the cart router at `/api/cart`.
- Verified the backend TypeScript build passes.
- Verified unauthenticated cart requests return HTTP 401.
- Verified authenticated cart retrieval creates and returns the user's cart.
- Added the seeded Demo Smartphone to the cart and verified its $499.99 subtotal and total.
- Updated the quantity to 2 and verified the subtotal and total become $999.98.
- Verified requests for 26 units are rejected with HTTP 409 when only 25 units are available.
- Verified individual item removal and the resulting empty cart.
- Verified clearing the cart removes the remaining item and returns an empty cart.
- Confirmed an empty cart returns itemCount 0 and total "0.00".
- Current status: The cart operations listed above passed their development API tests.
- Next action: Implement checkout and order creation with transactional inventory validation and simulated payment processing.

## Development Journal — 2026-10-21

### Checkout and Order API — Verified

- Implemented checkout request validation using Zod.
- Added authenticated checkout, order-list, and order-detail endpoints.
- Created orders with server-calculated totals and order-item price snapshots.
- Added conditional inventory decrements within the database transaction.
- Added simulated payment records without collecting real card details.
- Verified COD checkout for the Demo Smartphone at $499.99 USD.
- Verified the created order remains PENDING and its COD payment remains PENDING.
- Verified order-list and order-detail retrieval for the authenticated customer.
- Verified the cart is empty after successful checkout.
- Verified the active DEMO-MUM-01 warehouse inventory decreased from 25 to 24 units, with reserved stock remaining 0.
- Verified the backend TypeScript build passes.
- Current status: The tested checkout happy path passes.
- Follow-up: Harden unsupported payment methods, transaction conflicts, invalid order IDs, and failure scenarios before storefront integration.

### Checkout Validation and Order Access — Verified

- Restricted checkout payment methods to SIMULATED_CARD and COD.
- Verified WALLET checkout requests return HTTP 400 with field-level validation details.
- Added UUID-format validation for order IDs.
- Verified malformed order IDs return HTTP 400.
- Verified a valid UUID with no accessible order returns HTTP 404.
- Confirmed order retrieval is scoped to the authenticated user's ID.
- Current status: The tested checkout validation and order-access checks pass.
- Remaining hardening: Verify transaction conflict behavior, stock race conditions, and simulated payment failure handling.

### Customer Address Management — Verified

- Added authenticated customer address endpoints:
  - GET `/api/addresses` — list addresses.
  - POST `/api/addresses` — create an address.
  - PATCH `/api/addresses/:addressId` — update an address.
  - DELETE `/api/addresses/:addressId` — delete an address.
- Added Zod validation for address creation and updates.
- Verified country codes are normalized to uppercase.
- Verified the first address automatically becomes the default.
- Verified changing the default clears the previous default.
- Verified deleting the default assigns default status to a remaining address.
- Verified invalid address input returns HTTP 400 with field-level details.
- Verified requests without authentication return HTTP 401.
- Verified the TypeScript build passes.
- Current status: The tested address-management flows pass.

### Shipment Management and Tracking — Implemented

- Added admin endpoints to list shipments, create shipments for eligible orders, and update shipment status.
- Added customer shipment tracking scoped to the authenticated customer's own order.
- Implemented shipment status-transition validation and updates to related order status and shipment timestamps.
- Verified: TypeScript build passes; all 7 existing automated tests pass.
- Verified: Admin shipment listing and customer shipment tracking both return HTTP 401 without authentication.
- Pending verification: authenticated shipment creation, lifecycle transitions, customer tracking response, and end-to-end delivery flow.

### Frontend Authentication, Cart and Wishlist — Verified
- Frontend production build passed (`npm run build`).
- Frontend lint passed (`npm run lint`).
- Registration/sign-in and session restoration tested successfully.
- Cart API integration tested: add, quantity update, remove, subtotal refresh and persistence after page refresh.
- Wishlist API integration tested: save, remove and persistence after page refresh.
- Customer cart and wishlist use the existing authenticated backend APIs.
- Checkout and order history remain the next frontend milestone.
