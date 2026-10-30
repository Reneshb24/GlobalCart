import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingBag, Package, Warehouse, ArrowLeft, LogOut,
  Plus, RefreshCw, AlertTriangle, Eye, Store, X, Camera, Upload
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

type VendorWarehouse = {
  id: string;
  code: string;
  name: string;
  city: string;
  countryCode: string;
  region?: string | null;
  isActive: boolean;
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

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [publicWarehouses, setPublicWarehouses] = useState<VendorWarehouse[]>([]);
  const [registerForm, setRegisterForm] = useState({
    businessName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    nearestWarehouseId: ""
  });
  const [registerError, setRegisterError] = useState("");
  const [registerBusy, setRegisterBusy] = useState(false);

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
    imageUrl: "",
    image1: "",
    image2: "",
    image3: "",
    image4: "",
    initialQuantity: 10,
    warehouseId: ""
  });

  const [uploadingAngle, setUploadingAngle] = useState<number | null>(null);

  async function handleImageUpload(angleIndex: number, file: File) {
    if (!file) return;
    setUploadingAngle(angleIndex);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUri = reader.result as string;
        try {
          const res = await api.post<{ url: string }>("/upload", {
            file: dataUri,
            filename: file.name
          });
          const uploadedUrl = res.data.url;
          if (angleIndex === 1) {
            setProductForm((prev) => ({ ...prev, image1: uploadedUrl, imageUrl: uploadedUrl }));
          } else if (angleIndex === 2) {
            setProductForm((prev) => ({ ...prev, image2: uploadedUrl }));
          } else if (angleIndex === 3) {
            setProductForm((prev) => ({ ...prev, image3: uploadedUrl }));
          } else if (angleIndex === 4) {
            setProductForm((prev) => ({ ...prev, image4: uploadedUrl }));
          }
        } catch {
          // Graceful fallback to dataUri if backend upload route is unreachable
          if (angleIndex === 1) {
            setProductForm((prev) => ({ ...prev, image1: dataUri, imageUrl: dataUri }));
          } else if (angleIndex === 2) {
            setProductForm((prev) => ({ ...prev, image2: dataUri }));
          } else if (angleIndex === 3) {
            setProductForm((prev) => ({ ...prev, image3: dataUri }));
          } else if (angleIndex === 4) {
            setProductForm((prev) => ({ ...prev, image4: dataUri }));
          }
        } finally {
          setUploadingAngle(null);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingAngle(null);
    }
  }

  // Categories & Warehouses for select
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [warehouses, setWarehouses] = useState<VendorWarehouse[]>([]);

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

    async function loadPublicWarehouses() {
      try {
        const res = await api.get<{ warehouses: VendorWarehouse[] }>("/auth/warehouses/public");
        setPublicWarehouses(res.data.warehouses || []);
      } catch {
        // Ignore if unauthenticated
      }
    }
    void loadPublicWarehouses();
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegisterBusy(true);
    setRegisterError("");
    try {
      const res = await api.post<{
        token: string;
        user: VendorUser;
        vendor: { id: string; name: string; email: string | null; phone: string | null };
      }>("/auth/register-vendor", {
        businessName: registerForm.businessName.trim(),
        firstName: registerForm.firstName.trim(),
        lastName: registerForm.lastName.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        phone: registerForm.phone.trim() || undefined,
        nearestWarehouseId: registerForm.nearestWarehouseId || undefined
      });
      setAuthToken(res.data.token);
      setCurrentUser(res.data.user);
      setVendorProfile(res.data.vendor);
      setDeniedRole(null);
      setFeedback({ type: "success", text: `Welcome to GlobalCart! Your seller business "${res.data.vendor.name}" is now active.` });
    } catch (err) {
      setRegisterError(getApiErrorMessage(err, "Registration failed. Please check your details."));
    } finally {
      setRegisterBusy(false);
    }
  }

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

  const loadWarehouses = useCallback(async () => {
    try {
      const res = await api.get<{ warehouses: VendorWarehouse[] }>("/vendor/warehouses");
      setWarehouses(res.data.warehouses ?? []);
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
      if (activeTab === "dashboard") { void loadDashboard(); void loadWarehouses(); }
      else if (activeTab === "products") { void loadProducts(); void loadCategories(); void loadWarehouses(); }
      else if (activeTab === "inventory") void loadInventory();
      else if (activeTab === "orders") void loadOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentUser, activeTab, loadDashboard, loadProducts, loadCategories, loadWarehouses, loadInventory, loadOrders]);

  function switchTab(tab: VendorTab) {
    setActiveTab(tab);
    setFeedback(null);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const images = [
        { url: productForm.image1.trim(), altText: `${productForm.name} Front View`, position: 0 },
        { url: productForm.image2.trim(), altText: `${productForm.name} Side Profile`, position: 1 },
        { url: productForm.image3.trim(), altText: `${productForm.name} Lifestyle View`, position: 2 },
        { url: productForm.image4.trim(), altText: `${productForm.name} Detail Macro`, position: 3 },
      ].filter(img => Boolean(img.url));

      const primaryUrl = images[0]?.url || productForm.imageUrl.trim() || undefined;

      if (editingProduct) {
        await api.patch(`/vendor/products/${editingProduct.id}`, {
          name: productForm.name,
          description: productForm.description,
          brand: productForm.brand || null,
          price: Number(productForm.price),
          categoryId: productForm.categoryId,
          status: productForm.status,
          imageUrl: primaryUrl,
          images: images.length > 0 ? images : undefined,
          initialQuantity: Number(productForm.initialQuantity) || 0,
          warehouseId: productForm.warehouseId || undefined
        });
        setFeedback({ type: "success", text: "Product updated successfully with inventory stock." });
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
          imageUrl: primaryUrl,
          images: images.length > 0 ? images : undefined,
          initialQuantity: Number(productForm.initialQuantity) || 0,
          warehouseId: productForm.warehouseId || undefined
        });
        setFeedback({ type: "success", text: "Product created with 4-angle studio photography and stocked in warehouse." });
      }
      setShowProductModal(false);
      setEditingProduct(null);
      void loadProducts();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to save product.") });
    }
  }

  // Delete or Archive Vendor Product
  async function handleDeleteProduct(productId: string, productName: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete listing "${productName}"?\n\nIf it has customer order history, it will be safely archived and removed from the active storefront catalog. If it has no orders, it will be permanently deleted.`
    );
    if (!confirmed) return;

    try {
      const res = await api.delete<{ message: string; archived?: boolean; deleted?: boolean }>(`/vendor/products/${productId}`);
      setFeedback({ type: "success", text: res.data.message || `Product listing "${productName}" deleted successfully.` });
      setProducts(prev => prev.filter(p => p.id !== productId));
      if (editingProduct && editingProduct.id === productId) {
        setShowProductModal(false);
        setEditingProduct(null);
      }
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to delete product listing.") });
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
        <div className="vendor-guard-card" style={{ maxWidth: authMode === "register" ? "520px" : "420px", transition: "max-width 0.2s" }}>
          <Store size={40} color="#d97706" style={{ margin: "0 auto" }} />
          <h2>GlobalCart Seller Hub</h2>
          <p style={{ margin: "4px 0 16px" }}>
            {authMode === "login"
              ? "Sign in to manage your marketplace listings, orders & stock."
              : "Register your business, select your nearest fulfillment warehouse, and start selling."}
          </p>

          <div style={{ display: "flex", background: "#f5f5f4", borderRadius: "8px", padding: "4px", marginBottom: "18px" }}>
            <button
              type="button"
              onClick={() => { setAuthMode("login"); setLoginError(""); setRegisterError(""); }}
              style={{
                flex: 1,
                padding: "8px",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                background: authMode === "login" ? "#ffffff" : "transparent",
                color: authMode === "login" ? "#d97706" : "#78716c",
                boxShadow: authMode === "login" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              Partner Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode("register"); setLoginError(""); setRegisterError(""); }}
              style={{
                flex: 1,
                padding: "8px",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                background: authMode === "register" ? "#ffffff" : "transparent",
                color: authMode === "register" ? "#d97706" : "#78716c",
                boxShadow: authMode === "register" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              Register New Seller
            </button>
          </div>

          {authMode === "login" ? (
            <form onSubmit={handleLogin} style={{ textAlign: "left" }}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403c", marginBottom: "4px" }}>
                  Partner Email Address
                </label>
                <input
                  type="email"
                  required
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px", fontSize: "13px" }}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="partner@example.com"
                />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403c", marginBottom: "4px" }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px", fontSize: "13px" }}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
              {loginError && (
                <div style={{ padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "14px", background: "#fee2e2", color: "#991b1b" }}>
                  {loginError}
                </div>
              )}
              <button
                type="submit"
                className="vendor-btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "13px" }}
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
          ) : (
            <form onSubmit={handleRegister} style={{ textAlign: "left" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403c", marginBottom: "4px" }}>
                  Business / Store Name *
                </label>
                <input
                  type="text"
                  required
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px", fontSize: "13px" }}
                  value={registerForm.businessName}
                  onChange={(e) => setRegisterForm({ ...registerForm, businessName: e.target.value })}
                  placeholder="e.g. Acme Tech Innovations"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403c", marginBottom: "4px" }}>
                    Contact First Name *
                  </label>
                  <input
                    type="text"
                    required
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px", fontSize: "13px" }}
                    value={registerForm.firstName}
                    onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                    placeholder="Alex"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403c", marginBottom: "4px" }}>
                    Contact Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px", fontSize: "13px" }}
                    value={registerForm.lastName}
                    onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                    placeholder="Vance"
                  />
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403c", marginBottom: "4px" }}>
                  Seller Account Email *
                </label>
                <input
                  type="email"
                  required
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px", fontSize: "13px" }}
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  placeholder="seller@business.com"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403c", marginBottom: "4px" }}>
                    Password (min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px", fontSize: "13px" }}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403c", marginBottom: "4px" }}>
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px", fontSize: "13px" }}
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    placeholder="+1 555-0199"
                  />
                </div>
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403c", marginBottom: "4px" }}>
                  Nearest Fulfillment Warehouse Hub
                </label>
                <select
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px", fontSize: "13px", background: "#ffffff" }}
                  value={registerForm.nearestWarehouseId}
                  onChange={(e) => setRegisterForm({ ...registerForm, nearestWarehouseId: e.target.value })}
                >
                  <option value="">Select your regional fulfillment center...</option>
                  {publicWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.city}, {w.countryCode}) - Code: {w.code}
                    </option>
                  ))}
                </select>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#78716c" }}>
                  Inventory will route to and ship from your selected regional fulfillment warehouse.
                </p>
              </div>

              {registerError && (
                <div style={{ padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "14px", background: "#fee2e2", color: "#991b1b" }}>
                  {registerError}
                </div>
              )}
              <button
                type="submit"
                className="vendor-btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "13px" }}
                disabled={registerBusy}
              >
                {registerBusy ? "Registering Business..." : "Register as Vendor & Launch Store"}
              </button>
              <div style={{ marginTop: "16px", textAlign: "center" }}>
                <a href="/" style={{ color: "#78716c", fontSize: "12px", textDecoration: "none" }}>
                  ← Return to Storefront
                </a>
              </div>
            </form>
          )}
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
                          imageUrl: "",
                          image1: "",
                          image2: "",
                          image3: "",
                          image4: "",
                          initialQuantity: 10,
                          warehouseId: warehouses[0]?.id || ""
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
                          const angleCount = (p.images && p.images.length > 0) ? p.images.length : 1;
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
                              <td>
                                <strong>{p.name}</strong>
                                {angleCount > 1 && (
                                  <span className="vendor-badge badge-active" style={{ marginLeft: "8px", fontSize: "10px" }}>
                                    {angleCount} Angles
                                  </span>
                                )}
                              </td>
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
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    className="vendor-btn-secondary vendor-btn-sm"
                                    onClick={() => {
                                      const sortedImages = [...(p.images || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
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
                                        imageUrl: sortedImages[0]?.url || "",
                                        image1: sortedImages.find((i) => i.position === 0)?.url || sortedImages[0]?.url || "",
                                        image2: sortedImages.find((i) => i.position === 1)?.url || sortedImages[1]?.url || "",
                                        image3: sortedImages.find((i) => i.position === 2)?.url || sortedImages[2]?.url || "",
                                        image4: sortedImages.find((i) => i.position === 3)?.url || sortedImages[3]?.url || "",
                                        initialQuantity: p.inventory?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0,
                                        warehouseId: (p.inventory?.[0] as any)?.warehouseId || (p.inventory?.[0] as any)?.warehouse?.id || warehouses[0]?.id || ""
                                      });
                                      setShowProductModal(true);
                                    }}
                                  >
                                    Edit Listing
                                  </button>
                                  <button
                                    type="button"
                                    style={{
                                      background: totalAvailable <= 0 ? "#dc2626" : "#fee2e2",
                                      color: totalAvailable <= 0 ? "#ffffff" : "#b91c1c",
                                      border: "1px solid #fca5a5",
                                      fontWeight: 600,
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      fontSize: "12px",
                                      cursor: "pointer"
                                    }}
                                    title={totalAvailable <= 0 ? "Out of Stock - Delete Listing" : "Delete Product Listing"}
                                    onClick={() => void handleDeleteProduct(p.id, p.name)}
                                  >
                                    Delete
                                  </button>
                                </div>
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
                      name="sku"
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
                      name="slug"
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
                    name="name"
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
                    name="description"
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
                      name="brand"
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                      value={productForm.brand}
                      onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Category</label>
                    <select
                      name="categoryId"
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
                      name="price"
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

                {/* Warehouse Stock & Quantity Counter Field */}
                <div style={{ background: "#fafaf9", border: "1px solid #e7e5e4", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1c1917", margin: 0 }}>
                        Fulfillment Stock & Quantity Counter *
                      </label>
                      <span style={{ fontSize: "11px", color: "#78716c" }}>
                        Specify available physical units in your chosen nearest warehouse
                      </span>
                    </div>
                    {productForm.initialQuantity > 5 ? (
                      <span style={{ background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>
                        ✓ In Stock ({productForm.initialQuantity} units)
                      </span>
                    ) : productForm.initialQuantity > 0 ? (
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>
                        ⚠ Low Stock ({productForm.initialQuantity} remaining)
                      </span>
                    ) : (
                      <span style={{ background: "#fee2e2", color: "#991b1b", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>
                        ✕ Out of Stock (0 units)
                      </span>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "flex-end" }}>
                    {/* Stepper Counter */}
                    <div>
                      <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", color: "#44403c", fontWeight: 700, marginBottom: "4px" }}>
                        Units Available Counter
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <button
                          type="button"
                          className="vendor-btn-secondary"
                          style={{ width: "36px", height: "36px", fontSize: "18px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                          onClick={() => setProductForm((prev) => ({ ...prev, initialQuantity: Math.max(0, (prev.initialQuantity || 0) - 1) }))}
                          disabled={(productForm.initialQuantity || 0) <= 0}
                          title="Decrease by 1"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="100000"
                          value={productForm.initialQuantity}
                          onChange={(e) => setProductForm((prev) => ({ ...prev, initialQuantity: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                          style={{ width: "75px", textAlign: "center", height: "36px", fontWeight: 700, fontSize: "15px", borderRadius: "6px", border: "1px solid #d6d3d1", boxSizing: "border-box" }}
                        />
                        <button
                          type="button"
                          className="vendor-btn-secondary"
                          style={{ width: "36px", height: "36px", fontSize: "18px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                          onClick={() => setProductForm((prev) => ({ ...prev, initialQuantity: (prev.initialQuantity || 0) + 1 }))}
                          title="Increase by 1"
                        >
                          +
                        </button>

                        <div style={{ display: "flex", gap: "4px", marginLeft: "4px" }}>
                          <button
                            type="button"
                            className="vendor-btn-secondary vendor-btn-sm"
                            style={{ fontSize: "11px", padding: "4px 8px" }}
                            onClick={() => setProductForm((prev) => ({ ...prev, initialQuantity: (prev.initialQuantity || 0) + 10 }))}
                            title="Add 10 units"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            className="vendor-btn-secondary vendor-btn-sm"
                            style={{ fontSize: "11px", padding: "4px 8px" }}
                            onClick={() => setProductForm((prev) => ({ ...prev, initialQuantity: (prev.initialQuantity || 0) + 50 }))}
                            title="Add 50 units"
                          >
                            +50
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Nearest Stocking Warehouse */}
                    <div>
                      <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", color: "#44403c", fontWeight: 700, marginBottom: "4px" }}>
                        Nearest Fulfillment Warehouse
                      </label>
                      <select
                        style={{ width: "100%", height: "36px", boxSizing: "border-box", padding: "6px 10px", border: "1px solid #d6d3d1", borderRadius: "6px" }}
                        value={productForm.warehouseId}
                        onChange={(e) => setProductForm((prev) => ({ ...prev, warehouseId: e.target.value }))}
                      >
                        <option value="">Select Nearest Warehouse</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.code} – {w.city}, {w.countryCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4-Angle Photography Studio */}
                <div style={{ border: "1px solid #e7e5e4", borderRadius: "8px", padding: "16px", background: "#fafaf9", margin: "16px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1c1917", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Camera size={16} /> 4-Angle Photography Studio
                      </h4>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#78716c" }}>
                        Provide 4 perspectives of your product (Front, Side, Lifestyle, Detail Macro).
                      </p>
                    </div>
                    <button
                      type="button"
                      className="vendor-btn-secondary vendor-btn-sm"
                      onClick={() => {
                        setProductForm({
                          ...productForm,
                          imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
                          image1: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
                          image2: "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80",
                          image3: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
                          image4: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80"
                        });
                      }}
                    >
                      Fill Sample Studio Photos
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
                    {/* Angle 1 */}
                    <div style={{ background: "#ffffff", padding: "10px", borderRadius: "6px", border: "1px solid #e7e5e4" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "#44403c", textTransform: "uppercase" }}>
                          Angle 1: Front Hero *
                        </label>
                        {productForm.image1 && (
                          <button
                            type="button"
                            onClick={() => setProductForm((p) => ({ ...p, image1: "", imageUrl: "" }))}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "11px", padding: 0 }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="url"
                          placeholder="Image URL or upload..."
                          value={productForm.image1}
                          onChange={(e) => setProductForm({ ...productForm, image1: e.target.value, imageUrl: e.target.value })}
                          style={{ flex: 1, minWidth: 0, fontSize: "12px", padding: "6px 8px", border: "1px solid #d6d3d1", borderRadius: "4px" }}
                        />
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 8px",
                            background: uploadingAngle === 1 ? "#e7e5e4" : "#f5f5f4",
                            border: "1px solid #d6d3d1",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#44403c",
                            cursor: uploadingAngle === 1 ? "wait" : "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          <Upload size={12} />
                          {uploadingAngle === 1 ? "..." : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            disabled={uploadingAngle === 1}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleImageUpload(1, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      <div style={{ marginTop: "6px", height: "65px", background: "#f5f5f4", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {productForm.image1 ? (
                          <ProductImg src={productForm.image1} alt="Front Hero" style={{ width: "100%", height: "100%", objectFit: "contain" }} fallbackName={productForm.name || "Angle 1"} />
                        ) : (
                          <span style={{ fontSize: "11px", color: "#a8a29e" }}>No image</span>
                        )}
                      </div>
                    </div>

                    {/* Angle 2 */}
                    <div style={{ background: "#ffffff", padding: "10px", borderRadius: "6px", border: "1px solid #e7e5e4" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "#44403c", textTransform: "uppercase" }}>
                          Angle 2: Side Profile
                        </label>
                        {productForm.image2 && (
                          <button
                            type="button"
                            onClick={() => setProductForm((p) => ({ ...p, image2: "" }))}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "11px", padding: 0 }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="url"
                          placeholder="Image URL or upload..."
                          value={productForm.image2}
                          onChange={(e) => setProductForm({ ...productForm, image2: e.target.value })}
                          style={{ flex: 1, minWidth: 0, fontSize: "12px", padding: "6px 8px", border: "1px solid #d6d3d1", borderRadius: "4px" }}
                        />
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 8px",
                            background: uploadingAngle === 2 ? "#e7e5e4" : "#f5f5f4",
                            border: "1px solid #d6d3d1",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#44403c",
                            cursor: uploadingAngle === 2 ? "wait" : "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          <Upload size={12} />
                          {uploadingAngle === 2 ? "..." : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            disabled={uploadingAngle === 2}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleImageUpload(2, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      <div style={{ marginTop: "6px", height: "65px", background: "#f5f5f4", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {productForm.image2 ? (
                          <ProductImg src={productForm.image2} alt="Side Profile" style={{ width: "100%", height: "100%", objectFit: "contain" }} fallbackName={productForm.name || "Angle 2"} />
                        ) : (
                          <span style={{ fontSize: "11px", color: "#a8a29e" }}>No image</span>
                        )}
                      </div>
                    </div>

                    {/* Angle 3 */}
                    <div style={{ background: "#ffffff", padding: "10px", borderRadius: "6px", border: "1px solid #e7e5e4" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "#44403c", textTransform: "uppercase" }}>
                          Angle 3: Lifestyle View
                        </label>
                        {productForm.image3 && (
                          <button
                            type="button"
                            onClick={() => setProductForm((p) => ({ ...p, image3: "" }))}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "11px", padding: 0 }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="url"
                          placeholder="Image URL or upload..."
                          value={productForm.image3}
                          onChange={(e) => setProductForm({ ...productForm, image3: e.target.value })}
                          style={{ flex: 1, minWidth: 0, fontSize: "12px", padding: "6px 8px", border: "1px solid #d6d3d1", borderRadius: "4px" }}
                        />
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 8px",
                            background: uploadingAngle === 3 ? "#e7e5e4" : "#f5f5f4",
                            border: "1px solid #d6d3d1",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#44403c",
                            cursor: uploadingAngle === 3 ? "wait" : "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          <Upload size={12} />
                          {uploadingAngle === 3 ? "..." : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            disabled={uploadingAngle === 3}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleImageUpload(3, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      <div style={{ marginTop: "6px", height: "65px", background: "#f5f5f4", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {productForm.image3 ? (
                          <ProductImg src={productForm.image3} alt="Lifestyle" style={{ width: "100%", height: "100%", objectFit: "contain" }} fallbackName={productForm.name || "Angle 3"} />
                        ) : (
                          <span style={{ fontSize: "11px", color: "#a8a29e" }}>No image</span>
                        )}
                      </div>
                    </div>

                    {/* Angle 4 */}
                    <div style={{ background: "#ffffff", padding: "10px", borderRadius: "6px", border: "1px solid #e7e5e4" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "#44403c", textTransform: "uppercase" }}>
                          Angle 4: Detail Macro
                        </label>
                        {productForm.image4 && (
                          <button
                            type="button"
                            onClick={() => setProductForm((p) => ({ ...p, image4: "" }))}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "11px", padding: 0 }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="url"
                          placeholder="Image URL or upload..."
                          value={productForm.image4}
                          onChange={(e) => setProductForm({ ...productForm, image4: e.target.value })}
                          style={{ flex: 1, minWidth: 0, fontSize: "12px", padding: "6px 8px", border: "1px solid #d6d3d1", borderRadius: "4px" }}
                        />
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 8px",
                            background: uploadingAngle === 4 ? "#e7e5e4" : "#f5f5f4",
                            border: "1px solid #d6d3d1",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#44403c",
                            cursor: uploadingAngle === 4 ? "wait" : "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          <Upload size={12} />
                          {uploadingAngle === 4 ? "..." : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            disabled={uploadingAngle === 4}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleImageUpload(4, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      <div style={{ marginTop: "6px", height: "65px", background: "#f5f5f4", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {productForm.image4 ? (
                          <ProductImg src={productForm.image4} alt="Detail Macro" style={{ width: "100%", height: "100%", objectFit: "contain" }} fallbackName={productForm.name || "Angle 4"} />
                        ) : (
                          <span style={{ fontSize: "11px", color: "#a8a29e" }}>No image</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="vendor-modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  {editingProduct && (
                    <button
                      type="button"
                      style={{
                        background: "#fee2e2",
                        color: "#b91c1c",
                        border: "1px solid #fca5a5",
                        padding: "8px 14px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                      onClick={() => void handleDeleteProduct(editingProduct.id, editingProduct.name)}
                    >
                      Delete Listing
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="vendor-btn-secondary" onClick={() => setShowProductModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="vendor-btn-primary">
                    {editingProduct ? "Save Changes" : "Create Product with 4 Angles"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
