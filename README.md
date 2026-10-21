# GLOBALCART – UNIFIED E-COMMERCE, ROLE-BASED PORTALS & CLUSTER OPERATIONS PLATFORM

**GlobalCart** is an enterprise-grade full-stack e-commerce management platform built as a single, cohesive web application that orchestrates three primary operational experiences:

1. **Customer Storefront (`/`)** — Discover products, browse high-resolution studio photography, test interactive 4-angle product galleries, manage persistent shopping carts and wishlists, earn loyalty reward tiers, track order shipments in real-time, and submit post-purchase returns.
2. **Admin Control Panel (`/admin`)** — Mission control for platform operators to manage catalogs, create categories, inspect all customer orders, dispatch multi-carrier shipments (`FedEx`, `UPS`, `DHL`), manage multi-warehouse stock allocations, moderate customer reviews, resolve returns, and audit payment ledgers.
3. **Vendor Partner Portal (`/vendor`)** — Dedicated portal for verified third-party merchants to publish catalog listings with live image previews, oversee warehouse inventory for their SKUs, and manage order fulfillment lines assigned to their store.

The platform bridges modern consumer storefront aesthetics with high-density operational workflows, backed by distributed CockroachDB storage, Prisma ORM, Express TypeScript API micro-modules, and React 19 edge delivery on Vercel.

---

## 🌐 Live Production Links

| Service | Platform | Live URL | Status |
| :--- | :--- | :--- | :--- |
| **Customer Storefront** | **Vercel** | **[https://global-cart-three.vercel.app](https://global-cart-three.vercel.app/)** | **Operational** |
| **Admin Control Panel** | **Vercel** | **[https://global-cart-three.vercel.app/admin](https://global-cart-three.vercel.app/admin)** | **Protected / Live** |
| **Vendor Partner Portal** | **Vercel** | **[https://global-cart-three.vercel.app/vendor](https://global-cart-three.vercel.app/vendor)** | **Protected / Live** |
| **API Backend Server** | **Render** | **[https://globalcart-api.onrender.com](https://globalcart-api.onrender.com)** | **Healthy (`200 OK`)** |
| **Database Cluster** | **CockroachDB Cloud** | Provisioned Serverless Cluster | **Connected** |
| **Master Documentation** | **GitHub** | **[GLOBALCART_COMPREHENSIVE_SYSTEM_REPORT.md](https://github.com/Reneshb24/GlobalCart/blob/main/docs/GLOBALCART_COMPREHENSIVE_SYSTEM_REPORT.md)** | **Read Full Spec** |

---

## The Problem
Modern full-stack e-commerce architectures frequently suffer from architectural fragmentation, loose role boundaries, and brittle inventory management:
- **Fragmented Codebases**: Splitting customer, admin, and vendor portals into disjointed apps creates duplicated components, inconsistent design languages, and synchronization overhead.
- **Insecure Role-Based Access (RBAC)**: Applications often rely on client-side routing guards without fail-closed server-side verification, creating privilege escalation and IDOR vulnerabilities on operational endpoints.
- **Brittle Image Pipelines**: External product images frequently break, cause layout shifts, or fail silently without deterministic fallbacks, degrading the shopper experience.
- **Static Inventory Tracking**: Storing static stock numbers leads to overselling when multiple shoppers checkout simultaneously across different distribution centers.
- **Disconnected Post-Purchase Workflows**: Tracking shipments, handling cancellations, processing return approvals, and maintaining financial refund ledgers are often treated as afterthoughts rather than automated state machines.

GlobalCart solves these challenges by delivering an end-to-end, role-isolated architecture with distributed database ACID compliance, a deterministic image fallback engine, and automated order fulfillment lifecycles.

---

## Why GlobalCart?
GlobalCart is designed to simulate a real-world enterprise retail operation:
- **Unified Domain & Seamless Navigation**: Customers, administrators, and vendors access their respective interfaces through a unified portal switcher available on the homepage (header pills, announcement bar, footer directory, and floating dock).
- **Strict Server-Enforced RBAC**: Every administrative or vendor endpoint is protected by stateless JWT verification, database-backed account active checks, and automated tenant scoping.
- **Resilient Multi-Angle Image System**: Curated studio photography with 4 angles per product (Front Hero, 45° Profile, Lifestyle Desk, Macro Detail), smooth CSS blur-up transitions, and zero-network inline SVG fallbacks per category.
- **Real-Time Dynamic Stock Aggregation**: Available inventory is dynamically computed across warehouses ($\text{Available} = \sum (\text{OnHand} - \text{Reserved})$), ensuring zero overselling.
- **Complete Post-Purchase State Machine**: From `PENDING` order cancellations to carrier shipment progression and return authorization with ledger refunds.

---

## Key Features

### 1. Unified Multi-Role Portal Switcher
The homepage features 4 distinct navigational touchpoints (Top Announcement Strip, Main Header Action Pills, Floating Quick-Switch Dock, and Footer Directory) allowing 1-click access to the Storefront, Admin Panel, and Vendor Portal. Unauthorized visits to `/admin` or `/vendor` render a secure guard with an immediate return link.

### 2. Resilient Studio Photography & 4-Angle Gallery
Raw placeholder URLs are deterministically upgraded to curated high-resolution photography from Unsplash. The product modal renders an interactive 4-perspective gallery with active indicator rings, keyboard accessibility, and automatic fallback to category-themed inline SVGs if network errors occur.

### 3. Distributed Database Architecture (CockroachDB + Prisma)
Backed by CockroachDB Cloud, providing horizontal scalability, multi-region replication, and ACID guarantees. Prisma ORM handles strongly-typed relational queries across Users, Vendors, Products, Warehouses, Inventory, Orders, Shipments, Reviews, and Loyalty Accounts.

### 4. Admin Command Center & Order Fulfillment
Platform operators inspect global orders, filter by status, dispatch carrier shipments (`FedEx`, `UPS`, `DHL`, `BlueDart`), and advance tracking milestones (`PREPARING` → `DISPATCHED` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED`).

### 5. Multi-Warehouse Stock & Delta Adjustments
Administrators can create new physical distribution centers, inspect stock across warehouses, and apply positive or negative stock adjustments (+/-) to rebalance inventory.

### 6. Vendor Partner Portal & Scoped Operations
Third-party sellers publish catalog listings with live image preview cards, monitor stock across warehouses for their SKUs, and view order fulfillment lines restricted strictly to their vendor account.

### 7. Post-Purchase Returns & Ledger Refunds
Customers can request returns on delivered orders by submitting operational reasons. Administrators review requests, approve or reject them, mark items received, and trigger recorded refunds in the payment ledger.

### 8. Customer Loyalty Rewards & Review Moderation
Shoppers earn points on purchases, unlocking tiered rewards (`BRONZE` → `SILVER` → `GOLD` → `PLATINUM`). An administrative review moderation queue ensures reviews are verified before going public.

---

## 🔑 Test Accounts & Team Mate Credentials

Your team mates can test all 3 portals immediately using these credentials:

| Experience | Portal Link | Username / Email | Password | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | [https://global-cart-three.vercel.app/admin](https://global-cart-three.vercel.app/admin) | `globalcart.admin.dev@example.com` | `Admin123!` | Complete control: view platform orders, dispatch shipments, create products & categories, add warehouses, adjust stock deltas, approve returns, issue refunds, moderate reviews, and toggle customer active status. |
| **Vendor Partner** | [https://global-cart-three.vercel.app/vendor](https://global-cart-three.vercel.app/vendor) | `demo-electronics@globalcart.example` | `Vendor123!` | Scoped seller portal: create/edit vendor listings with live image previews, view multi-warehouse inventory levels, and track customer orders for their items. |
| **Customer Shopper** | [https://global-cart-three.vercel.app/](https://global-cart-three.vercel.app/) | Any email (or register new) | User defined | Browse catalog with studio photography, test 4-angle gallery, cart, wishlist, address book, loyalty reward points, order tracking, and return requests. |

---

## Technology Stack

### Frontend
- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite 8 (Hot Module Replacement, fast bundling)
- **Language**: TypeScript 5
- **Routing**: React Router DOM 7 (Client-side routing with SPA rewrite rules)
- **Styling**: Vanilla CSS3 (Custom design system, CSS Grid, Flexbox, responsive breakpoints)
- **Icons**: Lucide React
- **HTTP Client**: Axios (Automated bearer token interceptors)
- **Hosting**: Vercel (Global Edge CDN, automatic HTTPS, immutable asset caching)

### Backend API
- **Runtime**: Node.js 24 LTS
- **Framework**: Express 5
- **Language**: TypeScript 7 (`tsc`)
- **Security**:
  - `helmet`: HTTP headers, Content Security Policy, XSS filtering
  - `express-rate-limit`: Brute-force protection on authentication routes
  - `bcryptjs`: Password hashing with 12 salt rounds
  - `jsonwebtoken`: Stateless 256-bit signed JWT authentication
- **Validation**: Zod (Runtime payload parsing and schema validation)
- **Hosting**: Render (Web Service container with health check monitoring)

### Database & ORM
- **Database Engine**: CockroachDB Cloud (Distributed SQL, PostgreSQL-wire compatible)
- **ORM**: Prisma 6.19.3 (Native CockroachDB dialect, auto-generated type-safe queries)

### Libraries & Dependencies

#### Frontend Dependencies:
- `react` & `react-dom`: Declarative UI component engine
- `react-router-dom`: Client-side history and dynamic portal routing
- `axios`: Promise-based HTTP client for API communication
- `lucide-react`: Modern SVG iconography
- `typescript` & `vite`: Developer build system and type checking

#### Backend Dependencies:
- `express`: Lightweight web application framework
- `@prisma/client`: Auto-generated database query builder
- `pg`: Native PostgreSQL client driver for CockroachDB connection pooling
- `dotenv`: Runtime environment variable injector
- `cors`: Configurable cross-origin resource sharing
- `zod`: Declarative schema validation

---

## Project Structure

```
GlobalCart/
├── frontend/                     # React 19 + Vite Frontend SPA
│   ├── public/                   # Static favicon and icon assets
│   ├── src/
│   │   ├── admin/                # Admin Control Panel components & styles
│   │   │   ├── AdminPortal.tsx   # Dashboard, orders, catalog, inventory, reviews
│   │   │   └── AdminPortal.css   # Dark slate command center styling
│   │   ├── vendor/               # Vendor Partner Portal components & styles
│   │   │   ├── VendorPortal.tsx  # Seller listings, stock view, scoped orders
│   │   │   └── VendorPortal.css  # Amber/stone seller theme styling
│   │   ├── lib/
│   │   │   ├── api.ts            # Axios instance, token interceptor, base URLs
│   │   │   └── productImages.ts  # Deterministic image resolver & SVG fallback
│   │   ├── App.tsx               # Storefront, portal switchers, catalog, cart
│   │   ├── App.css               # Storefront styles & responsive grid
│   │   ├── AppRouter.tsx         # Top-level client-side router
│   │   ├── ProductDetailsDialog.tsx # 4-angle gallery modal with thumb selector
│   │   ├── CustomerCommerceDialog.tsx # Orders history, returns, tracking, loyalty
│   │   ├── AddressBookDialog.tsx # Address book manager with ISO normalizer
│   │   ├── ProductImg.tsx        # Resilient image with CSS blur-up transition
│   │   └── main.tsx              # React application entry point
│   ├── vercel.json               # SPA rewrite configuration for Vercel
│   └── package.json              # Frontend dependencies and Vite build scripts
│
├── backend/                      # Express 5 + TypeScript Backend API
│   ├── prisma/
│   │   └── schema.prisma         # CockroachDB database schema definition
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── authenticate.ts   # JWT validation & active user verification
│   │   │   ├── requireAdmin.ts   # Enforces ADMIN role guard
│   │   │   └── requireVendor.ts  # Enforces VENDOR role & vendor profile binding
│   │   ├── modules/
│   │   │   ├── catalog/          # Public product search & category routes
│   │   │   ├── orders/           # Checkout, order placement, order service
│   │   │   ├── admin.routes.ts   # Full administrative operations module
│   │   │   ├── vendor/           # Vendor scoped listings & order fulfillment
│   │   │   ├── reviews/          # Review submission & moderation queue
│   │   │   ├── returns.routes.ts # Return authorization & refund ledger
│   │   │   ├── loyalty.routes.ts # Loyalty reward points balance & history
│   │   │   └── auth/             # Login, registration, profile updates
│   │   ├── lib/
│   │   │   └── prisma.ts         # Singleton Prisma client instance
│   │   └── server.ts             # Express server setup, CORS, rate limits
│   ├── Procfile                  # Cloud PaaS execution command
│   ├── render.yaml               # Render Infrastructure-as-Code Blueprint
│   └── package.json              # Backend dependencies, types, and build scripts
│
├── docs/                         # Platform Documentation
│   ├── GLOBALCART_COMPREHENSIVE_SYSTEM_REPORT.md # Master architectural specification
│   ├── API_DOCUMENTATION.md      # REST API contracts
│   ├── DATABASE_DESIGN.md        # Relational schema reference
│   └── REQUIREMENTS.md           # Business specification
│
└── README.md                     # Root project documentation
```

---

## Target Workflow & System Walkthrough

### Phase 1: Customer Discovery & Checkout Journey
1. Navigate to the live storefront: [https://global-cart-three.vercel.app/](https://global-cart-three.vercel.app/).
2. Filter catalog items using category tabs or the debounced price slider.
3. Click **"Details"** on any product to inspect the 4-angle studio photography gallery.
4. Add items to the shopping cart drawer and proceed to checkout.
5. Select a shipping address and complete checkout with Cash on Delivery or Simulated Card.
6. Open **"Orders"** to view line-item product thumbnails and live delivery status.

### Phase 2: Administrative Fulfillment & Logistics Dispatch
1. Access the Admin Control Panel at [https://global-cart-three.vercel.app/admin](https://global-cart-three.vercel.app/admin).
2. Log in using `globalcart.admin.dev@example.com` / `Admin123!`.
3. Open **"Orders"** and select a newly placed order.
4. Dispatch carrier shipment by selecting a carrier (`FedEx`, `UPS`, `DHL`) and tracking number.
5. Advance tracking milestones (`PREPARING` → `DISPATCHED` → `IN_TRANSIT` → `DELIVERED`).

### Phase 3: Vendor Listing & Inventory Oversight
1. Access the Vendor Portal at [https://global-cart-three.vercel.app/vendor](https://global-cart-three.vercel.app/vendor).
2. Log in using `demo-electronics@globalcart.example` / `Vendor123!`.
3. Create a new listing, provide pricing, and paste an Image URL with live preview.
4. Review warehouse inventory levels for vendor-owned SKUs and view assigned customer order lines.

### Phase 4: Return Authorization & Refund Ledger
1. A customer requests a return on a delivered order.
2. In the Admin Panel, navigate to **"Returns"** and inspect the customer's stated reason.
3. Click **"Approve"**, mark the item **"Received"**, and click **"Issue Refund"**.
4. The refund is automatically recorded in the platform transaction ledger.

---

## Setup and Installation Guide

### 1. Prerequisites
Ensure the following are installed on your workstation:
- **Git**: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- **Node.js (v20.x or higher)**: [https://nodejs.org/](https://nodejs.org/)
- **npm** (bundled with Node.js)

Verify your environment:
```bash
node -v
npm -v
git --version
```

### 2. Clone the Repository
```bash
git clone https://github.com/Reneshb24/GlobalCart.git
cd GlobalCart
```

### 3. Backend Setup & Local Server
```bash
cd backend
npm install
npm run build
npm start
# Backend API running at http://localhost:4000
```

### 4. Frontend Setup & Development Server
Open a second terminal window:
```bash
cd frontend
npm install
npm run dev
# Frontend application running at http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173/) in your browser to experience GlobalCart locally.

---

## Future Improvements

1. **Direct Payment Gateway Integration**: Connect live Stripe Elements or Razorpay Checkout for direct credit card, UPI, and net banking authorization.
2. **Automated S3/Cloudinary Image Ingestion**: Cloud storage bucket integration for multi-image drag-and-drop file uploads with automatic WebP/AVIF compression.
3. **Real-Time WebSockets / SSE**: Push real-time inventory adjustments and order state updates to active admin and vendor dashboards without polling.
4. **Automated PDF Invoicing**: One-click generation of branded tax invoices and packing slips for warehouse dispatch.

---

## Author

**Renesh B** – [@Reneshb24](https://github.com/Reneshb24)  
*For detailed relational schemas, API contracts, and operator runbooks, consult the master document:*  
👉 **[docs/GLOBALCART_COMPREHENSIVE_SYSTEM_REPORT.md](https://github.com/Reneshb24/GlobalCart/blob/main/docs/GLOBALCART_COMPREHENSIVE_SYSTEM_REPORT.md)**
