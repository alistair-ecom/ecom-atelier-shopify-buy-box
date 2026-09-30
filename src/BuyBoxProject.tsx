import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  BuyBox,
  DEFAULT_BUY_BOX_API_URL,
  type BuyBoxProps,
} from "./BuyBox";

export interface BuyBoxProjectConfig {
  /**
   * Stable key for the storefront row in the
   * central buy_box_sites table.
   */
  siteKey: string;

  /**
   * Optional central Buy Box API override.
   * Normally the built-in Ecom Atelier API
   * should be used.
   */
  apiUrl?: string;

  /**
   * Controls whether the editor UI is shown.
   * "auto" keeps the existing Lovable/local
   * preview behavior.
   */
  editorMode?: "auto" | boolean;
}

export interface BuyBoxProviderProps
  extends BuyBoxProjectConfig {
  children: ReactNode;
}

const BuyBoxProjectContext =
  createContext<BuyBoxProjectConfig | null>(
    null,
  );

/**
 * Configure a Lovable/React project once.
 *
 * After this is mounted around the app,
 * individual pages can use <BuyBoxSection />
 * without repeating siteKey or API details.
 */
export function BuyBoxProvider({
  siteKey,
  apiUrl = DEFAULT_BUY_BOX_API_URL,
  editorMode = "auto",
  children,
}: BuyBoxProviderProps) {
  const value =
    useMemo<BuyBoxProjectConfig>(
      () => ({
        siteKey,
        apiUrl,
        editorMode,
      }),
      [
        siteKey,
        apiUrl,
        editorMode,
      ],
    );

  return (
    <BuyBoxProjectContext.Provider
      value={value}
    >
      {children}
    </BuyBoxProjectContext.Provider>
  );
}

export interface BuyBoxSectionProps
  extends Omit<
    BuyBoxProps,
    "siteKey" | "apiUrl" | "editorMode"
  > {
  /**
   * Optional per-section override.
   * Usually inherited from BuyBoxProvider.
   */
  siteKey?: string;

  /**
   * Optional per-section API override.
   */
  apiUrl?: string;

  /**
   * Optional per-section editor override.
   */
  editorMode?: "auto" | boolean;

  /**
   * Escape common narrow landing-page
   * containers so the Buy Box can use its own
   * configured Small/Medium/Large/Full width.
   *
   * Defaults to true.
   */
  fullBleed?: boolean;

  className?: string;

  style?: CSSProperties;
}

function joinClassNames(
  ...values: Array<
    string | false | null | undefined
  >
) {
  return values
    .filter(Boolean)
    .join(" ");
}

/**
 * Landing-page friendly Buy Box wrapper.
 *
 * It inherits the project-wide siteKey,
 * automatically uses the current page path,
 * and defaults to a full-bleed section so a
 * Lovable parent container cannot accidentally
 * squeeze the Buy Box.
 */
export function BuyBoxSection({
  siteKey,
  apiUrl,
  editorMode,
  fullBleed = true,
  className,
  style,
  ...buyBoxProps
}: BuyBoxSectionProps) {
  const project =
    useContext(
      BuyBoxProjectContext,
    );

  const resolvedSiteKey =
    siteKey ??
    project?.siteKey;

  const resolvedApiUrl =
    apiUrl ??
    project?.apiUrl ??
    DEFAULT_BUY_BOX_API_URL;

  const resolvedEditorMode =
    editorMode ??
    project?.editorMode ??
    "auto";

  if (!resolvedSiteKey) {
    const message =
      "BuyBoxSection is missing a siteKey. Wrap the app in <BuyBoxProvider siteKey=\"...\"> or pass siteKey directly.";

    console.error(message);

    return (
      <div
        className="ecom-buy-box-section__error"
        role="alert"
      >
        {message}
      </div>
    );
  }

  return (
    <section
      className={joinClassNames(
        "ecom-buy-box-section",
        fullBleed &&
          "ecom-buy-box-section--full-bleed",
        className,
      )}
      style={style}
      data-ecom-buy-box-section
    >
      <BuyBox
        {...buyBoxProps}
        siteKey={resolvedSiteKey}
        apiUrl={resolvedApiUrl}
        editorMode={resolvedEditorMode}
      />
    </section>
  );
}
