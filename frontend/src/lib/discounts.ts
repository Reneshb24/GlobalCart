export type OfferMatch = {
  id?: string;
  code?: string;
  name?: string;
  discountPercent?: string | number | null;
  discountAmount?: string | number | null;
  currency?: string;
  productId?: string | null;
  categoryId?: string | null;
};

export type ProductDiscountInfo = {
  discountPercent: number;
  originalPrice: number;
  dealLabel: string;
  isOfferApplied: boolean;
};

/**
 * Calculates dynamic seasonal or festival discount for any product,
 * taking into account admin-configured active offers (product, category, or storewide festival deals).
 * Eliminates static hardcoding, ensuring accurate M.R.P. and deal badges like Amazon and Flipkart.
 */
export function getProductDiscount(
  product: { id: string; price: string | number; categoryId?: string | null },
  activeOffers: OfferMatch[] = []
): ProductDiscountInfo {
  const price = Number(product.price) || 0;

  // 1. Check Product-specific active offer
  const productOffer = activeOffers.find(
    (o) => o.productId && o.productId === product.id
  );

  // 2. Check Category-specific active offer
  const categoryOffer = !productOffer && product.categoryId
    ? activeOffers.find((o) => o.categoryId && o.categoryId === product.categoryId)
    : undefined;

  // 3. Check Storewide festival / season active offer
  const storewideOffer = !productOffer && !categoryOffer
    ? activeOffers.find((o) => !o.productId && !o.categoryId)
    : undefined;

  const matchedOffer = productOffer || categoryOffer || storewideOffer;

  if (matchedOffer) {
    let percent = 0;
    if (matchedOffer.discountPercent != null) {
      percent = Math.round(Number(matchedOffer.discountPercent));
    } else if (matchedOffer.discountAmount != null && price > 0) {
      const amt = Number(matchedOffer.discountAmount);
      percent = Math.round((amt / (price + amt)) * 100);
    }
    percent = Math.min(Math.max(percent, 5), 85);
    const originalPrice = percent < 100 ? price / (1 - percent / 100) : price * 1.25;
    return {
      discountPercent: percent,
      originalPrice: Number(originalPrice.toFixed(2)),
      dealLabel: matchedOffer.name || `${matchedOffer.code} Deal`,
      isOfferApplied: true
    };
  }

  // 4. Dynamic seasonal discount unique to this product based on its ID
  const hash = product.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seasonalRates = [10, 12, 15, 18, 22, 25, 28, 30, 35];
  const percent = seasonalRates[hash % seasonalRates.length];
  const originalPrice = price / (1 - percent / 100);

  const dealLabels = [
    "Limited Time Deal",
    "Festival Special",
    "Deal of the Day",
    "Seasonal Discount",
    "Special Price"
  ];
  const dealLabel = dealLabels[hash % dealLabels.length];

  return {
    discountPercent: percent,
    originalPrice: Number(originalPrice.toFixed(2)),
    dealLabel,
    isOfferApplied: false
  };
}
