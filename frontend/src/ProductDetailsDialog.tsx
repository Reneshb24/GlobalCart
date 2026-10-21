import { useEffect, useState } from "react";
import { ArrowLeft, Heart, Minus, Plus, ShoppingBag, Star, X } from "lucide-react";
import { api, getApiErrorMessage, getAuthToken } from "./lib/api";
import ProductImg from "./ProductImg";
import { getProductGallery } from "./lib/productImages";

type ProductDetails = {
  id: string;
  sku?: string;
  name: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  price: string | number;
  currency: string;
  availableStock: number;
  category?: { name: string; slug: string } | null;
  vendor?: { name: string } | null;
  images?: { url: string; altText?: string | null; position?: number }[];
};

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  createdAt: string;
  user?: { firstName: string };
};

type ReviewsResponse = {
  reviews: Review[];
  count: number;
  averageRating: number | null;
};

type Props = {
  slug: string;
  savedProductIds: string[];
  onClose: () => void;
  onAddToCart: (product: ProductDetails, quantity: number) => void;
  onToggleWishlist: (productId: string) => void | Promise<void>;
};

function formatPrice(price: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(price));
}

export default function ProductDetailsDialog({
  slug,
  savedProductIds,
  onClose,
  onAddToCart,
  onToggleWishlist,
}: Props) {
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [reviews, setReviews] = useState<ReviewsResponse | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;
    if (!getAuthToken()) {
      setReviewError("Please sign in to write a review.");
      return;
    }
    if (!reviewTitle.trim() && !reviewComment.trim()) {
      setReviewError("Please provide a title or comment.");
      return;
    }

    setReviewBusy(true);
    setReviewError("");
    setReviewSuccess("");
    try {
      const payload: { rating: number; title?: string; comment?: string } = {
        rating: reviewRating,
      };
      if (reviewTitle.trim()) payload.title = reviewTitle.trim();
      if (reviewComment.trim()) payload.comment = reviewComment.trim();

      await api.post(`/reviews/products/${encodeURIComponent(product.id)}`, payload);
      setReviewSuccess("Thank you! Your review has been submitted for moderation.");
      setReviewTitle("");
      setReviewComment("");
      setReviewFormOpen(false);
    } catch (err) {
      setReviewError(getApiErrorMessage(err, "Unable to submit your review."));
    } finally {
      setReviewBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setProduct(null);
      setReviews(null);
      setSelectedImage(0);
      setQuantity(1);

      try {
        const response = await api.get<{ product: ProductDetails }>(
          `/products/${encodeURIComponent(slug)}`,
        );
        if (cancelled) return;

        const loadedProduct = response.data.product;
        setProduct(loadedProduct);

        try {
          const reviewResponse = await api.get<ReviewsResponse>(
            `/reviews/products/${encodeURIComponent(loadedProduct.id)}`,
          );
          if (!cancelled) setReviews(reviewResponse.data);
        } catch {
          // Product details remain usable if reviews cannot be loaded.
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(getApiErrorMessage(loadError, "Unable to load this product."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const gallery = product ? getProductGallery(product) : [];
  const activeImage = gallery[selectedImage] || gallery[0];
  const saved = product ? savedProductIds.includes(product.id) : false;

  return (
    <div className="product-detail-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="product-detail-dialog" role="dialog" aria-modal="true"
        aria-labelledby="product-detail-title">
        <button className="product-detail-close" type="button"
          aria-label="Close product details" onClick={onClose}>
          <X size={20} />
        </button>

        {loading && <div className="product-detail-state" role="status">Loading product details…</div>}
        {!loading && error && (
          <div className="product-detail-state" role="alert">
            <p>{error}</p>
            <button type="button" className="secondary-button" onClick={onClose}>Back to catalog</button>
          </div>
        )}

        {!loading && !error && product && (
          <>
            <button type="button" className="product-detail-back" onClick={onClose}>
              <ArrowLeft size={16} /> Back to collection
            </button>

            <div className="product-detail-layout">
              <div className="product-detail-gallery">
                <div className="product-detail-main-image">
                  <ProductImg
                    src={activeImage?.url}
                    alt={activeImage?.altText || product.name}
                    fallbackCategory={product.category?.name}
                    fallbackName={product.name}
                    loading="eager"
                  />
                  {product.availableStock <= 0 && <span className="stock-overlay">Out of stock</span>}
                </div>
                {gallery.length > 1 && (
                  <div className="product-detail-thumbnails" aria-label="Product image gallery" role="tablist">
                    {gallery.map((item, index) => (
                      <button key={`${item.url}-${index}`} type="button"
                        className={index === selectedImage ? "product-detail-thumbnail active" : "product-detail-thumbnail"}
                        aria-label={`View angle ${index + 1}: ${item.altText}`}
                        aria-pressed={index === selectedImage}
                        onClick={() => setSelectedImage(index)}>
                        <ProductImg
                          src={item.url}
                          alt={item.altText || `${product.name} ${index + 1}`}
                          fallbackCategory={product.category?.name}
                          fallbackName={`${product.name} view ${index + 1}`}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="product-detail-info">
                <span className="product-brand">{product.brand || "GLOBALCART SELECT"}</span>
                {product.category && <span className="product-detail-category">{product.category.name}</span>}
                <h2 id="product-detail-title">{product.name}</h2>

                {reviews && (
                  <div className="product-detail-rating" aria-label={
                    reviews.averageRating === null
                      ? "No approved reviews"
                      : `${reviews.averageRating} out of 5 from ${reviews.count} reviews`
                  }>
                    <Star size={16} fill="currentColor" />
                    <strong>{reviews.averageRating === null ? "No ratings yet" : reviews.averageRating.toFixed(2)}</strong>
                    <span>{reviews.count} approved review{reviews.count === 1 ? "" : "s"}</span>
                  </div>
                )}

                <p className="product-detail-price">{formatPrice(product.price, product.currency)}</p>
                <p className="product-detail-description">
                  {product.description || "A thoughtful pick for everyday living."}
                </p>

                {product.vendor?.name && (
                  <p className="product-detail-meta"><strong>Sold by</strong> {product.vendor.name}</p>
                )}

                <p className={`product-detail-stock ${product.availableStock <= 0 ? "out" : ""}`}>
                  {product.availableStock <= 0
                    ? "Currently out of stock"
                    : product.availableStock <= 5
                      ? `Only ${product.availableStock} left in stock`
                      : "In stock"}
                </p>

                {product.availableStock > 0 && (
                  <div className="product-detail-purchase">
                    <div className="product-detail-quantity" aria-label="Quantity selector">
                      <button type="button" aria-label="Decrease quantity"
                        disabled={quantity <= 1}
                        onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                        <Minus size={16} />
                      </button>
                      <span aria-live="polite">{quantity}</span>
                      <button type="button" aria-label="Increase quantity"
                        disabled={quantity >= product.availableStock}
                        onClick={() => setQuantity((value) => Math.min(product.availableStock, value + 1))}>
                        <Plus size={16} />
                      </button>
                    </div>
                    <button type="button" className="product-detail-add"
                      onClick={() => onAddToCart(product, quantity)}>
                      <ShoppingBag size={17} /> Add to cart
                    </button>
                  </div>
                )}

                <button type="button"
                  className={saved ? "product-detail-wishlist saved" : "product-detail-wishlist"}
                  onClick={() => void onToggleWishlist(product.id)}>
                  <Heart size={17} fill={saved ? "currentColor" : "none"} />
                  {saved ? "Remove from saved items" : "Save to wishlist"}
                </button>
              </div>
            </div>

            <div className="product-detail-reviews">
              <div className="product-detail-reviews-header">
                <h3>Customer reviews</h3>
                {!reviewFormOpen && !reviewSuccess && (
                  <button
                    type="button"
                    className="product-detail-write-review-btn"
                    onClick={() => {
                      setReviewError("");
                      setReviewFormOpen(true);
                    }}
                  >
                    Write a review
                  </button>
                )}
              </div>

              {reviewSuccess && (
                <p className="auth-success" role="status" style={{ margin: "10px 0" }}>
                  {reviewSuccess}
                </p>
              )}

              {reviewFormOpen && (
                <form className="product-detail-review-form" onSubmit={submitReview}>
                  <h4>Share your feedback</h4>
                  {reviewError && (
                    <p className="auth-error" role="alert" style={{ margin: "6px 0" }}>
                      {reviewError}
                    </p>
                  )}
                  <label>
                    Rating
                    <div className="product-detail-star-picker" role="radiogroup" aria-label="Rating">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={star <= reviewRating ? "star-btn active" : "star-btn"}
                          onClick={() => setReviewRating(star)}
                          aria-label={`${star} star${star > 1 ? "s" : ""}`}
                        >
                          <Star size={20} fill={star <= reviewRating ? "currentColor" : "none"} />
                        </button>
                      ))}
                      <span className="star-rating-text">{reviewRating} of 5 stars</span>
                    </div>
                  </label>
                  <label>
                    Review title (optional)
                    <input
                      maxLength={120}
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="e.g. Excellent everyday quality"
                    />
                  </label>
                  <label>
                    Comments
                    <textarea
                      rows={3}
                      maxLength={3000}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="What did you like or dislike about this product?"
                    />
                  </label>
                  <div className="product-detail-review-form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setReviewFormOpen(false);
                        setReviewError("");
                      }}
                      disabled={reviewBusy}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={reviewBusy || (!reviewTitle.trim() && !reviewComment.trim())}
                    >
                      {reviewBusy ? "Submitting…" : "Submit Review"}
                    </button>
                  </div>
                </form>
              )}

              {!reviews && <p className="product-detail-muted">Reviews are temporarily unavailable.</p>}
              {reviews && reviews.count === 0 && (
                <p className="product-detail-muted">No approved reviews yet. Be the first to review this product!</p>
              )}
              {reviews?.reviews.map((review) => (
                <article className="product-detail-review" key={review.id}>
                  <div className="product-detail-review-heading">
                    <strong>{review.title || "Customer review"}</strong>
                    <span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                  </div>
                  <p>{review.comment}</p>
                  <small>
                    {review.user?.firstName || "Customer"} ·{" "}
                    {new Date(review.createdAt).toLocaleDateString()}
                  </small>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}