import {
  useState,
  type FormEvent,
} from "react";

import {
  verifyCentralBuyBoxEditor,
  type CentralBuyBoxClientOptions,
} from "../lib/centralBuyBoxApi";

export const EDITOR_KEY_STORAGE =
  "buy-box-editor-key";

interface BuyBoxEditorLoginProps {
  clientOptions:
    CentralBuyBoxClientOptions;

  initialMessage?:
    | string
    | null;

  onUnlock:
    (key: string) => void;
}

export function BuyBoxEditorLogin({
  clientOptions,
  initialMessage = null,
  onUnlock,
}: BuyBoxEditorLoginProps) {
  const [
    key,
    setKey,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      initialMessage,
    );

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmed =
      key.trim();

    if (!trimmed) {
      setError(
        "Bitte Editor-Schlüssel eingeben.",
      );

      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyCentralBuyBoxEditor(
        clientOptions,
        trimmed,
      );

      try {
        sessionStorage.setItem(
          EDITOR_KEY_STORAGE,
          trimmed,
        );
      } catch {
        /*
         * The editor can still work for the
         * current session even if storage is
         * unavailable.
         */
      }

      onUnlock(
        trimmed,
      );
    } catch (err) {
      console.error(
        err,
      );

      setError(
        "Editor-Schlüssel ungültig",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      style={{
        display: "grid",
        gap: "10px",
        maxWidth: "420px",
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
        Editor-Schlüssel

        <input
          type="password"
          value={key}
          autoComplete="off"
          onChange={(event) =>
            setKey(
              event.target.value,
            )
          }
          placeholder="Editor-Schlüssel"
          disabled={loading}
          style={{
            width: "100%",
            minHeight: "40px",
            padding: "0 10px",
            border:
              "1px solid #cfcfcf",
            borderRadius: "7px",
            font: "inherit",
          }}
        />
      </label>

      {error && (
        <div
          style={{
            padding:
              "9px 11px",
            borderRadius:
              "7px",
            background:
              "#fff2f2",
            color:
              "#9f1d1d",
            fontSize:
              "12px",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={
          loading ||
          !key.trim()
        }
        style={{
          width:
            "fit-content",
          minHeight:
            "36px",
          padding:
            "6px 16px",
          border:
            "none",
          borderRadius:
            "8px",
          background:
            "#202936",
          color:
            "#ffffff",
          fontWeight:
            700,
          cursor:
            loading
              ? "default"
              : "pointer",
          opacity:
            loading
              ? 0.7
              : 1,
        }}
      >
        {loading
          ? "Prüfen…"
          : "Entsperren"}
      </button>
    </form>
  );
}
