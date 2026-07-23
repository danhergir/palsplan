# Lessons

- The product name is Palsplan. Keep the directory, visible brand, storage namespace, package, and repository aligned to that name.
- Trips can have zero, one, or several destinations. Model them as an ordered list so future itinerary features can build on the route.
- Shared travelers may add notes and links, but trip-wide destructive or identity changes (rename/cancel) are creator-only and must be enforced in the database, not only hidden in the UI.
- Browser-local identity should never force a returning traveler to create a duplicate member on another device; offer existing-member recovery before the new-member form.
- Group availability needs both an aggregate overlap view and a quick per-traveler filter so friends can understand who selected which dates.
