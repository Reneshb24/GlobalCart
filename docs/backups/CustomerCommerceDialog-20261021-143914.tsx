import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, MapPin, X } from "lucide-react";
import { api, getApiErrorMessage } from "./lib/api";

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

type OrderItem = {
  productName: string;
  sku: string;
  unitPrice: string | number;
  quantity: number;
  lineTotal: string | number;
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        if (mode === "checkout") {
          const response = await api.get<{ addresses: Address[] }>("/addresses");
          if (!active) return;
          const saved = response.data.addresses ?? [];
          setAddresses(saved);
          const preferred = saved.find((item) => item.isDefault) ?? saved[0];
          if (preferred) setSelectedAddressId(preferred.id);
        } else {
          const response = await api.get<{ orders: Order[] }>("/orders");
          if (!active) return;
          setOrders(response.data.orders ?? []);
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
        shippingAddress,
      });
      setResult(response.data);
      onCompleted();
    } catch (e) {
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
            <p className="auth-privacy">This is a demo checkout. No real card payment is processed.</p>
            <div className="shop-dialog-footer commerce-actions">
              <button className="secondary-button" type="button" onClick={onClose}>Continue shopping</button>
            </div>
          </div>
        ) : mode === "orders" ? (
          <>
            <div className="shop-dialog-heading">
              <div className="auth-symbol"><ClipboardList size={24} /></div>
              <span className="eyebrow">YOUR GLOBALCART ACCOUNT</span>
              <h2 id="commerce-title">Order history</h2>
              <p>Review your recent purchases and payment statuses.</p>
            </div>
            {error && <p className="auth-error shop-notice" role="alert">{error}</p>}
            {loading ? <p className="shop-loading">Loading your orders…</p> :
              orders.length === 0 ? (
                <div className="shop-empty"><ClipboardList size={32} /><h3>No orders yet</h3><p>Your completed checkouts will appear here.</p></div>
              ) : (
                <div className="commerce-orders">
                  {orders.map((order) => (
                    <article className="commerce-order-card" key={order.id}>
                      <div className="commerce-order-heading">
                        <div><span>Order number</span><strong>{order.orderNumber}</strong></div>
                        <span className="commerce-status">{order.status.replaceAll("_", " ")}</span>
                      </div>
                      <p className="commerce-date">{new Date(order.placedAt).toLocaleString()}</p>
                      <ul>
                        {order.items.map((item, index) => (
                          <li key={`${order.id}-${item.sku}-${index}`}>
                            <span>{item.productName} × {item.quantity}</span>
                            <strong>{money(item.lineTotal, order.currency)}</strong>
                          </li>
                        ))}
                      </ul>
                      <div className="commerce-summary-row"><span>Subtotal</span><span>{money(order.subtotal, order.currency)}</span></div>
                      {Number(order.discount) > 0 && <div className="commerce-summary-row"><span>Discount</span><span>−{money(order.discount, order.currency)}</span></div>}
                      <div className="commerce-summary-row commerce-grand-total"><span>Total</span><strong>{money(order.total, order.currency)}</strong></div>
                      {order.payments.map((payment, index) => (
                        <p className="commerce-payment" key={`${order.id}-payment-${index}`}>
                          {payment.method === "COD" ? "Cash on Delivery" : "Simulated card"} · Payment: {payment.status}
                        </p>
                      ))}
                    </article>
                  ))}
                </div>
              )}
            <div className="shop-dialog-footer commerce-actions">
              <button className="secondary-button" type="button" onClick={onClose}>Close</button>
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

                <fieldset className="commerce-payment-options">
                  <legend>Payment method</legend>
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
