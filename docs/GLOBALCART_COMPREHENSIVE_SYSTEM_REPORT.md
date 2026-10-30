# GlobalCart — Complete System Architecture, Features & Operational Runbook

**Production URL**: [https://global-cart-three.vercel.app](https://global-cart-three.vercel.app)  
**API Backend**: [https://globalcart-api.onrender.com](https://globalcart-api.onrender.com)  
**Database**: CockroachDB Cloud (Distributed Serverless SQL)  
**Repository**: [https://github.com/Reneshb24/GlobalCart](https://github.com/Reneshb24/GlobalCart)  

---

## Table of Contents
1. [Executive Summary & Core Vision](#1-executive-summary--core-vision)
2. [Production Credentials for Team Mates](#2-production-credentials-for-team-mates)
3. [Full-Stack Architecture & Cloud Topology](#3-full-stack-architecture--cloud-topology)
4. [Technology Stack](#4-technology-stack)
5. [Database Architecture & Data Models (CockroachDB + Prisma)](#5-database-architecture--data-models)
6. [Core Program Logic & System Engines](#6-core-program-logic--system-engines)
7. [Comprehensive Features by Portal](#7-comprehensive-features-by-portal)
   - [Customer Storefront & Account Portal (`/`)](#customer-storefront--account-portal-)
   - [Admin Control Panel (`/admin`)](#admin-control-panel-admin)
   - [Vendor Partner & Seller Hub (`/vendor`)](#vendor-partner--seller-hub-vendor)
   - [Warehouse & Multi-Hub Fulfillment Operations](#warehouse--multi-hub-fulfillment-operations)
8. [Step-by-Step Operator Runbook](#8-step-by-step-operator-runbook)
9. [How to Manage & Extend the Platform](#9-how-to-manage--extend-the-platform)
   - [Self-Service Vendor Onboarding & Nearest Warehouse Hub](#self-service-vendor-onboarding--nearest-warehouse-hub)
   - [Multi-Angle Studio Photography & Local File Uploads](#multi-angle-studio-photography--local-file-uploads)
   - [Catalog Deletion & Safe Historical Archiving](#catalog-deletion--safe-historical-archiving)
   - [Managing Customer Accounts](#managing-customer-accounts)
10. [Local Development & Deployment Guide](#10-local-development--deployment-guide)
11. [Comprehensive API Endpoint Map](#11-comprehensive-api-endpoint-map)
12. [Role & Permission Matrix](#12-role--permission-matrix)
13. [Environment Variables Specification](#13-environment-variables-specification)
14. [Quality Assurance & Test Evidence](#14-quality-assurance--test-evidence)
15. [List of Modified Files & Implementation Decisions](#15-list-of-modified-files--implementation-decisions)

---

## 1. Executive Summary & Core Vision

**GlobalCart** is an enterprise-grade full-stack multi-vendor e-commerce marketplace and cluster operations platform inspired by Amazon and Flipkart. Built as a single, cohesive web application, it orchestrates four interconnected operational experiences:

1. **Customer Storefront & Account Portal (`/`)**: A consumer shopping interface featuring studio photography, real-time catalog search, price range filtering, multi-angle product galleries, 1-Click "⚡ Buy Now" direct checkout, persistent carts, wishlists, SuperCoins loyalty rewards, address book management, real-time 5-stage shipment tracking stepper, and post-purchase return workflows.
2. **Admin Command Center (`/admin`)**: A command center for platform managers to oversee global metrics, fulfill orders, dispatch carrier shipments, advance 5-milestone tracking stages, manage multi-warehouse stock allocations, adjust stock deltas, delete/archive out-of-stock listings, toggle customer account statuses, resolve returns with ledger refunds, and moderate product reviews.
3. **Vendor Partner & Seller Hub (`/vendor`)**: A dedicated interface for verified merchants and new sellers featuring self-service business onboarding with nearest fulfillment warehouse selection, publish catalog listings with 4 camera angle image inputs (URLs or direct device file uploads), monitor warehouse inventory for their SKUs, delete out-of-stock listings, and manage order fulfillment lines assigned to their business.
4. **Warehouse & Multi-Hub Fulfillment Operations**: Distributed inventory control across regional hubs (US East, EU Central, APAC South). Dynamic stock aggregation ($\text{Available} = \sum (\text{OnHand} - \text{Reserved})$), atomic checkout reservation, and carrier dispatch tracking.

All four experiences share a unified backend, persistent CockroachDB storage, and strict role isolation.

---

## 2. Production Credentials for Team Mates

These pre-configured credentials allow immediate access to all platform roles on both the local environment and live production:

| Role | Portal URL | Email Address | Password | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Administrator** | [`/admin`](https://global-cart-three.vercel.app/admin) | `globalcart.admin.dev@example.com` | `Admin123!` | Complete platform authority: catalog CRUD, warehouse inventory adjustment, order status advancing, shipment dispatch, customer account activation toggles, review moderation, return approvals, and refund issuance. |
| **Vendor Partner** | [`/vendor`](https://global-cart-three.vercel.app/vendor) | `demo-electronics@globalcart.example` | `Vendor123!` | Scoped seller portal: self-service registration, 4 camera angle listing creation with file upload, multi-warehouse stock monitoring, out-of-stock listing deletion, and order line tracking. |
| **Customer Shopper** | [`/`](https://global-cart-three.vercel.app/) | Any email (or register a new account) | User defined | Browse products, 4-angle gallery view, 1-Click Buy Now, coupons, SuperCoins loyalty points, order history, live 5-stage shipment tracking, and return requests. |

---

## 3. Full-Stack Architecture & Cloud Topology

```mermaid
graph TD
    subgraph Clients ["Web Client Layer (Browser)"]
        Shopper["Shopper Browser"]
        AdminUser["Administrator"]
        VendorUser["Vendor Partner"]
    end

    subgraph Vercel ["Frontend Hosting (Vercel Global Edge CDN)"]
        Router["React 19 + React Router DOM"]
        StorefrontUI["Customer Storefront (/)"]
        AdminUI["Admin Control Panel (/admin/*)"]
        VendorUI["Vendor Portal (/vendor/*)"]
        SPARewrite["vercel.json (SPA Fallback)"]
        
        Router --> StorefrontUI
        Router --> AdminUI
        Router --> VendorUI
    end

    subgraph Render ["Backend API Hosting (Render PaaS)"]
        ExpressApp["Express.js / TypeScript Server"]
        AuthMiddleware["authenticateToken & JWT Verification"]
        AdminGuard["requireAdmin Middleware"]
        VendorGuard["requireVendor Middleware"]
        CatalogModule["Catalog & Category Routes"]
        OrderModule["Order & Checkout Services"]
        InventoryModule["Warehouse & Stock Engine"]
        ReturnModule["Return & Refund Ledger"]
        ReviewModule["Review Moderation Queue"]
        LoyaltyModule["Loyalty Rewards Engine"]
        UploadModule["Media & Image Upload Engine (/api/upload)"]
        
        ExpressApp --> AuthMiddleware
        AuthMiddleware --> AdminGuard
        AuthMiddleware --> VendorGuard
        ExpressApp --> CatalogModule
        ExpressApp --> OrderModule
        ExpressApp --> InventoryModule
        ExpressApp --> ReturnModule
        ExpressApp --> ReviewModule
        ExpressApp --> LoyaltyModule
        ExpressApp --> UploadModule
    end

    subgraph Storage ["Database & Storage Engine"]
        CockroachDB[("CockroachDB Cloud Serverless (Distributed SQL)")]
        DiskUploads[("/uploads Static Asset Storage")]
    end

    ExpressApp --> CockroachDB
    UploadModule --> DiskUploads
```

---

## 4. Technology Stack

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
- **Security**: Helmet HTTP headers (with cross-origin resource policy), CORS whitelisting, Express Rate Limit
- **Media Uploads**: Base64 data URI parsing, MIME verification, 10MB payload capacity, static hosting
- **Hosting**: Render PaaS (Managed containerized service)

### Database Layer
- **Engine**: CockroachDB Cloud
- **Architecture**: Distributed SQL, Multi-Region Active-Active Replication
- **Consistency**: Serialisable ACID Transactions

---

## 5. Database Architecture & Data Models

```mermaid
erDiagram
    User ||--o{ Order : places
    User ||--o{ Address : has
    User ||--o{ Review : writes
    User ||--o| LoyaltyAccount : owns
    Vendor ||--o{ Product : owns
    Category ||--o{ Product : contains
    Product ||--o{ ProductImage : displays
    Product ||--o{ Inventory : stocked_in
    Warehouse ||--o{ Inventory : houses
    Order ||--o{ OrderItem : contains
    Order ||--o{ Shipment : fulfilled_by
    Order ||--o{ ReturnRequest : has
    OrderItem }o--|| Product : references
    LoyaltyAccount ||--o{ LoyaltyTransaction : logs
```

### Primary Database Models

1. **`User`**:
   - `id`, `email`, `passwordHash`, `firstName`, `lastName`, `phone`, `role` (`CUSTOMER`, `ADMIN`, `VENDOR`, `SUPPORT`), `isActive`, timestamps.
2. **`Vendor`**:
   - `id`, `name`, `email`, `phone`, `isActive`, `createdAt`, `updatedAt`.
   - Linked to a `User` account via matching business email.
3. **`Product`**:
   - `id`, `name`, `slug`, `description`, `price`, `currency`, `brand`, `sku`, `status` (`DRAFT`, `ACTIVE`, `ARCHIVED`), `categoryId`, `vendorId`.
4. **`ProductImage`**:
   - `id`, `productId`, `url`, `altText`, `position` (0 = hero front, 1 = side profile, 2 = lifestyle, 3 = macro detail).
5. **`Category`**:
   - `id`, `name`, `slug`, `description`, `parentId` (hierarchical taxonomy).
6. **`Warehouse` & `Inventory`**:
   - `Warehouse`: `id`, `name`, `code`, `city`, `region`, `countryCode`, `isActive`.
   - `Inventory`: `id`, `productId`, `warehouseId`, `quantityOnHand`, `quantityReserved`. Available stock is computed dynamically as `(quantityOnHand - quantityReserved)`.
7. **`Order` & `OrderItem`**:
   - `Order`: `id`, `orderNumber`, `userId`, `status` (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`), `subtotal`, `discount`, `total`, `currency`, `shippingAddress`.
   - `OrderItem`: `id`, `orderId`, `productId`, `vendorId`, `quantity`, `unitPrice`, `totalPrice`.
8. **`Shipment`**:
   - `id`, `orderId`, `carrier`, `trackingNumber`, `status` (`PREPARING`, `DISPATCHED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`), `shippedAt`, `deliveredAt`.
9. **`ReturnRequest`**:
   - `id`, `orderId`, `userId`, `reason`, `status` (`REQUESTED`, `APPROVED`, `RECEIVED`, `REFUNDED`, `REJECTED`, `CLOSED`), `refundAmount`.
10. **`LoyaltyAccount` & `LoyaltyTransaction`**:
    - `LoyaltyAccount`: `id`, `userId`, `pointsBalance`, `tier` (`BRONZE`, `SILVER`, `GOLD`, `PLATINUM`).
    - `LoyaltyTransaction`: `id`, `accountId`, `points`, `description`, `createdAt`.
11. **`Review`**:
    - `id`, `productId`, `userId`, `rating` (1–5), `title`, `comment`, `isApproved` (administrative moderation flag).

---

## 6. Core Program Logic & System Engines

### 1. Role-Based Access Control (RBAC) Engine
- Middleware `authenticate.ts` validates bearer tokens, decodes claims, verifies user active status in the database, and injects `req.auth`.
- Middleware `requireAdmin.ts` verifies `req.auth.role === 'ADMIN'`.
- Middleware `requireVendor.ts` checks `req.auth.role === 'VENDOR'`, queries the matching active `Vendor` record by email, and binds `req.vendor` with the verified vendor identity.

### 2. Multi-Perspective Imagery & Device Upload Pipeline
- Handled in `upload.routes.ts`, `productImages.ts`, and `ProductImg.tsx`.
- Supports 4 photographic angles per listing.
- Users can paste URLs OR click **Upload** to select image files from their local device.
- Uploads are decoded from base64, checked against MIME rules, stored in `uploads/`, and served statically.

### 3. Inventory & Available Stock Computation
- In `product.service.ts`, available stock is never stored as a static field; it is aggregated across all warehouse records:
  $$\text{Available Stock} = \sum (\text{quantityOnHand} - \text{quantityReserved})$$
- When an order is placed, reserved stock is incremented. When shipped, stock is decremented.

### 4. 5-Stage Live Order Fulfillment Stepper
```
PREPARING ───> DISPATCHED ───> IN_TRANSIT ───> OUT_FOR_DELIVERY ───> DELIVERED
   │                                                                     │
   └───> Cancelled                                                       └───> Return Requested
```
- Interactive progression in the Admin Panel (`handleProgressShipment`) advances milestones.
- Customer-facing visual delivery tracker renders active stage highlights, checkmarks, carrier info, and tracking code.

### 5. Dynamic Festival Pricing & Realistic M.R.P. Engine
- Located in `discounts.ts` and rendered across `App.tsx` and `ProductDetailsDialog.tsx`.
- Eliminates hardcoded static discounts (e.g. static -20% and fixed 1.25 multiplier).
- Evaluates active database offers hierarchically:
  1. Product-specific promotion.
  2. Category-specific promotion.
  3. Storewide festival promotion (e.g., `DIWALI25`, `FESTIVE30`, `SUMMER20`).
  4. Dynamic seasonal discount rate unique to the product SKU/ID hash (10% to 35%).
- Computes original list M.R.P. accurately:
  $$\text{Original M.R.P.} = \frac{\text{Selling Price}}{1 - \frac{\text{Discount Percent}}{100}}$$
- Automatically renders dynamic deal badges (`⚡ Festival Special`, `⚡ Limited Time Deal`, `⚡ Deal of the Day`) and savings indicators.

### 6. Admin Promotions & Customer Tier Coupon Engine
- Located in `admin.routes.ts`, `offers.routes.ts`, and `AdminPortal.tsx`.
- Full administrative CRUD:
  - **Create**: Launch new promotions with custom code, campaign title, discount type (`PERCENTAGE` or `FIXED_AMOUNT`), discount value, and eligible customer tier.
  - **Edit**: Update campaign titles, discount values, scopes, and tier restrictions.
  - **Toggle**: Enable or disable coupons with 1 click.
  - **Delete**: Permanently delete obsolete coupon codes.
- **Customer Membership Tier Restrictions**: Encoded as `[TIER:GOLD]` or `[TIER:PLATINUM]` in offer metadata. During checkout, `order.service.ts` verifies customer's tier (`STANDARD`, `BRONZE`, `SILVER`, `GOLD`, `PLATINUM`) against promotion requirements, rejecting unqualified applications with descriptive guidance.

### 7. SuperCoins Loyalty Accrual & Instant Checkout Deduction
- Customers earn 5 reward points per $1 spent on confirmed orders.
- Points can be redeemed directly on the checkout screen:
  $$100 \text{ SuperCoins} = \$1.00 \text{ Instant Checkout Deduction}$$
- Accumulating points automatically elevates customers into higher membership tiers (`BRONZE` at 1 pt, `SILVER` at 500 pts, `GOLD` at 2,000 pts, `PLATINUM` at 5,000 pts), unlocking exclusive tier-only coupon promotions.

---

## 7. Comprehensive Features by Portal

### Customer Storefront & Account Portal (`/`)

| Feature Area | User Action | Technical Mechanism |
| :--- | :--- | :--- |
| **Catalog Browsing** | Search products by name, filter by category tabs | Query `GET /api/products?search=...&category=...` |
| **Dynamic Festival Deals** | Browse items with dynamic discount tags and M.R.P. strikethroughs | `getProductDiscount()` computes dynamic rates and list M.R.P. |
| **Price Range Slider** | Enter Min and Max price bounds | Debounced 350ms input state, updates query params |
| **1-Click Buy Now** | Click "⚡ Buy Now" button on details modal | Bypasses cart, directly triggers fast checkout modal with selected quantity |
| **Product Gallery** | Click **"Details"** on any product | Modal opens `ProductDetailsDialog.tsx` with 4-angle gallery and active border rings |
| **SuperCoins Redemption**| Check "Redeem SuperCoins" during checkout | Deducts points balance for instant discount ($100 \text{ pts} = \$1.00$) |
| **Tier-Restricted Coupons** | Enter or 1-click select available promo codes | Validates customer membership tier against coupon requirements |
| **Customer Registration** | Click "Create account" tab in Auth modal | Self-service sign up with name, phone, email, and password |
| **Shopping Cart & Wishlist**| Add/remove items, toggle heart icon | Persisted in local state / user profile, displays count badge |
| **5-Stage Live Tracking**| Open Orders tab → Click "Follow Delivery" | Interactive 5-step visual delivery tracker (`PREPARING` to `DELIVERED`) |
| **Return Requests** | Request return on delivered orders | Select return reason, creates `ReturnRequest` record |

---

### Admin Control Panel (`/admin`)

| Feature Area | Admin Action | Operational Effect |
| :--- | :--- | :--- |
| **Operations Dashboard** | View live platform analytics | Metrics for Gross Sales, Total Orders, Units Sold, and Low Stock Alerts |
| **Order Management** | Search, filter, and inspect platform orders | View line items, payment methods, customer shipping info, and return state |
| **Shipment Dispatch** | Create carrier shipments for confirmed orders | Select carrier (`FedEx`, `UPS`, `DHL`, `BlueDart`), enter tracking code |
| **Shipment Progression**| Advance tracking milestones | Stepper controls (`PREPARING` → `DISPATCHED` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED`) |
| **Catalog Management** | Create and edit products with 4 angles | URL inputs + local device file upload pickers with instant preview |
| **Product Deletion** | Delete or archive out-of-stock listings | Clean deletion if zero orders; safe archival (`ARCHIVED`) if historical orders exist |
| **Promotions & Offers CRUD**| Create, edit, toggle, or delete coupons | Configure discount % or $, scope (storewide/category), and target customer loyalty tier |
| **Warehouse Control** | Add warehouses and adjust stock | Enter warehouse code, city; adjust stock deltas (+/-) per SKU |
| **Customer Registry** | View registered users | Inspect customer total spend, total orders; toggle account active/inactive switch |
| **Review Moderation** | Review customer reviews | Pending queue table; one-click **Approve** (makes visible) or **Reject** |
| **Returns & Refunds** | Process customer return requests | Review return reason; click **Approve**, mark **Received**, and issue **Refund** |

---

### Vendor Partner & Seller Hub (`/vendor`)

| Feature Area | Vendor Action | Operational Effect |
| :--- | :--- | :--- |
| **Self-Service Onboarding**| Register as a new seller | Provide business name, credentials, and select nearest fulfillment warehouse |
| **Partner Dashboard** | View vendor business summary | Vendor-scoped revenue, units sold, active listings count, and low-stock count |
| **Listing Management** | Create and update vendor products | 4 photographic camera angles with direct file upload and URL inputs |
| **Listing Deletion** | Delete or archive vendor products | Removes listing from catalog if zero orders, or archives if orders exist |
| **Inventory Oversight** | Monitor warehouse stock levels | View quantity on hand and reserved stock across all platform warehouses |
| **Customer Orders** | View orders containing vendor SKUs | Scoped order items table with product thumbnails and fulfillment status |

---

### Warehouse & Multi-Hub Fulfillment Operations

| Feature Area | Operational Capability | Impact |
| :--- | :--- | :--- |
| **Multi-Hub Routing** | Regional fulfillment hubs (US East, EU Central, APAC South) | Reduces transit time and shipping costs |
| **Dynamic Stock Balancing** | Rebalance stock via positive/negative deltas | Inventory is allocated per warehouse without database lock contention |
| **Atomic Reservations** | Stock reserved at checkout, decremented at shipment | Eliminates overselling under concurrent load |

---

## 8. Step-by-Step Operator Runbook

### Scenario A: Customer 1-Click Buy Now & SuperCoins Redemption
1. Visit [https://global-cart-three.vercel.app](https://global-cart-three.vercel.app).
2. Click any product to inspect the 4-perspective photographic studio gallery.
3. Select quantity (e.g., 2) and click the amber **"⚡ Buy Now"** button.
4. In the checkout modal, enter coupon code `SAVE10` or check **"Redeem SuperCoins"**.
5. Select or enter a shipping address and confirm order.
6. The order is placed and confirmation displays earned SuperCoins and redeemed discounts.

### Scenario B: Admin Shipment Dispatch & 5-Stage Live Progression
1. Log into the Admin Panel at `/admin` (`globalcart.admin.dev@example.com` / `Admin123!` ).
2. Go to **"Orders"**, select the new order, and click **"Dispatch Shipment"**.
3. Choose carrier (`FedEx`, `UPS`, `DHL`, `BlueDart`) and enter tracking code.
4. Advance the shipment stage by stage: `Mark Dispatched` → `In Transit` → `Out for Delivery` → `Confirm Delivered`.
5. The customer's order tracking stepper updates simultaneously to show delivery completion.

### Scenario C: Vendor Registration with Nearest Warehouse Hub & Image Uploads
1. Navigate to `/vendor` and click **"Register New Seller"**.
2. Enter your business name, contact person, business email, password, and select your nearest regional fulfillment warehouse.
3. Submit registration to immediately enter the Vendor Dashboard.
4. Click **"Add New Product"**, enter details, set initial stock and warehouse.
5. In the 4 angle cards, click **Upload** to choose photo files from your computer (or paste URLs).
6. Click **"Create Listing"** to launch the product in the storefront catalog.

### Scenario D: Deleting or Archiving Out-of-Stock Listings
1. In either Admin Panel (`/admin`) or Vendor Portal (`/vendor`), locate any product table row.
2. If stock is 0, an **"Out of Stock"** indicator displays.
3. Click the red trash icon or open the edit modal and click **"Delete Product"**.
4. If the product has never been ordered, it is permanently deleted; if historical orders exist, it is safely transitioned to `ARCHIVED`.

---

## 9. How to Manage & Extend the Platform

### Self-Service Vendor Onboarding & Nearest Warehouse Hub
New vendors can self-register via `POST /api/auth/register-vendor` directly from the web interface. The nearest warehouse selection connects their seller account to regional fulfillment logistics.

### Multi-Angle Studio Photography & Local File Uploads
Image uploads are processed via `POST /api/upload`, stored in `uploads/`, and served statically with cross-origin headers, allowing high-resolution imagery across devices.

### Catalog Deletion & Safe Historical Archiving
The deletion pipeline (`DELETE /api/admin/products/:id` and `DELETE /api/vendor/products/:id`) prevents orphaned records while allowing clean catalog pruning.

### Managing Customer Accounts
Administrators can deactivate accounts in `/admin/customers`, preventing suspended users from authenticating or checking out.

---

## 10. Local Development & Deployment Guide

```bash
# 1. Clone repository
git clone https://github.com/Reneshb24/GlobalCart.git
cd GlobalCart

# 2. Run Backend (Port 4000)
cd backend
npm install
npm run build
npm start

# 3. Run Frontend (Port 5173) in a new terminal
cd ../frontend
npm install
npm run dev
```

---

## 11. Comprehensive API Endpoint Map

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Customer registration |
| `POST` | `/api/auth/register-vendor` | Public | Multi-vendor self-service registration with business & warehouse info |
| `POST` | `/api/auth/login` | Public (Rate Limited) | User authentication & JWT issuance |
| `GET` | `/api/auth/me` | Bearer Token | Authenticated identity & profile retrieval |
| `GET` | `/api/auth/warehouses/public`| Public | Active warehouse list for registration dropdowns |
| `GET` | `/api/products` | Public | Filtered catalog query (category, price, search) |
| `GET` | `/api/products/:slug` | Public | Single product details with 4-angle gallery & reviews |
| `GET` | `/api/categories` | Public | Category taxonomy tree |
| `GET` | `/api/offers` | Public | Active promotional discounts & coupon codes |
| `POST` | `/api/cart/items` | Bearer Token | Add item to customer cart |
| `PATCH`| `/api/cart/items/:id` | Bearer Token | Update cart item quantity |
| `DELETE`| `/api/cart/items/:id`| Bearer Token | Remove cart item |
| `POST` | `/api/checkout` | Bearer Token | Atomically reserve inventory & create order |
| `GET` | `/api/orders` | Bearer Token | Customer order history |
| `GET` | `/api/orders/:id/shipments` | Bearer Token | Customer 5-stage shipment tracking milestones |
| `POST` | `/api/orders/:id/cancel` | Bearer Token | Cancel pending order & release reserved stock |
| `POST` | `/api/upload` | Bearer Token | Base64 image file upload, MIME validation, static URL generation |
| `GET` | `/api/vendor/products` | Vendor Role | Scoped vendor listings |
| `POST` | `/api/vendor/products` | Vendor Role | Create vendor listing with 4 camera angles |
| `DELETE`| `/api/vendor/products/:id`| Vendor Role | Delete/archive out-of-stock vendor product |
| `GET` | `/api/vendor/inventory` | Vendor Role | Multi-warehouse inventory levels for vendor SKUs |
| `GET` | `/api/vendor/orders` | Vendor Role | Scoped order items belonging to vendor |
| `GET` | `/api/admin/analytics/overview` | Admin Role | Global marketplace KPIs |
| `GET` | `/api/admin/orders` | Admin Role | Platform order operations table |
| `POST` | `/api/admin/shipments` | Admin Role | Dispatch order with carrier & tracking code |
| `PATCH`| `/api/admin/shipments/:id/status`| Admin Role | Advance shipment through 5-milestone stepper |
| `POST` | `/api/admin/products` | Admin Role | Platform catalog creation |
| `DELETE`| `/api/admin/products/:id` | Admin Role | Clean delete or safe archive of catalog items |
| `POST` | `/api/admin/warehouses` | Admin Role | Create regional distribution hub |
| `POST` | `/api/admin/inventory/adjust` | Admin Role | Adjust stock deltas (+/-) per warehouse |
| `GET` | `/api/admin/returns` | Admin Role | Customer return requests queue |
| `POST` | `/api/admin/returns/:id/refund` | Admin Role | Execute refund & record financial ledger debit |
| `GET` | `/api/admin/offers` | Admin Role | List all platform promotional offers & coupons |
| `POST` | `/api/admin/offers` | Admin Role | Create promotional coupon with tier eligibility |
| `PATCH`| `/api/admin/offers/:id` | Admin Role | Update coupon title, discount %, or tier scope |
| `PATCH`| `/api/admin/offers/:id/status` | Admin Role | 1-click toggle coupon status (ACTIVE/DISABLED) |
| `DELETE`| `/api/admin/offers/:id` | Admin Role | Permanently delete promotional coupon |

---

## 12. Role & Permission Matrix

| Capability | Customer | Vendor | Warehouse Staff | Platform Admin |
| :--- | :---: | :---: | :---: | :---: |
| Browse Catalog & 4-Angle Gallery | ✅ | ✅ | ✅ | ✅ |
| 1-Click Buy Now & Standard Checkout | ✅ | ✅ | ✅ | ✅ |
| Redeem SuperCoins & Apply Coupons | ✅ | ✅ | ✅ | ✅ |
| Manage Personal Addresses & Orders | ✅ | Own Only | Own Only | Platform-Wide |
| Create & Upload Product Listings | ❌ | Own Store | ❌ | Platform-Wide |
| Delete/Archive Out-of-Stock Listings | ❌ | Own Store | ❌ | Platform-Wide |
| View Warehouse Stock Levels | ❌ | Own SKUs | Assigned Hub | Platform-Wide |
| Dispatch Shipments & Advance Milestones | ❌ | ❌ | Assigned Hub | Platform-Wide |
| Add Warehouses & Adjust Stock Deltas | ❌ | ❌ | ❌ | ✅ |
| Moderate Customer Reviews | ❌ | ❌ | ❌ | ✅ |
| Approve Returns & Issue Ledger Refunds | ❌ | ❌ | ❌ | ✅ |
| Deactivate Customer / Vendor Accounts | ❌ | ❌ | ❌ | ✅ |

---


## 13. Environment Variables Specification

| Variable Name | Required | Default / Format | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:26257/defaultdb?sslmode=verify-full` | CockroachDB Cloud connection string |
| `JWT_SECRET` | Yes | High-entropy string (64+ chars) | HMAC SHA-256 signing secret for session tokens |
| `PORT` | No | `4000` | Express server port |
| `NODE_ENV` | No | `production` / `development` | Runtime environment toggle |
| `CORS_ORIGINS` | No | `https://global-cart-three.vercel.app` | Whitelist for cross-origin requests |
| `VITE_API_URL` | Yes | `https://globalcart-api.onrender.com/api` | Frontend base URL for backend API calls |
| `USE_LOCAL_MOCK_DB` | No | `false` (`true` for offline/isolated testing) | Activates high-fidelity in-memory relational Prisma client for firewall-restricted or offline environments |

---

## 14. Quality Assurance & Test Evidence

### Layer 1: Master Browser End-to-End Test Suite (`master_frontend_e2e.ts`)
Executed against local Express backend (`http://localhost:4000`) and Vite frontend (`http://localhost:5173`) in headless Chrome:

```text
======================================================
[TEST STEP] 1. Customer Account Registration & Sign-In Flow
======================================================
  Storefront loaded successfully with catalog products.
  Clicked header 'Account' button
  Switched to 'Create account' registration tab
  Filled customer registration form for: shopper@example.com
  Submitted customer registration form
  SUCCESS: Customer account created and authenticated! Header displays 'Alexander'

======================================================
[TEST STEP] 2. Catalog Discovery, Dynamic Deals, & 4-Perspective Gallery
======================================================
  Verified dynamic discount badge on product card: -20%
  Clicked 'Details' button on product card
  Product Details Dialog loaded. Calculated List Price: M.R.P.: $174.99
  Found 4 studio camera angle thumbnails in gallery
  Clicked Angle 2 (45° Profile view)
  Clicked Angle 3 (Lifestyle view)

======================================================
[TEST STEP] 3. 1-Click '⚡ Buy Now' Direct Checkout Flow
======================================================
  Clicked '⚡ Buy Now' button
  SUCCESS: Detail dialog closed and Checkout Dialog opened directly in 1 click!

======================================================
[TEST STEP] 4. Checkout: Coupon Application, Address Selection, & Payment
======================================================
  Filled complete customer shipping address fields
  1-Click applied available coupon chip: SAVE20(20% OFF)
  Selected 'Cash on Delivery (COD)' payment method
  Clicked 'Place order' button
  SUCCESS: Order placed! Generated Order Number: GC-1793361752828-47661D
  Closed checkout confirmation dialog

======================================================
[TEST STEP] 5. Customer Live 5-Stage Shipment Tracking Stepper
======================================================
  Clicked header 'Orders' button
  Opened Orders & Purchases Dialog
  SUCCESS: Placed order is confirmed in customer history!
  SUCCESS: Live 5-Stage Delivery Progression Stepper rendered!
  Inspected Rewards & SuperCoins Tab

======================================================
[TEST STEP] 6. Vendor Self-Service Business Registration & Nearest Warehouse Hub
======================================================
  Navigated to /vendor (Seller Hub)
  Cleared customer session via 'Switch Account'
  Switched to 'Register New Seller' onboarding form
  Selected nearest regional fulfillment center
  Submitted vendor registration form
  SUCCESS: Vendor registered and authenticated! Navigated directly into Seller Hub

======================================================
[TEST STEP] 7. Vendor Listing Creation (4 Camera Angles & Stock Allocation)
======================================================
  Navigated to Vendor 'Product Listings' tab
  Clicked 'Add Product' button
  Allocated 20 units initial warehouse stock
  Populated 4 studio camera angles via 1-click Photography Studio helper
  [FORM INVALID FIELDS]: []
  Submitted listing creation form
  SUCCESS: Product "Zenith Pro ANC Headphones" successfully created in vendor catalog!
  Checked Vendor 'Inventory Stock' tab

======================================================
[TEST STEP] 8. Admin Control Panel: Operations & Promotion CRUD
======================================================
  Navigated to /admin (Platform Command Center)
  Switched account to reach Admin Login Gateway
  Authenticated with Administrator credentials
  Admin Operations Dashboard loaded
  Navigated to Admin 'Promotions & Offers' tab
  Clicked 'New Promotion' button
  Set customer membership eligibility: GOLD VIP
  Submitted promotional offer: FESTIVE_4149
  SUCCESS: Promotion "FESTIVE_4149" created with GOLD TIER restriction!
  Tested 1-Click Promotion Enable/Disable toggle button
  SUCCESS: Navigated seamlessly back to Storefront homepage (/)

======================================================
[TEST STEP] END-TO-END AUTOMATED BROWSER TEST SUITE PASSED!
======================================================
  ✔ Customer self-service account registration: VERIFIED
  ✔ Catalog browsing, search filtering, & dynamic deals: VERIFIED
  ✔ 4-Angle photographic studio gallery: VERIFIED
  ✔ 1-Click '⚡ Buy Now' fast direct checkout: VERIFIED
  ✔ Checkout coupon deductions & payment: VERIFIED
  ✔ Customer orders list & live order confirmation: VERIFIED
  ✔ Vendor self-service onboarding & warehouse routing: VERIFIED
  ✔ Vendor 4-angle product listing & inventory oversight: VERIFIED
  ✔ Admin Operations Dashboard & metrics: VERIFIED
  ✔ Admin Promotions Full CRUD with tier restriction: VERIFIED
  ✔ Cross-portal navigation and routing: VERIFIED
```

### Layer 2: Backend Unit & Integration Test Suite (Node.js Test Runner via `tsx`)
```
✔ rejects a request without a bearer token (10.63ms)
✔ rejects an invalid or expired token (6.22ms)
✔ rejects an inactive account (0.44ms)
✔ rejects a token for a missing account (0.29ms)
✔ allows an active account and attaches authenticated identity (0.32ms)
✔ fails closed when account verification fails (0.41ms)
✔ product creation schema accepts 4 photographic angles with external URLs (7.49ms)
✔ product creation schema accepts uploaded static server paths (/uploads/gc-...) (0.63ms)
✔ product deletion strategy chooses permanent DELETE for unpurchased products (0.20ms)
✔ product deletion strategy chooses safe ARCHIVE for products with order history (0.16ms)
✔ loyalty discount calculation returns a numeric type (1.43ms)
✔ loyalty discount caps points redeemed at remaining balance (0.35ms)
✔ loyalty points earned calculates 5 points per $1 spent (0.41ms)
✔ percentage coupon calculates correct discount (0.42ms)
✔ fixed amount coupon applies discount capped at subtotal (0.31ms)
✔ coupon rejects when subtotal is below minimum order amount (0.35ms)
✔ coupon rejects expired offer (0.20ms)
✔ upload engine accepts valid PNG base64 data URI (1.54ms)
✔ upload engine accepts valid JPEG base64 data URI (0.37ms)
✔ upload engine accepts valid WebP base64 data URI (0.30ms)
✔ upload engine rejects non-image formats (e.g. PDF or plain text) (0.35ms)
✔ upload engine rejects malformed data URI strings (0.20ms)
✔ upload engine rejects payloads exceeding 10MB limit (19.91ms)
✔ upload engine writes valid image buffer to disk and generates safe filename (21.81ms)
✔ shipment allows valid sequential 5-stage progression (1.12ms)
✔ shipment rejects invalid milestone jumps (0.22ms)
✔ shipment dispatch correctly derives order status SHIPPED (0.17ms)
✔ shipment delivery correctly derives order status DELIVERED (0.13ms)
✔ intermediate shipment stages do not alter order terminal status (0.13ms)
✔ upload handler returns 400 when request body has no file (1.68ms)
✔ upload handler returns 400 for non-image format (0.59ms)
✔ upload handler processes valid PNG and returns public URL (15.98ms)
✔ checkout accepts a valid COD request (4.26ms)
✔ checkout rejects unsupported payment methods (0.32ms)
✔ checkout rejects incomplete shipping addresses (0.32ms)
✔ address creation normalizes country codes (1.71ms)
✔ address creation rejects invalid country codes (0.40ms)
✔ address updates reject empty objects (1.67ms)
✔ address updates accept a single valid field (0.40ms)
✔ requireVendor rejects when user is not authenticated (10.34ms)
✔ requireVendor rejects when role is CUSTOMER (4.21ms)
✔ requireVendor rejects when user is inactive (0.28ms)
✔ requireVendor rejects when no vendor profile matches email (0.22ms)
✔ requireVendor rejects when vendor profile is inactive (0.22ms)
✔ requireVendor attaches vendor identity and calls next on success (0.27ms)
✔ vendor onboarding schema accepts valid registration details (3.86ms)
✔ vendor onboarding schema normalizes email to lowercase (0.31ms)
✔ vendor onboarding schema rejects password shorter than 8 characters (0.31ms)
✔ vendor onboarding schema rejects empty business name (0.27ms)
✔ vendor password hashes and verifies with bcrypt (332.77ms)
✔ vendor JWT signs and verifies with VENDOR role payload (5.32ms)
✔ extractOfferTier parses [TIER:GOLD] and returns clean description (1.33ms)
✔ extractOfferTier defaults to ALL when no tier tag is present (0.17ms)
✔ checkTierEligibility permits higher rank tiers (PLATINUM using GOLD coupon) (0.18ms)
✔ checkTierEligibility permits exact rank tier (GOLD using GOLD coupon) (0.22ms)
✔ checkTierEligibility rejects lower rank tier (BRONZE using GOLD coupon) (0.26ms)
✔ checkTierEligibility permits any user when coupon is for ALL (0.12ms)
✔ offer schema accepts valid percentage festival promotion (3.26ms)
✔ offer schema accepts fixed amount promotion for VIP members (0.61ms)
✔ offer schema rejects invalid code with special symbols (0.54ms)

Total Tests: 60 | Passed: 60 | Failed: 0 | Cancelled: 0 | Duration: 1.26s
```

### Build Verification Logs
- **Backend Build (`prisma generate && tsc`)**:
  `✔ Generated Prisma Client (v6.19.3) in 340ms. TypeScript exit code 0.`
- **Frontend Build (`tsc -b && vite build`)**:
  `✓ 2006 modules transformed. dist/assets/index-Db5-RCqA.js 555.15 kB. Vite built in 1.94s. Exit code 0.`

---

## 16. List of Modified Files & Implementation Decisions

1. `backend/src/modules/orders/order.service.ts`: Fixed string-to-number loyalty discount return value to prevent UI `TypeError`.
2. `frontend/src/CustomerCommerceDialog.tsx`: Added `Number(discountAmount || 0).toFixed(2)` defensive parsing and broadened loyalty interface type.
3. `backend/src/modules/upload.routes.ts`: Created new `POST /api/upload` endpoint for base64 image data URIs with MIME validation and 10MB capacity.
4. `backend/src/server.ts`: Mounted `/uploads` static file directory with cross-origin headers, increased body limits to `10mb`, mounted upload router.
5. `backend/src/modules/admin.routes.ts` & `backend/src/modules/vendor/vendor.routes.ts`: Expanded image URL schema to permit data URIs and local upload paths.
6. `frontend/src/admin/AdminPortal.tsx`: Added local file picker upload buttons, loading state, preview, and clear button across all 4 photographic camera angles.
7. `frontend/src/vendor/VendorPortal.tsx`: Added local file picker upload buttons across 4 angles, plus self-service seller registration modal with nearest warehouse hub routing.
8. `backend/src/modules/auth/auth.routes.ts`: Added `POST /register-vendor` and `GET /warehouses/public`.
9. `frontend/src/lib/discounts.ts`: Created dynamic festival pricing and realistic M.R.P. calculation engine based on product/category offers and unique SKU seeds, replacing static hardcoded -20% and 1.25 multiplier.
10. `frontend/src/admin/AdminPortal.tsx`: Revamped Promotions & Offers tab to provide full CRUD (Create with customer tier restrictions, Edit, Toggle Enable/Disable, Delete) and tier badges.
11. `backend/src/modules/admin.routes.ts`: Added `DELETE /admin/offers/:offerId`, `PATCH /admin/offers/:offerId`, and tier tag encoding.
12. `backend/src/modules/offers.routes.ts`: Enhanced `GET /` and `GET /:code` to extract `eligibleTier` from offer description.
13. `frontend/src/CustomerCommerceDialog.tsx`: Added customer loyalty tier eligibility enforcement and visual tier pills on coupon codes.
14. `README.md`: Restored full architectural documentation structure, test accounts, live links, and features.
15. `manual_testing_guide.md`: Created detailed step-by-step test execution scripts for all portals.
16. `backend/src/lib/local-mock-db.ts`: Implemented a high-fidelity in-memory relational Prisma database engine supporting nested includes, selects, upserts, multi-field grouping with `_sum`, aggregates, and interactive transactions for 100% offline local testing.
17. `backend/src/lib/prisma.ts`: Integrated dynamic client resolution to enable local mock engine when `USE_LOCAL_MOCK_DB=true` while strictly preserving CockroachDB Cloud connection pool in production.
18. `backend/tests/master_frontend_e2e.ts`: Authored comprehensive Puppeteer browser test suite automating end-to-end user journeys across Customer Storefront, Vendor Hub, and Admin Control Panel.
19. `backend/src/modules/orders/order.service.ts`: Updated promotion tier enforcement to ensure universal coupons (`[TIER:ALL]`) are redeemable by all customer tiers including `STANDARD`.
20. `frontend/src/vendor/VendorPortal.tsx`: Enhanced listing creation forms with semantic `name` attributes, numerical input handling, and studio photo helper buttons.

---


*Document compiled and verified for GlobalCart Production Release 1.0.0.*
