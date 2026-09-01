import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { AVATARS } from "@/lib/game";
import { COUNTRIES } from "@/lib/i18n";
import { toast } from "sonner";

const loginSearchSchema = z.object({ ref: z.string().optional() });

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: loginSearchSchema,
  head: () => ({
    meta: [
      { title: "登入／註冊 — 畫聊 Doodle 多人遊戲平台" },
      { name: "description", content: "登入或註冊畫聊 Doodle，保存你的頭像、金幣與寶石，加好友、參加邀請活動，並在多人繪圖猜題與桌遊房間中累積戰績。" },
      { property: "og:title", content: "登入／註冊 — 畫聊 Doodle" },
      { property: "og:description", content: "註冊帳號保存頭像、金幣與好友清單，解鎖邀請獎勵與完整多人遊戲功能。" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mark1217.lovable.app/login" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://mark1217.lovable.app/login" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [country, setCountry] = useState(COUNTRIES[0].code);
  const [inviteCode, setInviteCode] = useState((search.ref ?? "").toUpperCase());
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate({ to: "/" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!username.trim()) {
          toast.error("請輸入顯示名稱");
          return;
        }
        const selected = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username: username.trim(),
              avatar,
              country: selected.code,
              country_flag: selected.flag,
              language: selected.lang,
              invite_ref: inviteCode.trim().toUpperCase() || null,
            },
          },
        });
        if (error) throw error;
        // Persist country/language onto profile (best-effort; may run before session established)
        try {
          const { data: sess } = await supabase.auth.getUser();
          if (sess.user) {
            await supabase.from("profiles").update({
              country: selected.code, language: selected.lang,
            }).eq("id", sess.user.id);
          }
          localStorage.setItem("lang", selected.lang);
          if (inviteCode.trim()) localStorage.setItem("pending_invite", inviteCode.trim().toUpperCase());
        } catch {}
        toast.success("註冊成功！");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("歡迎回來！");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "失敗");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (r.error) toast.error("Google 登入失敗");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-card border-brutal shadow-brutal rounded-3xl p-6 space-y-5"
      >
        <div className="text-center">
          <h1 className="font-display font-bold text-3xl">
            {mode === "login" ? "登入帳號" : "建立新帳號"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            登入後可以加好友、私訊與接受加房邀請
          </p>
        </div>

        <button
          onClick={google}
          className="w-full border-brutal shadow-brutal-sm rounded-xl bg-background font-display font-bold py-3 hover:translate-y-0.5 hover:shadow-none transition flex items-center justify-center gap-2"
        >
          <span>🔑</span> 使用 Google 登入
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-foreground/20" />
          <span className="text-xs text-muted-foreground">或用 Email</span>
          <div className="flex-1 h-px bg-foreground/20" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="顯示名稱"
                maxLength={16}
                className="w-full border-brutal rounded-xl px-4 py-3 bg-input focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">選擇國家/地區（語言會自動套用）</div>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full border-brutal rounded-xl px-3 py-3 bg-input"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.lang})</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">邀請碼（選填，雙方各得 10 💎）</div>
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 12))}
                  placeholder="例如 A1B2C3D4"
                  className="w-full border-brutal rounded-xl px-4 py-3 bg-input font-mono"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">頭像</div>
                <div className="grid grid-cols-8 gap-1.5">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      className={`aspect-square rounded-lg text-xl flex items-center justify-center transition border-2 ${
                        avatar === a
                          ? "border-foreground bg-primary/20 scale-110"
                          : "border-transparent hover:bg-muted"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full border-brutal rounded-xl px-4 py-3 bg-input focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密碼（至少 6 字元）"
            required
            minLength={6}
            className="w-full border-brutal rounded-xl px-4 py-3 bg-input focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full border-brutal shadow-brutal-sm rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg py-3 hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-50"
          >
            {loading ? "處理中…" : mode === "login" ? "登入" : "註冊"}
          </button>
        </form>

        <div className="text-center text-sm">
          {mode === "login" ? (
            <button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">
              沒有帳號？馬上註冊
            </button>
          ) : (
            <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">
              已經有帳號？登入
            </button>
          )}
        </div>

        <Link to="/" className="block text-center text-xs text-muted-foreground hover:underline">
          ← 不登入直接玩
        </Link>
      </motion.div>
    </main>
  );
}