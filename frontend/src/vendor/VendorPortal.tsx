import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingBag, Package, Warehouse, ArrowLeft, LogOut,
  Plus, RefreshCw, AlertTriangle, Eye, Store, X
} from "lucide-react";
import { api, clearAuthToken, getApiErrorMessage, getAuthToken, setAuthToken } from "../lib/api";
import ProductImg from "../ProductImg";
import { getProductThumbnail } from "../lib/productImages";
import "./VendorPortal.css";

type VendorTab = "dashboard" | "products" | "inventory" | "orders";

type VendorUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

type VendorMetrics = {
  products?: { total: number; active: number; draft: number; archived: number };
  ordersCount?: number;
  unitsSold?: number;
  grossRevenue?: number;
  lowStockCount?: number;
};

type VendorProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  brand?: string | null;
  price: number;
  currency: string;
  categoryId: string;
  status: string;
  category?: { id: string; name: string; slug: string } | null;
  images?: { id: string; url: string; altText?: string | null; position?: number }[];
  inventory?: { quantity: number; reserved: number; available?: number; warehouse?: { name: string; code: string } }[];
};

type VendorCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
};

type VendorInventoryRow = {
  productId: string;
  productName: string;
  sku: string;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
  reserved: number;
  available: number;
  reorderLevel: number;
  stockValue: number;
  lowStock: boolean;
};

type VendorOrderItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product?: { images?: { url: string; altText?: string | null }[] };
};

type VendorOrder = {
  id: string;
  orderNumber: string;
  placedAt: string;
  status: string;
  shippingCity: string;
  shippingRegion: string;
  shippingCountryCode: string;
  vendorSubtotal: number;
  shipments?: { id: string; status: string; carrier?: string | null; trackingNumber?: string | null }[];
  items?: VendorOrderItem[];
};

export default function VendorPortal() {
  const [currentUser, setCurrentUser] = useState<VendorUser | null>(null);
  const [vendorProfile, setVendorProfile] = useState<{ id: string; name: string; email: string | null; phone: string | null } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [deniedRole, setDeniedRole] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<VendorTab>("dashboard");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Metrics
  const [metrics, setMetrics] = useState<VendorMetrics | null>(null);

  // Products
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    slug: "",
    description: "",
    brand: "",
    price: 0,
    currency: "USD",
    categoryId: "",
    status: "ACTIVE",
    imageUrl: ""
  });

  // Categories for select
  const [categories, setCategories] = useState<VendorCategory[]>([]);

  // Inventory
  const [inventoryRows, setInventoryRows] = useState<VendorInventoryRow[]>([]);

  // Orders
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      if (!getAuthToken()) {
        setAuthLoading(false);
        return;
      }
      try {
        const res = await api.get<{ user: VendorUser }>("/auth/me");
        if (res.data.user.role === "VENDOR") {
          setCurrentUser(res.data.user);
          setDeniedRole(null);
        } else {
          setDeniedRole(res.data.user.role);
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    }
    void checkAuth();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const res = await api.post<{ token: string; user: VendorUser }>("/auth/login", {
        email: loginEmail.trim(),
        password: loginPassword
      });
      if (res.data.user.role !== "VENDOR") {
        setLoginError("This account does not have vendor partner access.");
        return;
      }
      setAuthToken(res.data.token);
      setCurrentUser(res.data.user);
      setDeniedRole(null);
      setLoginPassword("");
    } catch (err) {
      setLoginError(getApiErrorMessage(err, "Sign-in failed. Please verify credentials."));
    } finally {
      setLoginBusy(false);
    }
  }

  function handleLogout() {
    clearAuthToken();
    setCurrentUser(null);
    setVendorProfile(null);
    setDeniedRole(null);
  }

  // Loaders
  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get<{
        vendor: { id: string; name: string; email: string | null; phone: string | null };
        metrics: VendorMetrics;
      }>("/vendor/dashboard");
      setVendorProfile(res.data.vendor);
      setMetrics(res.data.metrics);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load vendor dashboard.") });
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (productStatusFilter) params.status = productStatusFilter;
      if (productSearch.trim()) params.search = productSearch.trim();
      const res = await api.get<{ products: VendorProduct[] }>("/vendor/products", { params });
      setProducts(res.data.products ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load products.") });
    }
  }, [productStatusFilter, productSearch]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get<{ categories: VendorCategory[] }>("/vendor/categories");
      setCategories(res.data.categories ?? []);
    } catch {
      // Non-critical
    }
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      const res = await api.get<{ inventory: VendorInventoryRow[] }>("/vendor/inventory");
      setInventoryRows(res.data.inventory ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load inventory.") });
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.get<{ orders: VendorOrder[] }>("/vendor/orders");
      setOrders(res.data.orders ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load vendor orders.") });
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const timer = window.setTimeout(() => {
      if (activeTab === "dashboard") void loadDashboard();
      else if (activeTab === "products") { void loadProducts(); void loadCategories(); }
      else if (activeTab === "inventory") void loadInventory();
      else if (activeTab === "orders") void loadOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentUser, activeTab, loadDashboard, loadProducts, loadCategories, loadInventory, loadOrders]);

  function switchTab(tab: VendorTab) {
    setActiveTab(tab);
    setFeedback(null);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.patch(`/vendor/products/${editingProduct.id}`, {
          name: productForm.name,
          description: productForm.description,
          brand: productForm.brand || null,
          price: Number(productForm.price),
          categoryId: productForm.categoryId,
          status: productForm.status,
          ...(productForm.imageUrl.trim() ? { imageUrl: productForm.imageUrl.trim() } : {})
        });
        setFeedback({ type: "success", text: "Product updated successfully." });
      } else {
        await api.post("/vendor/products", {
          sku: productForm.sku,
          name: productForm.name,
          slug: productForm.slug,
          description: productForm.description,
          brand: productForm.brand || null,
          price: Number(productForm.price),
          currency: productForm.currency,
          categoryId: productForm.categoryId,
          status: productForm.status,
          ...(productForm.imageUrl.trim() ? { imageUrl: productForm.imageUrl.trim() } : {})
        });
        setFeedback({ type: "success", text: "Product added to your catalog." });
      }
      setShowProductModal(false);
      setEditingProduct(null);
      void loadProducts();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to save product.") });
    }
  }

  if (authLoading) {
    return (
      <div className="vendor-guard-container">
        <div className="vendor-guard-card">
          <p>Checking vendor partner session...</p>
        </div>
      </div>
    );
  }

  if (deniedRole) {
    return (
      <div className="vendor-guard-container">
        <div className="vendor-guard-card">
          <AlertTriangle size={42} color="#dc2626" style={{ margin: "0 auto 12px" }} />
          <h2>Access Restricted</h2>
          <p>
            You are currently signed in with a <strong>{deniedRole}</strong> account.
            The Vendor Portal is restricted to verified seller partner accounts.
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "center" }}>
            <a href="/" className="vendor-btn-primary" style={{ textDecoration: "none" }}>
              Return to Storefront
            </a>
            <button
              type="button"
              className="vendor-btn-secondary"
              onClick={() => {
                clearAuthToken();
                setDeniedRole(null);
                setCurrentUser(null);
                setVendorProfile(null);
              }}
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="vendor-guard-container">
        <div className="vendor-guard-card">
          <Store size={40} color="#d97706" style={{ margin: "0 auto" }} />
          <h2>GlobalCart Vendor Portal</h2>
          <p>Sign in with your verified vendor partner account.</p>
          <form onSubmit={handleLogin} style={{ textAlign: "left" }}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403c", marginBottom: "6px" }}>
                Partner Email Address
              </label>
              <input
                type="email"
                required
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="partner@example.com"
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403c", marginBottom: "6px" }}>
                Password
              </label>
              <input
                type="password"
                required
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
            {loginError && (
              <div style={{ padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px", background: "#fee2e2", color: "#991b1b" }}>
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="vendor-btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "10px" }}
              disabled={loginBusy}
            >
              {loginBusy ? "Authenticating..." : "Access Vendor Portal"}
            </button>
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <a href="/" style={{ color: "#78716c", fontSize: "12px", textDecoration: "none" }}>
                ← Return to Storefront
              </a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-shell">
      {/* Sidebar */}
      <aside className="vendor-sidebar">
        <div className="vendor-sidebar-header">
          <a href="/vendor" className="vendor-brand">
            <span>GlobalCart</span>
            <span className="vendor-brand-badge">VENDOR</span>
          </a>
        </div>
        <nav className="vendor-nav">
          <button className={`vendor-nav-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => switchTab("dashboard")}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className={`vendor-nav-item ${activeTab === "products" ? "active" : ""}`} onClick={() => switchTab("products")}>
            <Package size={18} /> My Products
          </button>
          <button className={`vendor-nav-item ${activeTab === "inventory" ? "active" : ""}`} onClick={() => switchTab("inventory")}>
            <Warehouse size={18} /> Inventory Stock
          </button>
          <button className={`vendor-nav-item ${activeTab === "orders" ? "active" : ""}`} onClick={() => switchTab("orders")}>
            <ShoppingBag size={18} /> Customer Orders
          </button>
        </nav>
        <div className="vendor-sidebar-footer">
          <a href="/" className="vendor-back-btn">
            <ArrowLeft size={14} /> Back to Storefront
          </a>
          <div className="vendor-user-pill">
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{vendorProfile?.name || currentUser.email}</span>
            <button className="vendor-logout-btn" onClick={handleLogout} title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="vendor-main">
        <header className="vendor-topbar">
          <h1>
            {activeTab === "dashboard" && "Vendor Partner Operations"}
            {activeTab === "products" && "My Product Listings"}
            {activeTab === "inventory" && "Warehouse Inventory Levels"}
            {activeTab === "orders" && "Fulfillment & Orders Assigned to You"}
          </h1>
          <div className="vendor-topbar-actions">
            <button
              className="vendor-btn-secondary"
              onClick={() => {
                if (activeTab === "dashboard") void loadDashboard();
                else if (activeTab === "products") void loadProducts();
                else if (activeTab === "inventory") void loadInventory();
                else if (activeTab === "orders") void loadOrders();
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </header>

        <div className="vendor-body">
          {feedback && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              marginBottom: "16px",
              background: feedback.type === "success" ? "#dcfce7" : "#fee2e2",
              color: feedback.type === "success" ? "#166534" : "#991b1b"
            }}>
              {feedback.text}
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && metrics && (
            <div>
              <div className="vendor-kpi-grid">
                <div className="vendor-kpi-card">
                  <div className="vendor-kpi-label">Active Products</div>
                  <div className="vendor-kpi-value">{metrics.products?.active ?? 0}</div>
                  <div className="vendor-kpi-subtext">Total listings: {metrics.products?.total ?? 0}</div>
                </div>
                <div className="vendor-kpi-card">
                  <div className="vendor-kpi-label">Draft Products</div>
                  <div className="vendor-kpi-value">{metrics.products?.draft ?? 0}</div>
                  <div className="vendor-kpi-subtext">Unpublished drafts</div>
                </div>
                <div className="vendor-kpi-card">
                  <div className="vendor-kpi-label">Units Sold</div>
                  <div className="vendor-kpi-value">{metrics.unitsSold ?? 0}</div>
                  <div className="vendor-kpi-subtext">Across {metrics.ordersCount ?? 0} customer orders</div>
                </div>
                <div className="vendor-kpi-card">
                  <div className="vendor-kpi-label">Gross Revenue</div>
                  <div className="vendor-kpi-value">${Number(metrics.grossRevenue ?? 0).toFixed(2)}</div>
                  <div className="vendor-kpi-subtext">For your catalog items</div>
                </div>
                <div className="vendor-kpi-card">
                  <div className="vendor-kpi-label">Low Stock Alerts</div>
                  <div className="vendor-kpi-value">{metrics.lowStockCount ?? 0}</div>
                  <div className="vendor-kpi-subtext">Items near reorder level</div>
                </div>
              </div>

              <div className="vendor-card">
                <div className="vendor-card-header">
                  <h3 className="vendor-card-title">Vendor Partner Account Summary</h3>
                </div>
                <div style={{ padding: "20px" }}>
                  <p><strong>Company:</strong> {vendorProfile?.name}</p>
                  <p><strong>Contact Email:</strong> {vendorProfile?.email}</p>
                  <p><strong>Phone:</strong> {vendorProfile?.phone || "None registered"}</p>
                  <p style={{ color: "#78716c", fontSize: "12px", marginTop: "12px" }}>
                    Your products are displayed to customers globally across the GlobalCart storefront. Orders placed containing your items are dispatched directly from assigned platform distribution centers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === "products" && (
            <div>
              <div className="vendor-card">
                <div className="vendor-card-header">
                  <h3 className="vendor-card-title">My Product Listings ({products.length})</h3>
                  <div className="vendor-card-tools">
                    <input
                      className="vendor-search-input"
                      placeholder="Search my products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                    <select
                      className="vendor-select"
                      value={productStatusFilter}
                      onChange={(e) => setProductStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                    <button
                      className="vendor-btn-primary"
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({
                          sku: `VND-${Date.now().toString().slice(-6)}`,
                          name: "",
                          slug: "",
                          description: "",
                          brand: vendorProfile?.name || "",
                          price: 29.99,
                          currency: "USD",
                          categoryId: categories[0]?.id || "",
                          status: "ACTIVE",
                          imageUrl: ""
                        });
                        setShowProductModal(true);
                      }}
                    >
                      <Plus size={14} /> Add Product
                    </button>
                  </div>
                </div>
                <div className="vendor-table-wrap">
                  <table className="vendor-table">
                    <thead>
                      <tr>
                        <th style={{ width: "54px" }}>Image</th>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock Available</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#78716c" }}>No products in your catalog yet.</td></tr>
                      ) : (
                        products.map((p) => {
                          const totalAvailable = (p.inventory ?? []).reduce(
                            (sum, inv) => sum + (inv.quantity - inv.reserved),
                            0
                          );
                          return (
                            <tr key={p.id}>
                              <td>
                                <ProductImg
                                  src={getProductThumbnail(p.name, p.sku, p.images?.[0]?.url)}
                                  alt={p.name}
                                  className="vendor-table-thumb"
                                  fallbackName={p.name}
                                />
                              </td>
                              <td><code>{p.sku}</code></td>
                              <td><strong>{p.name}</strong></td>
                              <td>{p.category?.name || "Uncategorized"}</td>
                              <td>{p.currency} {Number(p.price).toFixed(2)}</td>
                              <td>
                                <span style={{ fontWeight: 600, color: totalAvailable <= 5 ? "#dc2626" : "#166534" }}>
                                  {totalAvailable} units
                                </span>
                              </td>
                              <td>
                                <span className={`vendor-badge ${p.status === "ACTIVE" ? "badge-active" : p.status === "DRAFT" ? "badge-draft" : "badge-archived"}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="vendor-btn-secondary vendor-btn-sm"
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setProductForm({
                                      sku: p.sku,
                                      name: p.name,
                                      slug: p.slug,
                                      description: p.description,
                                      brand: p.brand || "",
                                      price: Number(p.price),
                                      currency: p.currency,
                                      categoryId: p.categoryId,
                                      status: p.status,
                                      imageUrl: p.images?.[0]?.url || ""
                                    });
                                    setShowProductModal(true);
                                  }}
                                >
                                  Edit Listing
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === "inventory" && (
            <div>
              <div className="vendor-card">
                <div className="vendor-card-header">
                  <h3 className="vendor-card-title">Warehouse Stock For Your Products</h3>
                </div>
                <div className="vendor-table-wrap">
                  <table className="vendor-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Warehouse</th>
                        <th>Total Qty</th>
                        <th>Reserved</th>
                        <th>Available</th>
                        <th>Reorder Level</th>
                        <th>Stock Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryRows.length === 0 ? (
                        <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "#78716c" }}>No warehouse inventory records found for your products.</td></tr>
                      ) : (
                        inventoryRows.map((inv, idx) => (
                          <tr key={idx}>
                            <td><strong>{inv.productName}</strong></td>
                            <td><code>{inv.sku}</code></td>
                            <td>{inv.warehouseName} ({inv.warehouseCode})</td>
                            <td>{inv.quantity}</td>
                            <td>{inv.reserved}</td>
                            <td><strong>{inv.available}</strong></td>
                            <td>{inv.reorderLevel}</td>
                            <td>${Number(inv.stockValue).toFixed(2)}</td>
                            <td>
                              {inv.lowStock ? (
                                <span className="vendor-badge badge-cancelled">
                                  <AlertTriangle size={11} style={{ marginRight: "3px" }} /> LOW
                                </span>
                              ) : (
                                <span className="vendor-badge badge-active">OK</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === "orders" && (
            <div>
              <div className="vendor-card">
                <div className="vendor-card-header">
                  <h3 className="vendor-card-title">Orders Containing Your Products ({orders.length})</h3>
                </div>
                <div className="vendor-table-wrap">
                  <table className="vendor-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Placed Date</th>
                        <th>Destination</th>
                        <th>Order Status</th>
                        <th>Shipment</th>
                        <th>Your Subtotal</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#78716c" }}>No orders placed for your products yet.</td></tr>
                      ) : (
                        orders.map((o) => (
                          <tr key={o.id}>
                            <td><strong>{o.orderNumber}</strong></td>
                            <td>{new Date(o.placedAt).toLocaleDateString()}</td>
                            <td>{o.shippingCity}, {o.shippingRegion} {o.shippingCountryCode}</td>
                            <td>
                              <span className={`vendor-badge badge-${o.status.toLowerCase()}`}>
                                {o.status}
                              </span>
                            </td>
                            <td>
                              {o.shipments?.[0] ? (
                                <span className={`vendor-badge badge-${o.shipments[0].status.toLowerCase()}`}>
                                  {o.shipments[0].status}
                                </span>
                              ) : (
                                <span style={{ color: "#a8a29e", fontSize: "11px" }}>Unshipped</span>
                              )}
                            </td>
                            <td><strong>${Number(o.vendorSubtotal).toFixed(2)}</strong></td>
                            <td>
                              <button
                                className="vendor-btn-secondary vendor-btn-sm"
                                onClick={() => setSelectedOrder(o)}
                              >
                                <Eye size={13} /> View Items
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* VENDOR ORDER ITEMS MODAL */}
      {selectedOrder && (
        <div className="vendor-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelectedOrder(null); }}>
          <div className="vendor-modal">
            <div className="vendor-modal-header">
              <h2>Order #{selectedOrder.orderNumber} (Your Line Items)</h2>
              <button className="vendor-btn-secondary vendor-btn-sm" onClick={() => setSelectedOrder(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="vendor-modal-body">
              <div style={{ marginBottom: "16px", fontSize: "13px" }}>
                <p><strong>Order Status:</strong> {selectedOrder.status}</p>
                <p><strong>Delivery Destination:</strong> {selectedOrder.shippingCity}, {selectedOrder.shippingRegion} {selectedOrder.shippingCountryCode}</p>
              </div>

              <table className="vendor-table">
                <thead>
                  <tr>
                    <th style={{ width: "54px" }}>Image</th>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <ProductImg
                          src={getProductThumbnail(it.productName, it.sku, it.product?.images?.[0]?.url)}
                          alt={it.productName}
                          className="vendor-table-thumb"
                          fallbackName={it.productName}
                        />
                      </td>
                      <td><strong>{it.productName}</strong></td>
                      <td><code>{it.sku}</code></td>
                      <td>{it.quantity}</td>
                      <td>${Number(it.unitPrice).toFixed(2)}</td>
                      <td><strong>${Number(it.lineTotal).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: "16px", textAlign: "right" }}>
                <span style={{ fontSize: "13px", color: "#78716c" }}>Your Order Subtotal: </span>
                <strong style={{ fontSize: "16px" }}>${Number(selectedOrder.vendorSubtotal).toFixed(2)}</strong>
              </div>
            </div>
            <div className="vendor-modal-footer">
              <button className="vendor-btn-secondary" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="vendor-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowProductModal(false); }}>
          <div className="vendor-modal">
            <div className="vendor-modal-header">
              <h2>{editingProduct ? "Edit Product Listing" : "Create New Product Listing"}</h2>
              <button className="vendor-btn-secondary vendor-btn-sm" onClick={() => setShowProductModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="vendor-modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>SKU</label>
                    <input
                      required
                      disabled={!!editingProduct}
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Slug</label>
                    <input
                      required
                      disabled={!!editingProduct}
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                      value={productForm.slug}
                      onChange={(e) => setProductForm({ ...productForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Product Name</label>
                  <input
                    required
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                    value={productForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setProductForm({
                        ...productForm,
                        name,
                        slug: !editingProduct ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : productForm.slug
                      });
                    }}
                  />
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Description</label>
                  <textarea
                    required
                    rows={3}
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Brand</label>
                    <input
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                      value={productForm.brand}
                      onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Category</label>
                    <select
                      required
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                      value={productForm.categoryId}
                      onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Status</label>
                    <select
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                      value={productForm.status}
                      onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Product Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  />
                  {productForm.imageUrl && (
                    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "11px", color: "#78716c" }}>Live preview:</span>
                      <ProductImg
                        src={productForm.imageUrl}
                        alt="Product preview"
                        style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "6px", border: "1px solid #d6d3d1", background: "#f5f5f4" }}
                        fallbackName={productForm.name || "Preview"}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="vendor-modal-footer">
                <button type="button" className="vendor-btn-secondary" onClick={() => setShowProductModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="vendor-btn-primary">
                  {editingProduct ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
