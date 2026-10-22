import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft, CheckCircle2, ClipboardList, MapPin, X,
  Truck, RotateCcw, Sparkles, Tag, Percent, Award
} from "lucide-react";
import { api, getApiErrorMessage } from "./lib/api";
import ProductImg from "./ProductImg";
import { getProductThumbnail } from "./lib/productImages";

type Address = {
  id: string;
  label?: string | null;
  recipient: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
};

type AddressForm = Omit<Address, "id" | "isDefault"> & { label: string };

type LoyaltyAccount = {
  id: string;
  pointsBalance: number;
  tier: string;
  createdAt?: string;
  updatedAt?: string;
};

type LoyaltyTransaction = {
  id: string;
  type: string;
  points: number;
  reason?: string | null;
  createdAt: string;
};

type Offer = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discountType: string;
  discountValue: string | number;
  minimumSpend?: string | number | null;
};

type OrderItem = {
  id?: string;
  productName: string;
  sku: string;
  unitPrice: string | number;
  quantity: number;
  lineTotal: string | number;
  product?: { images?: { url: string; altText?: string | null }[] };
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  subtotal: string | number;
  tax: string | number;
  shippingCost: string | number;
  discount: string | number;
  total: string | number;
  placedAt: string;
  items: OrderItem[];
  payments: {
    method: string;
    status: string;
    amount: string | number;
    currency: string;
    simulated: boolean;
  }[];
};

type Shipment = {
  id: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  status: string;
  shippedAt?: string | null;
  estimatedDelivery?: string | null;
  deliveredAt?: string | null;
};

type ReturnRequest = {
  id: string;
  returnNumber: string;
  orderId: string;
  status: string;
  reason: string;
  requestedAt: string;
  resolvedAt?: string | null;
  items: {
    id: string;
    quantity: number;
    reason?: string | null;
    orderItem: {
      productName: string;
      unitPrice: string | number;
    };
  }[];
  refunds: {
    id: string;
    amount: string | number;
    reference?: string | null;
  }[];
};

type CheckoutResult = {
  message: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    currency: string;
    subtotal: string | number;
    tax: string | number;
    shippingCost: string | number;
    discount: string | number;
    total: string | number;
    items: OrderItem[];
  };
  payment: {
    id: string;
    method: string;
    status: string;
    amount: string | number;
    currency: string;
    simulated: boolean;
  };
  loyalty?: {
    pointsRedeemed: number;
    discountAmount: number;
    pointsEarned: number;
  };
};

type Props = {
  mode: "checkout" | "orders";
  onClose: () => void;
  onCompleted: () => void;
};

const emptyAddress: AddressForm = {
  label: "Shipping",
  recipient: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  countryCode: "IN",
};

function money(value: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default function CustomerCommerceDialog({ mode, onClose, onCompleted }: Props) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("new");
  const [address, setAddress] = useState<AddressForm>(emptyAddress);
  const [paymentMethod, setPaymentMethod] = useState<"SIMULATED_CARD" | "COD">("SIMULATED_CARD");
  const [offerCode, setOfferCode] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [saveAddressToBook, setSaveAddressToBook] = useState(false);
  const [addressSaveWarning, setAddressSaveWarning] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [loading, setLoading] = useState(true);

  // Loyalty and Offers state
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>([]);
  const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);
  const [redeemLoyaltyPoints, setRedeemLoyaltyPoints] = useState(false);

  // Orders tab state
  const [ordersTab, setOrdersTab] = useState<"orders" | "returns" | "loyalty">("orders");
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [expandedTracking, setExpandedTracking] = useState<Record<string, Shipment[]>>({});
  const [loadingTracking, setLoadingTracking] = useState<Record<string, boolean>>({});
  const [cancelBusy, setCancelBusy] = useState<string | null>(null);

  // Return request modal state
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);
  const [selectedReturnItemId, setSelectedReturnItemId] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setSuccessNotice("");
      try {
        if (mode === "checkout") {
          const [addrRes, offersRes, loyaltyRes] = await Promise.all([
            api.get<{ addresses: Address[] }>("/addresses"),
            api.get<{ offers: Offer[] }>("/offers").catch(() => ({ data: { offers: [] } })),
            api.get<{ account: LoyaltyAccount }>("/loyalty").catch(() => ({ data: { account: null } })),
          ]);
          if (!active) return;
          const saved = addrRes.data.addresses ?? [];
          setAddresses(saved);
          setAvailableOffers(offersRes.data.offers ?? []);
          if (loyaltyRes.data?.account) {
            setLoyaltyAccount(loyaltyRes.data.account);
          }
          const preferred = saved.find((item) => item.isDefault) ?? saved[0];
          if (preferred) setSelectedAddressId(preferred.id);
        } else {
          const [ordersRes, returnsRes, loyaltyRes] = await Promise.all([
            api.get<{ orders: Order[] }>("/orders"),
            api.get<{ returns: ReturnRequest[] }>("/returns").catch(() => ({ data: { returns: [] } })),
            api.get<{ account: LoyaltyAccount; transactions: LoyaltyTransaction[] }>("/loyalty").catch(() => ({ data: { account: null, transactions: [] } })),
          ]);
          if (!active) return;
          setOrders(ordersRes.data.orders ?? []);
          setReturns(returnsRes.data.returns ?? []);
          if (loyaltyRes.data?.account) {
            setLoyaltyAccount(loyaltyRes.data.account);
            setLoyaltyTransactions(loyaltyRes.data.transactions ?? []);
          }
        }
      } catch (e) {
        if (active) setError(getApiErrorMessage(e, "Unable to load your information."));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [mode]);

  async function toggleTracking(orderId: string) {
    if (expandedTracking[orderId]) {
      setExpandedTracking((prev) => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
      return;
    }
    setLoadingTracking((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await api.get<{ shipments: Shipment[] }>(`/orders/${orderId}/shipments`);
      setExpandedTracking((prev) => ({ ...prev, [orderId]: res.data.shipments ?? [] }));
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load shipment tracking."));
    } finally {
      setLoadingTracking((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  async function handleCancelOrder(orderId: string) {
    const confirmed = window.confirm("Are you sure you want to cancel this order? Any reserved inventory will be restored.");
    if (!confirmed) return;
    setCancelBusy(orderId);
    setError("");
    setSuccessNotice("");
    try {
      await api.post(`/orders/${orderId}/cancel`);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELLED" } : o)));
      setSuccessNotice("Order cancelled successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to cancel this order."));
    } finally {
      setCancelBusy(null);
    }
  }

  async function loadReturns() {
    setReturnsLoading(true);
    try {
      const res = await api.get<{ returns: ReturnRequest[] }>("/returns");
      setReturns(res.data.returns ?? []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to refresh returns."));
    } finally {
      setReturnsLoading(false);
    }
  }

  async function handleReturnSubmit(e: FormEvent) {
    e.preventDefault();
    if (!returningOrder || !selectedReturnItemId || !returnReason.trim()) return;
    setReturnSubmitting(true);
    setReturnError("");
    setError("");
    try {
      await api.post("/returns", {
        orderId: returningOrder.id,
        reason: returnReason.trim(),
        items: [
          {
            orderItemId: selectedReturnItemId,
            quantity: returnQuantity,
          },
        ],
      });
      setSuccessNotice("Return request submitted! Our team will review your request.");
      setReturningOrder(null);
      setSelectedReturnItemId("");
      setReturnReason("");
      setReturnQuantity(1);
      setOrdersTab("returns");
      await loadReturns();
    } catch (err) {
      setReturnError(getApiErrorMessage(err, "Unable to submit return request."));
    } finally {
      setReturnSubmitting(false);
    }
  }

  function updateAddress<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setAddress((current) => ({ ...current, [key]: value }));
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const saved = addresses.find((item) => item.id === selectedAddressId);
    const shippingAddress = saved
      ? {
          recipient: saved.recipient,
          phone: saved.phone || undefined,
          line1: saved.line1,
          line2: saved.line2 || undefined,
          city: saved.city,
          region: saved.region,
          postalCode: saved.postalCode,
          countryCode: saved.countryCode,
        }
      : {
          recipient: address.recipient.trim(),
          phone: address.phone?.trim() || undefined,
          line1: address.line1.trim(),
          line2: address.line2?.trim() || undefined,
          city: address.city.trim(),
          region: address.region.trim(),
          postalCode: address.postalCode.trim(),
          countryCode: address.countryCode.trim().toUpperCase(),
        };

    try {
      const response = await api.post<CheckoutResult>("/checkout", {
        paymentMethod,
        ...(offerCode.trim() ? { offerCode: offerCode.trim().toUpperCase() } : {}),
        redeemLoyaltyPoints,
        shippingAddress,
      });
      setResult(response.data);
      onCompleted();

      // Checkout has succeeded. Saving the address is a separate, optional action.
      if (!saved && saveAddressToBook) {
        try {
          const addressResponse = await api.post<{ address: Address }>("/addresses", {
            label: address.label.trim() || "Shipping",
            recipient: address.recipient.trim(),
            phone: address.phone?.trim() || undefined,
            line1: address.line1.trim(),
            line2: address.line2?.trim() || undefined,
            city: address.city.trim(),
            region: address.region.trim(),
            postalCode: address.postalCode.trim(),
            countryCode: address.countryCode.trim().toUpperCase(),
          });

          const createdAddress = addressResponse.data.address;
          setAddresses((current) => [
            createdAddress,
            ...current.filter((item) => item.id !== createdAddress.id),
          ]);
          setSelectedAddressId(createdAddress.id);
        } catch (saveError) {
          setAddressSaveWarning(
            `Your order was placed, but the address could not be saved. ${getApiErrorMessage(saveError, "Please try saving the address again later.")}`
          );
        }
      }    } catch (e) {
      setError(getApiErrorMessage(e, "Checkout could not be completed. Please review your cart and try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="shop-dialog commerce-dialog" role="dialog" aria-modal="true"
        aria-labelledby="commerce-title">
        <button className="auth-close" type="button" aria-label="Close dialog"
          onClick={onClose} disabled={busy}><X size={20} /></button>

        {result ? (
          <div className="commerce-success">
            <div className="auth-symbol"><CheckCircle2 size={28} /></div>
            <span className="eyebrow">ORDER PLACED</span>
            <h2 id="commerce-title">Thank you for your order!</h2>
            <p>Your order has been created by GlobalCart.</p>
            <div className="commerce-order-number">
              <span>Order number</span>
              <strong>{result.order.orderNumber}</strong>
            </div>
            <div className="commerce-summary-row"><span>Order status</span><strong>{result.order.status}</strong></div>
            <div className="commerce-summary-row"><span>Payment method</span><strong>{result.payment.method === "COD" ? "Cash on Delivery" : "Simulated card"}</strong></div>
            <div className="commerce-summary-row"><span>Payment status</span><strong>{result.payment.status}</strong></div>
            <div className="commerce-summary-row commerce-grand-total"><span>Total</span><strong>{money(result.order.total, result.order.currency)}</strong></div>
            {result.loyalty && (
              <div style={{
                margin: "12px 0",
                padding: "12px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                textAlign: "left"
              }}>
                {result.loyalty.pointsEarned > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#15803d", fontWeight: 600, fontSize: "13px" }}>
                    <Sparkles size={16} /> You earned +{result.loyalty.pointsEarned} SuperCoins on this purchase!
                  </div>
                )}
                {result.loyalty.pointsRedeemed > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#047857", fontSize: "12px", marginTop: "4px" }}>
                    <CheckCircle2 size={14} /> Redeemed {result.loyalty.pointsRedeemed} points (-${result.loyalty.discountAmount.toFixed(2)} instant discount)
                  </div>
                )}
              </div>
            )}
            <p className="auth-privacy">This is a demo checkout. No real card payment is processed.</p>
            {addressSaveWarning && (
              <p className="auth-error shop-notice" role="alert">{addressSaveWarning}</p>
            )}            <div className="shop-dialog-footer commerce-actions">
              <button className="secondary-button" type="button" onClick={onClose}>Continue shopping</button>
            </div>
          </div>
        ) : mode === "orders" ? (
          <>
            <div className="shop-dialog-heading">
              <div className="auth-symbol"><ClipboardList size={24} /></div>
              <span className="eyebrow">YOUR GLOBALCART ACCOUNT</span>
              <h2 id="commerce-title">Orders & Post-Purchase</h2>
              <p>Follow your shipments, cancel pending purchases, and manage returns.</p>
            </div>

            <div className="commerce-tabs" role="tablist">
              <button
                type="button"
                className={ordersTab === "orders" ? "commerce-tab commerce-tab-active" : "commerce-tab"}
                onClick={() => setOrdersTab("orders")}
              >
                Orders ({orders.length})
              </button>
              <button
                type="button"
                className={ordersTab === "returns" ? "commerce-tab commerce-tab-active" : "commerce-tab"}
                onClick={() => {
                  setOrdersTab("returns");
                  void loadReturns();
                }}
              >
                Returns & Refunds ({returns.length})
              </button>
              <button
                type="button"
                className={ordersTab === "loyalty" ? "commerce-tab commerce-tab-active" : "commerce-tab"}
                onClick={() => setOrdersTab("loyalty")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Sparkles size={14} color="#f59e0b" />
                Rewards & SuperCoins ({loyaltyAccount?.pointsBalance ?? 0})
              </button>
            </div>

            {error && <p className="auth-error shop-notice" role="alert">{error}</p>}
            {successNotice && <p className="auth-success shop-notice" role="status">{successNotice}</p>}

            {/* Return Request Modal */}
            {returningOrder && (
              <div className="return-inline-form">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4>Request Return for #{returningOrder.orderNumber}</h4>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setReturningOrder(null)}
                    aria-label="Close return form"
                  >
                    <X size={16} />
                  </button>
                </div>
                {returnError && <p className="auth-error" role="alert">{returnError}</p>}
                <form onSubmit={handleReturnSubmit}>
                  <label>
                    Select Item to Return
                    <select
                      required
                      value={selectedReturnItemId}
                      onChange={(e) => {
                        setSelectedReturnItemId(e.target.value);
                        setReturnQuantity(1);
                      }}
                    >
                      <option value="">-- Choose an item --</option>
                      {returningOrder.items.map((item) => (
                        <option key={item.id || item.sku} value={item.id}>
                          {item.productName} (Qty: {item.quantity})
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedReturnItemId && (
                    <label>
                      Return Quantity
                      <input
                        type="number"
                        min="1"
                        max={
                          returningOrder.items.find((i) => i.id === selectedReturnItemId)?.quantity || 1
                        }
                        value={returnQuantity}
                        onChange={(e) => setReturnQuantity(Math.max(1, Number(e.target.value)))}
                        required
                      />
                    </label>
                  )}

                  <label>
                    Reason for Return
                    <textarea
                      required
                      rows={2}
                      minLength={3}
                      maxLength={1000}
                      placeholder="e.g. Item defective, arrived damaged, or incorrect size"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    />
                  </label>

                  <div className="return-inline-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setReturningOrder(null)}
                      disabled={returnSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={returnSubmitting || !selectedReturnItemId || !returnReason.trim()}
                    >
                      {returnSubmitting ? "Submitting…" : "Submit Return Request"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {ordersTab === "orders" ? (
              loading ? (
                <p className="shop-loading">Loading your orders…</p>
              ) : orders.length === 0 ? (
                <div className="shop-empty">
                  <ClipboardList size={32} />
                  <h3>No orders yet</h3>
                  <p>Your completed checkouts will appear here.</p>
                </div>
              ) : (
                <div className="commerce-orders">
                  {orders.map((order) => {
                    const isEligibleCancel =
                      order.status === "PENDING" &&
                      !order.payments.some((p) => p.status === "CAPTURED");
                    const isDelivered = order.status === "DELIVERED";
                    const shipments = expandedTracking[order.id];
                    const isTrackingLoading = loadingTracking[order.id];

                    return (
                      <article className="commerce-order-card" key={order.id}>
                        <div className="commerce-order-heading">
                          <div>
                            <span>Order number</span>
                            <strong>{order.orderNumber}</strong>
                          </div>
                          <span className={`commerce-status status-${order.status}`}>
                            {order.status.replaceAll("_", " ")}
                          </span>
                        </div>
                        <p className="commerce-date">{new Date(order.placedAt).toLocaleString()}</p>
                        <ul className="commerce-order-items">
                          {order.items.map((item, index) => (
                            <li key={`${order.id}-${item.sku}-${index}`} className="commerce-order-item-row">
                              <div className="commerce-order-item-lead">
                                <ProductImg
                                  src={getProductThumbnail(item.productName, item.sku, item.product?.images?.[0]?.url)}
                                  alt={item.productName}
                                  className="commerce-item-thumb"
                                  fallbackName={item.productName}
                                />
                                <div className="commerce-item-info">
                                  <strong>{item.productName}</strong>
                                  <span className="commerce-item-meta">Qty: {item.quantity} · {money(item.unitPrice, order.currency)}</span>
                                </div>
                              </div>
                              <strong className="commerce-item-total">{money(item.lineTotal, order.currency)}</strong>
                            </li>
                          ))}
                        </ul>
                        <div className="commerce-summary-row">
                          <span>Subtotal</span>
                          <span>{money(order.subtotal, order.currency)}</span>
                        </div>
                        {Number(order.discount) > 0 && (
                          <div className="commerce-summary-row">
                            <span>Discount</span>
                            <span>−{money(order.discount, order.currency)}</span>
                          </div>
                        )}
                        <div className="commerce-summary-row commerce-grand-total">
                          <span>Total</span>
                          <strong>{money(order.total, order.currency)}</strong>
                        </div>
                        {order.payments.map((payment, index) => (
                          <p className="commerce-payment" key={`${order.id}-payment-${index}`}>
                            {payment.method === "COD" ? "Cash on Delivery" : "Simulated card"} ·
                            Payment: {payment.status}
                          </p>
                        ))}

                        {/* Shipment Tracking Panel */}
                        {shipments !== undefined && (
                          <div className="tracking-box" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginTop: "14px" }}>
                            <div className="tracking-box-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                              <span style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                                <Truck size={16} /> Live Delivery Progression
                              </span>
                              {shipments[0] && (
                                <span className={`tracking-status-badge badge-${shipments[0].status.toLowerCase()}`}>
                                  {shipments[0].status.replaceAll("_", " ")}
                                </span>
                              )}
                            </div>

                            {shipments.length === 0 ? (
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", position: "relative", margin: "16px 0 10px" }}>
                                  {[
                                    { label: "Order Placed", done: true },
                                    { label: "Processing", done: order.status === "PROCESSING" || order.status === "CONFIRMED" },
                                    { label: "Preparing Dispatch", done: false },
                                    { label: "In Transit", done: false },
                                    { label: "Delivered", done: false }
                                  ].map((st, i) => (
                                    <div key={st.label} style={{ flex: 1, textAlign: "center" }}>
                                      <div style={{
                                        width: "26px", height: "26px", borderRadius: "50%", margin: "0 auto",
                                        background: st.done ? "#10b981" : "#e2e8f0",
                                        color: st.done ? "#fff" : "#64748b",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "11px", fontWeight: 700
                                      }}>
                                        {st.done ? "✓" : i + 1}
                                      </div>
                                      <div style={{ fontSize: "11px", marginTop: "4px", color: st.done ? "#047857" : "#94a3b8", fontWeight: st.done ? 600 : 400 }}>
                                        {st.label}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: "12px", textAlign: "center" }}>
                                  Fulfillment center is packing your order. Carrier tracking code will appear once dispatched.
                                </p>
                              </div>
                            ) : (
                              shipments.map((s) => {
                                const deliverySteps = [
                                  { key: "ORDER_PLACED", label: "Confirmed" },
                                  { key: "PREPARING", label: "Preparing" },
                                  { key: "DISPATCHED", label: "Dispatched" },
                                  { key: "IN_TRANSIT", label: "In Transit" },
                                  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
                                  { key: "DELIVERED", label: "Delivered" }
                                ];
                                const orderStatusMap: Record<string, number> = {
                                  PREPARING: 1,
                                  DISPATCHED: 2,
                                  IN_TRANSIT: 3,
                                  OUT_FOR_DELIVERY: 4,
                                  DELIVERED: 5
                                };
                                const activeStageIdx = orderStatusMap[s.status] ?? 1;

                                return (
                                  <div key={s.id} style={{ marginTop: "8px" }}>
                                    {/* Visual Stepper */}
                                    <div style={{ display: "flex", justifyContent: "space-between", margin: "16px 0 12px" }}>
                                      {deliverySteps.map((step, idx) => {
                                        const isDone = activeStageIdx >= idx;
                                        const isCurrent = activeStageIdx === idx;
                                        return (
                                          <div key={step.key} style={{ flex: 1, textAlign: "center" }}>
                                            <div style={{
                                              width: "26px", height: "26px", borderRadius: "50%", margin: "0 auto",
                                              background: isDone ? (isCurrent && s.status !== "DELIVERED" ? "#2563eb" : "#10b981") : "#e2e8f0",
                                              color: isDone ? "#ffffff" : "#64748b",
                                              display: "flex", alignItems: "center", justifyContent: "center",
                                              fontSize: "11px", fontWeight: 700,
                                              boxShadow: isCurrent ? "0 0 0 3px rgba(37, 99, 235, 0.2)" : "none"
                                            }}>
                                              {isDone && !isCurrent ? "✓" : idx + 1}
                                            </div>
                                            <div style={{
                                              fontSize: "10px", marginTop: "4px",
                                              color: isCurrent ? "#1e293b" : isDone ? "#047857" : "#94a3b8",
                                              fontWeight: isCurrent ? 700 : isDone ? 600 : 400
                                            }}>
                                              {step.label}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Carrier & Tracking Meta Cards */}
                                    <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", fontSize: "12px" }}>
                                      <div>
                                        <span style={{ color: "#64748b" }}>Carrier:</span> <strong>{s.carrier || "Global Express"}</strong>
                                      </div>
                                      {s.trackingNumber && (
                                        <div>
                                          <span style={{ color: "#64748b" }}>Tracking #:</span> <code>{s.trackingNumber}</code>
                                        </div>
                                      )}
                                      {s.shippedAt && (
                                        <div>
                                          <span style={{ color: "#64748b" }}>Dispatched:</span> {new Date(s.shippedAt).toLocaleString()}
                                        </div>
                                      )}
                                      {s.deliveredAt && (
                                        <div>
                                          <span style={{ color: "#64748b" }}>Delivered:</span> <strong style={{ color: "#166534" }}>{new Date(s.deliveredAt).toLocaleString()}</strong>
                                        </div>
                                      )}
                                      {s.estimatedDelivery && !s.deliveredAt && (
                                        <div>
                                          <span style={{ color: "#64748b" }}>Est. Delivery:</span> {new Date(s.estimatedDelivery).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}

                        {/* Actions Row */}
                        <div className="order-actions-row">
                          <button
                            type="button"
                            className="order-action-btn"
                            onClick={() => void toggleTracking(order.id)}
                            disabled={isTrackingLoading}
                          >
                            <Truck size={14} />
                            {isTrackingLoading
                              ? "Checking tracking…"
                              : shipments !== undefined
                              ? "Hide Tracking"
                              : "Track Shipment"}
                          </button>

                          {isEligibleCancel && (
                            <button
                              type="button"
                              className="order-action-btn cancel-btn"
                              onClick={() => void handleCancelOrder(order.id)}
                              disabled={cancelBusy === order.id}
                            >
                              {cancelBusy === order.id ? "Cancelling…" : "Cancel Order"}
                            </button>
                          )}

                          {isDelivered && (
                            <button
                              type="button"
                              className="order-action-btn"
                              onClick={() => {
                                setReturningOrder(order);
                                setSelectedReturnItemId(order.items[0]?.id || "");
                                setReturnError("");
                              }}
                            >
                              <RotateCcw size={14} />
                              Request Return
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            ) : ordersTab === "returns" ? (
              /* Returns Tab */
              returnsLoading ? (
                <p className="shop-loading">Loading your returns…</p>
              ) : returns.length === 0 ? (
                <div className="shop-empty">
                  <RotateCcw size={32} />
                  <h3>No return requests</h3>
                  <p>When you request returns for delivered orders, track their progress here.</p>
                </div>
              ) : (
                <div className="commerce-orders">
                  {returns.map((ret) => (
                    <article className="return-card" key={ret.id}>
                      <div className="return-card-heading">
                        <div>
                          <span style={{ fontSize: "11px", color: "#68766a" }}>Return Number</span>
                          <strong style={{ display: "block", fontSize: "14px", color: "#223528" }}>
                            {ret.returnNumber}
                          </strong>
                          <span style={{ fontSize: "11px", color: "#8a958c" }}>
                            Requested on {new Date(ret.requestedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`return-status-badge return-status-${ret.status}`}>
                          {ret.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      <div style={{ margin: "10px 0", fontSize: "12px", color: "#455449" }}>
                        <strong>Reason:</strong> {ret.reason}
                      </div>

                      <div style={{ margin: "10px 0" }}>
                        <span style={{ fontSize: "11px", color: "#68766a", fontWeight: 700 }}>
                          Items Requested for Return:
                        </span>
                        <ul style={{ margin: "6px 0", paddingLeft: "18px", fontSize: "12px" }}>
                          {ret.items.map((item, idx) => (
                            <li key={idx}>
                              {item.orderItem.productName} — Qty: {item.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {ret.refunds && ret.refunds.length > 0 && (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "10px",
                            borderRadius: "6px",
                            background: "#eef9f0",
                            border: "1px solid #d4ecd8",
                            fontSize: "12px",
                          }}
                        >
                          <strong style={{ color: "#196633" }}>Refund Processed:</strong>{" "}
                          ${Number(ret.refunds[0].amount).toFixed(2)} (Ref:{" "}
                          {ret.refunds[0].reference || "Approved"})
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )
            ) : (
              /* Rewards & SuperCoins Tab */
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px 0" }}>
                <div style={{
                  background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
                  color: "#ffffff",
                  padding: "20px",
                  borderRadius: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 4px 14px rgba(6, 78, 59, 0.25)"
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        background: loyaltyAccount?.tier === "PLATINUM" ? "#a855f7" :
                                    loyaltyAccount?.tier === "GOLD" ? "#fbbf24" :
                                    loyaltyAccount?.tier === "SILVER" ? "#cbd5e1" : "#10b981",
                        color: loyaltyAccount?.tier === "GOLD" ? "#78350f" :
                               loyaltyAccount?.tier === "SILVER" ? "#0f172a" : "#ffffff",
                      }}>
                        {loyaltyAccount?.tier || "STANDARD"} MEMBER
                      </span>
                      <span style={{ fontSize: "12px", color: "#a7f3d0" }}>Amazon & Flipkart Loyalty Tier</span>
                    </div>
                    <div style={{ fontSize: "34px", fontWeight: 800, letterSpacing: "-0.02em", color: "#f8fafc" }}>
                      {loyaltyAccount?.pointsBalance ?? 0}
                      <span style={{ fontSize: "15px", fontWeight: 600, color: "#a7f3d0", marginLeft: "8px" }}>SuperCoins</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#d1fae5", marginTop: "4px" }}>
                      Worth <strong>${(((loyaltyAccount?.pointsBalance ?? 0) / 100)).toFixed(2)} USD</strong> instant deduction at checkout
                    </div>
                  </div>
                  <div style={{
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: "50%",
                    width: "56px",
                    height: "56px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Sparkles size={32} color="#fbbf24" />
                  </div>
                </div>

                {/* Loyalty Rules & Benefits */}
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px"
                }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ background: "#dcfce7", color: "#16a34a", padding: "8px", borderRadius: "8px", height: "fit-content" }}>
                      <Percent size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>Earn 5% Back</strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>5 coins credited per $1 spent on GlobalCart orders.</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ background: "#fef3c7", color: "#d97706", padding: "8px", borderRadius: "8px", height: "fit-content" }}>
                      <Tag size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>100 Pts = $1.00</strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Direct checkout discount with 1-click redemption.</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ background: "#f3e8ff", color: "#9333ea", padding: "8px", borderRadius: "8px", height: "fit-content" }}>
                      <Award size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>VIP Upgrades</strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Unlock Silver, Gold, and Platinum multiplier privileges.</span>
                    </div>
                  </div>
                </div>

                {/* Activity Table */}
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", margin: "8px 0 10px" }}>
                    Recent Coins Activity
                  </h4>
                  {loyaltyTransactions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px", background: "#f8fafc", borderRadius: "8px", color: "#64748b", fontSize: "13px" }}>
                      No reward points transactions yet. Complete a checkout to earn your first SuperCoins!
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "260px", overflowY: "auto" }}>
                      {loyaltyTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 14px",
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px"
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: "13px", color: "#1e293b", display: "block" }}>
                              {tx.reason || (tx.type === "EARNED" ? "Order Purchase Reward" : "Checkout Points Redemption")}
                            </strong>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              {new Date(tx.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: "20px",
                              background: tx.type === "EARNED" ? "#dcfce7" : "#fee2e2",
                              color: tx.type === "EARNED" ? "#15803d" : "#b91c1c"
                            }}
                          >
                            {tx.type === "EARNED" ? `+${tx.points} pts` : `-${tx.points} pts`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="shop-dialog-footer commerce-actions">
              <button className="secondary-button" type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="shop-dialog-heading">
              <div className="auth-symbol"><MapPin size={24} /></div>
              <span className="eyebrow">SECURE DEMO CHECKOUT</span>
              <h2 id="commerce-title">Shipping and payment</h2>
              <p>Confirm the delivery address and payment method for your order.</p>
            </div>
            {error && <p className="auth-error shop-notice" role="alert">{error}</p>}
            {loading ? <p className="shop-loading">Loading saved addresses…</p> : (
              <form className="commerce-form" onSubmit={submitCheckout}>
                {addresses.length > 0 && (
                  <label className="commerce-field commerce-field-full">
                    Saved shipping address
                    <select value={selectedAddressId} onChange={(event) => setSelectedAddressId(event.target.value)}>
                      {addresses.map((item) => (
                        <option key={item.id} value={item.id}>
                          {(item.label || "Address")}{item.isDefault ? " (Default)" : ""} — {item.line1}, {item.city}
                        </option>
                      ))}
                      <option value="new">Enter a different address</option>
                    </select>
                  </label>
                )}

                {(selectedAddressId === "new" || addresses.length === 0) && (
                  <div className="commerce-form-grid">
                    <label className="commerce-field">Recipient name
                      <input required minLength={2} maxLength={100} value={address.recipient}
                        onChange={(event) => updateAddress("recipient", event.target.value)} />
                    </label>
                    <label className="commerce-field">Phone (optional)
                      <input maxLength={30} value={address.phone ?? ""}
                        onChange={(event) => updateAddress("phone", event.target.value)} />
                    </label>
                    <label className="commerce-field commerce-field-full">Address line 1
                      <input required minLength={3} maxLength={200} value={address.line1}
                        onChange={(event) => updateAddress("line1", event.target.value)} />
                    </label>
                    <label className="commerce-field commerce-field-full">Address line 2 (optional)
                      <input maxLength={200} value={address.line2 ?? ""}
                        onChange={(event) => updateAddress("line2", event.target.value)} />
                    </label>
                    <label className="commerce-field">City
                      <input required minLength={2} maxLength={100} value={address.city}
                        onChange={(event) => updateAddress("city", event.target.value)} />
                    </label>
                    <label className="commerce-field">State / Region
                      <input required minLength={2} maxLength={100} value={address.region}
                        onChange={(event) => updateAddress("region", event.target.value)} />
                    </label>
                    <label className="commerce-field">Postal code
                      <input required minLength={2} maxLength={20} value={address.postalCode}
                        onChange={(event) => updateAddress("postalCode", event.target.value)} />
                    </label>
                    <label className="commerce-field">Country code
                      <input required minLength={2} maxLength={2} pattern="[A-Za-z]{2}"
                        value={address.countryCode}
                        onChange={(event) => updateAddress("countryCode", event.target.value.toUpperCase())} />
                    </label>
                  </div>
                )}

                {(selectedAddressId === "new" || addresses.length === 0) && (
                  <label className="commerce-save-address">
                    <input
                      type="checkbox"
                      checked={saveAddressToBook}
                      onChange={(event) => setSaveAddressToBook(event.target.checked)}
                    />
                    <span>
                      <strong>Save this address to my address book</strong>
                      <small>Reuse it during your next checkout.</small>
                    </span>
                  </label>
                )}

                <fieldset className="commerce-payment-options">                  <legend>Payment method</legend>
                  <label><input type="radio" name="paymentMethod" value="SIMULATED_CARD"
                    checked={paymentMethod === "SIMULATED_CARD"}
                    onChange={() => setPaymentMethod("SIMULATED_CARD")} />
                    <span><strong>Simulated card</strong><small>Demo payment; no real card details required.</small></span>
                  </label>
                  <label><input type="radio" name="paymentMethod" value="COD"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")} />
                    <span><strong>Cash on Delivery</strong><small>Payment remains pending until collected.</small></span>
                  </label>
                </fieldset>

                {loyaltyAccount && loyaltyAccount.pointsBalance > 0 && (
                  <div style={{
                    marginBottom: "16px",
                    padding: "14px",
                    borderRadius: "8px",
                    background: "#f0fdf4",
                    border: "1.5px solid #86efac",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px"
                  }}>
                    <input
                      type="checkbox"
                      id="redeemLoyaltyCheckbox"
                      checked={redeemLoyaltyPoints}
                      onChange={(e) => setRedeemLoyaltyPoints(e.target.checked)}
                      style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "#15803d", cursor: "pointer" }}
                    />
                    <label htmlFor="redeemLoyaltyCheckbox" style={{ cursor: "pointer", margin: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <strong style={{ color: "#14532d", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Sparkles size={16} color="#15803d" />
                          Redeem GlobalCart SuperCoins ({loyaltyAccount.pointsBalance} pts)
                        </strong>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          background: "#15803d",
                          color: "#ffffff",
                          padding: "2px 8px",
                          borderRadius: "12px"
                        }}>
                          Save ${(loyaltyAccount.pointsBalance / 100).toFixed(2)}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#166534", lineHeight: "1.4" }}>
                        Amazon & Flipkart reward model: 100 points = $1.00 instant checkout deduction. Apply directly toward this order.
                      </p>
                    </label>
                  </div>
                )}

                {availableOffers.length > 0 && (
                  <div style={{ marginBottom: "12px", padding: "12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                      <Tag size={14} color="#059669" /> Available Coupons & Discounts (Click to apply):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {availableOffers.map((offer) => (
                        <button
                          key={offer.id}
                          type="button"
                          onClick={() => setOfferCode(offer.code)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            borderRadius: "6px",
                            border: offerCode === offer.code ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
                            background: offerCode === offer.code ? "#dcfce7" : "#ffffff",
                            color: offerCode === offer.code ? "#15803d" : "#1e293b",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Percent size={12} />
                          <span>{offer.code}</span>
                          <span style={{ fontSize: "10px", color: offerCode === offer.code ? "#15803d" : "#64748b", fontWeight: 500 }}>
                            ({offer.discountType === "PERCENTAGE" ? `${Number(offer.discountValue)}% OFF` : `$${Number(offer.discountValue)} OFF`})
                          </span>
                          {offerCode === offer.code && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="commerce-field commerce-field-full">Offer code (optional)
                  <input value={offerCode} maxLength={40} pattern="[A-Za-z0-9_-]{3,40}"
                    placeholder="Enter offer code" onChange={(event) => setOfferCode(event.target.value.toUpperCase())} />
                </label>
                <p className="auth-privacy">The backend recalculates prices, discounts, and stock at checkout. Taxes and shipping are determined by current server rules.</p>
                <div className="shop-dialog-footer commerce-actions">
                  <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>
                    <ArrowLeft size={15} /> Back to cart
                  </button>
                  <button className="primary-button commerce-submit" type="submit" disabled={busy}>
                    {busy ? "Placing order…" : "Place order"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
