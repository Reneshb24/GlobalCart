import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowDownUp, ArrowRight, Check, ChevronDown, Heart,
  Menu, Package, Search, ShieldCheck, UserRound, LogOut,
  ShoppingBag, Sparkles, Truck, X, Plus, Minus, Trash2, HeartHandshake,
  ClipboardList, MapPin,} from "lucide-react";
import { api, clearAuthToken, getApiErrorMessage, getAuthToken, setAuthToken } from "./lib/api";
import CustomerCommerceDialog from "./CustomerCommerceDialog";
import AddressBookDialog from "./AddressBookDialog";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const PAGE_SIZE = 8;

type Category = {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  price: string | number;
  currency: string;
  category?: { name: string; slug: string } | null;
  images?: { url: string; altText?: string | null }[];
  availableStock: number;
};

type ProductResponse = {
  items: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type CategoryResponse = { categories: Category[] };

function formatPrice(price: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(price));
}

type AccountUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
};

type AuthMode = "login" | "register";

type CartView = {
  id: string;
  quantity: number;
  product: Product;
  availableStock: number;
  subtotal: string;
  isAvailable: boolean;
  isInStock: boolean;
};

type CartPayload = {
  cart: {
    id: string;
    items: CartView[];
    itemCount: number;
    total: string;
    currency: string | null;
    hasMixedCurrencies: boolean;
  };
};

type WishlistPayload = {
  wishlist: {
    items: { product: Product }[];
  };
};

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<ProductResponse["pagination"]>({
    page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cartData, setCartData] = useState<CartPayload["cart"] | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [shopMessage, setShopMessage] = useState("");
  const [shopError, setShopError] = useState("");
  const [shopBusy, setShopBusy] = useState(false);
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFirstName, setAuthFirstName] = useState("");
  const [authLastName, setAuthLastName] = useState("");
  const [authPhone, setAuthPhone] = useState("");

  const loadCategories = useCallback(async () => {
    setCategoryLoading(true);
    setCategoryError("");
    try {
      const response = await axios.get<CategoryResponse>(`${API_URL}/categories`);
      setCategories(response.data.categories ?? []);
    } catch {
      setCategoryError("Categories are temporarily unavailable.");
    } finally {
      setCategoryLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
        sort,
      };
      if (search.trim()) params.search = search.trim();
      if (category) params.category = category;

      const response = await axios.get<ProductResponse>(`${API_URL}/products`, { params });
      setProducts(response.data.items ?? []);
      setPagination(response.data.pagination ?? {
        page, limit: PAGE_SIZE, total: response.data.items?.length ?? 0, totalPages: 1,
      });
    } catch {
      setError("We couldn't load the catalog. Check that the GlobalCart API is running on port 4000.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!getAuthToken()) return;

      try {
        const response = await api.get<{ user: AccountUser }>("/auth/me");
        if (!cancelled) {
          setAccountUser(response.data.user);
      try {
        const [cartResponse, wishlistResponse] = await Promise.all([
          api.get<CartPayload>("/cart"),
          api.get<WishlistPayload>("/wishlist"),
        ]);
        setCartData(cartResponse.data.cart);
        const savedProducts = wishlistResponse.data.wishlist.items.map((item) => item.product);
        setWishlistProducts(savedProducts);
        setWishlist(savedProducts.map((product) => product.id));
      } catch {
        setCartData(null);
        setWishlist([]);
    setWishlistProducts([]);
    setCartData(null);
    setCartOpen(false);
    setWishlistOpen(false);
        setWishlistProducts([]);
      }
          try {
            const [cartResponse, wishlistResponse] = await Promise.all([
              api.get<CartPayload>("/cart"),
              api.get<WishlistPayload>("/wishlist"),
            ]);
            if (!cancelled) {
              setCartData(cartResponse.data.cart);
              const savedProducts = wishlistResponse.data.wishlist.items.map((item) => item.product);
              setWishlistProducts(savedProducts);
              setWishlist(savedProducts.map((product) => product.id));
            }
          } catch {
            // A later open of Cart or Saved will retry loading the data.
          }
        }
      } catch {
        clearAuthToken();
        if (!cancelled) setAccountUser(null);
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");

    try {
      if (authMode === "register") {
        await api.post("/auth/register", {
          email: authEmail.trim(),
          password: authPassword,
          firstName: authFirstName.trim(),
          lastName: authLastName.trim(),
          ...(authPhone.trim() ? { phone: authPhone.trim() } : {}),
        });
      }

      const response = await api.post<{
        token: string;
        user: AccountUser;
      }>("/auth/login", {
        email: authEmail.trim(),
        password: authPassword,
      });

      setAuthToken(response.data.token);
      setAccountUser(response.data.user);
      try {
        const [cartResponse, wishlistResponse] = await Promise.all([
          api.get<CartPayload>("/cart"),
          api.get<WishlistPayload>("/wishlist"),
        ]);
        setCartData(cartResponse.data.cart);
        const savedProducts = wishlistResponse.data.wishlist.items.map((item) => item.product);
        setWishlistProducts(savedProducts);
        setWishlist(savedProducts.map((product) => product.id));
      } catch {
        setCartData(null);
        setWishlist([]);
    setWishlistProducts([]);
    setCartData(null);
    setCartOpen(false);
    setWishlistOpen(false);
        setWishlistProducts([]);
      }
      setAuthPassword("");
      setAuthError("");
      setAuthMessage("");
      setAuthOpen(false);
    } catch (error) {
      setAuthError(getApiErrorMessage(
        error,
        authMode === "register"
          ? "Unable to create your account."
          : "Unable to sign in.",
      ));
    } finally {
      setAuthBusy(false);
    }
  }

  function logout() {
    clearAuthToken();
    setAccountUser(null);
    setAuthMessage("You have signed out.");
    setWishlist([]);
    setWishlistProducts([]);
    setCartData(null);
    setCartOpen(false);
    setWishlistOpen(false);
  }
  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setPage(1);
    setMobileMenuOpen(false);
  }

  const loadCart = useCallback(async () => {
    const response = await api.get<CartPayload>("/cart");
    setCartData(response.data.cart);
    return response.data.cart;
  }, []);

  const loadWishlist = useCallback(async () => {
    const response = await api.get<WishlistPayload>("/wishlist");
    const savedProducts = response.data.wishlist.items.map((item) => item.product);
    setWishlistProducts(savedProducts);
    setWishlist(savedProducts.map((product) => product.id));
    return savedProducts;
  }, []);

  async function openCart() {
    if (!accountUser) {
      setAuthError("Please sign in to access your cart.");
      setAuthMessage("");
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    setShopError("");
    setShopMessage("");
    setCartOpen(true);
    setShopBusy(true);
    try {
      await loadCart();
    } catch (error) {
      setShopError(getApiErrorMessage(error, "Unable to load your cart."));
    } finally {
      setShopBusy(false);
    }
  }

  async function openWishlist() {
    if (!accountUser) {
      setAuthError("Please sign in to view your saved items.");
      setAuthMessage("");
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    setShopError("");
    setShopMessage("");
    setWishlistOpen(true);
    setShopBusy(true);
    try {
      await loadWishlist();
    } catch (error) {
      setShopError(getApiErrorMessage(error, "Unable to load saved items."));
    } finally {
      setShopBusy(false);
    }
  }

  async function addToCart(product: Product) {
    if (!accountUser) {
      setAuthError("Please sign in before adding items to your cart.");
      setAuthMessage("");
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    setShopBusy(true);
    setShopError("");
    setShopMessage("");
    try {
      await api.post("/cart/items", { productId: product.id, quantity: 1 });
      const updatedCart = await loadCart();
      setShopMessage(`${product.name} added to your cart.`);
      setCartOpen(true);
      setWishlistOpen(false);
      if (updatedCart.itemCount < 1) {
        setShopMessage("Your cart is ready.");
      }
    } catch (error) {
      setShopError(getApiErrorMessage(error, "Unable to add this product."));
    } finally {
      setShopBusy(false);
    }
  }

  async function changeCartQuantity(item: CartView, quantity: number) {
    if (quantity < 1 || quantity > item.availableStock) return;

    setShopBusy(true);
    setShopError("");
    setShopMessage("");
    try {
      await api.patch(`/cart/items/${item.id}`, { quantity });
      await loadCart();
    } catch (error) {
      setShopError(getApiErrorMessage(error, "Unable to update quantity."));
      try { await loadCart(); } catch { /* Keep the last displayed cart. */ }
    } finally {
      setShopBusy(false);
    }
  }

  async function removeCartItem(item: CartView) {
    setShopBusy(true);
    setShopError("");
    try {
      await api.delete(`/cart/items/${item.id}`);
      await loadCart();
      setShopMessage(`${item.product.name} removed from your cart.`);
    } catch (error) {
      setShopError(getApiErrorMessage(error, "Unable to remove this item."));
    } finally {
      setShopBusy(false);
    }
  }
  async function toggleWishlist(id: string) {
    if (!accountUser) {
      setAuthError("Please sign in to save products to your wishlist.");
      setAuthMessage("");
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    const wasSaved = wishlist.includes(id);
    setShopBusy(true);
    setShopError("");
    setShopMessage("");
    try {
      if (wasSaved) {
        await api.delete(`/wishlist/items/${id}`);
      } else {
        await api.post("/wishlist/items", { productId: id });
      }
      await loadWishlist();
      setShopMessage(wasSaved ? "Removed from saved items." : "Added to saved items.");
    } catch (error) {
      setShopError(getApiErrorMessage(error, "Unable to update saved items."));
    } finally {
      setShopBusy(false);
    }
  }

  const categoryItems = categories.flatMap((item) => [
    { name: item.name, slug: item.slug },
    ...(item.children ?? []).map((child) => ({ name: child.name, slug: child.slug })),
  ]);
  const uniqueCategories = categoryItems.filter(
    (item, index, all) => all.findIndex((candidate) => candidate.slug === item.slug) === index,
  );

  return (
    <div className="storefront">
      <div className="announcement">
        <Sparkles size={14} />
        <span>Thoughtful finds. Everyday essentials.</span>
        <span className="announcement-divider">·</span>
        <span>Welcome to GlobalCart</span>
      </div>

      <header className="site-header">
        <div className="header-main">
          <button className="icon-button mobile-menu-button" aria-label="Open menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <a className="brand" href="#" aria-label="GlobalCart home"
            onClick={(event) => { event.preventDefault(); updateCategory(""); updateSearch(""); }}>
            <span className="brand-mark"><ShoppingBag size={22} strokeWidth={2.3} /></span>
            <span>global<span className="brand-accent">cart</span><small>SHOP THE EVERYDAY</small></span>
          </a>

          <form className="header-search" onSubmit={(event) => event.preventDefault()}>
            <Search size={19} />
            <input value={search} onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search products, brands and more..." aria-label="Search products" />
            {search && <button type="button" className="search-clear" aria-label="Clear search"
              onClick={() => updateSearch("")}><X size={16} /></button>}
            <button type="submit" className="search-submit">Search</button>
          </form>

          <div className="header-actions">
            <button className="header-action" onClick={() => {
              if (!accountUser) {
                setAuthError("");
                setAuthMessage("");
                setAuthMode("login");
                setAuthOpen(true);
              } else {
                setAuthMessage("");
                setAuthError("");
                setAuthOpen(true);
              }
            }}>
              <UserRound size={21} />
              <span>{accountUser ? accountUser.firstName : "Account"}</span>
            </button>
            <button className="header-action" onClick={() => {
              if (!accountUser) {
                setAuthError("Please sign in to view your orders.");
                setAuthMessage("");
                setAuthMode("login");
                setAuthOpen(true);
                return;
              }
              setOrdersOpen(true);
            }}>
              <ClipboardList size={21} /><span>Orders</span>
            </button>
            <button className="header-action" onClick={() => void openWishlist()}>
              <Heart size={21} /><span>Saved</span>
              {wishlist.length > 0 && <b className="action-count">{wishlist.length}</b>}
            </button>
            <button className="header-action" onClick={() => void openCart()}>
              <ShoppingBag size={21} /><span>Cart</span>
              {(cartData?.itemCount ?? 0) > 0 && <b className="action-count">{cartData?.itemCount}</b>}
            </button>
          </div>
        </div>

        <nav className={`category-nav ${mobileMenuOpen ? "category-nav-open" : ""}`}>
          <button className={`nav-link ${!category ? "nav-link-active" : ""}`}
            onClick={() => updateCategory("")}>All products</button>
          {categoryLoading ? <span className="nav-loading">Loading categories…</span> :
            uniqueCategories.map((item) => (
              <button key={item.slug} className={`nav-link ${category === item.slug ? "nav-link-active" : ""}`}
                onClick={() => updateCategory(item.slug)}>{item.name}</button>
            ))}
          <button className="nav-link nav-link-offers" onClick={() => void openWishlist()}>
            Explore picks <ArrowRight size={15} />
          </button>
        </nav>
        {categoryError && <p className="inline-notice">{categoryError}</p>}
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> YOUR EVERYDAY, ELEVATED</span>
            <h1>Good things.<br />Great <span>finds.</span></h1>
            <p>Discover useful essentials and little upgrades for your everyday life — all in one place.</p>
            <button className="primary-button" onClick={() => void openWishlist()}>
              Explore the collection <ArrowRight size={18} />
            </button>
            <div className="hero-trust">
              <span><Check size={15} /> Curated essentials</span>
              <span><Check size={15} /> Clear pricing</span>
            </div>
          </div>
          <div className="hero-art" aria-label="Illustration of a shopping bag and everyday essentials">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-sun" />
            <div className="art-card art-card-top"><Sparkles size={17} /><span>Little things,<br />big difference.</span></div>
            <div className="art-bag">
              <div className="bag-handle" />
              <div className="bag-face"><ShoppingBag size={72} strokeWidth={1.1} /><span>GC</span></div>
            </div>
            <div className="art-product art-product-one"><Package size={30} /></div>
            <div className="art-product art-product-two"><Heart size={25} /></div>
            <div className="art-card art-card-bottom"><span className="art-check"><Check size={15} /></span><span>Made for<br />everyday living</span></div>
          </div>
          <div className="hero-index"><span>01</span><span className="index-line" /><span>THE COLLECTION</span></div>
        </section>

        <section className="benefits" aria-label="Shopping benefits">
          <div className="benefit"><span className="benefit-icon"><Package size={20} /></span><div><strong>Everyday essentials</strong><small>Useful finds for your life</small></div></div>
          <div className="benefit"><span className="benefit-icon"><ShieldCheck size={20} /></span><div><strong>Transparent pricing</strong><small>Know what you pay</small></div></div>
          <div className="benefit"><span className="benefit-icon"><Truck size={20} /></span><div><strong>Order tracking</strong><small>Follow your order journey</small></div></div>
        </section>

        <section className="catalog-section" id="catalog">
          <div className="section-heading">
            <div>
              <span className="eyebrow section-eyebrow">THE GLOBALCART EDIT</span>
              <h2>Find your next <span>favourite.</span></h2>
              <p>Practical picks, small upgrades, and things worth keeping around.</p>
            </div>
            <div className="catalog-count">{pagination.total} <span>products to explore</span></div>
          </div>

          <div className="catalog-toolbar">
            <div className="filter-heading"><span>Browse</span><span className="filter-separator">/</span>
              <button className={!category ? "filter-active" : ""} onClick={() => updateCategory("")}>Everything</button>
              {category && <><span className="filter-separator">/</span><span className="current-filter">
                {uniqueCategories.find((item) => item.slug === category)?.name ?? category}
              </span></>}
            </div>
            <label className="sort-control"><ArrowDownUp size={16} /><span>Sort by</span>
              <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort products">
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="name_asc">Name: A–Z</option>
              </select><ChevronDown size={14} className="sort-chevron" />
            </label>
          </div>

          {error && <div className="state-panel error-panel"><div className="state-icon"><Package size={24} /></div>
            <h3>Catalog unavailable</h3><p>{error}</p>
            <button className="primary-button" onClick={() => void loadProducts()}>Try again <ArrowRight size={16} /></button>
          </div>}

          {loading && <div className="loading-grid">{Array.from({ length: 4 }, (_, index) =>
            <div className="skeleton-card" key={index}><div className="skeleton-image" /><div className="skeleton-line" /><div className="skeleton-line short" /><div className="skeleton-line price-line" /></div>)}
          </div>}

          {!loading && !error && products.length === 0 && <div className="state-panel">
            <div className="state-icon"><Search size={24} /></div><h3>No products found</h3>
            <p>Try another search or choose a different category.</p>
            <button className="secondary-button" onClick={() => { updateSearch(""); updateCategory(""); }}>Clear filters</button>
          </div>}

          {!loading && !error && products.length > 0 && <>
            <div className="product-grid">
              {products.map((product, index) => {
                const image = product.images?.[0];
                const saved = wishlist.includes(product.id);
                return <article className="product-card" key={product.id} style={{ animationDelay: `${index * 55}ms` }}>
                  <div className="product-image-wrap">
                    {image?.url ? <img className="product-image" src={image.url} alt={image.altText || product.name}
                      loading="lazy" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} /> :
                      <div className="product-image-fallback"><ShoppingBag size={48} /></div>}
                    <span className="product-category">{product.category?.name ?? "Everyday"}</span>
                    <button className={`wishlist-button ${saved ? "wishlist-saved" : ""}`}
                      aria-label={saved ? `Remove ${product.name} from saved items` : `Save ${product.name}`}
                      onClick={() => toggleWishlist(product.id)}><Heart size={18} fill={saved ? "currentColor" : "none"} /></button>
                    {product.availableStock <= 0 && <span className="stock-overlay">Out of stock</span>}
                    {product.availableStock > 0 && product.availableStock <= 5 && <span className="low-stock">Only {product.availableStock} left</span>}
                  </div>
                  <div className="product-details">
                    <span className="product-brand">{product.brand || "GLOBALCART SELECT"}</span>
                    <h3>{product.name}</h3>
                    <p className="product-description">{product.description || "A thoughtful pick for everyday living."}</p>
                    <div className="product-bottom">
                      <div><span className="price-label">PRICE</span><strong className="product-price">{formatPrice(product.price, product.currency)}</strong></div>
                      <button className="quick-view-button" disabled={product.availableStock <= 0 || shopBusy}
                        onClick={() => void addToCart(product)}
                        aria-label={`Add ${product.name} to cart`}><ShoppingBag size={18} /></button>
                    </div>
                  </div>
                </article>;
              })}
            </div>

            <div className="pagination">
              <span>Showing <strong>{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of {pagination.total}</span>
              <div className="pagination-actions">
                <button className="page-button" disabled={page <= 1 || loading} onClick={() => { setPage((current) => current - 1); document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); }}>Previous</button>
                <span className="page-indicator">{page} / {Math.max(pagination.totalPages, 1)}</span>
                <button className="page-button page-next" disabled={page >= pagination.totalPages || loading} onClick={() => { setPage((current) => current + 1); document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); }}>Next <ArrowRight size={15} /></button>
              </div>
            </div>
          </>}
        </section>

        <section className="closing-banner">
          <div className="closing-icon"><Sparkles size={24} /></div>
          <div><span className="eyebrow">A LITTLE MORE EVERYDAY</span><h2>Make room for good finds.</h2><p>Your next everyday favourite might be just a scroll away.</p></div>
          <button className="closing-button" onClick={() => { updateCategory(""); updateSearch(""); document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); }}>Browse everything <ArrowRight size={17} /></button>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <span className="brand-mark"><ShoppingBag size={19} /></span>
          <span>global<span className="brand-accent">cart</span><small>SHOP THE EVERYDAY</small></span>
        </a>
        <p>Everyday finds. One thoughtful cart.</p>
        <span className="footer-copy">© {new Date().getFullYear()} GlobalCart · Demo storefront</span>
      </footer>
      <button className="mobile-search-fab" aria-label="Search products" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><Search size={20} /></button>

      {(cartOpen || wishlistOpen) && (
        <div className="auth-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !shopBusy) {
            setCartOpen(false);
            setWishlistOpen(false);
            setShopError("");
            setShopMessage("");
          }
        }}>
          <section className="shop-dialog" role="dialog" aria-modal="true"
            aria-labelledby="shop-dialog-title">
            <button className="auth-close" type="button" aria-label="Close shopping dialog"
              onClick={() => { setCartOpen(false); setWishlistOpen(false); }}
              disabled={shopBusy}><X size={20} /></button>

            <div className="shop-dialog-heading">
              <div className="auth-symbol">{cartOpen ? <ShoppingBag size={24} /> : <Heart size={24} />}</div>
              <span className="eyebrow">YOUR GLOBALCART</span>
              <h2 id="shop-dialog-title">{cartOpen ? "Your shopping cart" : "Your saved items"}</h2>
              <p>{cartOpen ? `${cartData?.itemCount ?? 0} item(s) in your cart` : `${wishlistProducts.length} saved product(s)`}</p>
            </div>

            {shopError && <p className="auth-error shop-notice" role="alert">{shopError}</p>}
            {shopMessage && <p className="auth-success shop-notice" role="status">{shopMessage}</p>}
            {shopBusy && <p className="shop-loading">Updating your items…</p>}

            {cartOpen && cartData && cartData.items.length > 0 && (
              <div className="shop-item-list">
                {cartData.items.map((item) => (
                  <article className="shop-item" key={item.id}>
                    {item.product.images?.[0]?.url
                      ? <img src={item.product.images[0].url} alt={item.product.images[0].altText || item.product.name} />
                      : <div className="shop-item-placeholder"><ShoppingBag size={24} /></div>}
                    <div className="shop-item-main">
                      <strong>{item.product.name}</strong>
                      <span>{formatPrice(item.product.price, item.product.currency)}</span>
                      <div className="quantity-control">
                        <button type="button" aria-label="Decrease quantity"
                          disabled={shopBusy || item.quantity <= 1}
                          onClick={() => void changeCartQuantity(item, item.quantity - 1)}><Minus size={14} /></button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label="Increase quantity"
                          disabled={shopBusy || item.quantity >= item.availableStock || item.quantity >= 100}
                          onClick={() => void changeCartQuantity(item, item.quantity + 1)}><Plus size={14} /></button>
                      </div>
                      {!item.isAvailable && <small className="auth-error">This product is no longer available.</small>}
                      {!item.isInStock && <small className="auth-error">Quantity exceeds current stock.</small>}
                    </div>
                    <div className="shop-item-end">
                      <strong>{formatPrice(item.subtotal, item.product.currency)}</strong>
                      <button type="button" className="shop-remove" disabled={shopBusy}
                        onClick={() => void removeCartItem(item)} aria-label={`Remove ${item.product.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
                <div className="shop-total">
                  <span>Subtotal</span>
                  <strong>{cartData.currency ? formatPrice(cartData.total, cartData.currency) : "Mixed currencies"}</strong>
                </div>
                {cartData.hasMixedCurrencies && <p className="auth-error">Your cart contains different currencies. Checkout is unavailable until they are separated.</p>}
                <p className="auth-privacy">Taxes, shipping, offers, and final availability are calculated by the backend during checkout.</p>
              </div>
            )}

            {cartOpen && cartData && cartData.items.length === 0 && (
              <div className="shop-empty"><ShoppingBag size={32} /><h3>Your cart is empty</h3><p>Explore the collection and add something you love.</p></div>
            )}

            {wishlistOpen && wishlistProducts.length > 0 && (
              <div className="shop-item-list">
                {wishlistProducts.map((product) => (
                  <article className="shop-item" key={product.id}>
                    {product.images?.[0]?.url
                      ? <img src={product.images[0].url} alt={product.images[0].altText || product.name} />
                      : <div className="shop-item-placeholder"><Heart size={24} /></div>}
                    <div className="shop-item-main">
                      <strong>{product.name}</strong>
                      <span>{formatPrice(product.price, product.currency)}</span>
                      <button type="button" className="shop-text-button" disabled={shopBusy}
                        onClick={() => void addToCart(product)}>Add to cart</button>
                    </div>
                    <button type="button" className="shop-remove" disabled={shopBusy}
                      onClick={() => void toggleWishlist(product.id)} aria-label={`Remove ${product.name} from saved items`}>
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>
            )}

            {wishlistOpen && wishlistProducts.length === 0 && (
              <div className="shop-empty"><HeartHandshake size={32} /><h3>No saved items yet</h3><p>Tap the heart on a product to keep it here.</p></div>
            )}

            <div className="shop-dialog-footer">
              {cartOpen && cartData && cartData.items.length > 0 && (
                <button type="button" className="primary-button" disabled={shopBusy || cartData.hasMixedCurrencies || cartData.items.some((item) => !item.isAvailable || !item.isInStock)}
                  onClick={() => { setShopError(""); setShopMessage(""); setCartOpen(false); setCheckoutOpen(true); }}>
                  Proceed to checkout <ArrowRight size={16} />
                </button>
              )}
              <button type="button" className="secondary-button" onClick={() => {
                setCartOpen(false);
                setWishlistOpen(false);
                document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
              }}>Continue shopping</button>
            </div>
          </section>
        </div>
      )}
      {checkoutOpen && (
        <CustomerCommerceDialog
          mode="checkout"
          onClose={() => setCheckoutOpen(false)}
          onCompleted={() => {
            setCartOpen(false);
            void loadCart().catch(() => setCartData(null));
          }}
        />
      )}
      {ordersOpen && (
        <CustomerCommerceDialog
          mode="orders"
          onClose={() => setOrdersOpen(false)}
          onCompleted={() => undefined}
        />
      )}
      {authOpen && (
        <div className="auth-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !authBusy) setAuthOpen(false);
        }}>
          <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="auth-close" type="button" aria-label="Close account dialog"
              onClick={() => setAuthOpen(false)} disabled={authBusy}><X size={20} /></button>

            {accountUser ? (
              <div className="auth-content">
                <div className="auth-symbol"><UserRound size={25} /></div>
                <span className="eyebrow">YOUR GLOBALCART ACCOUNT</span>
                <h2 id="auth-title">Welcome, {accountUser.firstName}</h2>
                <p className="auth-subtitle">{accountUser.email}</p>
                <div className="account-summary">
                  <span>Account role</span><strong>{accountUser.role}</strong>
                  <span>Full name</span><strong>{accountUser.firstName} {accountUser.lastName}</strong>
                </div>

                {authMessage && <p className="auth-success" role="status">{authMessage}</p>}
                <button
                  className="auth-submit"
                  type="button"
                  onClick={() => {
                    setAuthOpen(false);
                    setAddressBookOpen(true);
                  }}
                >
                  <MapPin size={17} /> Manage addresses
                </button>
                <button className="auth-submit" type="button" onClick={logout}>
                  <LogOut size={17} /> Sign out
                </button>
              </div>
            ) : (
              <div className="auth-content">
                <div className="auth-symbol"><ShoppingBag size={25} /></div>
                <span className="eyebrow">WELCOME TO GLOBALCART</span>
                <h2 id="auth-title">{authMode === "login" ? "Sign in to your account" : "Create your account"}</h2>
                <p className="auth-subtitle">
                  {authMode === "login" ? "Your everyday finds are waiting." : "A few details to get you started."}
                </p>

                <div className="auth-tabs">
                  <button type="button" className={authMode === "login" ? "auth-tab auth-tab-active" : "auth-tab"}
                    onClick={() => { setAuthMode("login"); setAuthError(""); setAuthMessage(""); }}>Sign in</button>
                  <button type="button" className={authMode === "register" ? "auth-tab auth-tab-active" : "auth-tab"}
                    onClick={() => { setAuthMode("register"); setAuthError(""); setAuthMessage(""); }}>Create account</button>
                </div>

                <form className="auth-form" onSubmit={submitAuth}>
                  {authMode === "register" && (
                    <>
                      <div className="auth-name-row">
                        <label>First name
                          <input required autoComplete="given-name" minLength={1} maxLength={80}
                            value={authFirstName} onChange={(event) => setAuthFirstName(event.target.value)}
                            placeholder="First name" />
                        </label>
                        <label>Last name
                          <input required autoComplete="family-name" minLength={1} maxLength={80}
                            value={authLastName} onChange={(event) => setAuthLastName(event.target.value)}
                            placeholder="Last name" />
                        </label>
                      </div>
                      <label>Phone (optional)
                        <input type="tel" autoComplete="tel" maxLength={30}
                          value={authPhone} onChange={(event) => setAuthPhone(event.target.value)}
                          placeholder="Phone number" />
                      </label>
                    </>
                  )}

                  <label>Email address
                    <input type="email" required autoComplete="email" maxLength={254}
                      value={authEmail} onChange={(event) => setAuthEmail(event.target.value)}
                      placeholder="you@example.com" />
                  </label>
                  <label>Password
                    <input type="password" required autoComplete={authMode === "login" ? "current-password" : "new-password"}
                      minLength={authMode === "register" ? 8 : 1} maxLength={72}
                      value={authPassword} onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder={authMode === "register" ? "At least 8 characters" : "Enter your password"} />
                  </label>

                  {authError && <p className="auth-error" role="alert">{authError}</p>}
                  {authMessage && <p className="auth-success" role="status">{authMessage}</p>}

                  <button className="auth-submit" type="submit" disabled={authBusy}>
                    {authBusy ? "Please wait…" : authMode === "login" ? "Sign in securely" : "Create account"}
                    {!authBusy && <ArrowRight size={17} />}
                  </button>
                  <p className="auth-privacy">Your password is sent securely to the GlobalCart API and is never saved in browser storage.</p>
                </form>
              </div>
            )}
          </section>
        </div>
      )}
      {addressBookOpen && (
        <AddressBookDialog onClose={() => setAddressBookOpen(false)} />
      )}
    </div>
  );
}

export default App;