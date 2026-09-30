import type {
  BuyBoxCartAttribute,
  DiscountKitRule,
} from "./discountKit";

export interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

export interface ShopifySelectedOption {
  name: string;
  value: string;
}

export interface ShopifyProductOption {
  name: string;
  values: string[];
}

export interface ShopifyProductVariant {
  id: string;
  title: string;

  availableForSale: boolean;

  price: ShopifyMoney;

  compareAtPrice?:
    | ShopifyMoney
    | null;

  image?: {
    url: string;
    altText?: string | null;
  } | null;

  selectedOptions:
    ShopifySelectedOption[];
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;

  featuredImage?: {
    url: string;
    altText?: string | null;
  } | null;

  quantityUnit?: string;

  options:
    ShopifyProductOption[];

  variants:
    ShopifyProductVariant[];

  discountKitRules:
    DiscountKitRule[];

  countryCode:
    string | null;

  currencyCode:
    string | null;

  marketHandle:
    string | null;
}

export interface EvaluatedShopifyCart {
  id: string;

  checkoutUrl: string;

  quantity: number;

  /**
   * Shopify-returned price before the
   * applied discount on this merchandise.
   */
  originalSubtotalAmount: number;

  /**
   * Actual Shopify cart total after
   * Discount Kit / Shopify discounts.
   */
  totalAmount: number;

  discountAmount: number;

  currencyCode: string;

  hasDiscount: boolean;
}

interface StorefrontGraphQLResponse<T> {
  data?: T;

  errors?: Array<{
    message: string;

    locations?: Array<{
      line: number;
      column: number;
    }>;

    path?: Array<
      string | number
    >;
  }>;
}

export interface ShopifyStorefrontConfig {
  domain: string;
  storefrontAccessToken: string;
  apiVersion: string;
}

function normalizeStorefrontConfig(
  config: ShopifyStorefrontConfig,
): ShopifyStorefrontConfig {
  const domain =
    config.domain
      .trim()
      .replace(
        /^https?:\/\//i,
        "",
      )
      .replace(
        /\/+$/,
        "",
      );

  const storefrontAccessToken =
    config.storefrontAccessToken
      .trim();

  const apiVersion =
    config.apiVersion
      .trim();

  if (!domain) {
    throw new Error(
      "Shopify storefront domain is missing.",
    );
  }

  if (!storefrontAccessToken) {
    throw new Error(
      "Shopify Storefront access token is missing.",
    );
  }

  if (!apiVersion) {
    throw new Error(
      "Shopify API version is missing.",
    );
  }

  return {
    domain,
    storefrontAccessToken,
    apiVersion,
  };
}

export async function shopifyStorefrontFetch<T>(
  query: string,
  variables: Record<
    string,
    unknown
  > | undefined,
  storefrontConfig: ShopifyStorefrontConfig,
): Promise<T> {
  const config =
    normalizeStorefrontConfig(
      storefrontConfig,
    );

  const response =
    await fetch(
      `https://${config.domain}/api/${config.apiVersion}/graphql.json`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "X-Shopify-Storefront-Access-Token":
            config.storefrontAccessToken,
        },

        body: JSON.stringify({
          query,
          variables,
        }),
      },
    );

  if (!response.ok) {
    throw new Error(
      `Shopify Storefront API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const json =
    (await response.json()) as StorefrontGraphQLResponse<T>;

  if (json.errors?.length) {
    throw new Error(
      json.errors
        .map(
          (error) =>
            error.message,
        )
        .join("\n"),
    );
  }

  if (!json.data) {
    throw new Error(
      "Shopify Storefront API returned no data.",
    );
  }

  return json.data;
}

/* =========================================================
   DISCOUNT KIT METAOBJECT PARSING
========================================================= */

interface ShopifyMetaobjectField {
  key: string;
  type: string;
  value: string | null;
}

interface ShopifyDiscountMetaobject {
  id: string;

  fields:
    ShopifyMetaobjectField[];
}

function fieldValue(
  fields:
    ShopifyMetaobjectField[],
  key: string,
) {
  return (
    fields.find(
      (field) =>
        field.key === key,
    )?.value ?? null
  );
}

function parseNumber(
  value: string | null,
  fallback = 0,
) {
  if (
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function parseBoolean(
  value: string | null,
  fallback = false,
) {
  if (value === null) {
    return fallback;
  }

  return (
    value === "true" ||
    value === "1"
  );
}

function parseNullableBoolean(
  value: string | null,
) {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  return parseBoolean(value);
}

function parseJson<T>(
  value: string | null,
  fallback: T,
): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(
      value,
    ) as T;
  } catch {
    return fallback;
  }
}

function parseStringList(
  value: string | null,
) {
  const parsed =
    parseJson<unknown>(
      value,
      [],
    );

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map(
    (item) =>
      String(item),
  );
}

function parseNumberList(
  value: string | null,
) {
  const parsed =
    parseJson<unknown>(
      value,
      [],
    );

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item) =>
      Number(item),
    )
    .filter((item) =>
      Number.isFinite(item),
    );
}

function parseDiscountKitRule(
  metaobject:
    ShopifyDiscountMetaobject,
): DiscountKitRule {
  const fields =
    metaobject.fields;

  return {
    id:
      metaobject.id,

    discountTitle:
      fieldValue(
        fields,
        "discount_title",
      ) ?? "",

    discountType:
      fieldValue(
        fields,
        "discount_type",
      ) ?? "UNKNOWN_APP",

    method:
      fieldValue(
        fields,
        "method",
      ) ?? "automatic",

    code:
      fieldValue(
        fields,
        "code",
      ) ?? "",

    thresholdType:
      fieldValue(
        fields,
        "threshold_type",
      ) ?? "NONE",

    minimumThresholdValue:
      parseNumber(
        fieldValue(
          fields,
          "minimum_threshold_value",
        ),
      ),

    rewardType:
      fieldValue(
        fields,
        "reward_type",
      ) ?? "",

    minimumRewardValue:
      parseNumber(
        fieldValue(
          fields,
          "minimum_reward_value",
        ),
      ),

    maximumRewardValue:
      parseNumber(
        fieldValue(
          fields,
          "maximum_reward_value",
        ),
      ),

    thresholds:
      parseNumberList(
        fieldValue(
          fields,
          "thresholds",
        ),
      ),

    rewardValues:
      parseNumberList(
        fieldValue(
          fields,
          "reward_values",
        ),
      ),

    rewardQuantities:
      parseNumberList(
        fieldValue(
          fields,
          "reward_quantities",
        ),
      ),

    thresholdMessages:
      parseStringList(
        fieldValue(
          fields,
          "threshold_messages",
        ),
      ),

    tags:
      parseStringList(
        fieldValue(
          fields,
          "tags",
        ),
      ),

    includedMarkets:
      parseStringList(
        fieldValue(
          fields,
          "included_markets",
        ),
      ),

    excludedMarkets:
      parseStringList(
        fieldValue(
          fields,
          "excluded_markets",
        ),
      ),

    includedCustomerTags:
      parseStringList(
        fieldValue(
          fields,
          "included_customer_tags",
        ),
      ),

    excludedCustomerTags:
      parseStringList(
        fieldValue(
          fields,
          "excluded_customer_tags",
        ),
      ),

    currency:
      fieldValue(
        fields,
        "currency",
      ),

    allowB2B:
      parseNullableBoolean(
        fieldValue(
          fields,
          "allow_b2b",
        ),
      ),

    onlyB2B:
      parseNullableBoolean(
        fieldValue(
          fields,
          "only_b2b",
        ),
      ),

    cartAttributeKey:
      fieldValue(
        fields,
        "cart_attribute_key",
      ) ?? "",

    cartAttributeValue:
      fieldValue(
        fields,
        "cart_attribute_value",
      ) ?? "",

    test:
      parseBoolean(
        fieldValue(
          fields,
          "test",
        ),
      ),

    config:
      parseJson<
        Record<
          string,
          unknown
        >
      >(
        fieldValue(
          fields,
          "config",
        ),
        {},
      ),
  };
}

/* =========================================================
   PRODUCT
========================================================= */

const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle(
    $handle: String!
  ) {
    localization {
      country {
        isoCode

        currency {
          isoCode
        }

        market {
          handle
        }
      }
    }

    productByHandle(
      handle: $handle
    ) {
      id
      handle
      title

      featuredImage {
        url
        altText
      }

      quantityUnit: metafield(
        namespace: "custom"
        key: "quantity_unit"
      ) {
        value
      }

      discountKit: metafield(
        namespace: "app--9549316097--discount_kit"
        key: "discounts"
      ) {
        references(
          first: 50
        ) {
          nodes {
            ... on Metaobject {
              id

              fields {
                key
                type
                value
              }
            }
          }
        }
      }

      options {
        name

        optionValues {
          name
        }
      }

      variants(
        first: 100
      ) {
        nodes {
          id
          title
          availableForSale

          price {
            amount
            currencyCode
          }

          compareAtPrice {
            amount
            currencyCode
          }

          image {
            url
            altText
          }

          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
`;

interface ProductByHandleResponse {
  localization: {
    country: {
      isoCode: string;

      currency: {
        isoCode: string;
      };

      market?: {
        handle: string;
      } | null;
    };
  };

  productByHandle: {
    id: string;
    handle: string;
    title: string;

    featuredImage?: {
      url: string;
      altText?:
        | string
        | null;
    } | null;

    quantityUnit?: {
      value: string;
    } | null;

    discountKit?: {
      references?: {
        nodes:
          ShopifyDiscountMetaobject[];
      } | null;
    } | null;

    options: Array<{
      name: string;

      optionValues: Array<{
        name: string;
      }>;
    }>;

    variants: {
      nodes:
        ShopifyProductVariant[];
    };
  } | null;
}

export async function getProductByHandle(
  handle: string,
  storefrontConfig: ShopifyStorefrontConfig,
): Promise<ShopifyProduct> {
  const data =
    await shopifyStorefrontFetch<ProductByHandleResponse>(
      PRODUCT_BY_HANDLE_QUERY,
      {
        handle,
      },
      storefrontConfig,
    );

  if (!data.productByHandle) {
    throw new Error(
      `Shopify product "${handle}" was not found or is not published to the Headless sales channel.`,
    );
  }

  const product =
    data.productByHandle;

  const discountMetaobjects =
    product.discountKit
      ?.references
      ?.nodes ?? [];

  return {
    id:
      product.id,

    handle:
      product.handle,

    title:
      product.title,

    featuredImage:
      product.featuredImage,

    quantityUnit:
      product.quantityUnit
        ?.value
        ?.trim() ||
      "Stk.",

    options:
      product.options.map(
        (option) => ({
          name:
            option.name,

          values:
            option.optionValues.map(
              (value) =>
                value.name,
            ),
        }),
      ),

    variants:
      product.variants.nodes,

    discountKitRules:
      discountMetaobjects.map(
        parseDiscountKitRule,
      ),

    countryCode:
      data.localization
        .country
        .isoCode ?? null,

    currencyCode:
      data.localization
        .country
        .currency
        .isoCode ?? null,

    marketHandle:
      data.localization
        .country
        .market
        ?.handle ?? null,
  };
}

/* =========================================================
   REAL SHOPIFY CART EVALUATION
========================================================= */

const CREATE_CART_MUTATION = `
  mutation CreateBuyBoxCart(
    $input: CartInput!
  ) {
    cartCreate(
      input: $input
    ) {
      cart {
        id
        checkoutUrl
        totalQuantity

        cost {
          subtotalAmount {
            amount
            currencyCode
          }

          totalAmount {
            amount
            currencyCode
          }
        }

        lines(
          first: 20
        ) {
          nodes {
            quantity

            cost {
              subtotalAmount {
                amount
                currencyCode
              }

              totalAmount {
                amount
                currencyCode
              }
            }
          }
        }
      }

      userErrors {
        field
        message
      }
    }
  }
`;

interface CreateCartResponse {
  cartCreate: {
    cart: {
      id: string;

      checkoutUrl:
        string;

      totalQuantity:
        number;

      cost: {
        subtotalAmount:
          ShopifyMoney;

        totalAmount:
          ShopifyMoney;
      };

      lines: {
        nodes: Array<{
          quantity: number;

          cost: {
            subtotalAmount:
              ShopifyMoney;

            totalAmount:
              ShopifyMoney;
          };
        }>;
      };
    } | null;

    userErrors: Array<{
      field?:
        | string[]
        | null;

      message: string;
    }>;
  };
}

interface EvaluateCartInput {
  variantId: string;

  quantity: number;

  countryCode?:
    | string
    | null;

  cartAttributes?:
    BuyBoxCartAttribute[];
}

export async function evaluateVariantCart(
  {
    variantId,
    quantity,
    countryCode,
    cartAttributes = [],
  }: EvaluateCartInput,
  storefrontConfig: ShopifyStorefrontConfig,
): Promise<EvaluatedShopifyCart> {
  const input: Record<
    string,
    unknown
  > = {
    lines: [
      {
        merchandiseId:
          variantId,

        quantity,
      },
    ],
  };

  if (countryCode) {
    input.buyerIdentity = {
      countryCode,
    };
  }

  if (
    cartAttributes.length > 0
  ) {
    input.attributes =
      cartAttributes;
  }

  const data =
    await shopifyStorefrontFetch<CreateCartResponse>(
      CREATE_CART_MUTATION,
      {
        input,
      },
      storefrontConfig,
    );

  if (
    data.cartCreate
      .userErrors.length > 0
  ) {
    throw new Error(
      data.cartCreate.userErrors
        .map(
          (error) =>
            error.message,
        )
        .join("\n"),
    );
  }

  const cart =
    data.cartCreate.cart;

  if (!cart) {
    throw new Error(
      "Shopify did not return a cart.",
    );
  }

  /*
   * Each line subtotal is Shopify's
   * merchandise cost before line-level
   * discounts.
   *
   * We deliberately use Shopify's returned
   * amounts rather than reconstructing price
   * or Discount Kit maths ourselves.
   */
  const originalSubtotalAmount =
    cart.lines.nodes.reduce(
      (sum, line) =>
        sum +
        Number(
          line.cost
            .subtotalAmount
            .amount,
        ),
      0,
    );

  const totalAmount =
    Number(
      cart.cost
        .totalAmount
        .amount,
    );

  const discountAmount =
    Math.max(
      0,
      originalSubtotalAmount -
        totalAmount,
    );

  return {
    id:
      cart.id,

    checkoutUrl:
      cart.checkoutUrl,

    quantity:
      cart.totalQuantity,

    originalSubtotalAmount,

    totalAmount,

    discountAmount,

    currencyCode:
      cart.cost
        .totalAmount
        .currencyCode,

    hasDiscount:
      discountAmount >
      0.004,
  };
}
