
import { useCallback, useEffect, useState } from "react";
import {
  Check, MapPin, Pencil, Plus, Star, Trash2, X,
} from "lucide-react";
import { api, getApiErrorMessage } from "./lib/api";
import "./AddressBookDialog.css";

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

type AddressForm = {
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
};

const EMPTY_FORM: AddressForm = {
  label: "Home",
  recipient: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  countryCode: "IN",
  isDefault: false,
};

type Props = {
  onClose: () => void;
};

export default function AddressBookDialog({ onClose }: Props) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Address | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<{ addresses: Address[] }>("/addresses");
      setAddresses(response.data.addresses ?? []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load saved addresses."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  function beginAdd() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      isDefault: addresses.length === 0,
    });
    setFormOpen(true);
    setError("");
    setMessage("");
  }

  function beginEdit(address: Address) {
    setEditing(address);
    setForm({
      label: address.label ?? "",
      recipient: address.recipient,
      phone: address.phone ?? "",
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      countryCode: address.countryCode,
      isDefault: address.isDefault,
    });
    setFormOpen(true);
    setError("");
    setMessage("");
  }

  function updateField<K extends keyof AddressForm>(
    field: K,
    value: AddressForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const payload = {
      label: form.label.trim() || "Address",
      recipient: form.recipient.trim(),
      phone: form.phone.trim() || undefined,
      line1: form.line1.trim(),
      line2: form.line2.trim() || undefined,
      city: form.city.trim(),
      region: form.region.trim(),
      postalCode: form.postalCode.trim(),
      countryCode: form.countryCode.trim().toUpperCase(),
      isDefault: form.isDefault,
    };

    try {
      if (editing) {
        await api.patch(`/addresses/${editing.id}`, payload);
        setMessage("Address updated successfully.");
      } else {
        await api.post("/addresses", payload);
        setMessage("Address saved successfully.");
      }

      setFormOpen(false);
      setEditing(null);
      await loadAddresses();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save this address."));
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(address: Address) {
    if (address.isDefault) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/addresses/${address.id}`, { isDefault: true });
      setMessage("Default delivery address updated.");
      await loadAddresses();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update the default address."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAddress(address: Address) {
    const confirmed = window.confirm(
      `Delete the ${address.label || "saved"} address for ${address.recipient}?`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.delete(`/addresses/${address.id}`);
      setAddresses((current) => current.filter((item) => item.id !== address.id));
      setMessage("Address deleted.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to delete this address."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="auth-backdrop address-book-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="auth-dialog address-book-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-book-title"
      >
        <button
          className="auth-close"
          type="button"
          aria-label="Close address book"
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </button>

        <div className="auth-content address-book-content">
          <div className="auth-symbol"><MapPin size={25} /></div>
          <span className="eyebrow">DELIVERY PREFERENCES</span>
          <h2 id="address-book-title">Manage addresses</h2>
          <p className="auth-subtitle">
            Keep your delivery details ready for your next checkout.
          </p>

          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-success" role="status">{message}</p>}

          {!formOpen && (
            <button
              type="button"
              className="address-book-add"
              onClick={beginAdd}
              disabled={busy || loading}
            >
              <Plus size={17} /> Add a new address
            </button>
          )}

          {loading ? (
            <p className="address-book-status">Loading your saved addresses…</p>
          ) : formOpen ? (
            <form className="auth-form address-book-form" onSubmit={saveAddress}>
              <div className="auth-name-row">
                <label>
                  Address label
                  <input
                    required
                    maxLength={50}
                    value={form.label}
                    onChange={(event) => updateField("label", event.target.value)}
                    placeholder="Home, Work…"
                  />
                </label>
                <label>
                  Recipient name
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    value={form.recipient}
                    onChange={(event) => updateField("recipient", event.target.value)}
                  />
                </label>
              </div>

              <label>
                Phone (optional)
                <input
                  type="tel"
                  maxLength={30}
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </label>

              <label>
                Address line 1
                <input
                  required
                  minLength={3}
                  maxLength={200}
                  autoComplete="address-line1"
                  value={form.line1}
                  onChange={(event) => updateField("line1", event.target.value)}
                />
              </label>

              <label>
                Address line 2 (optional)
                <input
                  maxLength={200}
                  autoComplete="address-line2"
                  value={form.line2}
                  onChange={(event) => updateField("line2", event.target.value)}
                />
              </label>

              <div className="auth-name-row">
                <label>
                  City
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                  />
                </label>
                <label>
                  State / region
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="address-level1"
                    value={form.region}
                    onChange={(event) => updateField("region", event.target.value)}
                  />
                </label>
              </div>

              <div className="auth-name-row">
                <label>
                  Postal code
                  <input
                    required
                    minLength={2}
                    maxLength={20}
                    autoComplete="postal-code"
                    value={form.postalCode}
                    onChange={(event) => updateField("postalCode", event.target.value)}
                  />
                </label>
                <label>
                  Country code
                  <input
                    required
                    minLength={2}
                    maxLength={2}
                    pattern="[A-Za-z]{2}"
                    autoComplete="country"
                    value={form.countryCode}
                    onChange={(event) => updateField("countryCode", event.target.value.toUpperCase())}
                  />
                </label>
              </div>

              <label className="address-book-default-check">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(event) => updateField("isDefault", event.target.checked)}
                />
                Set as my default delivery address
              </label>

              {error && <p className="auth-error" role="alert">{error}</p>}

              <div className="address-book-form-actions">
                <button
                  className="auth-submit"
                  type="submit"
                  disabled={busy}
                >
                  <Check size={17} />
                  {busy ? "Saving…" : editing ? "Save changes" : "Save address"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => {
                    setFormOpen(false);
                    setEditing(null);
                    setError("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : addresses.length === 0 ? (
            <div className="shop-empty address-book-empty">
              <MapPin size={30} />
              <h3>No saved addresses yet</h3>
              <p>Add an address to make future checkouts faster.</p>
            </div>
          ) : (
            <div className="address-book-list">
              {addresses.map((address) => (
                <article className="address-book-card" key={address.id}>
                  <div className="address-book-card-heading">
                    <div>
                      <strong>{address.label || "Address"}</strong>
                      {address.isDefault && (
                        <span className="address-book-default">
                          <Star size={12} fill="currentColor" /> Default
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="address-book-recipient">{address.recipient}</p>
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  <p>{address.city}, {address.region} {address.postalCode}</p>
                  <p>{address.countryCode}</p>
                  {address.phone && <p>{address.phone}</p>}

                  <div className="address-book-actions">
                    {!address.isDefault && (
                      <button
                        type="button"
                        className="address-book-text-action"
                        disabled={busy}
                        onClick={() => void makeDefault(address)}
                      >
                        <Star size={14} /> Make default
                      </button>
                    )}
                    <button
                      type="button"
                      className="address-book-text-action"
                      disabled={busy}
                      onClick={() => beginEdit(address)}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      className="address-book-text-action address-book-delete"
                      disabled={busy}
                      onClick={() => void deleteAddress(address)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
