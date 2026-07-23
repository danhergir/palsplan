# Lessons

- The product name is Palsplan. Keep the directory, visible brand, storage namespace, package, and repository aligned to that name.
- Trips can have zero, one, or several destinations. Model them as an ordered list so future itinerary features can build on the route.
- Shared travelers may add notes and links, but trip-wide destructive or identity changes (rename/cancel) are creator-only and must be enforced in the database, not only hidden in the UI.
