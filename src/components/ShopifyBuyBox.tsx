import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import "./ShopifyBuyBox.css";

import {
  buildBuyBoxOffers,
  type BuyBoxOfferDefinition,
} from "../lib/discountKit";

import {
  evaluateVariantCart,
  type EvaluatedShopifyCart,
} from "../lib/shopify";

import {
  DEFAULT_BUY_BOX_COLORS,
  type BuyBoxProduct,
  type BuyBoxVariant,
  type ShopifyBuyBoxProps,
} from "./types";

interface OfferEvaluationState {
  status:
    | "loading"
    | "success"
    | "error";

  cart?:
    EvaluatedShopifyCart;

  error?: string;
}

function formatMoney(
  value: number,
  currencyCode: string,
) {
  return new Intl.NumberFormat(
    "de-DE",
    {
      style: "currency",
      currency:
        currencyCode,
    },
  ).format(value);
}

function getOptionValue(
  variant:
    | BuyBoxVariant
    | undefined,
  optionName: string,
) {
  return variant
    ?.selectedOptions
    .find(
      (option) =>
        option.name ===
        optionName,
    )
    ?.value;
}

function findVariant(
  product:
    BuyBoxProduct,

  selectedOptions:
    Record<string, string>,
) {
  return product.variants.find(
    (variant) =>
      variant.selectedOptions.every(
        (option) =>
          selectedOptions[
            option.name
          ] ===
          option.value,
      ),
  );
}

function getOptionKind(
  optionName: string,
):
  | "size"
  | "color"
  | "other" {
  const normalized =
    optionName.toLowerCase();

  if (
    [
      "size",
      "größe",
      "groesse",
    ].includes(normalized)
  ) {
    return "size";
  }

  if (
    [
      "color",
      "colour",
      "farbe",
    ].includes(normalized)
  ) {
    return "color";
  }

  return "other";
}

function getOptionLabel(
  optionName: string,
) {
  const kind =
    getOptionKind(
      optionName,
    );

  if (kind === "size") {
    return "Größe";
  }

  if (kind === "color") {
    return "Farbe";
  }

  return optionName;
}

function getOfferLabel(
  offer:
    BuyBoxOfferDefinition,
) {
  return (
    offer.labels[0] ??
    ""
  );
}

function isWideBadge(
  label: string,
) {
  return label.length > 5;
}

export function ShopifyBuyBox({
  product,
  tierOrder = "descending",
  trustLine1 =
    "Kostenloser Versand",
  trustLine2 =
    "30 Tage Geld-zurück-Garantie",
  buttonText =
    "Jetzt kaufen",
  colors:
    colorOverrides,
  size = "large",
  customWidth = 1000,
  showStars = true,
  showCompareAtPrice = true,
  showTotalPrice = true,
  showDiscountBadge = true,
}: ShopifyBuyBoxProps) {
  const colors = {
    ...DEFAULT_BUY_BOX_COLORS,
    ...colorOverrides,
  };

  const widthMap = {
    small: "800px",
    medium: "1000px",
    large: "1200px",
    full: "100%",
    custom:
      `${customWidth}px`,
  };

  const buyBoxMaxWidth =
    widthMap[size];

  const initialSelectedOptions =
    useMemo(() => {
      const firstVariant =
        product.variants.find(
          (variant) =>
            variant.available,
        ) ??
        product.variants[0];

      const options:
        Record<
          string,
          string
        > = {};

      product.options.forEach(
        (option) => {
          options[
            option.name
          ] =
            getOptionValue(
              firstVariant,
              option.name,
            ) ??
            option.values[0];
        },
      );

      return options;
    }, [product]);

  const [
    selectedOptions,
    setSelectedOptions,
  ] = useState<
    Record<string, string>
  >(
    initialSelectedOptions,
  );

  useEffect(() => {
    setSelectedOptions(
      initialSelectedOptions,
    );
  }, [
    product.id,
    initialSelectedOptions,
  ]);

  const selectedVariant =
    useMemo(
      () =>
        findVariant(
          product,
          selectedOptions,
        ),
      [
        product,
        selectedOptions,
      ],
    );

  /*
   * Discount Kit decides which configured
   * quantity offers exist.
   *
   * The current product and selected variant
   * are passed into the parser so CUSTOM
   * Discount Kit bucket rules can determine
   * whether they actually apply.
   *
   * No pricing is calculated here.
   */
  const offers =
    useMemo(() => {
      const built =
        buildBuyBoxOffers(
          product.discountKitRules,
          {
            marketHandle:
              product.marketHandle,

            currencyCode:
              product.currencyCode,

            productId:
              product.id,

            variantId:
              selectedVariant?.id ??
              null,
          },
        );

      return built.sort(
        (a, b) =>
          tierOrder ===
          "descending"
            ? b.quantity -
              a.quantity
            : a.quantity -
              b.quantity,
      );
    }, [
      product.discountKitRules,
      product.marketHandle,
      product.currencyCode,
      product.id,
      selectedVariant?.id,
      tierOrder,
    ]);

  const [
    selectedQuantity,
    setSelectedQuantity,
  ] = useState(
    offers[0]?.quantity ??
      1,
  );

  const [
    evaluations,
    setEvaluations,
  ] = useState<
    Record<
      number,
      OfferEvaluationState
    >
  >({});

  /*
   * Every time the variant changes,
   * Shopify evaluates the real cart for
   * every configured quantity.
   *
   * Discount Kit therefore applies exactly
   * as it would in the Shopify cart.
   */
  useEffect(() => {
    if (!selectedVariant) {
      return;
    }

    let cancelled =
      false;

    const loadingState:
      Record<
        number,
        OfferEvaluationState
      > = {};

    offers.forEach(
      (offer) => {
        loadingState[
          offer.quantity
        ] = {
          status:
            "loading",
        };
      },
    );

    setEvaluations(
      loadingState,
    );

    async function evaluateOffers() {
      const results =
        await Promise.all(
          offers.map(
            async (
              offer,
            ) => {
              try {
                const cart =
                  await evaluateVariantCart(
                    {
                      variantId:
                        selectedVariant!
                          .id,

                      quantity:
                        offer.quantity,

                      countryCode:
                        product.countryCode,

                      cartAttributes:
                        offer.cartAttributes,
                    },
                    product.storefrontConfig,
                  );

                return [
                  offer.quantity,
                  {
                    status:
                      "success",

                    cart,
                  } satisfies OfferEvaluationState,
                ] as const;
              } catch (error) {
                return [
                  offer.quantity,
                  {
                    status:
                      "error",

                    error:
                      error instanceof
                      Error
                        ? error.message
                        : "Unknown cart error",
                  } satisfies OfferEvaluationState,
                ] as const;
              }
            },
          ),
        );

      if (cancelled) {
        return;
      }

      setEvaluations(
        Object.fromEntries(
          results,
        ),
      );
    }

    evaluateOffers();

    return () => {
      cancelled = true;
    };
  }, [
    selectedVariant?.id,
    offers,
    product.countryCode,
    product.storefrontConfig.domain,
    product.storefrontConfig.storefrontAccessToken,
    product.storefrontConfig.apiVersion,
  ]);

  /*
   * If DK metadata suggests an offer but
   * Shopify evaluates the real cart and
   * does NOT apply any discount, we remove
   * that offer.
   *
   * Shopify remains final authority.
   */
  const visibleOffers =
    useMemo(
      () =>
        offers.filter(
          (offer) => {
            if (
              offer.quantity ===
              1
            ) {
              return true;
            }

            const evaluation =
              evaluations[
                offer.quantity
              ];

            if (
              !evaluation ||
              evaluation.status ===
                "loading"
            ) {
              return true;
            }

            if (
              evaluation.status ===
              "error"
            ) {
              return false;
            }

            return (
              evaluation.cart
                ?.hasDiscount ??
              false
            );
          },
        ),
      [
        offers,
        evaluations,
      ],
    );

  const visibleQuantityKey =
    visibleOffers
      .map(
        (offer) =>
          offer.quantity,
      )
      .join(",");

  useEffect(() => {
    if (
      visibleOffers.length === 0
    ) {
      return;
    }

    const stillVisible =
      visibleOffers.some(
        (offer) =>
          offer.quantity ===
          selectedQuantity,
      );

    if (!stillVisible) {
      setSelectedQuantity(
        visibleOffers[0]
          .quantity,
      );
    }
  }, [
    visibleQuantityKey,
    selectedQuantity,
  ]);

  const selectedOffer =
    visibleOffers.find(
      (offer) =>
        offer.quantity ===
        selectedQuantity,
    ) ??
    visibleOffers[0];

  const quantityUnit =
    product.quantityUnit
      ?.trim() ||
    "Stk.";

  const handleOptionChange = (
    optionName: string,
    value: string,
  ) => {
    setSelectedOptions(
      (current) => ({
        ...current,
        [optionName]:
          value,
      }),
    );
  };

  const handleBuyNow = (
    offer:
      BuyBoxOfferDefinition,
  ) => {
    const evaluation =
      evaluations[
        offer.quantity
      ];

    if (
      evaluation?.status !==
        "success" ||
      !evaluation.cart
    ) {
      return;
    }

    window.location.href =
      evaluation.cart
        .checkoutUrl;
  };

  const renderSelectors =
    () => (
      <div
        className="shopify-buy-box__selectors"
        onClick={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        {product.options.map(
          (option) => {
            const optionKind =
              getOptionKind(
                option.name,
              );

            return (
              <label
                className={`shopify-buy-box__selector shopify-buy-box__selector--${optionKind}`}
                key={
                  option.name
                }
              >
                <span>
                  {getOptionLabel(
                    option.name,
                  )}
                </span>

                <select
                  value={
                    selectedOptions[
                      option.name
                    ]
                  }
                  onChange={(
                    event,
                  ) =>
                    handleOptionChange(
                      option.name,
                      event
                        .target
                        .value,
                    )
                  }
                >
                  {option.values.map(
                    (value) => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {
                          value
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>
            );
          },
        )}
      </div>
    );

  const renderTrustLines =
    () => (
      <div className="shopify-buy-box__trust">
        {trustLine1 && (
          <div>
            <span className="shopify-buy-box__trust-icon">
              ✓
            </span>

            <span>
              {
                trustLine1
              }
            </span>
          </div>
        )}

        {trustLine2 && (
          <div>
            <span className="shopify-buy-box__trust-icon">
              ✓
            </span>

            <span>
              {
                trustLine2
              }
            </span>
          </div>
        )}
      </div>
    );

  const renderOfferPrice = (
    offer:
      BuyBoxOfferDefinition,
  ) => {
    const state =
      evaluations[
        offer.quantity
      ];

    if (
      !state ||
      state.status ===
        "loading"
    ) {
      return (
        <div className="shopify-buy-box__price-loading">
          Preis wird
          geladen…
        </div>
      );
    }

    if (
      state.status ===
        "error" ||
      !state.cart
    ) {
      return (
        <div className="shopify-buy-box__price-error">
          Preis im
          Checkout
        </div>
      );
    }

    const cart =
      state.cart;

    /*
     * Shopify / Discount Kit has already
     * calculated the final cart total.
     *
     * This division is only used to express
     * that final Shopify amount as an
     * effective per-unit price.
     *
     * It does NOT calculate the discount.
     */
    const effectiveUnitPrice =
      cart.totalAmount /
      offer.quantity;

    /*
     * The crossed-out reference price comes
     * from the selected Shopify variant's
     * Compare-at price.
     *
     * It is completely separate from
     * Discount Kit pricing.
     *
     * Example:
     *
     * Current Shopify price:    €44.90
     * Compare-at price:         €59.90
     *
     * For quantity 3:
     * crossed-out reference =   €179.70
     */
    const compareAtUnitPrice =
      selectedVariant
        ?.compareAtPrice;

    /*
     * Only show a crossed-out reference when
     * Shopify actually has a valid Compare-at
     * price above the normal variant price.
     */
    const compareAtTotal =
      compareAtUnitPrice !==
        undefined &&
      selectedVariant &&
      compareAtUnitPrice >
        selectedVariant.price
        ? compareAtUnitPrice *
          offer.quantity
        : null;

    /*
     * Single item.
     *
     * This now also shows the Shopify
     * Compare-at price when one exists.
     */
    if (
      offer.quantity === 1
    ) {
      return (
        <>
          <div className="shopify-buy-box__unit-price">
            {formatMoney(
              cart.totalAmount,
              cart.currencyCode,
            )}
          </div>

          {showCompareAtPrice &&
            compareAtTotal !==
              null && (
            <div className="shopify-buy-box__original-price">
              statt{" "}
              {formatMoney(
                compareAtTotal,
                cart.currencyCode,
              )}
            </div>
          )}
        </>
      );
    }

    /*
     * Multi-item offer.
     *
     * Actual total comes from Shopify after
     * Discount Kit evaluation.
     *
     * Crossed-out reference comes from:
     * Compare-at price × quantity.
     */
    return (
      <>
        <div className="shopify-buy-box__unit-price">
          {formatMoney(
            effectiveUnitPrice,
            cart.currencyCode,
          )}{" "}
          je {quantityUnit}
        </div>

        {showTotalPrice && (
          <div className="shopify-buy-box__total-price">
            Gesamt:{" "}
            {formatMoney(
              cart.totalAmount,
              cart.currencyCode,
            )}
          </div>
        )}

        {showCompareAtPrice &&
          compareAtTotal !==
            null && (
          <div className="shopify-buy-box__original-price">
            statt{" "}
            {formatMoney(
              compareAtTotal,
              cart.currencyCode,
            )}
          </div>
        )}
      </>
    );
  };

  const renderBadge = (
    offer:
      BuyBoxOfferDefinition,
  ) => {
    if (
      !showDiscountBadge ||
      offer.quantity === 1
    ) {
      return null;
    }

    const label =
      getOfferLabel(offer);

    if (!label) {
      return null;
    }

    return (
      <div
        className={`shopify-buy-box__discount-badge ${
          isWideBadge(
            label,
          )
            ? "shopify-buy-box__discount-badge--wide"
            : ""
        }`}
      >
        {label}
      </div>
    );
  };

  if (!selectedVariant) {
    return (
      <section
        className={`shopify-buy-box shopify-buy-box--${size}`}
      >
        <div
          className="shopify-buy-box__inner"
          style={{
            maxWidth:
              buyBoxMaxWidth,
          }}
        >
          <div className="shopify-buy-box__unavailable">
            Diese
            Variantenkombination
            ist derzeit nicht
            verfügbar.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`shopify-buy-box shopify-buy-box--${size}`}
      style={
        {
          "--buybox-section-bg":
            colors.sectionBackground,

          "--buybox-card-bg":
            colors.cardBackground,

          "--buybox-selected-border":
            colors.selectedCardBorder,

          "--buybox-text":
            colors.text,

          "--buybox-price":
            colors.price,

          "--buybox-button-bg":
            colors.buttonBackground,

          "--buybox-button-text":
            colors.buttonText,

          "--buybox-discount-bg":
            colors.discountBadgeBackground,

          "--buybox-discount-text":
            colors.discountBadgeText,

          "--buybox-trust-icon":
            colors.trustIcon,
        } as CSSProperties
      }
    >
      <div
        className="shopify-buy-box__inner"
        style={{
          maxWidth:
            buyBoxMaxWidth,
        }}
      >
        {/* DESKTOP */}

        <div className="shopify-buy-box__desktop">
          <div className="shopify-buy-box__cards">
            {visibleOffers.map(
              (offer) => {
                const isSelected =
                  selectedQuantity ===
                  offer.quantity;

                const state =
                  evaluations[
                    offer.quantity
                  ];

                const canBuy =
                  selectedVariant.available &&
                  state?.status ===
                    "success" &&
                  !!state.cart;

                return (
                  <article
                    key={
                      offer.quantity
                    }
                    className={`shopify-buy-box__card ${
                      isSelected
                        ? "shopify-buy-box__card--selected"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedQuantity(
                        offer.quantity,
                      )
                    }
                  >
                    <h3 className="shopify-buy-box__quantity">
                      {
                        offer.quantity
                      }{" "}
                      {quantityUnit}
                    </h3>

                    {showStars && (
                      <div className="shopify-buy-box__stars">
                        ★★★★★
                      </div>
                    )}

                    <div className="shopify-buy-box__image-wrap">
                      <img
                        src={
                          selectedVariant.image
                        }
                        alt={`${product.title} ${selectedVariant.title}`}
                        className="shopify-buy-box__image"
                      />

                      {renderBadge(
                        offer,
                      )}
                    </div>

                    {renderSelectors()}

                    <div className="shopify-buy-box__price-area">
                      {renderOfferPrice(
                        offer,
                      )}
                    </div>

                    <button
                      type="button"
                      className="shopify-buy-box__button"
                      disabled={
                        !canBuy
                      }
                      onClick={(
                        event,
                      ) => {
                        event.stopPropagation();

                        handleBuyNow(
                          offer,
                        );
                      }}
                    >
                      {!selectedVariant.available
                        ? "Nicht verfügbar"
                        : state?.status ===
                            "loading"
                          ? "Preis wird geladen…"
                          : buttonText}
                    </button>

                    {renderTrustLines()}
                  </article>
                );
              },
            )}
          </div>
        </div>

        {/* MOBILE */}

        <div className="shopify-buy-box__mobile">
          {selectedOffer && (
            <article className="shopify-buy-box__mobile-card">
              <div className="shopify-buy-box__mobile-tier-heading">
                Menge wählen
              </div>

              <div
                className="shopify-buy-box__mobile-tier-selector"
                style={{
                  gridTemplateColumns:
                    `repeat(${Math.max(
                      visibleOffers.length,
                      1,
                    )}, minmax(0, 1fr))`,
                }}
              >
                {visibleOffers.map(
                  (offer) => {
                    const isSelected =
                      offer.quantity ===
                      selectedQuantity;

                    const label =
                      getOfferLabel(
                        offer,
                      );

                    return (
                      <button
                        type="button"
                        key={
                          offer.quantity
                        }
                        className={`shopify-buy-box__mobile-tier ${
                          isSelected
                            ? "shopify-buy-box__mobile-tier--selected"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedQuantity(
                            offer.quantity,
                          )
                        }
                      >
                        <span className="shopify-buy-box__mobile-tier-quantity">
                          {
                            offer.quantity
                          }{" "}
                          {
                            quantityUnit
                          }
                        </span>

                        {label && (
                          <span className="shopify-buy-box__mobile-tier-discount">
                            {
                              label
                            }
                          </span>
                        )}
                      </button>
                    );
                  },
                )}
              </div>

              {showStars && (
                <div className="shopify-buy-box__stars">
                  ★★★★★
                </div>
              )}

              <div className="shopify-buy-box__image-wrap shopify-buy-box__mobile-image-wrap">
                <img
                  src={
                    selectedVariant.image
                  }
                  alt={`${product.title} ${selectedVariant.title}`}
                  className="shopify-buy-box__image"
                />

                {renderBadge(
                  selectedOffer,
                )}
              </div>

              {renderSelectors()}

              <div className="shopify-buy-box__price-area shopify-buy-box__mobile-price-area">
                {renderOfferPrice(
                  selectedOffer,
                )}
              </div>

              <button
                type="button"
                className="shopify-buy-box__button shopify-buy-box__mobile-button"
                disabled={
                  !selectedVariant.available ||
                  evaluations[
                    selectedOffer
                      .quantity
                  ]?.status !==
                    "success"
                }
                onClick={() =>
                  handleBuyNow(
                    selectedOffer,
                  )
                }
              >
                {!selectedVariant.available
                  ? "Nicht verfügbar"
                  : evaluations[
                        selectedOffer
                          .quantity
                      ]?.status ===
                      "loading"
                    ? "Preis wird geladen…"
                    : buttonText}
              </button>

              {renderTrustLines()}
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
