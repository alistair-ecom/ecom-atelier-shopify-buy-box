import {
  DEFAULT_BUY_BOX_COLORS,
  type BuyBoxColors,
  type BuyBoxSize,
  type BuyBoxTierOrder,
} from "../components/types";

export interface BuyBoxConfig {
  productHandle?: string;
  size?: BuyBoxSize;
  customWidth?: number;
  tierOrder?: BuyBoxTierOrder;
  buttonText?: string;
  trustLine1?: string;
  trustLine2?: string;
  showStars?: boolean;
  showCompareAtPrice?: boolean;
  showTotalPrice?: boolean;
  showDiscountBadge?: boolean;
  colors?: Partial<BuyBoxColors>;
  [key: string]: unknown;
}

export interface ResolvedBuyBoxConfig {
  productHandle: string;
  size: BuyBoxSize;
  customWidth: number;
  tierOrder: BuyBoxTierOrder;
  buttonText: string;
  trustLine1: string;
  trustLine2: string;
  showStars: boolean;
  showCompareAtPrice: boolean;
  showTotalPrice: boolean;
  showDiscountBadge: boolean;
  colors: BuyBoxColors;

  [key: string]: unknown;
}

const DEFAULT_CUSTOM_WIDTH = 1000;

function resolveCustomWidth(
  value: number | undefined,
  fallback: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    320,
    Math.round(value),
  );
}

export function resolveBuyBoxConfig(
  fallback: BuyBoxConfig,
  saved?: BuyBoxConfig | null,
): ResolvedBuyBoxConfig {
  const fallbackWidth =
    resolveCustomWidth(
      fallback.customWidth,
      DEFAULT_CUSTOM_WIDTH,
    );

  return {
    productHandle:
      saved?.productHandle ??
      fallback.productHandle ??
      "",

    size:
      saved?.size ??
      fallback.size ??
      "large",

    customWidth:
      resolveCustomWidth(
        saved?.customWidth,
        fallbackWidth,
      ),

    tierOrder:
      saved?.tierOrder ??
      fallback.tierOrder ??
      "descending",

    buttonText:
      saved?.buttonText ??
      fallback.buttonText ??
      "Jetzt kaufen",

    trustLine1:
      saved?.trustLine1 ??
      fallback.trustLine1 ??
      "Kostenloser Versand",

    trustLine2:
      saved?.trustLine2 ??
      fallback.trustLine2 ??
      "30 Tage Geld-zurück-Garantie",

    showStars:
      saved?.showStars ??
      fallback.showStars ??
      true,

    showCompareAtPrice:
      saved?.showCompareAtPrice ??
      fallback.showCompareAtPrice ??
      true,

    showTotalPrice:
      saved?.showTotalPrice ??
      fallback.showTotalPrice ??
      true,

    showDiscountBadge:
      saved?.showDiscountBadge ??
      fallback.showDiscountBadge ??
      true,

    colors: {
      ...DEFAULT_BUY_BOX_COLORS,
      ...fallback.colors,
      ...saved?.colors,
    },
  };
}

export function buyBoxConfigsEqual(
  a: ResolvedBuyBoxConfig,
  b: ResolvedBuyBoxConfig,
) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function normalizePagePath(
  value: string | undefined,
) {
  let path = value?.trim() || "/";
  path = path.split("?")[0].split("#")[0];

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (path.length > 1) {
    path = path.replace(/\/+$/, "");
  }

  return path || "/";
}

export function getCurrentPagePath() {
  if (typeof window === "undefined") {
    return "/";
  }

  return normalizePagePath(
    window.location.pathname || "/",
  );
}

export function asBuyBoxConfig(
  value: unknown,
): BuyBoxConfig | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as BuyBoxConfig;
}
