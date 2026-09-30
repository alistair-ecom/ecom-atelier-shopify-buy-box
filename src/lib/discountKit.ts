export type DiscountKitDiscountType =
  | "PRODUCT_VOLUME"
  | "ORDER_GOAL"
  | "GWP"
  | "BXGY"
  | "BASIC"
  | "FREE_SHIPPING"
  | "SHIPPING"
  | "CUSTOM"
  | "UNKNOWN_APP"
  | string;

export type DiscountKitRewardType =
  | "PERCENTAGE"
  | "FIXED_AMOUNT"
  | "FIXED_PRICE"
  | string;

export interface DiscountKitRule {
  id: string;

  discountTitle: string;
  discountType: DiscountKitDiscountType;

  method:
    | "automatic"
    | "code"
    | string;

  code: string;

  thresholdType:
    | "QUANTITY"
    | "AMOUNT"
    | "NONE"
    | string;

  minimumThresholdValue: number;

  rewardType: DiscountKitRewardType;

  minimumRewardValue: number;
  maximumRewardValue: number;

  thresholds: number[];
  rewardValues: number[];
  rewardQuantities: number[];
  thresholdMessages: string[];

  tags: string[];

  includedMarkets: string[];
  excludedMarkets: string[];

  includedCustomerTags: string[];
  excludedCustomerTags: string[];

  currency: string | null;

  allowB2B: boolean | null;
  onlyB2B: boolean | null;

  cartAttributeKey: string;
  cartAttributeValue: string;

  test: boolean;

  config: Record<string, unknown>;
}

export interface BuyBoxCartAttribute {
  key: string;
  value: string;
}

export interface BuyBoxOfferDefinition {
  quantity: number;

  /*
   * Presentation only.
   *
   * Actual pricing still comes from the
   * evaluated Shopify cart.
   */
  labels: string[];

  sourceRuleIds: string[];

  cartAttributes: BuyBoxCartAttribute[];
}

interface OfferContext {
  marketHandle?: string | null;
  currencyCode?: string | null;

  /*
   * Required so CUSTOM Discount Kit bucket
   * rules can determine whether a rule
   * actually applies to the currently
   * selected product / variant.
   */
  productId?: string | null;
  variantId?: string | null;
}

/* =========================================================
   CUSTOM DISCOUNT KIT CONFIG TYPES
========================================================= */

interface CustomProductFilterVariant {
  id?: string | number;
}

interface CustomProductFilter {
  id?: string | number;

  variants?: CustomProductFilterVariant[];
}

interface CustomBucketRule {
  name?: string;

  productFilter?: CustomProductFilter[];
}

interface CustomPrereqPart {
  bucket?: string;

  quantity?: number | null;

  total?: number | null;

  uniqueProducts?: number | null;

  uniqueVariants?: number | null;
}

interface CustomTargetPart {
  bucket?: string;

  quantity?: number | null;

  targetSelectionStrategy?: string;
}

interface CustomUniqueGroupRule {
  buckets?: string[];

  minQuantity?: number | null;

  order?: number;
}

interface CustomDiscountValue {
  percentage?: {
    value?: string | number;
  };

  fixedAmount?: {
    value?: string | number;
  };
}

interface CustomDiscountRule {
  message?: string;

  recurring?: boolean;

  requireAllTargets?: boolean;

  discountValue?: CustomDiscountValue;

  prereqParts?: CustomPrereqPart[];

  targetParts?: CustomTargetPart[];

  uniqueGroupRules?: CustomUniqueGroupRule[];

  conditionParts?: unknown[];

  maxRecurrences?: number | null;
}

interface CustomCartAttribute {
  key?: string;
  value?: string;
}

interface CustomDiscountConfig {
  bucketRules?: CustomBucketRule[];

  discountRules?: CustomDiscountRule[];

  cartAttribute?: CustomCartAttribute | null;

  marketHandles?: string[] | null;

  marketOperator?: string;

  test?: boolean;
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeString(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}

function normalizeShopifyId(
  value:
    | string
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const raw =
    String(value).trim();

  /*
   * Handles both:
   *
   * 55136451854714
   *
   * and:
   *
   * gid://shopify/ProductVariant/55136451854714
   */
  const numericTail =
    raw.match(/(\d+)$/);

  return (
    numericTail?.[1] ??
    raw
  );
}

function toFiniteNumber(
  value: unknown,
) {
  const result =
    Number(value);

  return Number.isFinite(result)
    ? result
    : null;
}

function formatConfiguredNumber(
  value: number,
) {
  return Number.isInteger(value)
    ? String(value)
    : String(
        Number(
          value.toFixed(2),
        ),
      );
}

/*
 * Only presentation cleanup.
 *
 * We are NOT using the label to determine
 * the price or whether the discount applies.
 */
function simplifyOfferLabel(
  value: string,
) {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  /*
   * Examples:
   *
   * 2+1 Gratis 100x200cm
   * 2 + 1 Gratis 40x80cm
   *
   * become:
   *
   * 2+1 Gratis
   */
  const germanFree =
    trimmed.match(
      /(\d+)\s*\+\s*(\d+)\s*gratis/i,
    );

  if (germanFree) {
    return `${germanFree[1]}+${germanFree[2]} Gratis`;
  }

  const englishFree =
    trimmed.match(
      /(\d+)\s*\+\s*(\d+)\s*free/i,
    );

  if (englishFree) {
    return `${englishFree[1]}+${englishFree[2]} Free`;
  }

  return trimmed;
}

/* =========================================================
   CONTEXT FILTERING
========================================================= */

function ruleAppliesToContext(
  rule: DiscountKitRule,
  context: OfferContext,
) {
  /*
   * Only automatic discounts should create
   * automatic quantity offers.
   */
  if (
    rule.method !==
    "automatic"
  ) {
    return false;
  }

  if (rule.test) {
    return false;
  }

  /*
   * Current Lovable buy box is an anonymous
   * B2C storefront.
   */
  if (
    rule.onlyB2B === true
  ) {
    return false;
  }

  /*
   * We currently do not have authenticated
   * Shopify customer-tag context.
   *
   * Do not advertise discounts which require
   * particular customer tags.
   */
  if (
    rule
      .includedCustomerTags
      .length > 0
  ) {
    return false;
  }

  const currentMarket =
    context.marketHandle
      ? normalizeString(
          context.marketHandle,
        )
      : null;

  if (
    rule.includedMarkets
      .length > 0
  ) {
    if (!currentMarket) {
      return false;
    }

    const included =
      rule.includedMarkets.some(
        (market) =>
          normalizeString(
            market,
          ) ===
          currentMarket,
      );

    if (!included) {
      return false;
    }
  }

  if (
    currentMarket &&
    rule.excludedMarkets.some(
      (market) =>
        normalizeString(
          market,
        ) ===
        currentMarket,
    )
  ) {
    return false;
  }

  if (
    rule.currency &&
    context.currencyCode &&
    normalizeString(
      rule.currency,
    ) !==
      normalizeString(
        context.currencyCode,
      )
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   CART ATTRIBUTES
========================================================= */

function getRuleCartAttributes(
  rule: DiscountKitRule,
) {
  const attributes =
    new Map<
      string,
      string
    >();

  if (
    rule.cartAttributeKey &&
    rule.cartAttributeValue
  ) {
    attributes.set(
      rule.cartAttributeKey,
      rule.cartAttributeValue,
    );
  }

  const customConfig =
    rule.config as
      CustomDiscountConfig;

  const configAttribute =
    customConfig.cartAttribute;

  if (
    configAttribute?.key &&
    configAttribute.value
  ) {
    attributes.set(
      configAttribute.key,
      configAttribute.value,
    );
  }

  return Array.from(
    attributes.entries(),
  ).map(
    ([key, value]) => ({
      key,
      value,
    }),
  );
}

/* =========================================================
   NORMAL DISCOUNT KIT TIERS
========================================================= */

function getStandardTierLabel(
  rule: DiscountKitRule,
  index: number,
) {
  const rewardValue =
    rule.rewardValues[
      index
    ];

  /*
   * Prefer the actual configured percentage
   * for volume discounts.
   *
   * This is only the badge label.
   * Shopify still determines the money.
   */
  if (
    rule.rewardType ===
      "PERCENTAGE" &&
    Number.isFinite(
      rewardValue,
    ) &&
    rewardValue > 0
  ) {
    return `${formatConfiguredNumber(
      rewardValue,
    )}%`;
  }

  const message =
    rule.thresholdMessages[
      index
    ]?.trim();

  if (message) {
    return simplifyOfferLabel(
      message,
    );
  }

  return simplifyOfferLabel(
    rule.discountTitle,
  );
}

/* =========================================================
   CUSTOM DISCOUNT KIT BUCKET MATCHING
========================================================= */

function getSelectedBuckets(
  rule: DiscountKitRule,
  context: OfferContext,
) {
  const customConfig =
    rule.config as
      CustomDiscountConfig;

  const productId =
    normalizeShopifyId(
      context.productId,
    );

  const variantId =
    normalizeShopifyId(
      context.variantId,
    );

  const selectedBuckets =
    new Set<string>();

  if (
    !productId ||
    !variantId
  ) {
    return selectedBuckets;
  }

  for (
    const bucketRule of
    customConfig.bucketRules ??
    []
  ) {
    const bucketName =
      bucketRule.name?.trim();

    if (!bucketName) {
      continue;
    }

    for (
      const filter of
      bucketRule.productFilter ??
      []
    ) {
      const filterProductId =
        normalizeShopifyId(
          filter.id,
        );

      if (
        filterProductId !==
        productId
      ) {
        continue;
      }

      const variantFilters =
        filter.variants ?? [];

      /*
       * Empty variants means the entire
       * product belongs to this bucket.
       */
      if (
        variantFilters.length ===
        0
      ) {
        selectedBuckets.add(
          bucketName,
        );

        break;
      }

      const containsVariant =
        variantFilters.some(
          (variant) =>
            normalizeShopifyId(
              variant.id,
            ) ===
            variantId,
        );

      if (containsVariant) {
        selectedBuckets.add(
          bucketName,
        );

        break;
      }
    }
  }

  return selectedBuckets;
}

/* =========================================================
   CUSTOM RULE LABEL
========================================================= */

function getCustomRuleLabel(
  discountRule:
    CustomDiscountRule,
  parentRule:
    DiscountKitRule,
) {
  const message =
    discountRule.message
      ?.trim();

  if (message) {
    const simplified =
      simplifyOfferLabel(
        message,
      );

    /*
     * 2+1 Gratis etc.
     */
    if (
      simplified !==
      message
    ) {
      return simplified;
    }
  }

  const percentage =
    toFiniteNumber(
      discountRule
        .discountValue
        ?.percentage
        ?.value,
    );

  if (
    percentage !== null &&
    percentage > 0
  ) {
    return `${formatConfiguredNumber(
      percentage,
    )}%`;
  }

  if (message) {
    return message;
  }

  return simplifyOfferLabel(
    parentRule.discountTitle,
  );
}

/* =========================================================
   OFFER MAP
========================================================= */

interface MutableOffer {
  labels: Set<string>;

  sourceRuleIds:
    Set<string>;

  cartAttributes:
    Map<
      string,
      string
    >;
}

function addOffer(
  offers:
    Map<number, MutableOffer>,

  quantity: number,

  label: string,

  rule: DiscountKitRule,
) {
  if (
    !Number.isFinite(
      quantity,
    ) ||
    quantity <= 1
  ) {
    return;
  }

  const normalizedQuantity =
    Math.round(quantity);

  const existing =
    offers.get(
      normalizedQuantity,
    ) ?? {
      labels:
        new Set<string>(),

      sourceRuleIds:
        new Set<string>(),

      cartAttributes:
        new Map<
          string,
          string
        >(),
    };

  if (label) {
    existing.labels.add(
      label,
    );
  }

  existing.sourceRuleIds.add(
    rule.id,
  );

  for (
    const attribute of
    getRuleCartAttributes(
      rule,
    )
  ) {
    existing.cartAttributes.set(
      attribute.key,
      attribute.value,
    );
  }

  offers.set(
    normalizedQuantity,
    existing,
  );
}

/* =========================================================
   STANDARD QUANTITY RULES
========================================================= */

function addStandardOffers(
  offers:
    Map<number, MutableOffer>,

  rule: DiscountKitRule,
) {
  if (
    rule.thresholdType !==
    "QUANTITY"
  ) {
    return;
  }

  const thresholds =
    rule.thresholds.length >
    0
      ? rule.thresholds
      : rule
            .minimumThresholdValue >
          0
        ? [
            rule
              .minimumThresholdValue,
          ]
        : [];

  thresholds.forEach(
    (
      threshold,
      index,
    ) => {
      addOffer(
        offers,
        threshold,
        getStandardTierLabel(
          rule,
          index,
        ),
        rule,
      );
    },
  );
}

/* =========================================================
   CUSTOM DISCOUNT KIT RULES
========================================================= */

function addCustomOffers(
  offers:
    Map<number, MutableOffer>,

  rule: DiscountKitRule,

  context: OfferContext,
) {
  const config =
    rule.config as
      CustomDiscountConfig;

  const selectedBuckets =
    getSelectedBuckets(
      rule,
      context,
    );

  if (
    selectedBuckets.size ===
    0
  ) {
    return;
  }

  for (
    const discountRule of
    config.discountRules ??
    []
  ) {
    const label =
      getCustomRuleLabel(
        discountRule,
        rule,
      );

    /*
     * -----------------------------------------------------
     * PREREQUISITE-BASED CUSTOM RULES
     *
     * Your 2+1 Gratis rule is represented this way:
     *
     * prereq bucket = selected size
     * quantity = 3
     * target quantity = 1
     *
     * Crucially, the target is drawn from the SAME
     * cart items, so the cart quantity is 3, not 4.
     * -----------------------------------------------------
     */

    const prerequisiteParts =
      (
        discountRule
          .prereqParts ??
        []
      ).filter(
        (part) =>
          typeof part.bucket ===
            "string" &&
          Number.isFinite(
            Number(
              part.quantity,
            ),
          ) &&
          Number(
            part.quantity,
          ) > 1,
      );

    if (
      prerequisiteParts.length >
      0
    ) {
      /*
       * A single-variant buy box can only advertise
       * this rule if every required product bucket
       * can actually be satisfied by the currently
       * selected variant.
       */
      const allPrerequisitesMatch =
        prerequisiteParts.every(
          (part) =>
            part.bucket &&
            selectedBuckets.has(
              part.bucket,
            ),
        );

      if (
        allPrerequisitesMatch
      ) {
        /*
         * If several conditions overlap on the same
         * selected merchandise, the highest required
         * quantity is the useful candidate.
         *
         * Shopify then validates the real cart.
         */
        const quantity =
          Math.max(
            ...prerequisiteParts.map(
              (part) =>
                Number(
                  part.quantity,
                ),
            ),
          );

        addOffer(
          offers,
          quantity,
          label,
          rule,
        );
      }
    }

    /*
     * -----------------------------------------------------
     * UNIQUE-GROUP CUSTOM RULES
     *
     * We only create a same-product quantity candidate
     * when the selected variant belongs to EVERY bucket
     * required by that group.
     *
     * This deliberately prevents your Summerbundle
     * rule from being presented as "3 Handtücher",
     * because that rule references several different
     * product groups.
     * -----------------------------------------------------
     */

    for (
      const groupRule of
      discountRule
        .uniqueGroupRules ??
      []
    ) {
      const buckets =
        groupRule.buckets ??
        [];

      const minimumQuantity =
        Number(
          groupRule
            .minQuantity,
        );

      if (
        buckets.length === 0 ||
        !Number.isFinite(
          minimumQuantity,
        ) ||
        minimumQuantity <= 1
      ) {
        continue;
      }

      const selectedVariantCanSatisfyAllBuckets =
        buckets.every(
          (bucket) =>
            selectedBuckets.has(
              bucket,
            ),
        );

      if (
        !selectedVariantCanSatisfyAllBuckets
      ) {
        continue;
      }

      addOffer(
        offers,
        minimumQuantity,
        label,
        rule,
      );
    }
  }
}

/* =========================================================
   PUBLIC API
========================================================= */

export function buildBuyBoxOffers(
  rules: DiscountKitRule[],
  context: OfferContext,
): BuyBoxOfferDefinition[] {
  const offers =
    new Map<
      number,
      MutableOffer
    >();

  /*
   * Quantity 1 is always available.
   */
  offers.set(1, {
    labels:
      new Set(),

    sourceRuleIds:
      new Set(),

    cartAttributes:
      new Map(),
  });

  for (const rule of rules) {
    if (
      !ruleAppliesToContext(
        rule,
        context,
      )
    ) {
      continue;
    }

    /*
     * Normal Discount Kit volume / quantity
     * structures.
     */
    addStandardOffers(
      offers,
      rule,
    );

    /*
     * Discount Kit's Custom discounts store
     * their real quantity prerequisites in
     * config.discountRules.
     */
    if (
      rule.discountType ===
      "CUSTOM"
    ) {
      addCustomOffers(
        offers,
        rule,
        context,
      );
    }
  }

  return Array.from(
    offers.entries(),
  ).map(
    ([
      quantity,
      value,
    ]) => ({
      quantity,

      labels:
        Array.from(
          value.labels,
        ),

      sourceRuleIds:
        Array.from(
          value.sourceRuleIds,
        ),

      cartAttributes:
        Array.from(
          value
            .cartAttributes
            .entries(),
        ).map(
          ([key, value]) => ({
            key,
            value,
          }),
        ),
    }),
  );
}
