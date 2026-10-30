# GLOBALCART – UNIFIED E-COMMERCE, ROLE-BASED PORTALS & CLUSTER OPERATIONS PLATFORM

**GlobalCart** is an enterprise-grade full-stack multi-vendor e-commerce marketplace and cluster operations platform inspired by Amazon and Flipkart. Built as a single, cohesive web application, it orchestrates four interconnected operational experiences:

1. **Customer Storefront & Account Portal (`/`)** — Discover products with dynamic festival deals and realistic M.R.P. strikethroughs, browse 4-perspective high-resolution photographic galleries, 1-Click "⚡ Buy Now" direct checkout, persistent shopping carts and wishlists, SuperCoins loyalty points redemption, tier-based promotional coupons, real-time 5-stage shipment tracking stepper, and post-purchase returns.
2. **Admin Command Center (`/admin`)** — Mission control for marketplace operators: manage catalogs, create categories, inspect all customer orders, dispatch multi-carrier shipments (`FedEx`, `UPS`, `DHL`, `BlueDart`), advance 5-milestone tracking stages, manage multi-warehouse stock allocations, adjust stock deltas, delete or safely archive out-of-stock listings, manage promotional coupons with customer tier restrictions (Full CRUD: Create, Edit, Toggle, Delete), moderate customer reviews, resolve returns, and audit payment ledgers.
3. **Vendor Partner & Seller Hub (`/vendor`)** — Dedicated portal for verified merchants and new sellers: self-service business onboarding with nearest fulfillment warehouse selection, publish catalog listings with 4 camera angle image inputs (URLs or direct local device file uploads with `POST /api/upload`), monitor warehouse inventory for their SKUs, delete out-of-stock listings, and manage order fulfillment lines assigned strictly to their store.
4. **Warehouse & Multi-Hub Fulfillment Operations** — Distributed inventory control across regional hubs (US East, EU Central, APAC South). Dynamic stock aggregation ($\text{Available} = \sum (\text{OnHand} - \text{Reserved})$), atomic checkout reservation, and carrier dispatch tracking.

The platform bridges modern consumer storefront aesthetics with high-density enterprise operations, backed by distributed CockroachDB storage, Prisma ORM, Express TypeScript API modules, and React 19 edge delivery on Vercel.

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
- **Rigid Hardcoded Pricing & Inflexible Promotions**: Hardcoded discounts fail to adapt to seasonal festival campaigns, product categories, or customer loyalty membership tiers.

GlobalCart solves these challenges by delivering an end-to-end, role-isolated architecture with distributed database ACID compliance, a deterministic image fallback engine, an automated order fulfillment lifecycle, dynamic festival pricing, and an admin-controlled coupon engine.

---

## Why GlobalCart?
GlobalCart is designed to simulate a real-world enterprise retail operation:
- **Unified Domain & Seamless Navigation**: Customers, administrators, and vendors access their respective interfaces through a unified portal switcher available on the homepage (header pills, announcement bar, footer directory, and floating dock).
- **Strict Server-Enforced RBAC**: Every administrative or vendor endpoint is protected by stateless JWT verification, database-backed account active checks, and automated tenant scoping.
- **4-Angle Photographic Studio & Direct File Uploads**: 4 photographic perspectives per product (Front Hero, Side Profile, Lifestyle View, Detail Macro). Sellers can paste image URLs or directly upload image files from their local device with instant preview.
- **Real-Time Dynamic Stock Aggregation**: Available inventory is dynamically computed across warehouses ($\text{Available} = \sum (\text{OnHand} - \text{Reserved})$), ensuring zero overselling.
- **Amazon & Flipkart Innovations**: 1-Click "⚡ Buy Now" direct checkout, dynamic festival discounts, M.R.P. strike-through pricing, SuperCoins loyalty points redemption, and tier-restricted promotional coupon codes.
- **Complete 5-Milestone Tracking State Machine**: From `ORDER CONFIRMED` → `PACKED & PREPARED` → `DISPATCHED` → `OUT FOR DELIVERY` → `DELIVERED` with interactive admin progression and customer live stepper.

---

## Key Features

### 1. Unified Multi-Role Portal Switcher
The homepage features 4 distinct navigational touchpoints (Top Announcement Strip, Main Header Action Pills, Floating Quick-Switch Dock, and Footer Directory) allowing 1-click access to the Storefront, Admin Panel, and Vendor Portal. Unauthorized visits to `/admin` or `/vendor` render a secure guard with an immediate return link.

### 2. Multi-Perspective Imagery & Device File Uploads
Products support 4 photographic camera angles (Angle 1: Front Hero, Angle 2: Side Profile, Angle 3: Lifestyle Context, Angle 4: Detail Macro). The system supports both direct URL ingestion and native local file uploads (`POST /api/upload`) with MIME validation (JPEG, PNG, WebP), 10MB payload capacity, static serving from `/uploads`, and automated preview fallback.

### 3. Vendor Self-Service Onboarding & Warehouse Hub Routing
New merchants can register their business name, owner details, contact email, password, and select their nearest regional fulfillment center (warehouse) directly from the Seller Hub (`POST /api/auth/register-vendor`), immediately gaining access to list products and track inventory.

### 4. Amazon & Flipkart E-Commerce Innovations
- **1-Click "⚡ Buy Now" Flow**: Instantly opens direct checkout with selected quantity without traversing multiple shopping cart screens.
- **Dynamic Festival Deals & M.R.P. Strikethrough**: Eliminates hardcoded static discounts. Calculates real festival discounts per product and category, deriving realistic original M.R.P. list prices and deal badges (`⚡ Festival Special`, `⚡ Limited Time Deal`).
- **SuperCoins Loyalty Accrual & Redemption**: Customers earn points on delivered orders (5 points per $1 spent) and can redeem them for instant checkout deductions ($100 \text{ pts} = \$1.00$).
- **Tier-Restricted Coupon Engine**: Supports percentage and fixed coupons with customer loyalty tier restrictions (`ALL`, `BRONZE`, `SILVER`, `GOLD`, `PLATINUM`).

### 5. Admin Promotion & Coupon Management (Full CRUD)
Platform administrators can manage promotional campaigns directly from `/admin`:
- **Create**: Launch new promotions with custom code, campaign title, discount type (`PERCENTAGE` or `FIXED_AMOUNT`), discount value, eligible customer loyalty tier, category scope, and status.
- **Edit**: Update campaign names, discount percentages, dates, and membership eligibility.
- **Toggle Status**: 1-click Enable or Disable active coupons in real-time.
- **Delete**: Permanently remove obsolete promotions with confirmation.

### 6. Out-of-Stock Catalog Management & Safe Deletion vs. Archival
Administrators and vendors can remove out-of-stock listings directly:
- **Clean Permanent Delete**: If a product has zero historical purchases, it is completely removed from the catalog, inventory, and database.
- **Safe Archival**: If historical customer orders exist for the product, the system automatically transitions its status to `ARCHIVED`, zeros out inventory, and clears it from active customer carts/wishlists to preserve legal order history.

### 7. Multi-Warehouse Stock & Delta Adjustments
Administrators can create physical distribution centers, inspect stock across warehouses, allocate quantities, and apply positive or negative stock adjustments (+/-) to rebalance inventory.

### 8. 5-Stage Live Order Fulfillment & Tracking Stepper
Platform operators dispatch orders using carriers (`FedEx`, `UPS`, `DHL`, `BlueDart`) and advance shipments through 5 discrete milestones:
$$\text{ORDER CONFIRMED} \longrightarrow \text{PACKED} \longrightarrow \text{DISPATCHED} \longrightarrow \text{OUT FOR DELIVERY} \longrightarrow \text{DELIVERED}$$
Customers see an interactive visual progress stepper with carrier badges and milestone timestamps.

### 9. Post-Purchase Returns & Ledger Refunds
Customers can request returns on delivered orders by submitting operational reasons. Administrators review requests, approve or reject them, mark items received, and trigger recorded refunds in the payment ledger.

### 10. Customer Loyalty Rewards & Review Moderation
Shoppers earn points on purchases, unlocking tiered rewards (`BRONZE` → `SILVER` → `GOLD` → `PLATINUM`). An administrative review moderation queue ensures reviews are verified before going public.

---

## 🔑 Test Accounts & Team Mate Credentials

You can test all portals immediately using these credentials:

| Experience | Portal Link | Username / Email | Password | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | [https://global-cart-three.vercel.app/admin](https://global-cart-three.vercel.app/admin) | `globalcart.admin.dev@example.com` | `Admin123!` | Complete control: view platform orders, dispatch shipments, create products & categories, manage coupons (CRUD), add warehouses, adjust stock deltas, delete/archive out-of-stock items, approve returns, issue refunds, moderate reviews, and toggle customer active status. |
| **Vendor Partner** | [https://global-cart-three.vercel.app/vendor](https://global-cart-three.vercel.app/vendor) | `demo-electronics@globalcart.example` | `Vendor123!` | Scoped seller portal: self-service registration with nearest warehouse selection, create listings with 4 camera angles or direct file uploads, view multi-warehouse inventory, delete out-of-stock items, and fulfill assigned customer orders. |
| **Customer Shopper** | [https://global-cart-three.vercel.app/](https://global-cart-three.vercel.app/) | Any email (or register new via modal) | User defined | Browse catalog with studio photography, 1-Click Buy Now, dynamic festival deals, 4-angle gallery, cart, wishlist, address book, loyalty reward points, 5-stage live order tracking stepper, and return requests. |

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
- **Upload Engine**: Base64 data URI parser with MIME inspection, 10MB buffer limits, and static serving from `/uploads`
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
│   │   │   ├── AdminPortal.tsx   # Dashboard, orders, catalog, coupons CRUD, inventory
│   │   │   └── AdminPortal.css   # Dark slate command center styling
│   │   ├── vendor/               # Vendor Partner Portal components & styles
│   │   │   ├── VendorPortal.tsx  # Seller onboarding, listings, 4 angles, device uploads
│   │   │   └── VendorPortal.css  # Amber/stone seller theme styling
│   │   ├── lib/
│   │   │   ├── api.ts            # Axios instance, token interceptor, base URLs
│   │   │   ├── productImages.ts  # Deterministic image resolver & SVG fallback
│   │   │   └── discounts.ts      # Dynamic festival pricing & M.R.P. calculations
│   │   ├── App.tsx               # Storefront, portal switchers, catalog, 1-Click Buy Now
│   │   ├── App.css               # Storefront styles & responsive grid
│   │   ├── AppRouter.tsx         # Top-level client-side router
│   │   ├── ProductDetailsDialog.tsx # 4-angle gallery modal with thumb selector
│   │   ├── CustomerCommerceDialog.tsx # Orders history, 5-stage tracking, coupons, loyalty
│   │   ├── AddressBookDialog.tsx # Address book manager with ISO normalizer
│   │   ├── ProductImg.tsx        # Resilient image with CSS blur-up transition
│   │   └── main.tsx              # React application entry point
│   ├── vercel.json               # SPA rewrite configuration for Vercel
│   └── package.json              # Frontend dependencies and Vite build scripts
│
├── backend/                      # Express 5 + TypeScript Backend API
│   ├── prisma/
│   │   └── schema.prisma         # CockroachDB database schema definition
│   ├── uploads/                  # Local device uploaded product image storage
│   ├── tests/                    # 51 Automated Integration & Unit Test Suites
│   │   ├── checkout_loyalty.test.ts
│   │   ├── image_upload.test.ts
│   │   ├── upload_route.test.ts
│   │   ├── shipment_tracking.test.ts
│   │   ├── vendor_onboarding.test.ts
│   │   └── catalog_product_angles.test.ts
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── authenticate.ts   # JWT validation & active user verification
│   │   │   ├── requireAdmin.ts   # Enforces ADMIN role guard
│   │   │   └── requireVendor.ts  # Enforces VENDOR role & vendor profile binding
│   │   ├── modules/
│   │   │   ├── catalog/          # Public product search & category routes
│   │   │   ├── orders/           # Checkout, order placement, loyalty service
│   │   │   ├── admin.routes.ts   # Full administrative operations & offers CRUD
│   │   │   ├── vendor/           # Vendor scoped listings & order fulfillment
│   │   │   ├── upload.routes.ts  # Base64 image ingestion engine
│   │   │   ├── offers.routes.ts  # Public promotional offers & coupon validation
│   │   │   ├── reviews/          # Review submission & moderation queue
│   │   │   ├── returns.routes.ts # Return authorization & refund ledger
│   │   │   ├── loyalty.routes.ts # Loyalty reward points balance & history
│   │   │   └── auth/             # Login, customer & vendor self-service registration
│   │   ├── lib/
│   │   │   └── prisma.ts         # Singleton Prisma client instance
│   │   └── server.ts             # Express server setup, CORS, static uploads, rate limits
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

### Phase 1: Customer Discovery, Deals & 1-Click Checkout
1. Navigate to the live storefront: [https://global-cart-three.vercel.app/](https://global-cart-three.vercel.app/).
2. Filter catalog items using category tabs or the debounced price slider. Notice the dynamic festival deal tags and M.R.P. strikethroughs.
3. Click **"Details"** on any product to inspect the interactive 4-angle studio photography gallery.
4. Test the **⚡ Buy Now** flow: Click "⚡ Buy Now" on any product detail modal to instantly open checkout in 1 click.
5. In Checkout, enter or select an eligible coupon code (e.g. `SAVE20`, `FESTIVE25`) or check the **"Redeem SuperCoins"** box for instant deductions.
6. Complete checkout with Cash on Delivery or Simulated Card.
7. Open **"Orders"** to view line-item product thumbnails and live 5-stage shipment tracking stepper.

### Phase 2: Administrative Fulfillment & Logistics Dispatch
1. Access the Admin Control Panel at [https://global-cart-three.vercel.app/admin](https://global-cart-three.vercel.app/admin).
2. Log in using `globalcart.admin.dev@example.com` / `Admin123!`.
3. Open **"Orders"** and select a newly placed order.
4. Dispatch carrier shipment by selecting a carrier (`FedEx`, `UPS`, `DHL`, `BlueDart`) and tracking number.
5. Advance tracking milestones (`PACKED` → `DISPATCHED` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED`). Watch the customer order stepper update live.
6. Navigate to **"Promotions & Offers"**: Create a new coupon with customer tier restrictions, edit existing discounts, or toggle them enable/disable.
7. Navigate to **"Products"**: Review stock levels; delete or archive out-of-stock items safely.

### Phase 3: Vendor Onboarding, 4-Angle Listing & Inventory
1. Access the Vendor Portal at [https://global-cart-three.vercel.app/vendor](https://global-cart-three.vercel.app/vendor).
2. Click **"Register Business"**: Enter your company name, owner credentials, and select your nearest regional fulfillment warehouse.
3. Upon registration, access the seller dashboard and click **"Add New Product"**.
4. Upload images directly from your computer or provide URLs for all 4 camera angles (Front, 45°, Lifestyle, Macro). Enter initial stock and price.
5. Review warehouse inventory levels for vendor-owned SKUs and view assigned customer order lines.

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
2. **Cloud Storage S3/GCS Integration**: Extended cloud bucket integration for multi-image drag-and-drop file uploads with automatic WebP/AVIF compression.
3. **Real-Time WebSockets / SSE**: Push real-time inventory adjustments and order state updates to active admin and vendor dashboards without polling.
4. **Automated PDF Invoicing**: One-click generation of branded tax invoices and packing slips for warehouse dispatch.

---

## Author & Documentation Link

- **Lead Architect & Developer**: [Renesh B](https://github.com/Reneshb24)
- **Master Technical Specification**: [GLOBALCART_COMPREHENSIVE_SYSTEM_REPORT.md](https://github.com/Reneshb24/GlobalCart/blob/main/docs/GLOBALCART_COMPREHENSIVE_SYSTEM_REPORT.md)
