import React, { useState } from "react";
import { getCategoryPlaceholderSvg } from "./lib/productImages";

type ProductImgProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackCategory?: string;
  fallbackName?: string;
  loading?: "lazy" | "eager";
  style?: React.CSSProperties;
};

export default function ProductImg({
  src,
  alt,
  className = "",
  fallbackCategory,
  fallbackName,
  loading = "lazy",
  style,
}: ProductImgProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // If no src or errored, use SVG data URL
  const fallbackSrc = getCategoryPlaceholderSvg(fallbackCategory, fallbackName || alt);
  const imageSrc = !src || error ? fallbackSrc : src;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`product-responsive-img ${loaded ? "img-loaded" : "img-loading"} ${className}`}
      loading={loading}
      style={style}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (!error) {
          setError(true);
        }
      }}
    />
  );
}
