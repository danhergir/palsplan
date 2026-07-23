# Palsplan

Find the dates when your favorite people can get away together.

Palsplan is a mobile-friendly group availability planner for trips. Create a trip with one destination, several stops, or an open-ended route; share its six-character code or URL; and let every friend mark all the dates they could travel. The strongest overlaps rise to the top automatically.

Travelers can also pin shared notes and safe links for Airbnbs, hotels, restaurants, or loose ideas. The trip creator keeps private permission to rename or permanently cancel the plan.

On a new device, returning travelers can choose their existing name to recover
their saved dates instead of creating a duplicate. Because Palsplan does not
yet require accounts, possession of the trip code is the trust boundary for
this recovery flow.

## Run locally

```bash
npm install
npm run dev
```

Without environment variables, Palsplan uses browser storage in local demo mode. This is useful for trying the complete flow in one browser.

## Enable shared trips with Supabase

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor, or use `npx supabase db push` after linking the Supabase CLI.
3. Copy `.env.example` to `.env.local` and add your project URL and public anon key.
4. Restart the development server.

For GitHub Pages, add the same values as repository secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The included MVP database policies allow anonymous collaboration because a trip code acts as the invitation. Tighten this access model with Supabase Auth or code-scoped database functions before storing sensitive information.

## Deploy

The workflow in `.github/workflows/deploy.yml` builds and deploys every push to `main`. In the GitHub repository settings, choose **GitHub Actions** as the Pages source.

## Product roadmap

- Destination discovery and collaborative shortlists
- Day-by-day itinerary building
- Lodging and activity voting
- Comments, reactions, reminders, and calendar export
- Authenticated trip ownership and moderation
