import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getShopifyProductChoices,
  type ShopifyProductChoice,
} from "../lib/shopifyProducts";

import type {
  ShopifyStorefrontConfig,
} from "../lib/shopify";

import type {
  CentralBuyBoxClientOptions,
} from "../lib/centralBuyBoxApi";

import type {
  ResolvedBuyBoxConfig,
} from "../lib/buyBoxConfig";

import type {
  BuyBoxColors,
} from "./types";

import {
  BuyBoxEditorLogin,
} from "./BuyBoxEditorLogin";

export type BuyBoxSaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

const SAVE_STATUS_LABEL: Record<
  BuyBoxSaveStatus,
  string
> = {
  idle: "",
  dirty:
    "Ungespeicherte Änderungen",
  saving:
    "Wird gespeichert…",
  saved:
    "Gespeichert",
  error:
    "Fehler beim Speichern",
};

interface BuyBoxSettingsPanelProps {
  storefrontConfig:
    ShopifyStorefrontConfig;

  clientOptions:
    CentralBuyBoxClientOptions;

  editorKey:
    | string
    | null;

  lockMessage:
    | string
    | null;

  configError:
    | string
    | null;

  saveStatus:
    BuyBoxSaveStatus;

  saveError:
    | string
    | null;

  draftConfig:
    ResolvedBuyBoxConfig;

  pagePath: string;

  onUnlock:
    (key: string) => void;

  onLock: () => void;

  onSave: () => void;

  onChange:
    (
      patch:
        Partial<ResolvedBuyBoxConfig>,
    ) => void;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange:
    (value: string) => void;
}

const HEX_COLOR =
  /^#[0-9a-fA-F]{6}$/;

function ColorField({
  label,
  value,
  onChange,
}: ColorFieldProps) {
  const [text, setText] =
    useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  function commitText(
    next: string,
  ) {
    const normalized =
      next.trim();

    if (
      HEX_COLOR.test(
        normalized,
      )
    ) {
      const lowercase =
        normalized.toLowerCase();

      setText(lowercase);
      onChange(lowercase);
      return;
    }

    setText(value);
  }

  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns:
          "1fr auto 110px",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        {label}
      </span>

      <input
        type="color"
        value={
          HEX_COLOR.test(value)
            ? value
            : "#000000"
        }
        onChange={(event) => {
          const next =
            event.target.value;

          setText(next);
          onChange(next);
        }}
        style={{
          width: "38px",
          height: "34px",
          padding: "2px",
          border:
            "1px solid #d1d5db",
          borderRadius: "6px",
          background: "#ffffff",
          cursor: "pointer",
        }}
        aria-label={label}
      />

      <input
        type="text"
        value={text}
        onChange={(event) =>
          setText(
            event.target.value,
          )
        }
        onBlur={() =>
          commitText(text)
        }
        onKeyDown={(event) => {
          if (
            event.key === "Enter"
          ) {
            event.currentTarget.blur();
          }
        }}
        style={{
          width: "100%",
          minHeight: "34px",
          padding: "0 8px",
          border:
            "1px solid #d1d5db",
          borderRadius: "6px",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "12px",
        }}
      />
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children:
    ReactNode;
}) {
  return (
    <section
      style={{
        paddingTop: "18px",
        marginTop: "18px",
        borderTop:
          "1px solid #e5e7eb",
      }}
    >
      <h3
        style={{
          margin: "0 0 12px",
          fontSize: "14px",
          fontWeight: 800,
          color: "#202936",
        }}
      >
        {title}
      </h3>

      {children}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange:
    (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent:
          "space-between",
        gap: "16px",
        minHeight: "36px",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        style={{
          width: "18px",
          height: "18px",
          cursor: "pointer",
        }}
      />
    </label>
  );
}

export function BuyBoxSettingsPanel({
  storefrontConfig,
  clientOptions,
  editorKey,
  lockMessage,
  configError,
  saveStatus,
  saveError,
  draftConfig,
  pagePath,
  onUnlock,
  onLock,
  onSave,
  onChange,
}: BuyBoxSettingsPanelProps) {
  const [open, setOpen] =
    useState(false);

  const [productChoices,
    setProductChoices,
  ] = useState<
    ShopifyProductChoice[]
  >([]);

  const [productListLoading,
    setProductListLoading,
  ] = useState(false);

  const [productListError,
    setProductListError,
  ] = useState<
    string | null
  >(null);

  const [productSearch,
    setProductSearch,
  ] = useState("");

  const storefrontIdentity =
    [
      storefrontConfig.domain,
      storefrontConfig.apiVersion,
      storefrontConfig.storefrontAccessToken,
    ].join("|");

  useEffect(() => {
    setProductChoices([]);
    setProductSearch("");
    setProductListError(null);
  }, [storefrontIdentity]);

  useEffect(() => {
    if (
      !open ||
      !editorKey ||
      productChoices.length > 0
    ) {
      return;
    }

    let cancelled = false;

    async function loadProducts() {
      try {
        setProductListLoading(
          true,
        );
        setProductListError(
          null,
        );

        const choices =
          await getShopifyProductChoices(
            storefrontConfig,
          );

        if (cancelled) {
          return;
        }

        setProductChoices(
          choices,
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        setProductListError(
          err instanceof Error
            ? err.message
            : "Produkte konnten nicht geladen werden.",
        );
      } finally {
        if (!cancelled) {
          setProductListLoading(
            false,
          );
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    editorKey,
    productChoices.length,
    storefrontConfig.domain,
    storefrontConfig.storefrontAccessToken,
    storefrontConfig.apiVersion,
  ]);

  const filteredProducts =
    useMemo(() => {
      const search =
        productSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return productChoices;
      }

      return productChoices.filter(
        (choice) =>
          choice.title
            .toLowerCase()
            .includes(search) ||
          choice.handle
            .toLowerCase()
            .includes(search),
      );
    }, [
      productChoices,
      productSearch,
    ]);

  const selectedProductChoice =
    useMemo(
      () =>
        productChoices.find(
          (choice) =>
            choice.handle ===
            draftConfig.productHandle,
        ),
      [
        productChoices,
        draftConfig.productHandle,
      ],
    );

  function changeColor(
    key: keyof BuyBoxColors,
    value: string,
  ) {
    onChange({
      colors: {
        ...draftConfig.colors,
        [key]: value,
      },
    });
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1200px",
        margin: "18px auto 12px",
        padding: "0 20px",
        fontFamily: "sans-serif",
      }}
    >
      {!open ? (
        <button
          type="button"
          onClick={() =>
            setOpen(true)
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            minHeight: "38px",
            padding: "7px 13px",
            border:
              "1px solid #d5d5d5",
            borderRadius: "8px",
            background: "#ffffff",
            color: "#202936",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ⚙ Buy Box Einstellungen
        </button>
      ) : (
        <div
          style={{
            padding: "18px",
            border:
              "1px solid #d9d9d9",
            borderRadius: "12px",
            background: "#ffffff",
            boxShadow:
              "0 6px 24px rgba(0,0,0,0.08)",
            color: "#202936",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "16px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                }}
              >
                Buy Box Einstellungen
              </div>

              <div
                style={{
                  marginTop: "3px",
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                Gespeichert für {pagePath}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              style={{
                border: "none",
                background:
                  "transparent",
                fontSize: "22px",
                cursor: "pointer",
              }}
              aria-label="Einstellungen schließen"
            >
              ×
            </button>
          </div>

          {configError && (
            <div
              style={{
                marginTop: "14px",
                padding: "10px 12px",
                borderRadius: "7px",
                background: "#fff2f2",
                color: "#9f1d1d",
                fontSize: "12px",
              }}
            >
              Konfiguration konnte nicht geladen werden (Fallback aktiv):{" "}
              {configError}
            </div>
          )}

          {!editorKey ? (
            <div
              style={{
                marginTop: "16px",
              }}
            >
              <BuyBoxEditorLogin
                clientOptions={
                  clientOptions
                }
                key={
                  lockMessage ??
                  "unlock"
                }
                initialMessage={
                  lockMessage
                }
                onUnlock={
                  onUnlock
                }
              />
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "16px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={onSave}
                  disabled={
                    saveStatus ===
                    "saving"
                  }
                  style={{
                    minHeight: "36px",
                    padding: "6px 16px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#95c11f",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor:
                      saveStatus ===
                      "saving"
                        ? "default"
                        : "pointer",
                    opacity:
                      saveStatus ===
                      "saving"
                        ? 0.7
                        : 1,
                  }}
                >
                  Speichern
                </button>

                {saveStatus !==
                  "idle" && (
                  <span
                    style={{
                      fontSize: "13px",
                      color:
                        saveStatus ===
                        "error"
                          ? "#9f1d1d"
                          : saveStatus ===
                              "saved"
                            ? "#1f5130"
                            : "#6b7280",
                    }}
                  >
                    {
                      SAVE_STATUS_LABEL[
                        saveStatus
                      ]
                    }
                    {saveError
                      ? `: ${saveError}`
                      : ""}
                  </span>
                )}

                <button
                  type="button"
                  onClick={onLock}
                  style={{
                    marginLeft: "auto",
                    border: "none",
                    background:
                      "transparent",
                    color: "#6b7280",
                    fontSize: "12px",
                    textDecoration:
                      "underline",
                    cursor: "pointer",
                  }}
                >
                  Sperren
                </button>
              </div>

              <Section title="Produkt">
                <div
                  style={{
                    marginBottom: "10px",
                    fontSize: "13px",
                  }}
                >
                  Aktuelles Produkt:{" "}
                  <strong>
                    {selectedProductChoice
                      ?.title ||
                      draftConfig.productHandle ||
                      "Kein Produkt ausgewählt"}
                  </strong>
                </div>

                <input
                  type="search"
                  value={productSearch}
                  onChange={(event) =>
                    setProductSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Produkt suchen…"
                  style={{
                    width: "100%",
                    minHeight: "42px",
                    padding: "0 12px",
                    border:
                      "1px solid #cfcfcf",
                    borderRadius: "7px",
                    font: "inherit",
                    marginBottom: "10px",
                  }}
                />

                {productListLoading && (
                  <div
                    style={{
                      padding: "14px 0",
                      color: "#666",
                      fontSize: "13px",
                    }}
                  >
                    Shopify Produkte werden geladen…
                  </div>
                )}

                {productListError && (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "7px",
                      background: "#fff2f2",
                      color: "#9f1d1d",
                      fontSize: "13px",
                    }}
                  >
                    {productListError}
                  </div>
                )}

                {!productListLoading &&
                  !productListError && (
                    <div
                      style={{
                        maxHeight: "240px",
                        overflowY: "auto",
                        border:
                          "1px solid #e5e5e5",
                        borderRadius: "8px",
                      }}
                    >
                      {filteredProducts.length ===
                      0 ? (
                        <div
                          style={{
                            padding: "14px",
                            color: "#777",
                            fontSize: "13px",
                          }}
                        >
                          Keine Produkte gefunden.
                        </div>
                      ) : (
                        filteredProducts.map(
                          (choice) => {
                            const selected =
                              choice.handle ===
                              draftConfig.productHandle;

                            return (
                              <button
                                type="button"
                                key={choice.id}
                                onClick={() => {
                                  onChange({
                                    productHandle:
                                      choice.handle,
                                  });
                                  setProductSearch("");
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  width: "100%",
                                  padding:
                                    "10px 12px",
                                  border: "none",
                                  borderBottom:
                                    "1px solid #eeeeee",
                                  background: selected
                                    ? "#f3f8e8"
                                    : "#ffffff",
                                  textAlign: "left",
                                  cursor: "pointer",
                                }}
                              >
                                {choice.featuredImage
                                  ?.url && (
                                  <img
                                    src={
                                      choice
                                        .featuredImage
                                        .url
                                    }
                                    alt=""
                                    style={{
                                      width: "44px",
                                      height: "44px",
                                      objectFit:
                                        "contain",
                                      borderRadius:
                                        "5px",
                                      background:
                                        "#f5f5f5",
                                    }}
                                  />
                                )}

                                <div
                                  style={{
                                    minWidth: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize:
                                        "14px",
                                      fontWeight:
                                        selected
                                          ? 800
                                          : 600,
                                    }}
                                  >
                                    {choice.title}
                                  </div>

                                  <div
                                    style={{
                                      marginTop:
                                        "2px",
                                      fontSize:
                                        "11px",
                                      color: "#777",
                                      overflow:
                                        "hidden",
                                      textOverflow:
                                        "ellipsis",
                                      whiteSpace:
                                        "nowrap",
                                    }}
                                  >
                                    {choice.handle}
                                  </div>
                                </div>

                                {selected && (
                                  <div
                                    style={{
                                      marginLeft:
                                        "auto",
                                      fontWeight: 800,
                                    }}
                                  >
                                    ✓
                                  </div>
                                )}
                              </button>
                            );
                          },
                        )
                      )}
                    </div>
                  )}
              </Section>

              <Section title="Layout">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <label
                    style={{
                      display: "grid",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    Breite
                    <select
                      value={draftConfig.size}
                      onChange={(event) =>
                        onChange({
                          size:
                            event.target.value as ResolvedBuyBoxConfig["size"],
                        })
                      }
                      style={{
                        minHeight: "40px",
                        padding: "0 10px",
                        border:
                          "1px solid #cfcfcf",
                        borderRadius: "7px",
                        background: "#ffffff",
                      }}
                    >
                      <option value="small">
                        Small (800px)
                      </option>
                      <option value="medium">
                        Medium (1000px)
                      </option>
                      <option value="large">
                        Large (1200px)
                      </option>
                      <option value="full">
                        Full (100%)
                      </option>
                      <option value="custom">
                        Custom
                      </option>
                    </select>
                  </label>

                  {draftConfig.size ===
                    "custom" && (
                    <label
                      style={{
                        display: "grid",
                        gap: "6px",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      Eigene Breite (px)
                      <input
                        type="number"
                        min={320}
                        step={10}
                        value={
                          draftConfig.customWidth
                        }
                        onChange={(event) => {
                          const value =
                            Number(
                              event.target.value,
                            );

                          if (
                            Number.isFinite(
                              value,
                            )
                          ) {
                            onChange({
                              customWidth:
                                Math.max(
                                  320,
                                  Math.round(
                                    value,
                                  ),
                                ),
                            });
                          }
                        }}
                        style={{
                          minHeight: "40px",
                          padding: "0 10px",
                          border:
                            "1px solid #cfcfcf",
                          borderRadius:
                            "7px",
                        }}
                      />
                    </label>
                  )}

                  <label
                    style={{
                      display: "grid",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    Reihenfolge der Mengen
                    <select
                      value={
                        draftConfig.tierOrder
                      }
                      onChange={(event) =>
                        onChange({
                          tierOrder:
                            event.target.value as ResolvedBuyBoxConfig["tierOrder"],
                        })
                      }
                      style={{
                        minHeight: "40px",
                        padding: "0 10px",
                        border:
                          "1px solid #cfcfcf",
                        borderRadius: "7px",
                        background: "#ffffff",
                      }}
                    >
                      <option value="descending">
                        Höchste Menge zuerst
                      </option>
                      <option value="ascending">
                        Niedrigste Menge zuerst
                      </option>
                    </select>
                  </label>
                </div>
              </Section>

              <Section title="Texte">
                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <label
                    style={{
                      display: "grid",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    Button Text
                    <input
                      type="text"
                      value={
                        draftConfig.buttonText
                      }
                      onChange={(event) =>
                        onChange({
                          buttonText:
                            event.target.value,
                        })
                      }
                      style={{
                        minHeight: "40px",
                        padding: "0 10px",
                        border:
                          "1px solid #cfcfcf",
                        borderRadius: "7px",
                      }}
                    />
                  </label>

                  <label
                    style={{
                      display: "grid",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    Vertrauenszeile 1
                    <input
                      type="text"
                      value={
                        draftConfig.trustLine1
                      }
                      onChange={(event) =>
                        onChange({
                          trustLine1:
                            event.target.value,
                        })
                      }
                      style={{
                        minHeight: "40px",
                        padding: "0 10px",
                        border:
                          "1px solid #cfcfcf",
                        borderRadius: "7px",
                      }}
                    />
                  </label>

                  <label
                    style={{
                      display: "grid",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    Vertrauenszeile 2
                    <input
                      type="text"
                      value={
                        draftConfig.trustLine2
                      }
                      onChange={(event) =>
                        onChange({
                          trustLine2:
                            event.target.value,
                        })
                      }
                      style={{
                        minHeight: "40px",
                        padding: "0 10px",
                        border:
                          "1px solid #cfcfcf",
                        borderRadius: "7px",
                      }}
                    />
                  </label>
                </div>
              </Section>

              <Section title="Anzeige">
                <div
                  style={{
                    display: "grid",
                    gap: "4px",
                  }}
                >
                  <Toggle
                    label="Bewertungssterne anzeigen"
                    checked={
                      draftConfig.showStars
                    }
                    onChange={(checked) =>
                      onChange({
                        showStars: checked,
                      })
                    }
                  />

                  <Toggle
                    label="Vergleichspreis anzeigen"
                    checked={
                      draftConfig.showCompareAtPrice
                    }
                    onChange={(checked) =>
                      onChange({
                        showCompareAtPrice:
                          checked,
                      })
                    }
                  />

                  <Toggle
                    label="Gesamtpreis anzeigen"
                    checked={
                      draftConfig.showTotalPrice
                    }
                    onChange={(checked) =>
                      onChange({
                        showTotalPrice:
                          checked,
                      })
                    }
                  />

                  <Toggle
                    label="Rabatt-Badge auf Produktbild anzeigen"
                    checked={
                      draftConfig.showDiscountBadge
                    }
                    onChange={(checked) =>
                      onChange({
                        showDiscountBadge:
                          checked,
                      })
                    }
                  />
                </div>
              </Section>

              <Section title="Farben">
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                  }}
                >
                  <ColorField
                    label="Bereich Hintergrund"
                    value={
                      draftConfig.colors
                        .sectionBackground
                    }
                    onChange={(value) =>
                      changeColor(
                        "sectionBackground",
                        value,
                      )
                    }
                  />

                  <ColorField
                    label="Karten Hintergrund"
                    value={
                      draftConfig.colors
                        .cardBackground
                    }
                    onChange={(value) =>
                      changeColor(
                        "cardBackground",
                        value,
                      )
                    }
                  />

                  <ColorField
                    label="Rahmen ausgewählte Karte"
                    value={
                      draftConfig.colors
                        .selectedCardBorder
                    }
                    onChange={(value) =>
                      changeColor(
                        "selectedCardBorder",
                        value,
                      )
                    }
                  />

                  <ColorField
                    label="Text"
                    value={
                      draftConfig.colors.text
                    }
                    onChange={(value) =>
                      changeColor(
                        "text",
                        value,
                      )
                    }
                  />

                  <ColorField
                    label="Preis"
                    value={
                      draftConfig.colors.price
                    }
                    onChange={(value) =>
                      changeColor(
                        "price",
                        value,
                      )
                    }
                  />

                  <ColorField
                    label="Button Hintergrund"
                    value={
                      draftConfig.colors
                        .buttonBackground
                    }
                    onChange={(value) =>
                      changeColor(
                        "buttonBackground",
                        value,
                      )
                    }
                  />

                  <ColorField
                    label="Button Text"
                    value={
                      draftConfig.colors
                        .buttonText
                    }
                    onChange={(value) =>
                      changeColor(
                        "buttonText",
                        value,
                      )
                    }
                  />

                  <ColorField
                    label="Rabatt Badge Hintergrund"
                    value={
                      draftConfig.colors
                        .discountBadgeBackground
                    }
                    onChange={(value) =>
                      changeColor(
                        "discountBadgeBackground",
                        value,
                      )
                    }
                  />

                  <ColorField
                    label="Rabatt Badge Text"
                    value={
                      draftConfig.colors
                        .discountBadgeText
                    }
                    onChange={(value) =>
                      changeColor(
                        "discountBadgeText",
                        value,
                      )
                    }
                  />

                  <ColorField
                    label="Trust Icon"
                    value={
                      draftConfig.colors
                        .trustIcon
                    }
                    onChange={(value) =>
                      changeColor(
                        "trustIcon",
                        value,
                      )
                    }
                  />
                </div>
              </Section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
