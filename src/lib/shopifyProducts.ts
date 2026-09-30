import {
  shopifyStorefrontFetch,
  type ShopifyStorefrontConfig,
} from "./shopify";

export interface ShopifyProductChoice {
  id: string;
  handle: string;
  title: string;

  featuredImage?: {
    url: string;
    altText?: string | null;
  } | null;
}

const PRODUCT_CHOICES_QUERY = `
  query BuyBoxProductChoices {
    products(
      first: 100
      sortKey: TITLE
    ) {
      nodes {
        id
        handle
        title

        featuredImage {
          url
          altText
        }
      }
    }
  }
`;

interface ProductChoicesResponse {
  products: {
    nodes: ShopifyProductChoice[];
  };
}

export async function getShopifyProductChoices(
  storefrontConfig: ShopifyStorefrontConfig,
): Promise<ShopifyProductChoice[]> {
  const data =
    await shopifyStorefrontFetch<ProductChoicesResponse>(
      PRODUCT_CHOICES_QUERY,
      undefined,
      storefrontConfig,
    );

  return data.products.nodes;
}
