# GLOBALCART — UNIFIED E-COMMERCE, ROLE-BASED PORTALS & CLUSTER OPERATIONS PLATFORM

**GlobalCart** is an enterprise-grade full-stack multi-vendor e-commerce marketplace and cluster operations platform inspired by Amazon and Flipkart. Built as a single, cohesive web application, it orchestrates four interconnected operational experiences:

1. **Customer Storefront & Account Portal (`/`)** — Discover products with Amazon/Flipkart-style deal badges and M.R.P. strikethroughs, browse 4-perspective high-resolution photographic galleries, 1-Click "⚡ Buy Now" direct checkout, persistent shopping carts and wishlists, SuperCoins loyalty points redemption, real-time 5-stage shipment tracking stepper, and post-purchase returns.
2. **Admin Command Center (`/admin`)** — Mission control for marketplace operators: manage catalogs, create categories, inspect all customer orders, dispatch multi-carrier shipments (`FedEx`, `UPS`, `DHL`, `BlueDart`), advance 5-milestone tracking stages, manage multi-warehouse stock allocations, adjust stock deltas, delete/archive out-of-stock listings, moderate customer reviews, resolve returns, and audit payment ledgers.
3. **Vendor Partner & Seller Hub (`/vendor`)** — Dedicated portal for verified merchants and new sellers: self-service business onboarding with nearest fulfillment warehouse selection, publish catalog listings with 4 camera angle image inputs (URLs or direct device file uploads), monitor warehouse inventory for their SKUs, delete out-of-stock listings, and manage order fulfillment lines assigned strictly to their store.
4. **Warehouse & Multi-Hub Fulfillment Operations** — Distributed inventory control across regional hubs (US East, EU Central, APAC South). Dynamic stock aggregation ($\text{Available} = \sum (\text{OnHand} - \text{Reserved})$), atomic checkout reservation, and carrier dispatch tracking.

The platform bridges consumer storefront aesthetics with high-density enterprise operations, backed by distributed CockroachDB storage, Prisma ORM, Express TypeScript API modules, and React 19 edge delivery on Vercel.

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
- **4-Angle Photographic Studio & Direct File Uploads**: 4 photographic perspectives per product (Front Hero, Side Profile, Lifestyle View, Detail Macro). Sellers can paste image URLs or directly upload image files from their local device with instant preview.
- **Real-Time Dynamic Stock Aggregation**: Available inventory is dynamically computed across warehouses ($\text{Available} = \sum (\text{OnHand} - \text{Reserved})$), ensuring zero overselling.
- **Amazon/Flipkart Fast-Checkout & Promotions**: 1-Click "⚡ Buy Now" direct checkout, SuperCoins loyalty points redemption, and promotional coupon discounts.
- **Complete 5-Milestone Tracking State Machine**: From `PREPARING` → `DISPATCHED` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED` with interactive admin progression and customer live stepper.

---

## Key Features

### 1. Unified Multi-Role Portal Switcher
The homepage features 4 distinct navigational touchpoints (Top Announcement Strip, Main Header Action Pills, Floating Quick-Switch Dock, and Footer Directory) allowing 1-click access to the Storefront, Admin Panel, and Vendor Portal. Unauthorized visits to `/admin` or `/vendor` render a secure guard with an immediate return link.

### 2. Multi-Perspective Imagery & Device File Uploads
Products support 4 photographic camera angles (Angle 1: Front Hero, Angle 2: Side Profile, Angle 3: Lifestyle Context, Angle 4: Detail Macro). The system supports both direct URL ingestion and native local file uploads (`POST /api/upload`) with MIME validation, 10MB payload capacity, static serving from `/uploads`, and automated preview fallback.

### 3. Vendor Self-Service Onboarding & Warehouse Hub Routing
New merchants can register their business name, contact credentials, and select their nearest regional fulfillment center (warehouse) directly from the Seller Hub (`POST /api/auth/register-vendor`), immediately gaining access to list products and track inventory.

### 4. Amazon & Flipkart E-Commerce Innovations
- **1-Click "⚡ Buy Now" Flow**: Instantly opens direct checkout with selected quantity without traversing multiple shopping cart screens.
- **M.R.P. Strikethrough & Deals**: Highlights active discounts (e.g. `-20%`) against original list prices.
- **SuperCoins Loyalty Accrual & Redemption**: Customers earn points on delivered orders and can redeem them for instant checkout discounts ($100 \text{ pts} = \$1.00$).
- **Promotional Coupon Engine**: Supports percentage and fixed coupons (`SAVE10`, `TECH20`, `WELCOME50`) with minimum order thresholds.

### 5. Multi-Warehouse Stock & Delta Adjustments
Administrators can create physical distribution centers, inspect stock across warehouses, allocate quantities, and apply positive or negative stock adjustments (+/-) to rebalance inventory.

### 6. 5-Stage Live Order Fulfillment & Tracking Stepper
Platform operators inspect global orders, filter by status, dispatch carrier shipments (`FedEx`, `UPS`, `DHL`, `BlueDart`), and advance milestones through an interactive stepper (`PREPARING` → `DISPATCHED` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED`). Customers track progress in real time with visual progress indicators.

### 7. Product Deletion & Safe Historical Archiving
Administrators and vendors can remove discontinued or out-of-stock products directly from catalog tables or editing modals. Products with zero order history are deleted cleanly; products with historical orders are safely archived (`ARCHIVED`) to maintain audit and financial ledger integrity.

### 8. Post-Purchase Returns & Ledger Refunds
Customers can request returns on delivered orders by submitting operational reasons. Administrators review requests, approve or reject them, mark items received, and trigger recorded refunds in the payment ledger.

---

## 🔑 Test Accounts & Team Mate Credentials

You can test all portals immediately using these credentials:

| Experience | Portal Link | Username / Email | Password | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | [https://global-cart-three.vercel.app/admin](https://global-cart-three.vercel.app/admin) | `globalcart.admin.dev@example.com` | `Admin123!` | Complete control: view platform orders, advance 5-stage shipments, create/delete products, add warehouses, adjust stock deltas, approve returns, issue refunds, moderate reviews, and toggle customer active status. |
| **Vendor Partner** | [https://global-cart-three.vercel.app/vendor](https://global-cart-three.vercel.app/vendor) | `demo-electronics@globalcart.example` | `Vendor123!` | Scoped seller portal: self-service registration, 4 camera angle listing creation with file upload, multi-warehouse stock monitoring, out-of-stock listing deletion, and order line tracking. |
| **Customer Shopper** | [https://global-cart-three.vercel.app/](https://global-cart-three.vercel.app/) | Any email (or register new) | User defined | Browse catalog with studio photography, test 4-angle gallery, 1-Click Buy Now, coupons, SuperCoins loyalty points, 5-stage shipment tracking, and return requests. |

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
- **Runtime**: Node.js v20.x
- **Framework**: Express.js
- **Language**: TypeScript
- **Database Client**: Prisma ORM (Strongly-typed data access, migration engine)
- **Validation**: Zod (Strict schema parsing for query params and request bodies)
- **Authentication**: JWT (`jsonwebtoken`) + `bcryptjs` password hashing
- **Security**: Helmet HTTP headers, CORS whitelisting, Express Rate Limit
- **Hosting**: Render PaaS (Managed containerized service)

### Database Layer
- **Engine**: CockroachDB Cloud
- **Architecture**: Distributed SQL, Multi-Region Active-Active Replication
- **Consistency**: Serialisable ACID Transactions

---

## Step-by-Step Operator Runbook

### Phase 1: Customer Purchase & Checkout
1. Visit [https://global-cart-three.vercel.app/](https://global-cart-three.vercel.app/).
2. Click any product to inspect the interactive 4-angle studio photography gallery.
3. Test 1-Click "⚡ Buy Now" direct checkout or add to cart.
4. Apply coupon code `SAVE10` or redeem earned SuperCoins points.
5. Complete checkout to generate an order in `PENDING` state.

### Phase 2: Administrative Fulfillment & Live Tracking
1. Log into the Admin Panel at `/admin` (`globalcart.admin.dev@example.com` / `Admin123!`).
2. Go to **"Orders"**, select the new order, and click **"Dispatch Shipment"**.
3. Choose carrier (`FedEx`, `UPS`, `DHL`, `BlueDart`) and input a tracking code.
4. Advance the shipment through each stage: `Mark Dispatched` → `In Transit` → `Out for Delivery` → `Confirm Delivered`.
5. Observe the order automatically moving to `DELIVERED`, and SuperCoins loyalty points being credited to the customer.

### Phase 3: Vendor Onboarding & Multi-Angle Listing
1. Navigate to `/vendor` and click **"Register New Seller"**.
2. Enter your business name, contact details, and select your nearest regional fulfillment warehouse hub.
3. Once in the dashboard, click **"Add New Product"**.
4. Enter product details, set stock quantity and warehouse, and supply 4 photographic angles (either paste URLs or click **Upload** to upload image files from your computer).
5. The product immediately appears in the customer catalog.

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

## Author

**Renesh B** – [@Reneshb24](https://github.com/Reneshb24)  
*For detailed relational schemas, API contracts, and operator runbooks, consult the master document:*  
👉 **[docs/GLOBALCART_COMPREHENSIVE_SYSTEM_REPORT.md](https://github.com/Reneshb24/GlobalCart/blob/main/docs/GLOBALCART_COMPREHENSIVE_SYSTEM_REPORT.md)**
