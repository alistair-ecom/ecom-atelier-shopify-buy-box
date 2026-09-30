# @ecom-atelier/shopify-buy-box

Reusable React Buy Box for Shopify storefronts managed by the Ecom Atelier central Buy Box backend.

The package gets the Shopify storefront connection and the page-specific Buy Box configuration from the central Supabase Edge Function by `siteKey + pagePath`. Shopify remains the pricing authority. Discount Kit metadata defines available quantity offers, while real prices and checkout URLs come from Shopify Cart API evaluation.

## Install

```bash
npm install @ecom-atelier/shopify-buy-box
```

## Recommended Lovable setup

Configure the store once at app level:

```tsx
import {
  BuyBoxProvider,
} from "@ecom-atelier/shopify-buy-box";

<BuyBoxProvider siteKey="adventure-shop">
  <App />
</BuyBoxProvider>
```

Then any page can add the Buy Box with:

```tsx
import {
  BuyBoxSection,
} from "@ecom-atelier/shopify-buy-box";

<BuyBoxSection />
```

`BuyBoxSection` automatically uses the current browser pathname, so each page resolves its own central configuration by:

```text
siteKey + pagePath
```

It also defaults to a full-width landing-page section so common narrow Lovable content wrappers do not squeeze the Buy Box.

For another Shopify storefront, configure that project once with a different registered site key:

```tsx
<BuyBoxProvider siteKey="ergowohl">
  <App />
</BuyBoxProvider>
```

The corresponding `buy_box_sites` row must already exist in the central Supabase project.

## Short Lovable prompts

First Buy Box in a new project:

```text
Set up the Ecom Atelier Buy Box for this project using site key "adventure-shop".
Add the Buy Box at the main purchase point of this page.
```

Additional pages in the same project:

```text
Add the Ecom Atelier Buy Box at the main purchase point of this page.
```

## Direct usage

The lower-level component remains available:

```tsx
import {
  BuyBox,
} from "@ecom-atelier/shopify-buy-box";

<BuyBox siteKey="adventure-shop" />
```

## Optional section overrides

```tsx
<BuyBoxSection
  pagePath="/summer-sale"
  productHandle="fallback-product-handle"
  size="large"
  fullBleed={true}
/>
```

`productHandle` is only a fallback for pages that do not yet have a saved central configuration.

## Central API URL

The Ecom Atelier API URL is built in as the default and is normally inherited from `BuyBoxProvider`.

## Editor

With `editorMode="auto"`, the settings editor is visible in the embedded Lovable editor preview and on localhost, but hidden on normal customer-facing pages.

The editor key is verified and writes are authorized by the central Supabase Edge Function. Never put the editor key or Supabase service-role key into this package.

## Architecture

```text
Lovable / React project
        ↓
<BuyBoxProvider siteKey="..." />
        ↓
<BuyBoxSection />
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
