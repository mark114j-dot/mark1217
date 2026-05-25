import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { AVATARS } from "@/lib/game";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "登入 · 畫聊" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username.trim(), avatar },
          },
        });
        if (error) throw error;
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