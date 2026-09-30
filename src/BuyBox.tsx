import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CentralBuyBoxApiError,
  getCentralBuyBoxConfig,
  saveCentralBuyBoxConfig,
  type CentralBuyBoxClientOptions,
  type CentralBuyBoxSite,
} from "./lib/centralBuyBoxApi";

import {
  getProductByHandle,
  type ShopifyStorefrontConfig,
} from "./lib/shopify";

import {
  asBuyBoxConfig,
  buyBoxConfigsEqual,
  getCurrentPagePath,
  normalizePagePath,
  resolveBuyBoxConfig,
  type BuyBoxConfig,
  type ResolvedBuyBoxConfig,
} from "./lib/buyBoxConfig";

import {
  ShopifyBuyBox,
} from "./components/ShopifyBuyBox";

import {
  BuyBoxSettingsPanel,
  type BuyBoxSaveStatus,
} from "./components/BuyBoxSettingsPanel";

import {
  EDITOR_KEY_STORAGE,
} from "./components/BuyBoxEditorLogin";

import type {
  BuyBoxProduct,
  ShopifyBuyBoxProps,
} from "./components/types";

export const DEFAULT_BUY_BOX_API_URL =
  "https://rczjhxomovldcwntthye.supabase.co/functions/v1/buy-box-api";

export interface BuyBoxProps
  extends Omit<
    ShopifyBuyBoxProps,
    "product"
  > {
  /**
   * Stable key for the storefront row in the
   * central buy_box_sites table.
   */
  siteKey: string;

  /**
   * Central Supabase Edge Function URL.
   * Defaults to the Ecom Atelier Buy Box API.
   */
  apiUrl?: string;

  /**
   * Optional explicit pathname. When omitted,
   * window.location.pathname is used.
   */
  pagePath?: string;

  /**
   * Fallback product for a page that has no
   * saved central configuration yet.
   */
  productHandle?: string;

  /**
   * "auto" shows the editor on localhost and
   * Lovable preview hosts, but not production.
   */
  editorMode?: "auto" | boolean;

  loadingText?: string;
  errorTitle?: string;
  showTechnicalError?: boolean;
}

function shouldShowEditor(
  mode: "auto" | boolean,
) {
  /*
   * Explicit true/false always wins.
   */
  if (typeof mode === "boolean") {
    return mode;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const host =
    window.location.hostname;

  /*
   * Local development always gets the editor.
   */
  if (
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    return true;
  }

  const isLovablePreview =
    /^id-preview--.+\.lovable\.app$/.test(
      host,
    ) ||
    /^project--.+-dev\.lovable\.app$/.test(
      host,
    ) ||
    host.endsWith(
      ".lovableproject.com",
    );

  if (!isLovablePreview) {
    return false;
  }

  /*
   * Lovable's editor displays the preview
   * inside an iframe.
   *
   * A preview URL opened directly in a normal
   * browser tab is top-level and should behave
   * like a customer-facing page, without the
   * Buy Box settings controls.
   */
  return window.self !== window.top;
}

function storefrontConfigFromSite(
  site: CentralBuyBoxSite,
): ShopifyStorefrontConfig {
  return {
    domain: site.shopifyDomain,
    storefrontAccessToken:
      site.storefrontAccessToken,
    apiVersion:
      site.shopifyApiVersion,
  };
}

function isShopifyDefaultTitleOption(
  optionName: string,
  optionValue: string,
) {
  return (
    optionName.trim().toLowerCase() === "title" &&
    optionValue.trim().toLowerCase() === "default title"
  );
}

async function loadBuyBoxProduct(
  handle: string,
  storefrontConfig: ShopifyStorefrontConfig,
): Promise<BuyBoxProduct> {
  const shopifyProduct =
    await getProductByHandle(
      handle,
      storefrontConfig,
    );

  return {
    id: shopifyProduct.id,
    handle: shopifyProduct.handle,
    title: shopifyProduct.title,
    quantityUnit:
      shopifyProduct.quantityUnit || "Stk.",

    options:
      shopifyProduct.options.filter(
        (option) => {
          if (option.values.length !== 1) {
            return true;
          }

          return !isShopifyDefaultTitleOption(
            option.name,
            option.values[0],
          );
        },
      ),

    variants:
      shopifyProduct.variants.map(
        (variant) => ({
          id: variant.id,
          title: variant.title,
          available:
            variant.availableForSale,
          price:
            Number(variant.price.amount),
          compareAtPrice:
            variant.compareAtPrice
              ? Number(
                  variant.compareAtPrice.amount,
                )
              : undefined,
          image:
            variant.image?.url ||
            shopifyProduct.featuredImage?.url ||
            "",
          selectedOptions:
            variant.selectedOptions.filter(
              (option) =>
                !isShopifyDefaultTitleOption(
                  option.name,
                  option.value,
                ),
            ),
        }),
      ),

    discountKitRules:
      shopifyProduct.discountKitRules,
    countryCode:
      shopifyProduct.countryCode,
    currencyCode:
      shopifyProduct.currencyCode,
    marketHandle:
      shopifyProduct.marketHandle,
    storefrontConfig,
  };
}

export function BuyBox({
  siteKey,
  apiUrl = DEFAULT_BUY_BOX_API_URL,
  pagePath,
  productHandle = "",
  editorMode = "auto",
  loadingText = "Produkt wird geladen…",
  errorTitle =
    "Produkt konnte nicht geladen werden.",
  showTechnicalError = true,
  ...buyBoxProps
}: BuyBoxProps) {
  const resolvedPagePath =
    normalizePagePath(
      pagePath ?? getCurrentPagePath(),
    );

  const clientOptions =
    useMemo<CentralBuyBoxClientOptions>(
      () => ({
        apiUrl,
        siteKey,
      }),
      [apiUrl, siteKey],
    );

  const fallbackConfig =
    useMemo(
      () =>
        resolveBuyBoxConfig({
          productHandle,
          size: buyBoxProps.size,
          customWidth:
            buyBoxProps.customWidth,
          tierOrder:
            buyBoxProps.tierOrder,
          buttonText:
            buyBoxProps.buttonText,
          trustLine1:
            buyBoxProps.trustLine1,
          trustLine2:
            buyBoxProps.trustLine2,
          showStars:
            buyBoxProps.showStars,
          showCompareAtPrice:
            buyBoxProps.showCompareAtPrice,
          showTotalPrice:
            buyBoxProps.showTotalPrice,
          showDiscountBadge:
            buyBoxProps.showDiscountBadge,
          colors:
            buyBoxProps.colors,
        }),
      [
        productHandle,
        buyBoxProps.size,
        buyBoxProps.customWidth,
        buyBoxProps.tierOrder,
        buyBoxProps.buttonText,
        buyBoxProps.trustLine1,
        buyBoxProps.trustLine2,
        buyBoxProps.showStars,
        buyBoxProps.showCompareAtPrice,
        buyBoxProps.showTotalPrice,
        buyBoxProps.showDiscountBadge,
        buyBoxProps.colors,
      ],
    );

  const [savedConfig, setSavedConfig] =
    useState<BuyBoxConfig | null>(null);

  const [draftConfig, setDraftConfig] =
    useState<ResolvedBuyBoxConfig>(
      fallbackConfig,
    );

  const [storefrontConfig, setStorefrontConfig] =
    useState<ShopifyStorefrontConfig | null>(
      null,
    );

  const [configLoaded, setConfigLoaded] =
    useState(false);

  const [configError, setConfigError] =
    useState<string | null>(null);

  const [saveStatus, setSaveStatus] =
    useState<BuyBoxSaveStatus>("idle");

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [editorEnabled, setEditorEnabled] =
    useState(false);

  const [editorKey, setEditorKey] =
    useState<string | null>(null);

  const [lockMessage, setLockMessage] =
    useState<string | null>(null);

  const [product, setProduct] =
    useState<BuyBoxProduct | null>(null);

  const [productError, setProductError] =
    useState<string | null>(null);

  const savedResolvedConfig =
    useMemo(
      () =>
        resolveBuyBoxConfig(
          fallbackConfig,
          savedConfig,
        ),
      [fallbackConfig, savedConfig],
    );

  useEffect(() => {
    let cancelled = false;

    setConfigLoaded(false);
    setConfigError(null);

    getCentralBuyBoxConfig(
      clientOptions,
      resolvedPagePath,
    )
      .then((central) => {
        if (cancelled) {
          return;
        }

        const centralConfig =
          asBuyBoxConfig(
            central.config,
          );

        setStorefrontConfig(
          storefrontConfigFromSite(
            central.site,
          ),
        );

        setSavedConfig(
          centralConfig,
        );

        setDraftConfig(
          resolveBuyBoxConfig(
            fallbackConfig,
            centralConfig,
          ),
        );
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(error);

        setStorefrontConfig(null);
        setSavedConfig(null);
        setDraftConfig(fallbackConfig);
        setConfigError(
          error instanceof Error
            ? error.message
            : "Konfiguration konnte nicht geladen werden.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setConfigLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    clientOptions,
    resolvedPagePath,
  ]);

  useEffect(() => {
    if (
      !configLoaded ||
      savedConfig ||
      saveStatus === "dirty" ||
      saveStatus === "saving"
    ) {
      return;
    }

    setDraftConfig(fallbackConfig);
  }, [
    configLoaded,
    savedConfig,
    fallbackConfig,
    saveStatus,
  ]);

  useEffect(() => {
    const enabled =
      shouldShowEditor(editorMode);

    setEditorEnabled(enabled);

    if (!enabled) {
      return;
    }

    try {
      const stored =
        sessionStorage.getItem(
          EDITOR_KEY_STORAGE,
        );

      if (stored) {
        setEditorKey(stored);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, [editorMode]);

  function lockEditor(
    message: string | null,
  ) {
    try {
      sessionStorage.removeItem(
        EDITOR_KEY_STORAGE,
      );
    } catch {
      // ignore
    }

    setEditorKey(null);
    setLockMessage(message);
  }

  function updateDraft(
    patch:
      Partial<ResolvedBuyBoxConfig>,
  ) {
    setDraftConfig((current) => {
      const next:
        ResolvedBuyBoxConfig = {
        ...current,
        ...patch,
        colors:
          patch.colors
            ? {
                ...current.colors,
                ...patch.colors,
              }
            : current.colors,
      };

      setSaveStatus(
        buyBoxConfigsEqual(
          next,
          savedResolvedConfig,
        )
          ? "idle"
          : "dirty",
      );

      setSaveError(null);

      return next;
    });
  }

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError(null);

    if (!editorKey) {
      lockEditor(null);
      setSaveStatus("dirty");
      return;
    }

    const cleanConfig =
      JSON.parse(
        JSON.stringify(draftConfig),
      ) as BuyBoxConfig;

    try {
      await saveCentralBuyBoxConfig(
        clientOptions,
        resolvedPagePath,
        cleanConfig as Record<
          string,
          unknown
        >,
        editorKey,
      );

      setSavedConfig(cleanConfig);
      setSaveStatus("saved");
    } catch (error) {
      console.error(error);

      if (
        error instanceof CentralBuyBoxApiError &&
        error.unauthorized
      ) {
        lockEditor(
          "Editor-Schlüssel ungültig",
        );
        setSaveStatus("dirty");
        return;
      }

      setSaveError(
        error instanceof Error
          ? error.message
          : String(error),
      );
      setSaveStatus("error");
    }
  }

  useEffect(() => {
    if (
      !configLoaded ||
      !storefrontConfig ||
      !draftConfig.productHandle
    ) {
      setProduct(null);
      return;
    }

    let cancelled = false;

    setProductError(null);
    setProduct(null);

    loadBuyBoxProduct(
      draftConfig.productHandle,
      storefrontConfig,
    )
      .then((nextProduct) => {
        if (!cancelled) {
          setProduct(nextProduct);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(error);
        setProductError(
          error instanceof Error
            ? error.message
            : "Unknown Shopify error",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [
    configLoaded,
    draftConfig.productHandle,
    storefrontConfig?.domain,
    storefrontConfig?.storefrontAccessToken,
    storefrontConfig?.apiVersion,
  ]);

  const settingsUi =
    editorEnabled && storefrontConfig ? (
      <BuyBoxSettingsPanel
        storefrontConfig={
          storefrontConfig
        }
        clientOptions={
          clientOptions
        }
        editorKey={editorKey}
        lockMessage={lockMessage}
        configError={configError}
        saveStatus={saveStatus}
        saveError={saveError}
        draftConfig={draftConfig}
        pagePath={resolvedPagePath}
        onUnlock={(key) => {
          setEditorKey(key);
          setLockMessage(null);
        }}
        onLock={() =>
          lockEditor(null)
        }
        onSave={handleSave}
        onChange={updateDraft}
      />
    ) : null;

  if (configError && !storefrontConfig) {
    return (
      <div
        style={{
          width: "100%",
          padding: "32px 20px",
          textAlign: "center",
          fontFamily: "sans-serif",
        }}
      >
        <strong>
          Buy Box konnte nicht geladen werden.
        </strong>

        {showTechnicalError && (
          <pre
            style={{
              margin: "14px auto 0",
              maxWidth: "800px",
              whiteSpace: "pre-wrap",
              fontSize: "13px",
              opacity: 0.7,
            }}
          >
            {configError}
          </pre>
        )}
      </div>
    );
  }

  if (!configLoaded || !storefrontConfig) {
    return (
      <div
        style={{
          width: "100%",
          padding: "32px 20px",
          textAlign: "center",
          fontFamily: "sans-serif",
        }}
      >
        {loadingText}
      </div>
    );
  }

  if (!draftConfig.productHandle) {
    return (
      <>
        {settingsUi}

        <div
          style={{
            width: "100%",
            padding: "40px 20px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          Bitte zuerst ein Shopify Produkt auswählen.
        </div>
      </>
    );
  }

  if (productError) {
    return (
      <>
        {settingsUi}

        <div
          style={{
            width: "100%",
            padding: "32px 20px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "18px",
            }}
          >
            {errorTitle}
          </div>

          {showTechnicalError && (
            <pre
              style={{
                margin: "16px auto 0",
                maxWidth: "800px",
                whiteSpace: "pre-wrap",
                fontSize: "13px",
                opacity: 0.7,
              }}
            >
              {productError}
            </pre>
          )}
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        {settingsUi}

        <div
          style={{
            width: "100%",
            padding: "32px 20px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          {loadingText}
        </div>
      </>
    );
  }

  return (
    <>
      {settingsUi}

      <ShopifyBuyBox
        product={product}
        size={draftConfig.size}
        customWidth={
          draftConfig.customWidth
        }
        tierOrder={
          draftConfig.tierOrder
        }
        buttonText={
          draftConfig.buttonText
        }
        trustLine1={
          draftConfig.trustLine1
        }
        trustLine2={
          draftConfig.trustLine2
        }
        showStars={
          draftConfig.showStars
        }
        showCompareAtPrice={
          draftConfig.showCompareAtPrice
        }
        showTotalPrice={
          draftConfig.showTotalPrice
        }
        showDiscountBadge={
          draftConfig.showDiscountBadge
        }
        colors={draftConfig.colors}
      />
    </>
  );
}
