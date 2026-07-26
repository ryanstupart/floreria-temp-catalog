# Supabase development setup

Required Render environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_STORAGE_BUCKET=product-images

After deployment, log in at `/admin`, open Products, and click **Import Current Catalog** exactly once while the Supabase `products` table is empty. The website falls back to `public/products.js` when Supabase is unavailable or empty.
