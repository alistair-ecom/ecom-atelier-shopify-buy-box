export {
  BuyBox,
  DEFAULT_BUY_BOX_API_URL,
} from "./BuyBox";

export type {
  BuyBoxProps,
} from "./BuyBox";

export type {
  BuyBoxColors,
  BuyBoxProduct,
  BuyBoxSize,
  BuyBoxTierOrder,
  BuyBoxVariant,
  ShopifyBuyBoxProps,
} from "./components/types";

export type {
  ShopifyStorefrontConfig,
} from "./lib/shopify";

export type {
  BuyBoxConfig,
  ResolvedBuyBoxConfig,
} from "./lib/buyBoxConfig";

export {
  ShopifyBuyBox,
} from "./components/ShopifyBuyBox";

export {
  buildBuyBoxOffers,
} from "./lib/discountKit";

import "./components/ShopifyBuyBox.css";
