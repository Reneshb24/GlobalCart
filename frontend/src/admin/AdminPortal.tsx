import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Tags, Warehouse, RotateCcw,
  Star, Tag, Users, CreditCard, ArrowLeft, LogOut, Plus,
  RefreshCw, CheckCircle, XCircle, AlertTriangle, Truck, Eye, ShieldCheck, X,
  Store, Camera
} from "lucide-react";
import { api, clearAuthToken, getApiErrorMessage, getAuthToken, setAuthToken } from "../lib/api";
import ProductImg from "../ProductImg";
import { getProductThumbnail } from "../lib/productImages";
import "./AdminPortal.css";

type AdminTab =
  | "dashboard"
  | "orders"
  | "products"
  | "vendors"
  | "categories"
  | "inventory"
  | "returns"
  | "reviews"
  | "offers"
  | "customers"
  | "payments";

type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

type OverviewMetrics = {
  orders?: { total?: number; pending?: number; cancelled?: number; delivered?: number };
  customers?: number;
  products?: number;
  inventory?: { quantity?: number; reserved?: number };
  payments?: {
    grossCapturedByCurrency?: Record<string, number>;
    refundedByCurrency?: Record<string, number>;
    netRevenueByCurrency?: Record<string, number>;
  };
  averageOrderValue?: number;
};

type DailySales = {
  date: string;
  orders: number;
  grossOrderValueByCurrency: Record<string, number>;
};

type TopProduct = {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
  grossSales: number;
};

type AdminOrder = {
  id: string;
  orderNumber: string;
  placedAt: string;
  status: string;
  currency: string;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  shippingRecipient: string;
  shippingLine1?: string;
  shippingLine2?: string | null;
  shippingCity: string;
  shippingRegion: string;
  shippingPostalCode?: string;
  shippingCountryCode: string;
  customer?: { id: string; email: string; firstName: string; lastName: string; phone?: string | null };
  user?: { id: string; email: string; firstName: string; lastName: string; phone?: string | null };
  itemCount?: number;
  items?: { id: string; productName: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }[];
  shipments?: { id: string; status: string; carrier?: string | null; trackingNumber?: string | null }[];
  payments?: { id: string; status: string; method: string; amount: number; refunds?: { id: string; amount: number }[] }[];
};

type AdminVendor = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt?: string;
  _count?: { products: number };
};

type AdminProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  brand?: string | null;
  price: number;
  currency: string;
  categoryId: string;
  vendorId?: string | null;
  vendor?: { id: string; name: string } | null;
  status: string;
  category?: { id: string; name: string; slug: string } | null;
  images?: { id: string; url: string; altText?: string | null; position?: number }[];
  inventory?: { quantity: number; reserved: number; available?: number; warehouse?: { name: string; code: string } }[];
};

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  isActive: boolean;
};

type AdminWarehouse = {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  region?: string | null;
  city: string;
  isActive: boolean;
};

type AdminInventoryRow = {
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

type AdminReturn = {
  id: string;
  returnNumber: string;
  reason: string;
  status: string;
  requestedAt: string;
  order?: { id: string; orderNumber: string; status: string; currency: string };
  user?: { id: string; email: string; firstName: string; lastName: string };
  refunds?: { id: string; amount: number }[];
};

type AdminReview = {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  createdAt: string;
  product?: { id: string; name: string; slug: string };
  user?: { id: string; firstName: string; lastName: string; email: string };
};

type AdminOffer = {
  id: string;
  code: string;
  title: string;
  discountType: string;
  discountValue: number;
  minOrderSubtotal: number;
  maxDiscountAmount?: number | null;
  status: string;
};

type AdminCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  orderCount: number;
  totalSpend: number;
};

type AdminPayment = {
  id: string;
  orderNumber: string;
  customer?: { email: string };
  method: string;
  amount: number;
  currency: string;
  status: string;
  providerReference?: string | null;
  simulated: boolean;
  createdAt: string;
};

export default function AdminPortal() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [deniedRole, setDeniedRole] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Data states
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [salesData, setSalesData] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  // Shipment creation in order detail
  const [shipmentCarrier, setShipmentCarrier] = useState("FedEx");
  const [shipmentTracking, setShipmentTracking] = useState("");
  const [shipmentBusy, setShipmentBusy] = useState(false);

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    slug: "",
    description: "",
    brand: "",
    price: 0,
    currency: "USD",
    categoryId: "",
    vendorId: "",
    status: "DRAFT",
    imageUrl: "",
    image1: "",
    image2: "",
    image3: "",
    image4: "",
    initialQuantity: 10,
    warehouseId: ""
  });

  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    name: "",
    email: "",
    phone: "",
    isActive: true
  });

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    parentId: "",
    isActive: true
  });

  const [inventoryRows, setInventoryRows] = useState<AdminInventoryRow[]>([]);
  const [warehouses, setWarehouses] = useState<AdminWarehouse[]>([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    productId: "",
    warehouseId: "",
    delta: 1
  });
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({
    code: "",
    name: "",
    countryCode: "US",
    region: "",
    city: "",
    isActive: true
  });

  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [returnStatusFilter, setReturnStatusFilter] = useState("");

  const [pendingReviews, setPendingReviews] = useState<AdminReview[]>([]);

  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({
    code: "",
    title: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderSubtotal: 0,
    maxDiscountAmount: 50,
    status: "ACTIVE"
  });

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      if (!getAuthToken()) {
        setAuthLoading(false);
        return;
      }
      try {
        const res = await api.get<{ user: AdminUser }>("/auth/me");
        if (res.data.user.role === "ADMIN") {
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
      const res = await api.post<{ token: string; user: AdminUser }>("/auth/login", {
        email: loginEmail.trim(),
        password: loginPassword
      });
      if (res.data.user.role !== "ADMIN") {
        setLoginError("This account does not have administrator privileges.");
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
    setDeniedRole(null);
  }

  // Loaders
  const loadDashboard = useCallback(async () => {
    try {
      const [ovRes, salesRes, prodRes] = await Promise.all([
        api.get<OverviewMetrics>("/admin/analytics/overview"),
        api.get<{ daily: DailySales[] }>("/admin/analytics/sales"),
        api.get<{ products: TopProduct[] }>("/admin/analytics/products")
      ]);
      setOverview(ovRes.data);
      setSalesData(salesRes.data.daily ?? []);
      setTopProducts(prodRes.data.products ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load dashboard metrics.") });
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (orderStatusFilter) params.status = orderStatusFilter;
      if (orderSearch.trim()) params.search = orderSearch.trim();
      const res = await api.get<{ orders: AdminOrder[] }>("/admin/orders", { params });
      setOrders(res.data.orders ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load orders.") });
    }
  }, [orderStatusFilter, orderSearch]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await api.get<{ products: AdminProduct[] }>("/admin/products");
      let prods = res.data.products ?? [];
      if (productStatusFilter) prods = prods.filter((p) => p.status === productStatusFilter);
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        prods = prods.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.vendor?.name && p.vendor.name.toLowerCase().includes(q))
        );
      }
      setProducts(prods);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load products.") });
    }
  }, [productStatusFilter, productSearch]);

  const loadWarehouses = useCallback(async () => {
    try {
      const res = await api.get<{ warehouses: AdminWarehouse[] }>("/admin/warehouses");
      setWarehouses(res.data.warehouses ?? []);
    } catch {
      // ignore
    }
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      const res = await api.get<{ vendors: AdminVendor[] }>("/admin/vendors");
      setVendors(res.data.vendors ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load vendors.") });
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get<{ categories: AdminCategory[] }>("/categories");
      setCategories(res.data.categories ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load categories.") });
    }
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      const [invRes, whRes] = await Promise.all([
        api.get<{ inventory: AdminInventoryRow[] }>("/admin/analytics/inventory"),
        api.get<{ warehouses: AdminWarehouse[] }>("/admin/warehouses")
      ]);
      setInventoryRows(invRes.data.inventory ?? []);
      setWarehouses(whRes.data.warehouses ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load inventory.") });
    }
  }, []);

  const loadReturns = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (returnStatusFilter) params.status = returnStatusFilter;
      const res = await api.get<{ returns: AdminReturn[] }>("/admin/returns", { params });
      setReturns(res.data.returns ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load returns.") });
    }
  }, [returnStatusFilter]);

  const loadReviews = useCallback(async () => {
    try {
      const res = await api.get<{ reviews: AdminReview[] }>("/admin/reviews/pending");
      setPendingReviews(res.data.reviews ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load reviews.") });
    }
  }, []);

  const loadOffers = useCallback(async () => {
    try {
      const res = await api.get<{ offers: AdminOffer[] }>("/admin/offers");
      setOffers(res.data.offers ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load offers.") });
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (customerSearch.trim()) params.search = customerSearch.trim();
      const res = await api.get<{ customers: AdminCustomer[] }>("/admin/customers", { params });
      setCustomers(res.data.customers ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load customers.") });
    }
  }, [customerSearch]);

  const loadPayments = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (paymentStatusFilter) params.status = paymentStatusFilter;
      const res = await api.get<{ payments: AdminPayment[] }>("/admin/payments", { params });
      setPayments(res.data.payments ?? []);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load payments.") });
    }
  }, [paymentStatusFilter]);

  // Tab switch effect
  useEffect(() => {
    if (!currentUser) return;
    const timer = window.setTimeout(() => {
      if (activeTab === "dashboard") void loadDashboard();
      else if (activeTab === "orders") void loadOrders();
      else if (activeTab === "products") { void loadProducts(); void loadCategories(); void loadVendors(); void loadWarehouses(); }
      else if (activeTab === "vendors") { void loadVendors(); void loadWarehouses(); }
      else if (activeTab === "categories") void loadCategories();
      else if (activeTab === "inventory") void loadInventory();
      else if (activeTab === "returns") void loadReturns();
      else if (activeTab === "reviews") void loadReviews();
      else if (activeTab === "offers") void loadOffers();
      else if (activeTab === "customers") void loadCustomers();
      else if (activeTab === "payments") void loadPayments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentUser, activeTab, loadDashboard, loadOrders, loadProducts, loadCategories, loadInventory, loadReturns, loadReviews, loadOffers, loadCustomers, loadPayments, loadVendors, loadWarehouses]);

  function switchTab(tab: AdminTab) {
    setActiveTab(tab);
    setFeedback(null);
  }

  // Order Details fetch
  async function openOrderDetail(orderId: string) {
    setOrderLoading(true);
    try {
      const res = await api.get<{ order: AdminOrder }>(`/admin/orders/${orderId}`);
      setSelectedOrder(res.data.order);
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to load order details.") });
    } finally {
      setOrderLoading(false);
    }
  }

  // Create Shipment
  async function handleCreateShipment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrder) return;
    setShipmentBusy(true);
    try {
      await api.post("/admin/shipments", {
        orderId: selectedOrder.id,
        carrier: shipmentCarrier,
        trackingNumber: shipmentTracking.trim() || undefined
      });
      setFeedback({ type: "success", text: "Shipment created successfully." });
      setShipmentTracking("");
      void openOrderDetail(selectedOrder.id);
      void loadOrders();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to create shipment.") });
    } finally {
      setShipmentBusy(false);
    }
  }

  // Progress Shipment Status
  async function handleProgressShipment(shipmentId: string, nextStatus: string) {
    try {
      await api.patch(`/admin/shipments/${shipmentId}/status`, { status: nextStatus });
      setFeedback({ type: "success", text: `Shipment advanced to ${nextStatus}.` });
      if (selectedOrder) void openOrderDetail(selectedOrder.id);
      void loadOrders();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to update shipment status.") });
    }
  }

  // Order status update
  async function handleUpdateOrderStatus(orderId: string, status: string) {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
      setFeedback({ type: "success", text: `Order status updated to ${status}.` });
      if (selectedOrder) void openOrderDetail(orderId);
      void loadOrders();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to update order status.") });
    }
  }

  // Review moderation
  async function handleModerateReview(reviewId: string, status: "APPROVED" | "REJECTED") {
    try {
      await api.patch(`/admin/reviews/${reviewId}/moderation`, { status });
      setFeedback({ type: "success", text: `Review ${status.toLowerCase()} successfully.` });
      void loadReviews();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to moderate review.") });
    }
  }

  // Return status update
  async function handleUpdateReturnStatus(returnId: string, status: string) {
    try {
      await api.patch(`/admin/returns/${returnId}/status`, { status });
      setFeedback({ type: "success", text: `Return status updated to ${status}.` });
      void loadReturns();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to update return status.") });
    }
  }

  // Process refund for return
  async function handleRefundReturn(returnId: string) {
    try {
      await api.post(`/admin/returns/${returnId}/refund`);
      setFeedback({ type: "success", text: "Refund processed and ledger updated." });
      void loadReturns();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to process refund.") });
    }
  }

  // Toggle Customer Status
  async function handleToggleCustomer(userId: string, currentActive: boolean) {
    try {
      await api.patch(`/admin/customers/${userId}/status`, { isActive: !currentActive });
      setFeedback({ type: "success", text: `Customer account ${!currentActive ? "activated" : "deactivated"}.` });
      void loadCustomers();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to update customer status.") });
    }
  }

  // Create or Update Product
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
        await api.patch(`/admin/products/${editingProduct.id}`, {
          name: productForm.name,
          description: productForm.description,
          brand: productForm.brand || null,
          price: Number(productForm.price),
          categoryId: productForm.categoryId,
          vendorId: productForm.vendorId || null,
          status: productForm.status,
          imageUrl: primaryUrl,
          images: images.length > 0 ? images : undefined
        });
        setFeedback({ type: "success", text: "Product updated successfully." });
      } else {
        await api.post("/admin/products", {
          sku: productForm.sku,
          name: productForm.name,
          slug: productForm.slug,
          description: productForm.description,
          brand: productForm.brand || null,
          price: Number(productForm.price),
          currency: productForm.currency,
          categoryId: productForm.categoryId,
          vendorId: productForm.vendorId || null,
          status: productForm.status,
          imageUrl: primaryUrl,
          images: images.length > 0 ? images : undefined,
          initialQuantity: Number(productForm.initialQuantity) || 0,
          warehouseId: productForm.warehouseId || undefined
        });
        setFeedback({ type: "success", text: "Product created successfully with catalog imagery and stock." });
      }
      setShowProductModal(false);
      setEditingProduct(null);
      void loadProducts();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to save product.") });
    }
  }

  // Vendors management
  async function handleSaveVendor(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/vendors", {
        name: vendorForm.name.trim(),
        email: vendorForm.email.trim() || null,
        phone: vendorForm.phone.trim() || null,
        isActive: vendorForm.isActive
      });
      setFeedback({ type: "success", text: `Vendor "${vendorForm.name}" registered successfully.` });
      setShowVendorModal(false);
      setVendorForm({ name: "", email: "", phone: "", isActive: true });
      void loadVendors();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to register vendor.") });
    }
  }

  async function handleToggleVendorStatus(vendorId: string, currentActive: boolean) {
    try {
      await api.patch(`/admin/vendors/${vendorId}`, { isActive: !currentActive });
      setFeedback({ type: "success", text: `Vendor status updated to ${!currentActive ? "ACTIVE" : "INACTIVE"}.` });
      void loadVendors();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to update vendor status.") });
    }
  }

  // Create Category
  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/categories", {
        name: categoryForm.name,
        slug: categoryForm.slug,
        description: categoryForm.description || null,
        parentId: categoryForm.parentId || null,
        isActive: categoryForm.isActive
      });
      setFeedback({ type: "success", text: "Category created successfully." });
      setShowCategoryModal(false);
      setCategoryForm({ name: "", slug: "", description: "", parentId: "", isActive: true });
      void loadCategories();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to create category.") });
    }
  }

  // Adjust Inventory
  async function handleAdjustInventory(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/inventory/adjust", {
        productId: adjustForm.productId,
        warehouseId: adjustForm.warehouseId,
        delta: Number(adjustForm.delta)
      });
      setFeedback({ type: "success", text: "Inventory adjusted successfully." });
      setShowAdjustModal(false);
      void loadInventory();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to adjust inventory.") });
    }
  }

  // Create Warehouse
  async function handleCreateWarehouse(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/warehouses", warehouseForm);
      setFeedback({ type: "success", text: "Warehouse created successfully." });
      setShowWarehouseModal(false);
      setWarehouseForm({ code: "", name: "", countryCode: "US", region: "", city: "", isActive: true });
      void loadInventory();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to create warehouse.") });
    }
  }

  // Create Offer
  async function handleCreateOffer(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/offers", {
        code: offerForm.code.trim().toUpperCase(),
        title: offerForm.title,
        discountType: offerForm.discountType,
        discountValue: Number(offerForm.discountValue),
        minOrderSubtotal: Number(offerForm.minOrderSubtotal),
        maxDiscountAmount: offerForm.maxDiscountAmount ? Number(offerForm.maxDiscountAmount) : null,
        status: offerForm.status
      });
      setFeedback({ type: "success", text: "Promotion created successfully." });
      setShowOfferModal(false);
      void loadOffers();
    } catch (err) {
      setFeedback({ type: "error", text: getApiErrorMessage(err, "Failed to create offer.") });
    }
  }

  if (authLoading) {
    return (
      <div className="admin-guard-container">
        <div className="admin-guard-card">
          <p>Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  if (deniedRole) {
    return (
      <div className="admin-guard-container">
        <div className="admin-guard-card">
          <AlertTriangle size={42} color="#dc2626" style={{ margin: "0 auto 12px" }} />
          <h2>Access Restricted</h2>
          <p>
            You are currently signed in with a <strong>{deniedRole}</strong> account.
            The Admin Control Panel requires platform administrator privileges.
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "center" }}>
            <a href="/" className="admin-btn-primary" style={{ textDecoration: "none" }}>
              Return to Storefront
            </a>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => {
                clearAuthToken();
                setDeniedRole(null);
                setCurrentUser(null);
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
      <div className="admin-guard-container">
        <div className="admin-guard-card">
          <ShieldCheck size={40} color="#2563eb" style={{ margin: "0 auto" }} />
          <h2>GlobalCart Control Panel</h2>
          <p>Sign in with your administrator account to access platform operations.</p>
          <form onSubmit={handleLogin} style={{ textAlign: "left" }}>
            <div className="admin-form-group">
              <label>Administrator Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="admin-form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
            {loginError && <div className="admin-feedback-msg msg-error">{loginError}</div>}
            <button
              type="submit"
              className="admin-btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "10px" }}
              disabled={loginBusy}
            >
              {loginBusy ? "Signing in..." : "Enter Control Panel"}
            </button>
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <a href="/" style={{ color: "#64748b", fontSize: "12px", textDecoration: "none" }}>
                ← Return to Storefront
              </a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <a href="/admin" className="admin-brand">
            <span>GlobalCart</span>
            <span className="admin-brand-badge">ADMIN</span>
          </a>
        </div>
        <nav className="admin-nav">
          <button className={`admin-nav-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => switchTab("dashboard")}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button className={`admin-nav-item ${activeTab === "orders" ? "active" : ""}`} onClick={() => switchTab("orders")}>
            <ShoppingCart size={18} /> Orders & Fulfillment
          </button>
          <button className={`admin-nav-item ${activeTab === "products" ? "active" : ""}`} onClick={() => switchTab("products")}>
            <Package size={18} /> Catalog Products
          </button>
          <button className={`admin-nav-item ${activeTab === "vendors" ? "active" : ""}`} onClick={() => switchTab("vendors")}>
            <Store size={18} /> Marketplace Vendors
          </button>
          <button className={`admin-nav-item ${activeTab === "categories" ? "active" : ""}`} onClick={() => switchTab("categories")}>
            <Tags size={18} /> Categories
          </button>
          <button className={`admin-nav-item ${activeTab === "inventory" ? "active" : ""}`} onClick={() => switchTab("inventory")}>
            <Warehouse size={18} /> Inventory & Stock
          </button>
          <button className={`admin-nav-item ${activeTab === "returns" ? "active" : ""}`} onClick={() => switchTab("returns")}>
            <RotateCcw size={18} /> Returns & Refunds
          </button>
          <button className={`admin-nav-item ${activeTab === "reviews" ? "active" : ""}`} onClick={() => switchTab("reviews")}>
            <Star size={18} /> Review Moderation
          </button>
          <button className={`admin-nav-item ${activeTab === "offers" ? "active" : ""}`} onClick={() => switchTab("offers")}>
            <Tag size={18} /> Promotions & Offers
          </button>
          <button className={`admin-nav-item ${activeTab === "customers" ? "active" : ""}`} onClick={() => switchTab("customers")}>
            <Users size={18} /> Customers
          </button>
          <button className={`admin-nav-item ${activeTab === "payments" ? "active" : ""}`} onClick={() => switchTab("payments")}>
            <CreditCard size={18} /> Payments Ledger
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <a href="/" className="admin-back-btn">
            <ArrowLeft size={14} /> Back to Storefront
          </a>
          <div className="admin-user-pill">
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.email}</span>
            <button className="admin-logout-btn" onClick={handleLogout} title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <h1>
            {activeTab === "dashboard" && "Platform Operations Overview"}
            {activeTab === "orders" && "Orders & Order Fulfillment"}
            {activeTab === "products" && "Product Catalog Management"}
            {activeTab === "vendors" && "Marketplace Vendors & Partner Network"}
            {activeTab === "categories" && "Category Taxonomy"}
            {activeTab === "inventory" && "Warehouses & Inventory Distribution"}
            {activeTab === "returns" && "Customer Returns & Refund Processing"}
            {activeTab === "reviews" && "Review Moderation Queue"}
            {activeTab === "offers" && "Promotions & Discount Campaigns"}
            {activeTab === "customers" && "Customer Account Registry"}
            {activeTab === "payments" && "Financial Ledger & Payment Transactions"}
          </h1>
          <div className="admin-topbar-actions">
            <button
              className="admin-btn-secondary"
              onClick={() => {
                if (activeTab === "dashboard") void loadDashboard();
                else if (activeTab === "orders") void loadOrders();
                else if (activeTab === "products") void loadProducts();
                else if (activeTab === "vendors") void loadVendors();
                else if (activeTab === "categories") void loadCategories();
                else if (activeTab === "inventory") void loadInventory();
                else if (activeTab === "returns") void loadReturns();
                else if (activeTab === "reviews") void loadReviews();
                else if (activeTab === "offers") void loadOffers();
                else if (activeTab === "customers") void loadCustomers();
                else if (activeTab === "payments") void loadPayments();
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </header>

        <div className="admin-body">
          {feedback && (
            <div className={`admin-feedback-msg ${feedback.type === "success" ? "msg-success" : "msg-error"}`}>
              {feedback.text}
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && overview && (
            <div>
              <div className="admin-kpi-grid">
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">Total Orders</div>
                  <div className="admin-kpi-value">{overview.orders?.total ?? 0}</div>
                  <div className="admin-kpi-subtext">Pending: {overview.orders?.pending ?? 0} | Delivered: {overview.orders?.delivered ?? 0}</div>
                </div>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">Active Catalog Products</div>
                  <div className="admin-kpi-value">{overview.products ?? 0}</div>
                  <div className="admin-kpi-subtext">Published and purchasable</div>
                </div>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">Customer Accounts</div>
                  <div className="admin-kpi-value">{overview.customers ?? 0}</div>
                  <div className="admin-kpi-subtext">Registered buyers</div>
                </div>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">Warehouse Inventory</div>
                  <div className="admin-kpi-value">{overview.inventory?.quantity ?? 0}</div>
                  <div className="admin-kpi-subtext">Reserved for orders: {overview.inventory?.reserved ?? 0}</div>
                </div>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">Average Order Value</div>
                  <div className="admin-kpi-value">${overview.averageOrderValue?.toFixed(2) ?? "0.00"}</div>
                  <div className="admin-kpi-subtext">Across completed orders</div>
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Daily Sales Trend (Last 30 Days)</h3>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Orders Placed</th>
                        <th>Gross Order Value (by Currency)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.length === 0 ? (
                        <tr><td colSpan={3} style={{ textAlign: "center" }}>No sales activity in this window.</td></tr>
                      ) : (
                        salesData.slice(-10).reverse().map((day) => (
                          <tr key={day.date}>
                            <td><strong>{day.date}</strong></td>
                            <td>{day.orders}</td>
                            <td>
                              {Object.entries(day.grossOrderValueByCurrency).map(([curr, val]) => (
                                <span key={curr} style={{ marginRight: "12px", fontFamily: "monospace" }}>
                                  {curr} {Number(val).toFixed(2)}
                                </span>
                              ))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Top Selling Products</h3>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Units Sold</th>
                        <th>Gross Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: "center" }}>No sales recorded yet.</td></tr>
                      ) : (
                        topProducts.map((p) => (
                          <tr key={p.productId}>
                            <td><strong>{p.name}</strong></td>
                            <td><code>{p.sku}</code></td>
                            <td>{p.unitsSold}</td>
                            <td style={{ fontFamily: "monospace" }}>${p.grossSales.toFixed(2)}</td>
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
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">All Customer Orders ({orders.length})</h3>
                  <div className="admin-card-tools">
                    <input
                      className="admin-search-input"
                      placeholder="Search order #, customer, city..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                    <select
                      className="admin-select"
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Placed Date</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Order Status</th>
                        <th>Shipment</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr><td colSpan={8} className="admin-empty">No orders found matching criteria.</td></tr>
                      ) : (
                        orders.map((o) => (
                          <tr key={o.id}>
                            <td><strong>{o.orderNumber}</strong></td>
                            <td>{new Date(o.placedAt).toLocaleDateString()}</td>
                            <td>
                              <div>{o.customer?.firstName} {o.customer?.lastName}</div>
                              <small style={{ color: "#64748b" }}>{o.customer?.email}</small>
                            </td>
                            <td>{o.itemCount} items</td>
                            <td><strong>{o.currency} {o.total.toFixed(2)}</strong></td>
                            <td>
                              <span className={`admin-badge badge-${o.status.toLowerCase()}`}>
                                {o.status}
                              </span>
                            </td>
                            <td>
                              {o.shipments?.[0] ? (
                                <span className={`admin-badge badge-${o.shipments[0].status.toLowerCase()}`}>
                                  {o.shipments[0].carrier || "Carrier"}: {o.shipments[0].status}
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "11px" }}>Unshipped</span>
                              )}
                            </td>
                            <td>
                              <button
                                className="admin-btn-secondary admin-btn-sm"
                                onClick={() => void openOrderDetail(o.id)}
                              >
                                <Eye size={13} /> View
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

          {/* PRODUCTS TAB */}
          {activeTab === "products" && (
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Catalog Inventory ({products.length})</h3>
                  <div className="admin-card-tools">
                    <input
                      className="admin-search-input"
                      placeholder="Search name, SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                    <select
                      className="admin-select"
                      value={productStatusFilter}
                      onChange={(e) => setProductStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                    <button
                      className="admin-btn-primary"
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({
                          sku: `SKU-${Date.now().toString().slice(-6)}`,
                          name: "",
                          slug: "",
                          description: "",
                          brand: "",
                          price: 19.99,
                          currency: "USD",
                          categoryId: categories[0]?.id || "",
                          vendorId: "",
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
                      <Plus size={14} /> New Product
                    </button>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: "54px" }}>Image</th>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Vendor</th>
                        <th>Price</th>
                        <th>Stock Available</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr><td colSpan={9} className="admin-empty">No products found.</td></tr>
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
                                  className="admin-table-thumb"
                                  fallbackName={p.name}
                                />
                              </td>
                              <td><code>{p.sku}</code></td>
                              <td>
                                <strong>{p.name}</strong>
                                {angleCount > 1 && (
                                  <span className="admin-badge badge-info" style={{ marginLeft: "8px", fontSize: "10px" }}>
                                    {angleCount} Angles
                                  </span>
                                )}
                              </td>
                              <td>{p.category?.name || "Uncategorized"}</td>
                              <td>
                                <span className="admin-badge" style={{ background: p.vendor ? "#f1f5f9" : "#ecfdf5", color: p.vendor ? "#334155" : "#047857" }}>
                                  {p.vendor?.name || "Direct (In-House)"}
                                </span>
                              </td>
                              <td>{p.currency} {Number(p.price).toFixed(2)}</td>
                              <td>
                                <span style={{ fontWeight: 600, color: totalAvailable <= 5 ? "#dc2626" : "#166534" }}>
                                  {totalAvailable} units
                                </span>
                              </td>
                              <td>
                                <span className={`admin-badge badge-${p.status.toLowerCase()}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="admin-btn-secondary admin-btn-sm"
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
                                      vendorId: p.vendorId || p.vendor?.id || "",
                                      status: p.status,
                                      imageUrl: sortedImages[0]?.url || "",
                                      image1: sortedImages.find((i) => i.position === 0)?.url || sortedImages[0]?.url || "",
                                      image2: sortedImages.find((i) => i.position === 1)?.url || sortedImages[1]?.url || "",
                                      image3: sortedImages.find((i) => i.position === 2)?.url || sortedImages[2]?.url || "",
                                      image4: sortedImages.find((i) => i.position === 3)?.url || sortedImages[3]?.url || "",
                                      initialQuantity: p.inventory?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0,
                                      warehouseId: warehouses[0]?.id || ""
                                    });
                                    setShowProductModal(true);
                                  }}
                                >
                                  Edit
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

          {/* VENDORS TAB */}
          {activeTab === "vendors" && (
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h3 className="admin-card-title">Registered Marketplace Vendors ({vendors.length})</h3>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                      Manage independent vendors, marketplace partners, onboarding status, and catalog allocations.
                    </p>
                  </div>
                  <div className="admin-card-tools">
                    <input
                      className="admin-search-input"
                      placeholder="Search vendor name, email..."
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                    />
                    <button
                      className="admin-btn-primary"
                      onClick={() => {
                        setVendorForm({ name: "", email: "", phone: "", isActive: true });
                        setShowVendorModal(true);
                      }}
                    >
                      <Plus size={14} /> Register Vendor
                    </button>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>Business Email</th>
                        <th>Phone</th>
                        <th>Catalog Items</th>
                        <th>Fulfillment Network</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.filter((v) =>
                        !vendorSearch.trim() ||
                        v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                        (v.email && v.email.toLowerCase().includes(vendorSearch.toLowerCase()))
                      ).length === 0 ? (
                        <tr><td colSpan={7} className="admin-empty">No marketplace vendors found.</td></tr>
                      ) : (
                        vendors
                          .filter((v) =>
                            !vendorSearch.trim() ||
                            v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                            (v.email && v.email.toLowerCase().includes(vendorSearch.toLowerCase()))
                          )
                          .map((v) => (
                            <tr key={v.id}>
                              <td>
                                <strong>{v.name}</strong>
                                <div style={{ fontSize: "11px", color: "#64748b" }}>ID: <code>{v.id.slice(0, 8)}...</code></div>
                              </td>
                              <td>{v.email || <span style={{ color: "#94a3b8" }}>No email</span>}</td>
                              <td>{v.phone || <span style={{ color: "#94a3b8" }}>No phone</span>}</td>
                              <td>
                                <span className="admin-badge badge-info">
                                  {v._count?.products ?? 0} products
                                </span>
                              </td>
                              <td>
                                <span style={{ fontSize: "12px", color: "#475569" }}>
                                  Global Distribution
                                </span>
                              </td>
                              <td>
                                <span className={`admin-badge ${v.isActive ? "badge-delivered" : "badge-cancelled"}`}>
                                  {v.isActive ? "ACTIVE" : "INACTIVE"}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="admin-btn-secondary admin-btn-sm"
                                  onClick={() => void handleToggleVendorStatus(v.id, v.isActive)}
                                >
                                  {v.isActive ? "Deactivate" : "Activate"}
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

          {/* CATEGORIES TAB */}
          {activeTab === "categories" && (
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Category Hierarchy</h3>
                  <div className="admin-card-tools">
                    <button
                      className="admin-btn-primary"
                      onClick={() => {
                        setCategoryForm({ name: "", slug: "", description: "", parentId: "", isActive: true });
                        setShowCategoryModal(true);
                      }}
                    >
                      <Plus size={14} /> New Category
                    </button>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Category Name</th>
                        <th>Slug</th>
                        <th>Description</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.name}</strong></td>
                          <td><code>{c.slug}</code></td>
                          <td>{c.description || "—"}</td>
                          <td>
                            <span className={`admin-badge ${c.isActive ? "badge-active" : "badge-archived"}`}>
                              {c.isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === "inventory" && (
            <div>
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <button
                  className="admin-btn-primary"
                  onClick={() => {
                    setAdjustForm({
                      productId: products[0]?.id || "",
                      warehouseId: warehouses[0]?.id || "",
                      delta: 10
                    });
                    setShowAdjustModal(true);
                  }}
                >
                  <Plus size={14} /> Adjust Stock
                </button>
                <button
                  className="admin-btn-secondary"
                  onClick={() => {
                    setWarehouseForm({ code: "", name: "", countryCode: "US", region: "", city: "", isActive: true });
                    setShowWarehouseModal(true);
                  }}
                >
                  <Warehouse size={14} /> Add Warehouse
                </button>
              </div>

              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Stock Levels Across Warehouses</h3>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Warehouse</th>
                        <th>Total Quantity</th>
                        <th>Reserved</th>
                        <th>Available</th>
                        <th>Reorder Level</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryRows.length === 0 ? (
                        <tr><td colSpan={8} className="admin-empty">No inventory records available.</td></tr>
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
                            <td>
                              {inv.lowStock ? (
                                <span className="admin-badge badge-cancelled">
                                  <AlertTriangle size={11} style={{ marginRight: "3px" }} /> LOW STOCK
                                </span>
                              ) : (
                                <span className="admin-badge badge-active">OK</span>
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

          {/* RETURNS TAB */}
          {activeTab === "returns" && (
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Return Requests ({returns.length})</h3>
                  <div className="admin-card-tools">
                    <select
                      className="admin-select"
                      value={returnStatusFilter}
                      onChange={(e) => setReturnStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="REQUESTED">REQUESTED</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="RECEIVED">RECEIVED</option>
                      <option value="REFUNDED">REFUNDED</option>
                      <option value="REJECTED">REJECTED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Return #</th>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returns.length === 0 ? (
                        <tr><td colSpan={6} className="admin-empty">No returns found.</td></tr>
                      ) : (
                        returns.map((r) => (
                          <tr key={r.id}>
                            <td><strong>{r.returnNumber}</strong></td>
                            <td>{r.order?.orderNumber}</td>
                            <td>{r.user?.firstName} {r.user?.lastName} ({r.user?.email})</td>
                            <td>{r.reason}</td>
                            <td>
                              <span className={`admin-badge badge-${r.status.toLowerCase()}`}>
                                {r.status}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "6px" }}>
                                {r.status === "REQUESTED" && (
                                  <>
                                    <button
                                      className="admin-btn-primary admin-btn-sm"
                                      onClick={() => void handleUpdateReturnStatus(r.id, "APPROVED")}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      className="admin-btn-danger admin-btn-sm"
                                      onClick={() => void handleUpdateReturnStatus(r.id, "REJECTED")}
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {r.status === "APPROVED" && (
                                  <button
                                    className="admin-btn-secondary admin-btn-sm"
                                    onClick={() => void handleUpdateReturnStatus(r.id, "RECEIVED")}
                                  >
                                    Mark Received
                                  </button>
                                )}
                                {r.status === "RECEIVED" && (!r.refunds || r.refunds.length === 0) && (
                                  <button
                                    className="admin-btn-primary admin-btn-sm"
                                    onClick={() => void handleRefundReturn(r.id)}
                                  >
                                    Issue Refund
                                  </button>
                                )}
                                {["APPROVED", "RECEIVED", "REJECTED"].includes(r.status) && (
                                  <button
                                    className="admin-btn-secondary admin-btn-sm"
                                    onClick={() => void handleUpdateReturnStatus(r.id, "CLOSED")}
                                  >
                                    Close
                                  </button>
                                )}
                              </div>
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

          {/* REVIEWS TAB */}
          {activeTab === "reviews" && (
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Pending Moderation Queue ({pendingReviews.length})</h3>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Customer</th>
                        <th>Rating</th>
                        <th>Review Title & Comment</th>
                        <th>Submitted At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingReviews.length === 0 ? (
                        <tr><td colSpan={6} className="admin-empty">No reviews waiting for moderation. Good job!</td></tr>
                      ) : (
                        pendingReviews.map((rev) => (
                          <tr key={rev.id}>
                            <td><strong>{rev.product?.name}</strong></td>
                            <td>{rev.user?.firstName} {rev.user?.lastName}</td>
                            <td>
                              <span style={{ color: "#d97706", fontWeight: 700 }}>★ {rev.rating}</span>
                            </td>
                            <td>
                              <strong>{rev.title || "Untitled"}</strong>
                              <p style={{ margin: "4px 0 0", color: "#475569" }}>{rev.comment}</p>
                            </td>
                            <td>{new Date(rev.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  className="admin-btn-primary admin-btn-sm"
                                  onClick={() => void handleModerateReview(rev.id, "APPROVED")}
                                >
                                  <CheckCircle size={13} /> Approve
                                </button>
                                <button
                                  className="admin-btn-danger admin-btn-sm"
                                  onClick={() => void handleModerateReview(rev.id, "REJECTED")}
                                >
                                  <XCircle size={13} /> Reject
                                </button>
                              </div>
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

          {/* OFFERS TAB */}
          {activeTab === "offers" && (
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Promotions & Discount Codes ({offers.length})</h3>
                  <div className="admin-card-tools">
                    <button
                      className="admin-btn-primary"
                      onClick={() => setShowOfferModal(true)}
                    >
                      <Plus size={14} /> New Promotion
                    </button>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Promo Code</th>
                        <th>Title</th>
                        <th>Discount Type</th>
                        <th>Discount Value</th>
                        <th>Min Order Subtotal</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.length === 0 ? (
                        <tr><td colSpan={6} className="admin-empty">No active promotions.</td></tr>
                      ) : (
                        offers.map((off) => (
                          <tr key={off.id}>
                            <td><code>{off.code}</code></td>
                            <td><strong>{off.title}</strong></td>
                            <td>{off.discountType}</td>
                            <td>
                              {off.discountType === "PERCENTAGE" ? `${off.discountValue}%` : `$${off.discountValue}`}
                            </td>
                            <td>${Number(off.minOrderSubtotal).toFixed(2)}</td>
                            <td>
                              <span className={`admin-badge badge-${off.status.toLowerCase()}`}>
                                {off.status}
                              </span>
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

          {/* CUSTOMERS TAB */}
          {activeTab === "customers" && (
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Registered Accounts ({customers.length})</h3>
                  <div className="admin-card-tools">
                    <input
                      className="admin-search-input"
                      placeholder="Search name, email..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Orders Count</th>
                        <th>Total Spend</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.firstName} {c.lastName}</strong></td>
                          <td>{c.email}</td>
                          <td><code>{c.role}</code></td>
                          <td>{c.orderCount}</td>
                          <td>${Number(c.totalSpend).toFixed(2)}</td>
                          <td>
                            <span className={`admin-badge ${c.isActive ? "badge-active" : "badge-archived"}`}>
                              {c.isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td>
                            {c.id !== currentUser.id && (
                              <button
                                className={`admin-btn-sm ${c.isActive ? "admin-btn-danger" : "admin-btn-primary"}`}
                                onClick={() => void handleToggleCustomer(c.id, c.isActive)}
                              >
                                {c.isActive ? "Deactivate" : "Activate"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === "payments" && (
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Payment Transaction Ledger ({payments.length})</h3>
                  <div className="admin-card-tools">
                    <select
                      className="admin-select"
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="PENDING">PENDING</option>
                      <option value="CAPTURED">CAPTURED</option>
                      <option value="FAILED">FAILED</option>
                      <option value="REFUNDED">REFUNDED</option>
                      <option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</option>
                    </select>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Payment Method</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Provider Ref</th>
                        <th>Simulated</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr><td colSpan={8} className="admin-empty">No payments recorded.</td></tr>
                      ) : (
                        payments.map((p) => (
                          <tr key={p.id}>
                            <td><strong>{p.orderNumber}</strong></td>
                            <td>{p.customer?.email}</td>
                            <td><code>{p.method}</code></td>
                            <td><strong>{p.currency} {Number(p.amount).toFixed(2)}</strong></td>
                            <td>
                              <span className={`admin-badge badge-${p.status.toLowerCase()}`}>
                                {p.status}
                              </span>
                            </td>
                            <td><small>{p.providerReference || "None"}</small></td>
                            <td>{p.simulated ? "Yes" : "No"}</td>
                            <td>{new Date(p.createdAt).toLocaleString()}</td>
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

      {/* ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="admin-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelectedOrder(null); }}>
          <div className="admin-modal" style={{ maxWidth: "750px" }}>
            <div className="admin-modal-header">
              <h2>Order #{selectedOrder.orderNumber}</h2>
              <button className="admin-btn-secondary admin-btn-sm" onClick={() => setSelectedOrder(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="admin-modal-body">
              {orderLoading ? (
                <p>Loading order details...</p>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <h4 style={{ margin: "0 0 6px", color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Customer</h4>
                      <p style={{ margin: 0 }}><strong>{selectedOrder.user?.firstName} {selectedOrder.user?.lastName}</strong></p>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>{selectedOrder.user?.email}</p>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>{selectedOrder.user?.phone || "No phone"}</p>
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 6px", color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Shipping Address</h4>
                      <p style={{ margin: 0 }}>{selectedOrder.shippingRecipient}</p>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>{selectedOrder.shippingLine1} {selectedOrder.shippingLine2}</p>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>{selectedOrder.shippingCity}, {selectedOrder.shippingRegion} {selectedOrder.shippingPostalCode}</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <h4 style={{ margin: "0 0 8px", color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Order Status</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span className={`admin-badge badge-${selectedOrder.status.toLowerCase()}`}>
                        Current: {selectedOrder.status}
                      </span>
                      <select
                        className="admin-select"
                        value={selectedOrder.status}
                        onChange={(e) => void handleUpdateOrderStatus(selectedOrder.id, e.target.value)}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                  </div>

                  {/* Line Items */}
                  <h4 style={{ margin: "0 0 8px", color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Purchased Items</h4>
                  <table className="admin-table" style={{ marginBottom: "20px" }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>SKU</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((it) => (
                        <tr key={it.id}>
                          <td><strong>{it.productName}</strong></td>
                          <td><code>{it.sku}</code></td>
                          <td>{it.quantity}</td>
                          <td>${Number(it.unitPrice).toFixed(2)}</td>
                          <td>${Number(it.lineTotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Shipments & Delivery Tracking Stepper */}
                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h4 style={{ margin: 0, color: "#64748b", fontSize: "11px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Truck size={14} /> End-to-End Fulfillment & Delivery Tracking
                      </h4>
                      {selectedOrder.shipments?.[0] && (
                        <span className={`admin-badge badge-${selectedOrder.shipments[0].status.toLowerCase()}`}>
                          Live Stage: {selectedOrder.shipments[0].status.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>

                    {selectedOrder.shipments && selectedOrder.shipments.length > 0 ? (
                      selectedOrder.shipments.map((shp) => {
                        const stages = [
                          { key: "PREPARING", label: "Preparing in Warehouse", next: "DISPATCHED", nextLabel: "Mark Dispatched" },
                          { key: "DISPATCHED", label: "Dispatched to Carrier", next: "IN_TRANSIT", nextLabel: "In Transit" },
                          { key: "IN_TRANSIT", label: "In Transit Between Hubs", next: "OUT_FOR_DELIVERY", nextLabel: "Out for Delivery" },
                          { key: "OUT_FOR_DELIVERY", label: "Out for Final Delivery", next: "DELIVERED", nextLabel: "Confirm Delivered" },
                          { key: "DELIVERED", label: "Delivered to Customer", next: null, nextLabel: null }
                        ];
                        const currentIdx = stages.findIndex((s) => s.key === shp.status);
                        const currentStageObj = stages[currentIdx] || null;

                        return (
                          <div key={shp.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px", borderRadius: "8px", marginBottom: "12px" }}>
                            {/* Metadata Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                              <div>
                                <strong>Carrier:</strong> {shp.carrier || "Standard Courier"} &nbsp;|&nbsp;
                                <strong>Tracking #:</strong> <code>{shp.trackingNumber || "Pending generation"}</code>
                              </div>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                {currentStageObj?.next && (
                                  <button
                                    type="button"
                                    className="admin-btn-primary admin-btn-sm"
                                    onClick={() => void handleProgressShipment(shp.id, currentStageObj.next!)}
                                  >
                                    <CheckCircle size={14} /> Advance: {currentStageObj.nextLabel}
                                  </button>
                                )}
                                {shp.status === "DELIVERED" && (
                                  <span style={{ fontSize: "12px", color: "#166534", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                                    <CheckCircle size={14} /> Completed & Confirmed
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Visual Progress Stepper */}
                            <div className="delivery-stepper-container" style={{ margin: "16px 0 8px" }}>
                              <div className="delivery-stepper" style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                                {stages.map((stage, sIdx) => {
                                  const isPast = currentIdx > sIdx;
                                  const isCurrent = currentIdx === sIdx;
                                  return (
                                    <div
                                      key={stage.key}
                                      style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        textAlign: "center",
                                        position: "relative"
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: "30px",
                                          height: "30px",
                                          borderRadius: "50%",
                                          background: isPast ? "#10b981" : isCurrent ? "#2563eb" : "#e2e8f0",
                                          color: isPast || isCurrent ? "#ffffff" : "#64748b",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontWeight: 700,
                                          fontSize: "12px",
                                          boxShadow: isCurrent ? "0 0 0 4px rgba(37, 99, 235, 0.2)" : "none",
                                          transition: "all 0.2s"
                                        }}
                                      >
                                        {isPast ? "✓" : sIdx + 1}
                                      </div>
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          marginTop: "6px",
                                          fontWeight: isCurrent ? 700 : 500,
                                          color: isCurrent ? "#1e293b" : isPast ? "#047857" : "#94a3b8"
                                        }}
                                      >
                                        {stage.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div>
                        {["CONFIRMED", "PROCESSING"].includes(selectedOrder.status) ? (
                          <form onSubmit={handleCreateShipment} style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", background: "#f8fafc", padding: "12px", borderRadius: "6px" }}>
                            <select
                              className="admin-select"
                              value={shipmentCarrier}
                              onChange={(e) => setShipmentCarrier(e.target.value)}
                            >
                              <option value="FedEx">FedEx Express</option>
                              <option value="UPS">UPS Worldwide</option>
                              <option value="DHL">DHL Global</option>
                              <option value="USPS">USPS Priority</option>
                            </select>
                            <input
                              className="admin-search-input"
                              placeholder="Carrier Tracking # (e.g. TRK-99214)"
                              value={shipmentTracking}
                              onChange={(e) => setShipmentTracking(e.target.value)}
                              style={{ flex: 1, minWidth: "180px" }}
                            />
                            <button type="submit" className="admin-btn-primary" disabled={shipmentBusy}>
                              <Truck size={14} /> Dispatch & Initialize Tracking
                            </button>
                          </form>
                        ) : (
                          <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>
                            Shipments can only be created once an order is CONFIRMED or PROCESSING.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE/EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="admin-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowProductModal(false); }}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>{editingProduct ? "Edit Product" : "Create New Product"}</h2>
              <button className="admin-btn-secondary admin-btn-sm" onClick={() => setShowProductModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="admin-modal-body">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>SKU</label>
                    <input
                      required
                      disabled={!!editingProduct}
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Slug</label>
                    <input
                      required
                      disabled={!!editingProduct}
                      value={productForm.slug}
                      onChange={(e) => setProductForm({ ...productForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label>Product Name</label>
                  <input
                    required
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
                <div className="admin-form-group">
                  <label>Description</label>
                  <textarea
                    required
                    rows={3}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Brand (Optional)</label>
                    <input
                      value={productForm.brand}
                      onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Category</label>
                    <select
                      required
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
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Status</label>
                    <select
                      value={productForm.status}
                      onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Vendor Partner / Seller</label>
                  <select
                    value={productForm.vendorId}
                    onChange={(e) => setProductForm({ ...productForm, vendorId: e.target.value })}
                  >
                    <option value="">GlobalCart Direct (In-House)</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {!v.isActive ? "(Inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingProduct && (
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Initial Stock Quantity</label>
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        value={productForm.initialQuantity}
                        onChange={(e) => setProductForm({ ...productForm, initialQuantity: parseInt(e.target.value, 10) || 0 })}
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Stocking Warehouse</label>
                      <select
                        value={productForm.warehouseId}
                        onChange={(e) => setProductForm({ ...productForm, warehouseId: e.target.value })}
                      >
                        <option value="">Select Warehouse (Optional)</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.code} - {w.city}, {w.countryCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* 4-Angle Photography Studio Section */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", background: "#f8fafc", margin: "16px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Camera size={16} /> 4-Angle Photography Studio
                      </h4>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                        Provide 4 distinct photographic angles (Front, Side, Lifestyle, Detail Macro).
                      </p>
                    </div>
                    <button
                      type="button"
                      className="admin-btn-secondary admin-btn-sm"
                      onClick={() => {
                        setProductForm({
                          ...productForm,
                          imageUrl: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80",
                          image1: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80",
                          image2: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
                          image3: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=800&q=80",
                          image4: "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80"
                        });
                      }}
                    >
                      Fill Sample Studio Photos
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" }}>
                    {/* Angle 1 */}
                    <div style={{ background: "#ffffff", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", marginBottom: "4px" }}>
                        Angle 1: Front / Hero View *
                      </label>
                      <input
                        type="url"
                        placeholder="https://... (Front View)"
                        value={productForm.image1}
                        onChange={(e) => setProductForm({ ...productForm, image1: e.target.value, imageUrl: e.target.value })}
                        style={{ width: "100%", boxSizing: "border-box", fontSize: "12px", padding: "6px 8px" }}
                      />
                      <div style={{ marginTop: "8px", height: "70px", background: "#f1f5f9", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {productForm.image1 ? (
                          <ProductImg src={productForm.image1} alt="Front Hero" style={{ width: "100%", height: "100%", objectFit: "contain" }} fallbackName={productForm.name || "Angle 1"} />
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>No image set</span>
                        )}
                      </div>
                    </div>

                    {/* Angle 2 */}
                    <div style={{ background: "#ffffff", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", marginBottom: "4px" }}>
                        Angle 2: Side Profile View
                      </label>
                      <input
                        type="url"
                        placeholder="https://... (Side Profile)"
                        value={productForm.image2}
                        onChange={(e) => setProductForm({ ...productForm, image2: e.target.value })}
                        style={{ width: "100%", boxSizing: "border-box", fontSize: "12px", padding: "6px 8px" }}
                      />
                      <div style={{ marginTop: "8px", height: "70px", background: "#f1f5f9", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {productForm.image2 ? (
                          <ProductImg src={productForm.image2} alt="Side Profile" style={{ width: "100%", height: "100%", objectFit: "contain" }} fallbackName={productForm.name || "Angle 2"} />
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>No image set</span>
                        )}
                      </div>
                    </div>

                    {/* Angle 3 */}
                    <div style={{ background: "#ffffff", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", marginBottom: "4px" }}>
                        Angle 3: Lifestyle / In-Context
                      </label>
                      <input
                        type="url"
                        placeholder="https://... (Lifestyle Setup)"
                        value={productForm.image3}
                        onChange={(e) => setProductForm({ ...productForm, image3: e.target.value })}
                        style={{ width: "100%", boxSizing: "border-box", fontSize: "12px", padding: "6px 8px" }}
                      />
                      <div style={{ marginTop: "8px", height: "70px", background: "#f1f5f9", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {productForm.image3 ? (
                          <ProductImg src={productForm.image3} alt="Lifestyle" style={{ width: "100%", height: "100%", objectFit: "contain" }} fallbackName={productForm.name || "Angle 3"} />
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>No image set</span>
                        )}
                      </div>
                    </div>

                    {/* Angle 4 */}
                    <div style={{ background: "#ffffff", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", marginBottom: "4px" }}>
                        Angle 4: Detail / Macro View
                      </label>
                      <input
                        type="url"
                        placeholder="https://... (Detail Close-up)"
                        value={productForm.image4}
                        onChange={(e) => setProductForm({ ...productForm, image4: e.target.value })}
                        style={{ width: "100%", boxSizing: "border-box", fontSize: "12px", padding: "6px 8px" }}
                      />
                      <div style={{ marginTop: "8px", height: "70px", background: "#f1f5f9", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {productForm.image4 ? (
                          <ProductImg src={productForm.image4} alt="Detail Macro" style={{ width: "100%", height: "100%", objectFit: "contain" }} fallbackName={productForm.name || "Angle 4"} />
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>No image set</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={() => setShowProductModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  {editingProduct ? "Save Changes" : "Create Product with 4 Angles"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER VENDOR MODAL */}
      {showVendorModal && (
        <div className="admin-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowVendorModal(false); }}>
          <div className="admin-modal" style={{ maxWidth: "520px" }}>
            <div className="admin-modal-header">
              <h2>Register New Marketplace Vendor</h2>
              <button className="admin-btn-secondary admin-btn-sm" onClick={() => setShowVendorModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveVendor}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label>Vendor / Company Name *</label>
                  <input
                    required
                    placeholder="e.g. Apex Audio Tech"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Business Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="vendor@company.com"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  />
                </div>
                <div className="admin-form-group" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                  <input
                    type="checkbox"
                    id="adminVendorActive"
                    checked={vendorForm.isActive}
                    onChange={(e) => setVendorForm({ ...vendorForm, isActive: e.target.checked })}
                  />
                  <label htmlFor="adminVendorActive" style={{ margin: 0, cursor: "pointer", fontSize: "13px" }}>
                    Active and authorized to sell on GlobalCart marketplace
                  </label>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={() => setShowVendorModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  Register Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="admin-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowCategoryModal(false); }}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Create New Category</h2>
              <button className="admin-btn-secondary admin-btn-sm" onClick={() => setShowCategoryModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label>Category Name</label>
                  <input
                    required
                    value={categoryForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCategoryForm({
                        ...categoryForm,
                        name,
                        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                      });
                    }}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Slug</label>
                  <input
                    required
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Parent Category (Optional)</label>
                  <select
                    value={categoryForm.parentId}
                    onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })}
                  >
                    <option value="">None (Top-level)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Description</label>
                  <textarea
                    rows={2}
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST INVENTORY MODAL */}
      {showAdjustModal && (
        <div className="admin-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowAdjustModal(false); }}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Adjust Warehouse Stock</h2>
              <button className="admin-btn-secondary admin-btn-sm" onClick={() => setShowAdjustModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdjustInventory}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label>Product</label>
                  <select
                    required
                    value={adjustForm.productId}
                    onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Warehouse</label>
                  <select
                    required
                    value={adjustForm.warehouseId}
                    onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Stock Delta (Use negative to decrease, positive to increase)</label>
                  <input
                    type="number"
                    required
                    value={adjustForm.delta}
                    onChange={(e) => setAdjustForm({ ...adjustForm, delta: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE WAREHOUSE MODAL */}
      {showWarehouseModal && (
        <div className="admin-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowWarehouseModal(false); }}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Add New Warehouse</h2>
              <button className="admin-btn-secondary admin-btn-sm" onClick={() => setShowWarehouseModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse}>
              <div className="admin-modal-body">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Warehouse Code</label>
                    <input
                      required
                      placeholder="e.g. WH-EAST-01"
                      value={warehouseForm.code}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Name</label>
                    <input
                      required
                      placeholder="e.g. East Coast Hub"
                      value={warehouseForm.name}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>City</label>
                    <input
                      required
                      placeholder="e.g. Newark"
                      value={warehouseForm.city}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Country Code</label>
                    <input
                      required
                      maxLength={2}
                      placeholder="US"
                      value={warehouseForm.countryCode}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, countryCode: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={() => setShowWarehouseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE OFFER MODAL */}
      {showOfferModal && (
        <div className="admin-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowOfferModal(false); }}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Create Promotional Offer</h2>
              <button className="admin-btn-secondary admin-btn-sm" onClick={() => setShowOfferModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateOffer}>
              <div className="admin-modal-body">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Promo Code</label>
                    <input
                      required
                      placeholder="SUMMER25"
                      value={offerForm.code}
                      onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Title</label>
                    <input
                      required
                      placeholder="Summer Savings 25% Off"
                      value={offerForm.title}
                      onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Discount Type</label>
                    <select
                      value={offerForm.discountType}
                      onChange={(e) => setOfferForm({ ...offerForm, discountType: e.target.value })}
                    >
                      <option value="PERCENTAGE">PERCENTAGE</option>
                      <option value="FIXED_AMOUNT">FIXED AMOUNT ($)</option>
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Discount Value</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={offerForm.discountValue}
                      onChange={(e) => setOfferForm({ ...offerForm, discountValue: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Min Order Subtotal ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={offerForm.minOrderSubtotal}
                      onChange={(e) => setOfferForm({ ...offerForm, minOrderSubtotal: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Status</label>
                    <select
                      value={offerForm.status}
                      onChange={(e) => setOfferForm({ ...offerForm, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={() => setShowOfferModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  Launch Promo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
