import React, { useState, useEffect } from "react";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | undefined | null;
  alt: string;
  categoryId?: string;
  isPizza?: boolean;
  className?: string;
}

export function getDefaultPhoto(categoryId?: string, isPizza?: boolean): string {
  const cat = (categoryId || "").toLowerCase();
  if (isPizza || cat.includes("salgada") || cat.includes("doce") || cat.includes("pizza")) {
    if (cat.includes("doce")) {
      // Premium Unsplash Sweet Chocolate/Strawberry Pizza
      return "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80";
    }
    // Premium Unsplash Savory Woodfired Pizza
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80";
  }
  if (cat.includes("esfirra")) {
    // Beautiful baked pastry/esfirra
    return "https://images.unsplash.com/photo-1544982503-9f984c14501a?w=600&auto=format&fit=crop&q=80";
  }
  if (cat.includes("bebida") || cat.includes("refrigerante") || cat.includes("suco") || cat.includes("drink")) {
    // Elegant cold soft drink with ice and lemon
    return "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80";
  }
  // Generic fall back pizza
  return "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80";
}

export default function OptimizedImage({
  src,
  alt,
  categoryId,
  isPizza,
  className = "",
  ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(() => {
    if (!src || src.trim() === "") {
      return getDefaultPhoto(categoryId, isPizza);
    }
    return src;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Initialize and validate src
  useEffect(() => {
    if (!src || src.trim() === "") {
      setImageSrc(getDefaultPhoto(categoryId, isPizza));
    } else {
      setImageSrc(src);
    }
  }, [src, categoryId, isPizza]);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
    // Switch to fallback on load error
    const fallback = getDefaultPhoto(categoryId, isPizza);
    if (imageSrc !== fallback) {
      setImageSrc(fallback);
    }
  };

  return (
    <div className={`relative overflow-hidden w-full h-full bg-[#121214] ${className}`}>
      {/* Shimmer skeleton loader */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-[length:400%_100%] animate-pulse" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-500 ease-out ${
          loading ? "opacity-0" : "opacity-100"
        }`}
        {...props}
      />
    </div>
  );
}
