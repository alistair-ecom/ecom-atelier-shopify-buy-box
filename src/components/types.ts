import type {
  DiscountKitRule,
} from "../lib/discountKit";

import type {
  ShopifyStorefrontConfig,
} from "../lib/shopify";

export interface BuyBoxVariant {
  id: string;
  title: string;

  available: boolean;

  price: number;

  compareAtPrice?: number;

  image: string;

  selectedOptions: {
    name: string;
    value: string;
  }[];
}

export interface BuyBoxProduct {
  id: string;
  handle: string;
  title: string;

  quantityUnit?: string;

  options: {
    name: string;
    values: string[];
  }[];

  variants:
    BuyBoxVariant[];

  discountKitRules:
    DiscountKitRule[];

  countryCode?:
    | string
    | null;

  currencyCode?:
    | string
    | null;

  marketHandle?:
    | string
    | null;

  storefrontConfig:
    ShopifyStorefrontConfig;
}

export interface BuyBoxColors {
  sectionBackground: string;

  cardBackground: string;

  selectedCardBorder: string;

  text: string;

  price: string;

  buttonBackground: string;

  buttonText: string;

  discountBadgeBackground: string;

  discountBadgeText: string;

  trustIcon: string;
}

export const DEFAULT_BUY_BOX_COLORS: BuyBoxColors = {
  sectionBackground: "#ffffff",
  cardBackground: "#f2f2f2",
  selectedCardBorder: "#95c11f",
  text: "#25384a",
  price: "#003b5c",
  buttonBackground: "#95c11f",
  buttonText: "#ffffff",
  discountBadgeBackground: "#0db7c4",
  discountBadgeText: "#ffffff",
  trustIcon: "#3aaa35",
};

export type BuyBoxSize =
  | "small"
  | "medium"
  | "large"
  | "full"
  | "custom";

export type BuyBoxTierOrder =
  | "descending"
  | "ascending";

export interface ShopifyBuyBoxProps {
  product: BuyBoxProduct;

  tierOrder?:
    BuyBoxTierOrder;

  trustLine1?: string;
  trustLine2?: string;

  buttonText?: string;

  colors?:
    Partial<BuyBoxColors>;

  size?: BuyBoxSize;

  customWidth?: number;

  showStars?: boolean;

  showCompareAtPrice?: boolean;

  showTotalPrice?: boolean;

  showDiscountBadge?: boolean;
}
