/**
 * GlobalCart Product Images & Fallbacks
 * 
 * Provides curated, high-resolution photography and multi-image galleries
 * for catalog products, paired with resilient inline SVG placeholders.
 */

export type ProductImageData = {
  url: string;
  altText: string;
  position: number;
};

// Curated high-resolution studio photography on clean neutral backgrounds
// Each item includes 4 views: front/primary, detail angle, feature/accessories, lifestyle/in-context.
const CATALOG_GALLERIES: Record<string, ProductImageData[]> = {
  // Demo Smartphone
  "GC-DEMO-PHONE-001": [
    {
      url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Smartphone - Front display view",
      position: 0,
    },
    {
      url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Smartphone - Angled sleek profile",
      position: 1,
    },
    {
      url: "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Smartphone - Camera lens detail",
      position: 2,
    },
    {
      url: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Smartphone - Modern desk lifestyle setup",
      position: 3,
    },
  ],

  // Demo Wireless Headphones
  "GC-DEMO-HEADPHONES-001": [
    {
      url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Wireless Headphones - Studio over-ear view",
      position: 0,
    },
    {
      url: "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Wireless Headphones - Cushioned ear-cup detail",
      position: 1,
    },
    {
      url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Wireless Headphones - Headband and folded hinge",
      position: 2,
    },
    {
      url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Wireless Headphones - Workspace desk lifestyle",
      position: 3,
    },
  ],

  // Demo USB-C Charger
  "GC-DEMO-CHARGER-001": [
    {
      url: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80",
      altText: "Demo USB-C Charger - Compact fast wall adapter",
      position: 0,
    },
    {
      url: "https://images.unsplash.com/photo-1622445262464-84b14e0745b3?auto=format&fit=crop&w=800&q=80",
      altText: "Demo USB-C Charger - Dual port interface detail",
      position: 1,
    },
    {
      url: "https://images.unsplash.com/photo-1608248597359-009c9f0b1a03?auto=format&fit=crop&w=800&q=80",
      altText: "Demo USB-C Charger - Reinforced braided cable accessory",
      position: 2,
    },
    {
      url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
      altText: "Demo USB-C Charger - Travel pouch and plug in use",
      position: 3,
    },
  ],

  // Demo Ceramic Mug
  "GC-DEMO-MUG-001": [
    {
      url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Ceramic Mug - Minimalist artisan ceramic mug",
      position: 0,
    },
    {
      url: "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Ceramic Mug - Top-down steaming warm coffee",
      position: 1,
    },
    {
      url: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Ceramic Mug - Ergonomic handle & glazed finish",
      position: 2,
    },
    {
      url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80",
      altText: "Demo Ceramic Mug - Morning table setting lifestyle",
      position: 3,
    },
  ],
};

// Fallback mapping by slug or lowercase keyword
const SLUG_MAP: Record<string, string> = {
  "demo-smartphone": "GC-DEMO-PHONE-001",
  "demo-wireless-headphones": "GC-DEMO-HEADPHONES-001",
  "demo-usb-c-charger": "GC-DEMO-CHARGER-001",
  "demo-ceramic-mug": "GC-DEMO-MUG-001",
};

/**
 * Generates a clean, modern inline SVG data URL as a guaranteed zero-network fallback.
 */
export function getCategoryPlaceholderSvg(categoryName?: string, productName?: string): string {
  const cat = (categoryName || "Everyday").toUpperCase();
  const name = (productName || "Product").slice(0, 24);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f8fafc" />
        <stop offset="100%" stop-color="#e2e8f0" />
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#bg)" />
    <circle cx="200" cy="180" r="64" fill="#cbd5e1" opacity="0.6" />
    <path d="M170 180 L230 180 M200 150 L200 210" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
    <rect x="160" y="145" width="80" height="70" rx="8" fill="none" stroke="#475569" stroke-width="3" />
    <text x="200" y="278" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" fill="#15803d" text-anchor="middle">${cat}</text>
    <text x="200" y="302" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#1e293b" text-anchor="middle">${name}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Checks if a URL is just a generic placehold.co placeholder that should be upgraded
 * to high-resolution product photography.
 */
function isGenericPlaceholder(url?: string | null): boolean {
  if (!url) return true;
  return url.includes("placehold.co") || url.includes("via.placeholder.com");
}

/**
 * Resolves the full gallery of images for a product.
 * Returns at least 3-4 images for known catalog items.
 */
export function getProductGallery(product?: {
  sku?: string;
  slug?: string;
  name?: string;
  category?: { name?: string; slug?: string } | null;
  images?: { url: string; altText?: string | null; position?: number }[];
}): ProductImageData[] {
  if (!product) {
    return [
      {
        url: getCategoryPlaceholderSvg(),
        altText: "Product item",
        position: 0,
      },
    ];
  }

  // 1. Check if SKU has curated gallery
  const sku = product.sku?.toUpperCase();
  if (sku && CATALOG_GALLERIES[sku]) {
    return CATALOG_GALLERIES[sku];
  }

  // 2. Check if slug maps to curated gallery
  const slug = product.slug?.toLowerCase();
  if (slug && SLUG_MAP[slug] && CATALOG_GALLERIES[SLUG_MAP[slug]]) {
    return CATALOG_GALLERIES[SLUG_MAP[slug]];
  }

  // 3. Check by name pattern
  const lowerName = (product.name || "").toLowerCase();
  if (lowerName.includes("phone")) return CATALOG_GALLERIES["GC-DEMO-PHONE-001"];
  if (lowerName.includes("headphone")) return CATALOG_GALLERIES["GC-DEMO-HEADPHONES-001"];
  if (lowerName.includes("charger")) return CATALOG_GALLERIES["GC-DEMO-CHARGER-001"];
  if (lowerName.includes("mug")) return CATALOG_GALLERIES["GC-DEMO-MUG-001"];

  // 4. If product has real, non-placeholder images in DB, return them
  const validImages = (product.images || []).filter((img) => !isGenericPlaceholder(img.url));
  if (validImages.length > 0) {
    return validImages.map((img, index) => ({
      url: img.url,
      altText: img.altText || `${product.name || "Product"} image ${index + 1}`,
      position: img.position ?? index,
    }));
  }

  // 5. Fallback SVG
  const categoryName = product.category?.name || "Everyday";
  return [
    {
      url: getCategoryPlaceholderSvg(categoryName, product.name),
      altText: product.name || "Product item",
      position: 0,
    },
  ];
}

/**
 * Returns primary product image details for cards, listings, and summary rows.
 */
export function getPrimaryProductImage(product?: {
  sku?: string;
  slug?: string;
  name?: string;
  category?: { name?: string; slug?: string } | null;
  images?: { url: string; altText?: string | null; position?: number }[];
}): { url: string; altText: string } {
  const gallery = getProductGallery(product);
  const primary = gallery[0];
  return {
    url: primary ? primary.url : getCategoryPlaceholderSvg(product?.category?.name, product?.name),
    altText: primary ? primary.altText : product?.name || "Product",
  };
}

/**
 * Returns a quick thumbnail for cart, wishlist, orders, or admin tables.
 */
export function getProductThumbnail(
  productName: string,
  sku?: string,
  existingUrl?: string | null
): string {
  if (existingUrl && !isGenericPlaceholder(existingUrl)) {
    return existingUrl;
  }
  const primary = getPrimaryProductImage({
    name: productName,
    sku,
  });
  return primary.url;
}
