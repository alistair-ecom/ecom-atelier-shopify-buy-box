# @ecom-atelier/shopify-buy-box

Reusable React Buy Box for Shopify storefronts managed by the Ecom Atelier central Buy Box backend.

The package gets the Shopify storefront connection and the page-specific Buy Box configuration from the central Supabase Edge Function by `siteKey + pagePath`. Shopify remains the pricing authority. Discount Kit metadata defines available quantity offers, while real prices and checkout URLs come from Shopify Cart API evaluation.

## Install

```bash
npm install @ecom-atelier/shopify-buy-box
```

## Basic usage

```tsx
import {
  BuyBox,
} from "@ecom-atelier/shopify-buy-box";

import "@ecom-atelier/shopify-buy-box/style.css";

export function ProductLandingPage() {
  return (
    <BuyBox
      siteKey="adventure-shop"
    />
  );
}
```

The package uses the current browser pathname automatically. A central config row therefore resolves by:

```text
siteKey + pagePath
```

For another Shopify storefront:

```tsx
<BuyBox siteKey="ergowohl" />
```

The corresponding `buy_box_sites` row must already exist in the central Supabase project.

## Optional props

```tsx
<BuyBox
  siteKey="adventure-shop"
  pagePath="/summer-sale"
  productHandle="fallback-product-handle"
  size="large"
  buttonText="Jetzt kaufen"
  editorMode="auto"
/>
```

`productHandle` is only a fallback for pages that do not yet have a saved central configuration.

## Central API URL

The Ecom Atelier API URL is built in as the default. It can still be overridden:

```tsx
<BuyBox
  siteKey="adventure-shop"
  apiUrl="https://example.supabase.co/functions/v1/buy-box-api"
/>
```

## Editor

With `editorMode="auto"`, the settings editor is visible on localhost and Lovable preview hosts, but hidden on normal production domains.

You can also force it explicitly:

```tsx
<BuyBox
  siteKey="adventure-shop"
  editorMode={true}
/>
```

The editor key is verified and writes are authorized by the central Supabase Edge Function. Never put the editor key or Supabase service-role key into this package.

## Architecture

```text
Lovable / React project
        ↓
<BuyBox siteKey="..." />
        ↓
Central Supabase Buy Box API
        ↓
buy_box_sites + buy_box_configs
        ↓
Shopify Storefront API
        ↓
Discount Kit metadata + Shopify Cart pricing
        ↓
Shopify checkout
```

## Publishing

This package is configured as a public scoped npm package. Before first publish, make sure the npm account/organization owns the `@ecom-atelier` scope.

```bash
npm install
npm run typecheck
npm run build
npm login
npm publish
```
