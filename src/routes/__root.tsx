import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { useEffect } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { MusicProvider } from "@/lib/music";
import { registerPwa } from "@/lib/pwa";
import { precacheOfflineGames } from "@/lib/offlineCache";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "u93TDIJ0Fky7-_USm_pgoCWXCG0D_ZdfzIZhZIJjLoA" },
      { title: "畫畫" },
      { name: "description", content: "Playful Realms is a multiplayer online game platform offering a variety of connected gaming experiences." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "畫畫" },
      { property: "og:description", content: "Playful Realms is a multiplayer online game platform offering a variety of connected gaming experiences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "畫畫" },
      { name: "twitter:description", content: "Playful Realms is a multiplayer online game platform offering a variety of connected gaming experiences." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b1a2abf9-b84a-4dec-9e68-ee09ba4854ac/id-preview-25f1b820--f8cd0126-39cf-4ace-82de-8826dad3b9d6.lovable.app-1779343089965.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b1a2abf9-b84a-4dec-9e68-ee09ba4854ac/id-preview-25f1b820--f8cd0126-39cf-4ace-82de-8826dad3b9d6.lovable.app-1779343089965.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Noto+Sans+TC:wght@400;500;700&family=Caveat:wght@600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/pwa-192.png" },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerPwa();
    const t = window.setTimeout(() => {
      void precacheOfflineGames();
    }, 2500);
    const onOnline = () => void precacheOfflineGames();
    window.addEventListener("online", onOnline);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return (

    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MusicProvider>
          <Outlet />
          <Toaster position="top-center" />
        </MusicProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
