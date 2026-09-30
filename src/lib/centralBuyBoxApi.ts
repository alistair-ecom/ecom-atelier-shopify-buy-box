export interface CentralBuyBoxClientOptions {
  apiUrl: string;
  siteKey: string;
}

export interface CentralBuyBoxSite {
  siteKey: string;

  displayName: string;

  shopifyDomain: string;

  storefrontAccessToken: string;

  shopifyApiVersion: string;
}

export interface CentralBuyBoxGetResponse {
  ok: true;

  site:
    CentralBuyBoxSite;

  pagePath: string;

  config:
    Record<
      string,
      unknown
    > | null;

  updatedAt:
    string | null;
}

export interface CentralBuyBoxSaveResponse {
  ok: true;

  siteKey: string;

  pagePath: string;

  config:
    Record<
      string,
      unknown
    >;

  updatedAt: string;
}

interface CentralBuyBoxErrorResponse {
  ok: false;

  error?: string;

  unauthorized?: boolean;

  authorized?: boolean;
}

export class CentralBuyBoxApiError
  extends Error {
  status: number;

  unauthorized: boolean;

  constructor(
    message: string,
    status: number,
    unauthorized = false,
  ) {
    super(message);

    this.name =
      "CentralBuyBoxApiError";

    this.status =
      status;

    this.unauthorized =
      unauthorized;
  }
}

function normalizeApiUrl(
  value: string,
) {
  return value
    .trim()
    .replace(
      /\/+$/,
      "",
    );
}

function validateClientOptions(
  options:
    CentralBuyBoxClientOptions,
) {
  const apiUrl =
    normalizeApiUrl(
      options.apiUrl,
    );

  const siteKey =
    options.siteKey
      .trim()
      .toLowerCase();

  if (
    !apiUrl ||
    apiUrl.includes(
      "PASTE_THE_EXACT",
    )
  ) {
    throw new Error(
      "Central Buy Box API URL has not been configured.",
    );
  }

  if (
    !/^https:\/\//i.test(
      apiUrl,
    )
  ) {
    throw new Error(
      "Central Buy Box API URL must use HTTPS.",
    );
  }

  if (
    !/^[a-z0-9][a-z0-9-]*$/.test(
      siteKey,
    )
  ) {
    throw new Error(
      "Invalid Buy Box siteKey.",
    );
  }

  return {
    apiUrl,
    siteKey,
  };
}

async function callCentralApi<T>(
  options:
    CentralBuyBoxClientOptions,

  body:
    Record<
      string,
      unknown
    >,
): Promise<T> {
  const {
    apiUrl,
    siteKey,
  } =
    validateClientOptions(
      options,
    );

  let response:
    Response;

  try {
    response =
      await fetch(
        apiUrl,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              ...body,

              /*
               * All site-scoped requests use
               * the installation's siteKey.
               */
              ...(
                body.action ===
                  "get-config" ||
                body.action ===
                  "save-config"
                  ? {
                      siteKey,
                    }
                  : {}
              ),
            }),
        },
      );
  } catch (error) {
    throw new CentralBuyBoxApiError(
      error instanceof Error
        ? `Central Buy Box API network error: ${error.message}`
        : "Central Buy Box API network error.",
      0,
    );
  }

  let data:
    | T
    | CentralBuyBoxErrorResponse;

  try {
    data =
      await response.json();
  } catch {
    throw new CentralBuyBoxApiError(
      `Central Buy Box API returned invalid JSON (${response.status}).`,
      response.status,
    );
  }

  if (
    !response.ok ||
    (
      typeof data ===
        "object" &&
      data !== null &&
      "ok" in data &&
      data.ok === false
    )
  ) {
    const errorData =
      data as CentralBuyBoxErrorResponse;

    throw new CentralBuyBoxApiError(
      errorData.error ||
        `Central Buy Box API request failed (${response.status}).`,

      response.status,

      (errorData
        .unauthorized ===
        true) ||
        response.status === 401 ||
        response.status === 403,
    );
  }

  return data as T;
}

/* =========================================================
   PUBLIC CONFIG READ
========================================================= */

export async function getCentralBuyBoxConfig(
  options:
    CentralBuyBoxClientOptions,

  pagePath: string,
) {
  return callCentralApi<
    CentralBuyBoxGetResponse
  >(
    options,
    {
      action:
        "get-config",

      pagePath,
    },
  );
}

/* =========================================================
   PROTECTED CONFIG SAVE

   We will connect this in the next migration step.
========================================================= */

export async function saveCentralBuyBoxConfig(
  options:
    CentralBuyBoxClientOptions,

  pagePath: string,

  config:
    Record<
      string,
      unknown
    >,

  editorKey: string,
) {
  return callCentralApi<
    CentralBuyBoxSaveResponse
  >(
    options,
    {
      action:
        "save-config",

      pagePath,

      config,

      editorKey,
    },
  );
}

/* =========================================================
   EDITOR KEY CHECK

   Also prepared for the next step.
========================================================= */

export async function verifyCentralBuyBoxEditor(
  options:
    CentralBuyBoxClientOptions,

  editorKey: string,
) {
  return callCentralApi<{
    ok: true;
    authorized: true;
  }>(
    options,
    {
      action:
        "verify-editor",

      editorKey,
    },
  );
}
