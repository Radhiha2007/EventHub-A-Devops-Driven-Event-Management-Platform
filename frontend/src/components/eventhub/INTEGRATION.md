# React + Vite integration

The homepage is plain React; it has no TanStack Router, server, authentication or API dependencies. This Lovable preview keeps its required TanStack shell; your existing repository is untouched.

Copy `src/components/eventhub`, the two images in `src/assets`, `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`, and `src/lib/utils.ts` into your React + Vite project. Install `lucide-react`, `@radix-ui/react-dialog`, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss` (v4), and `tw-animate-css`. Preserve the `@` alias for the shared UI imports, or change those imports to relative paths.

Merge the semantic theme and `.eventhub` stylesheet rules from `src/styles.css` into your global stylesheet. Load Plus Jakarta Sans (weights 400–800) in your application's document head. Render `<EventHubHome />` anywhere in your existing React app.

`events.ts` contains all temporary event data and the pure filtering function. Replace that input with API data later. Event saving is deliberately in-memory for this visit, not persisted. Login, contact, policies and social links display explicit connection-pending states; no authentication behavior or endpoint is invented.
