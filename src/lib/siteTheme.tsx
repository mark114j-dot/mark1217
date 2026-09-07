import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "site-theme-vars";

function apply(vars: Record<string, string>) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === "string") root.style.setProperty(`--${k}`, v);
  }
}

export function SiteThemeLoader() {
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) apply(JSON.parse(cached));
    } catch { /* ignore */ }

    if (!navigator.onLine) return;
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "theme")
      .maybeSingle()
      .then(({ data }) => {
        const vars = (data?.value as any)?.vars;
        if (vars && typeof vars === "object") {
          apply(vars);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(vars)); } catch { /* ignore */ }
        }
      });
  }, []);
  return null;
}
