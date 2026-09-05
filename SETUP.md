# Northlight Archive — FINAL SETUP

## 1. Create the GitHub repository

1. Go to https://github.com
2. Create a new repository named `northlight-archive`.
3. Upload everything in this folder so `index.html` is at the repository root.
4. Commit the files.

## 2. Enable GitHub Pages

GitHub repository → Settings → Pages
- Source: Deploy from a branch
- Branch: `main`
- Folder: `/ (root)`
- Save

Wait for GitHub to publish the site.

## 3. Create your Supabase project

Go to https://supabase.com and create a project.

In Supabase:
1. Open SQL Editor.
2. Create a new query.
3. Paste ALL of `supabase/schema.sql`.
4. Run it.

This creates the photo database, orders, order items, and storage buckets/policies.

## 4. Get your Supabase public settings

Supabase → Project Settings → API.

Copy:
- Project URL
- anon/public key

Open `js/config.js` in this project and replace:
`YOUR_SUPABASE_URL`
`YOUR_SUPABASE_ANON_KEY`

The anon key is intended for browser use. NEVER put a service-role key here.

## 5. Create your admin account

Supabase → Authentication → Users → Add user.

Create the email/password account that only YOU will use for the admin dashboard.

Then open the admin page:
`https://YOUR-GITHUB-USERNAME.github.io/northlight-archive/admin.html`

Sign in with that account.

## 6. Configure storage

The SQL file creates:
- `photo-previews` — public preview images
- `photo-originals` — private original files

The admin uploader automatically creates a reduced preview and stores the original separately.

## 7. Configure PayPal/Venmo

PayPal currently supports PayPal Checkout with Venmo for eligible U.S. transactions. Venmo availability depends on eligibility, and PayPal requires a Business account for accepting Venmo payments.

Start with PayPal's current developer documentation:
https://developer.paypal.com/platforms/checkout/standard/integrate
and Venmo:
https://developer.paypal.com/venmo/

Create a PayPal app and obtain:
- Client ID
- Client Secret

The Client ID can be used by the browser. The Client Secret MUST stay server-side.

## 8. Deploy the secure PayPal backend

Install the Supabase CLI and log in:
https://supabase.com/docs/guides/cli

From the project folder:
1. Link the project.
2. Deploy the included Edge Function:
   `supabase functions deploy paypal`
3. Set secrets:
   `supabase secrets set PAYPAL_CLIENT_ID="YOUR_CLIENT_ID"`
   `supabase secrets set PAYPAL_CLIENT_SECRET="YOUR_CLIENT_SECRET"`

For live payments, use the production PayPal API and production credentials. For testing, use sandbox credentials first.

## 9. Put your PayPal Client ID in the website

Open `js/config.js` and set:
`PAYPAL_CLIENT_ID: "YOUR_PAYPAL_CLIENT_ID"`

Do NOT put the PayPal Client Secret in any website file.

## 10. Set the Supabase function URL

In `js/config.js`, set:
`SUPABASE_FUNCTION_URL: "https://YOUR_PROJECT_REF.supabase.co/functions/v1/paypal"`

## 11. Test before taking real money

Use PayPal sandbox first.
Test:
- Admin login
- Upload
- Tags
- Search
- Cart
- Create order
- Cancel payment
- Successful payment
- Order appearing in Admin → Orders
- Download link
- Mobile checkout

Only switch to live credentials after the entire test flow works.

## 12. Your normal workflow

After setup, you do NOT edit HTML to add photos.

You:
1. Open `admin.html`.
2. Sign in.
3. Click Add Photograph.
4. Select the image from your computer.
5. Enter title.
6. Enter description.
7. Enter price.
8. Enter category.
9. Enter comma-separated tags.
10. Click Publish.

The public website reads the database automatically.

## 13. Custom domain (optional)

If you already own a domain:
GitHub repository → Settings → Pages → Custom domain.

Then configure the DNS records required by GitHub for that domain.

## 14. Important business note

Payment providers may require identity/tax information as part of merchant onboarding. Your website does not need to store your SSN, but you should not attempt to bypass a payment provider's verification requirements.

Also make sure your photo licensing terms, refunds, taxes, and business requirements are appropriate for your situation.
