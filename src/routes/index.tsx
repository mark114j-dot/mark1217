import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { AVATARS, getClientId, getSavedAvatar, getSavedName, makeRoomCode, saveAvatar, saveName } from "@/lib/game";
import { toast } from "sonner";
import { AuthMenu } from "@/components/AuthMenu";
import { MusicToggle } from "@/components/MusicToggle";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { checkAdmin } from "@/lib/studio.functions";
import { COUNTRIES, useLang, useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "免費小遊戲大廳｜線上多人遊戲、益智遊戲｜畫聊 Doodle" },
      { name: "description", content: "畫聊 Doodle 是免費小遊戲大廳，提供線上多人遊戲與單人益智遊戲，包含繪圖猜題、五子棋、海戰棋、24 點、質數攀登、邏輯與數感挑戰。免安裝、免註冊，開瀏覽器即可遊玩。" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:title", content: "免費小遊戲大廳｜線上多人遊戲、益智遊戲｜畫聊 Doodle" },
      { property: "og:description", content: "免費線上小遊戲集合，包含多人連線、繪圖猜題、棋盤遊戲、數學數感、邏輯推理與單人益智遊戲。免安裝即可玩。" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "畫聊 Doodle" },
      { property: "og:locale", content: "zh_TW" },
      { property: "og:url", content: "https://mark1217.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://mark1217.lovable.app/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebPage",
            "@id": "https://mark1217.lovable.app/#webpage",
            name: "免費小遊戲大廳｜畫聊 Doodle",
            url: "https://mark1217.lovable.app/",
            description: "免費線上多人與單人小遊戲平台，包含繪圖猜題、棋盤、益智、邏輯與數感遊戲。",
            inLanguage: "zh-TW",
            isPartOf: { "@type": "WebSite", "@id": "https://mark1217.lovable.app/#website", name: "畫聊 Doodle", url: "https://mark1217.lovable.app/" },
          },
          {
            "@type": "WebSite",
            "@id": "https://mark1217.lovable.app/#website",
            name: "畫聊 Doodle",
            url: "https://mark1217.lovable.app/",
            description: "免費小遊戲大廳與線上多人遊戲平台。",
            inLanguage: "zh-TW",
          },
          {
            "@type": "SoftwareApplication",
            name: "畫聊 Doodle",
            applicationCategory: "GameApplication",
            operatingSystem: "Web",
            url: "https://mark1217.lovable.app/",
            description: "免安裝的線上多人繪圖猜題與益智小遊戲平台。",
            offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
          },
        ],
      }),
    }],
  }),
});

function Index() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const { user, profile } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const checkFn = useServerFn(checkAdmin);
  const [announcements, setAnnouncements] = useState<Array<{ id: string; kind: string; title: string; body: string }>>([]);
  const [lang, setLang] = useLang();
  const T = useT();
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,kind,title,body,block_play,active")
        .eq("active", true).eq("block_play", false)
        .order("created_at", { ascending: false }).limit(5);
      if (data) setAnnouncements(data as any);
    })();
  }, []);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    checkFn().then((r: any) => setIsAdmin(!!r.isAdmin)).catch(() => setIsAdmin(false));
  }, [user]);

  useEffect(() => {
    getClientId();
    setName(getSavedName());
    setAvatar(getSavedAvatar());
  }, []);

  // Pre-fill name/avatar from profile when logged in
  useEffect(() => {
    if (profile) {
      if (!getSavedName()) setName(profile.username);
      setAvatar(profile.avatar);
    }
  }, [profile]);

  async function handleCreate() {
    if (!name.trim()) return toast.error("先輸入你的名字！");
    saveName(name.trim());
    saveAvatar(avatar);
    setLoading("create");
    try {
      let attempts = 0;
      while (attempts++ < 5) {
        const roomCode = makeRoomCode();
        const { data, error } = await supabase
          .from("rooms")
          .insert({ code: roomCode, host_client_id: getClientId() })
          .select()
          .single();
        if (!error && data) {
          navigate({ to: "/room/$code", params: { code: roomCode } });
          return;
        }
      }
      toast.error("建立房間失敗，請再試一次");
    } finally {
      setLoading(null);
    }
  }

  async function handleJoin() {
    if (!name.trim()) return toast.error("先輸入你的名字！");
    if (!code.trim()) return toast.error("請輸入房間代碼");
    saveName(name.trim());
    saveAvatar(avatar);
    setLoading("join");
    const upper = code.trim().toUpperCase();
    const { data } = await supabase.from("rooms").select("code").eq("code", upper).maybeSingle();
    if (!data) {
      setLoading(null);
      return toast.error("找不到這個房間");
    }
    navigate({ to: "/room/$code", params: { code: upper } });
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <span className="font-display font-bold text-lg tracking-tight">
            畫<span className="text-primary">聊</span> <span className="text-muted-foreground font-medium text-sm">邏輯數感遊戲平台</span>
          </span>
          <span className="flex-1" />
          <MusicToggle />
          <AuthMenu />
        </div>
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border-brutal bg-card px-4 py-1.5 mb-5 text-xs font-semibold text-muted-foreground shadow-brutal-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" /> 免安裝 · 免註冊 · 開瀏覽器就能對戰
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight leading-tight">
            免費小遊戲大廳 — <span className="text-primary">畫聊 Doodle 線上多人遊戲</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            免費線上小遊戲集合，從繪圖猜題、五子棋、海戰棋到 24 點與質數攀登，支援多人連線、單人益智、邏輯推理與數感挑戰。
          </p>
        </motion.div>

        {announcements.length > 0 && (
          <div className="space-y-2 mb-4">
            {announcements.map((a) => {
              const style = a.kind === "urgent" ? "bg-red-100" :
                a.kind === "maintenance" ? "bg-amber-100" :
                a.kind === "event" ? "bg-fuchsia-100" : "bg-sky-100";
              const label = a.kind === "urgent" ? "🚨 緊急" : a.kind === "maintenance" ? "🛠️ 維護"
                : a.kind === "event" ? "🎉 活動" : "📣 公告";
              return (
                <div key={a.id} className={`border-brutal shadow-brutal-sm rounded-2xl p-3 ${style}`}>
                  <div className="text-xs font-bold">{label}</div>
                  <div className="font-display font-bold">{a.title}</div>
                  <div className="text-sm whitespace-pre-wrap mt-1">{a.body}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end mb-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="border-brutal rounded-lg px-2 py-1 text-xs bg-card"
            title="語言 / Language"
          >
            {Array.from(new Map(COUNTRIES.map((c) => [c.lang, c])).values()).map((c) => (
              <option key={c.lang} value={c.lang}>{c.flag} {c.lang}</option>
            ))}
          </select>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { delay: 0.1 } }}
          className="bg-card border-brutal shadow-brutal rounded-3xl p-6 space-y-5"
        >
          <label className="block">
            <span className="text-sm font-semibold mb-1.5 block">{T("your_name")}</span>
            <input
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              placeholder={T("your_name")}
              className="w-full border-brutal rounded-xl px-4 py-3 bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <div>
            <span className="text-sm font-semibold mb-1.5 block">{T("pick_avatar")}</span>
            <div className="grid grid-cols-8 gap-1.5">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`aspect-square rounded-lg text-xl flex items-center justify-center transition border-2 ${
                    avatar === a
                      ? "border-foreground bg-primary/20 scale-110 shadow-brutal-sm"
                      : "border-transparent hover:bg-muted"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading !== null}
            className="w-full border-brutal shadow-brutal-sm rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg py-3 hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-50"
          >
            {loading === "create" ? "…" : `${T("create_room")} →`}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-foreground/20" />
            <span className="text-xs text-muted-foreground">{T("or")}</span>
            <div className="flex-1 h-px bg-foreground/20" />
          </div>

          <div className="flex gap-2">
            <input
              value={code}
              maxLength={5}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={T("room_code")}
              className="flex-1 border-brutal rounded-xl px-4 py-3 bg-input font-mono tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={handleJoin}
              disabled={loading !== null}
              className="border-brutal shadow-brutal-sm rounded-xl bg-accent text-accent-foreground font-display font-bold px-5 hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-50"
            >
              {T("join")}
            </button>
          </div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {user ? "登入中 · 在好友頁可邀請朋友" : "無需登入也能玩 · 登入後可加好友與私訊"}
        </p>

        <div className="mt-6 text-center">
          <a
            href="/games"
            className="inline-block border-brutal shadow-brutal rounded-2xl px-5 py-3 bg-accent text-accent-foreground font-display font-bold hover:translate-y-0.5 hover:shadow-none transition"
          >
            🎮 進入免費小遊戲大廳（多人連線與益智遊戲）
          </a>
        </div>

        <div className="mt-3 flex gap-2 justify-center">
          <a
            href="/arcade"
            className="border-brutal shadow-brutal-sm rounded-xl px-4 py-2 bg-card font-bold hover:translate-y-0.5 hover:shadow-none transition"
          >
            🕹️ 單人街機與 AI 對戰
          </a>
          <a
            href="/shop"
            className="border-brutal shadow-brutal-sm rounded-xl px-4 py-2 bg-yellow-100 font-bold hover:translate-y-0.5 hover:shadow-none transition"
          >
            🛍️ 頭像商店
          </a>
          {user && (
            <a
              href="/invite"
              className="border-brutal shadow-brutal-sm rounded-xl px-4 py-2 bg-cyan-100 font-bold hover:translate-y-0.5 hover:shadow-none transition"
            >
              👥 邀請好友
            </a>
          )}
        </div>

        <section className="mt-10 rounded-3xl border-brutal bg-card p-6 shadow-brutal-sm">
          <h2 className="text-2xl font-black tracking-tight">免費線上小遊戲怎麼玩？</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            畫聊 Doodle 是以瀏覽器為主的免費小遊戲平台。你可以直接建立房間，分享房間代碼和朋友一起玩線上多人遊戲，也可以前往遊戲大廳挑選單人與益智遊戲。遊戲類型涵蓋繪圖猜題、棋盤遊戲、數學數感、邏輯推理與反應挑戰，不需要下載安裝程式。
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
            <a href="/games" className="rounded-full bg-muted px-3 py-1.5 hover:bg-accent">免費小遊戲</a>
            <a href="/games" className="rounded-full bg-muted px-3 py-1.5 hover:bg-accent">線上多人遊戲</a>
            <a href="/games" className="rounded-full bg-muted px-3 py-1.5 hover:bg-accent">益智遊戲</a>
            <a href="/games" className="rounded-full bg-muted px-3 py-1.5 hover:bg-accent">棋盤遊戲</a>
            <a href="/arcade" className="rounded-full bg-muted px-3 py-1.5 hover:bg-accent">單人街機</a>
          </div>
        </section>

        {isAdmin && (
          <div className="mt-3 flex gap-2 justify-center flex-wrap">
            <a href="/admin/announcements" className="border-brutal shadow-brutal-sm rounded-xl px-3 py-1.5 bg-red-100 font-bold text-sm hover:translate-y-0.5 hover:shadow-none transition">
              📣 公告管理
            </a>
            <a href="/admin/emotes" className="border-brutal shadow-brutal-sm rounded-xl px-3 py-1.5 bg-fuchsia-100 font-bold text-sm hover:translate-y-0.5 hover:shadow-none transition">
              🖼️ GIF 表情管理
            </a>
          </div>
        )}

        <div className="mt-3 text-center">
          <a
            href="/studio"
            className="inline-block border-brutal shadow-brutal-sm rounded-xl px-4 py-2 bg-gradient-to-r from-fuchsia-200 to-cyan-200 font-bold hover:translate-y-0.5 hover:shadow-none transition"
          >
            ✨ AI 遊戲工作室（Beta）
          </a>
          <div className="text-[10px] text-muted-foreground mt-1">管理員專用 · 用聊天做遊戲</div>
        </div>
      </div>
    </main>
  );
}
