import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  checkAdmin,
  listSessions,
  createSession,
  getSession,
  updateSession,
  deleteSession,
  duplicateSession,
  publishSession,
  studioChat,
  generatePlayableGame,
  type StudioDraftSpec,
  type StudioMessage,
} from "@/lib/studio.functions";

export const Route = createFileRoute("/studio")({
  component: StudioPage,
  head: () => ({ meta: [{ title: "AI 遊戲工作室 (Beta) — 畫聊 Doodle" }] }),
});

type Session = {
  id: string;
  title: string;
  folder: string;
  progress: number;
  game_id: string | null;
  updated_at: string;
  draft_spec: StudioDraftSpec;
};

function StudioPage() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const checkFn = useServerFn(checkAdmin);
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); return; }
    checkFn().then((r) => setIsAdmin(r.isAdmin)).catch(() => setIsAdmin(false));
  }, [user, authLoading]);

  if (authLoading || isAdmin === null) {
    return <main className="min-h-screen grid place-items-center bg-background">
      <div className="font-display text-xl">讀取中…</div>
    </main>;
  }
  if (!user || !isAdmin) {
    return (
      <main className="min-h-screen grid place-items-center bg-background p-6">
        <div className="border-brutal shadow-brutal rounded-2xl bg-card p-8 max-w-md text-center">
          <div className="text-5xl mb-3">🛠️</div>
          <h1 className="font-display text-2xl font-bold mb-2">AI 遊戲工作室</h1>
          <p className="text-muted-foreground mb-4">此區僅限管理員使用。</p>
          <a href="/" className="inline-block border-brutal shadow-brutal-sm rounded-xl px-4 py-2 bg-primary text-primary-foreground font-bold">回首頁</a>
        </div>
      </main>
    );
  }
  return <StudioWorkspace />;
}

function StudioWorkspace() {
  const listFn = useServerFn(listSessions);
  const createFn = useServerFn(createSession);
  const getFn = useServerFn(getSession);
  const updateFn = useServerFn(updateSession);
  const deleteFn = useServerFn(deleteSession);
  const duplicateFn = useServerFn(duplicateSession);
  const publishFn = useServerFn(publishSession);
  const chatFn = useServerFn(studioChat);
  const generateFn = useServerFn(generatePlayableGame);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [spec, setSpec] = useState<StudioDraftSpec>({});
  const [progress, setProgress] = useState(0);
  const [folderFilter, setFolderFilter] = useState<"all" | "draft" | "published" | "archived">("all");
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [building, setBuilding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSuggestions, setLastSuggestions] = useState<string[]>([]);
  const [lastQuestions, setLastQuestions] = useState<string[]>([]);
  const [readyBuild, setReadyBuild] = useState(false);
  const [readyPublish, setReadyPublish] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "chat" | "info">("chat");
  const [codeTab, setCodeTab] = useState<"html" | "css" | "js" | "mp">("html");
  const [parts, setParts] = useState<{ html: string; css: string; js: string; mp: string }>({ html: "", css: "", js: "", mp: "" });

  async function refreshList() {
    try {
      const rows = await listFn();
      setSessions(rows as any);
    } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { refreshList(); }, []);

  async function openSession(id: string) {
    setActiveId(id);
    try {
      const s: any = await getFn({ data: { id } });
      setMessages((s.messages as StudioMessage[]) ?? []);
      setSpec((s.draft_spec as StudioDraftSpec) ?? {});
      setProgress(s.progress ?? 0);
      setLastQuestions([]); setLastSuggestions([]);
      setReadyBuild(false); setReadyPublish(false);
      const p = ((s.draft_spec?.extras as any)?.parts) ?? { html: "", css: "", js: "", mp: "" };
      setParts({ html: p.html ?? "", css: p.css ?? "", js: p.js ?? "", mp: p.mp ?? "" });
    } catch (e: any) { toast.error(e.message); }
  }

  async function newSession() {
    try {
      const s: any = await createFn({ data: {} });
      await refreshList();
      openSession(s.id);
    } catch (e: any) { toast.error(e.message); }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function persistSession(next: {
    messages?: StudioMessage[]; draft_spec?: StudioDraftSpec; progress?: number;
  }) {
    if (!activeId) return;
    try {
      await updateFn({ data: { id: activeId, ...next } });
      refreshList();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleSend() {
    if (!activeId) { toast.error("先建立或選擇一個專案"); return; }
    const text = input.trim();
    if (!text && pendingImages.length === 0) return;
    setSending(true);
    const userMsg: StudioMessage = { role: "user", content: text, ts: Date.now(), images: pendingImages };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    const imgs = pendingImages;
    setPendingImages([]);

    try {
      const res = await chatFn({
        data: {
          sessionId: activeId,
          userMessage: text,
          images: imgs,
          currentSpec: spec,
          history: newMessages.slice(0, -1).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        },
      });
      const mergedSpec = { ...spec, ...(res.spec_updates as StudioDraftSpec) };
      const asstMsg: StudioMessage = { role: "assistant", content: res.reply, ts: Date.now() };
      const finalMsgs = [...newMessages, asstMsg];
      setMessages(finalMsgs);
      setSpec(mergedSpec);
      setProgress(res.progress);
      setLastQuestions(res.questions);
      setLastSuggestions(res.suggestions);
      setReadyBuild(res.ready_to_build);
      setReadyPublish(res.ready_to_publish);
      await persistSession({ messages: finalMsgs, draft_spec: mergedSpec, progress: res.progress });
    } catch (e: any) {
      toast.error(e.message ?? "AI 回覆失敗");
      setMessages(newMessages); // keep user msg
    } finally { setSending(false); }
  }

  function handleFile(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 4)) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 3 * 1024 * 1024) { toast.error("圖片超過 3MB"); continue; }
      const reader = new FileReader();
      reader.onload = () => setPendingImages((p) => [...p, String(reader.result)]);
      reader.readAsDataURL(f);
    }
  }

  async function handlePublish() {
    if (!activeId) return;
    if (!confirm("確定要發布這款遊戲到平台嗎？")) return;
    setPublishing(true);
    try {
      const r = await publishFn({ data: { id: activeId } });
      toast.success(`已發布 v${r.version}`);
      refreshList();
    } catch (e: any) { toast.error(e.message); }
    finally { setPublishing(false); }
  }

  async function handleGeneratePlayable() {
    if (!activeId) { toast.error("先建立或選擇一個專案"); return; }
    setBuilding(true);
    try {
      const res: any = await generateFn({ data: { id: activeId, extraPrompt: input.trim() || undefined } });
      setMessages((res.messages as StudioMessage[]) ?? messages);
      setSpec((res.draft_spec as StudioDraftSpec) ?? spec);
      setProgress(res.progress ?? 100);
      setReadyPublish(true);
      setMobileTab("info");
      if (input.trim()) setInput("");
      toast.success("已產生真正可玩的遊戲程式，可以預覽與發布");
      refreshList();
    } catch (e: any) { toast.error(e.message ?? "產生遊戲失敗"); }
    finally { setBuilding(false); }
  }

  async function handleArchive(id: string) {
    await updateFn({ data: { id, folder: "archived" } });
    refreshList();
  }
  async function handleDelete(id: string) {
    if (!confirm("刪除這個專案？")) return;
    await deleteFn({ data: { id } });
    if (activeId === id) setActiveId(null);
    refreshList();
  }
  async function handleDuplicate(id: string) {
    const r: any = await duplicateFn({ data: { id } });
    refreshList();
    openSession(r.id);
  }

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (folderFilter !== "all" && s.folder !== folderFilter) return false;
      if (search && !(s.title.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [sessions, folderFilter, search]);

  return (
    <main className="h-[100dvh] w-screen overflow-hidden bg-background text-foreground flex flex-col lg:grid" style={{ gridTemplateColumns: "260px 1fr 340px" }}>
      {/* MOBILE TAB BAR */}
      <div className="lg:hidden flex border-b border-foreground/20 bg-card">
        {(["list", "chat", "info"] as const).map((t) => (
          <button key={t} onClick={() => setMobileTab(t)}
            className={`flex-1 py-2 text-sm font-bold ${mobileTab === t ? "bg-primary text-primary-foreground" : ""}`}>
            {t === "list" ? "📋 專案" : t === "chat" ? "💬 聊天" : "⚙️ 資訊"}
          </button>
        ))}
      </div>
      {/* LEFT */}
      <aside className={`${mobileTab === "list" ? "flex" : "hidden"} lg:flex border-r border-foreground/20 flex-col bg-card min-w-0 flex-1 lg:flex-none overflow-hidden`}>
        <div className="p-3 border-b border-foreground/20">
          <a href="/" className="text-xs text-muted-foreground hover:underline">← 回首頁</a>
          <div className="font-display font-bold text-lg mt-1">🛠️ AI 遊戲工作室</div>
          <div className="text-[11px] text-muted-foreground">Beta · 管理員專用</div>
        </div>
        <button onClick={newSession} className="m-3 border-brutal shadow-brutal-sm rounded-xl bg-primary text-primary-foreground font-bold py-2 hover:translate-y-0.5 hover:shadow-none transition">
          ➕ 建立新遊戲
        </button>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋…"
          className="mx-3 mb-2 border-brutal rounded-lg px-2 py-1 bg-input text-sm" />
        <div className="flex gap-1 px-3 mb-2 flex-wrap">
          {(["all", "draft", "published", "archived"] as const).map((f) => (
            <button key={f} onClick={() => setFolderFilter(f)}
              className={`text-[11px] border rounded-full px-2 py-0.5 ${folderFilter === f ? "bg-primary text-primary-foreground border-primary" : "border-foreground/30"}`}>
              {f === "all" ? "全部" : f === "draft" ? "草稿" : f === "published" ? "已發布" : "封存"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
          {filtered.length === 0 && <div className="text-center text-xs text-muted-foreground py-6">尚無專案</div>}
          {filtered.map((s) => (
            <div key={s.id}
              onClick={() => openSession(s.id)}
              className={`group cursor-pointer rounded-lg border p-2 text-sm ${activeId === s.id ? "border-foreground bg-primary/10" : "border-foreground/15 hover:bg-muted/50"}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span>{s.draft_spec?.emoji ?? "🎮"}</span>
                <span className="flex-1 truncate font-medium">{s.title}</span>
                <span className="text-[10px] text-muted-foreground">{s.progress}%</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{s.folder}</span>
                <div className="hidden group-hover:flex gap-1 text-[10px]">
                  <button onClick={(e) => { e.stopPropagation(); handleDuplicate(s.id); }} className="hover:underline">複製</button>
                  <button onClick={(e) => { e.stopPropagation(); handleArchive(s.id); }} className="hover:underline">封存</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="hover:underline text-destructive">刪除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* CENTER — chat */}
      <section className={`${mobileTab === "chat" ? "flex" : "hidden"} lg:flex flex-col min-w-0 bg-background flex-1 overflow-hidden`}>
        {activeId ? (
          <>
            <header className="border-b border-foreground/15 px-4 py-2 flex items-center gap-3">
              <span className="text-2xl">{spec.emoji ?? "🎮"}</span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold truncate">{spec.name ?? "未命名遊戲"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {spec.description ?? "透過聊天描述你的遊戲構想，AI 會逐步協助你完成設計。"}
                </div>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="max-w-lg mx-auto text-center py-10 opacity-80">
                  <div className="text-5xl mb-2">✨</div>
                  <div className="font-display text-lg font-bold">告訴我你想做什麼遊戲</div>
                  <div className="text-sm text-muted-foreground mt-1">例：「我要做一個 2 人合作解謎，有計時和排行榜」</div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground border-brutal shadow-brutal-sm"
                      : "bg-card border border-foreground/15"
                  }`}>
                    {m.images && m.images.length > 0 && (
                      <div className="flex gap-1 mb-1 flex-wrap">
                        {m.images.map((src, j) => (
                          <img key={j} src={src} alt="" className="h-24 w-24 object-cover rounded" />
                        ))}
                      </div>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-card border border-foreground/15 rounded-2xl px-3.5 py-2 text-sm">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce">·</span>
                      <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>·</span>
                    </span> AI 思考中
                  </div>
                </div>
              )}
            </div>

            {/* action chips */}
            {(lastSuggestions.length > 0 || lastQuestions.length > 0) && !sending && (
              <div className="px-4 pb-2 flex flex-wrap gap-1">
                {lastQuestions.slice(0, 5).map((q, i) => (
                  <button key={"q"+i} onClick={() => setInput(q)}
                    className="text-xs border border-foreground/20 rounded-full px-2 py-1 bg-muted/40 hover:bg-muted">💬 {q}</button>
                ))}
                {lastSuggestions.slice(0, 5).map((s, i) => (
                  <button key={"s"+i} onClick={() => setInput(`套用建議：${s}`)}
                    className="text-xs border border-foreground/20 rounded-full px-2 py-1 bg-accent/30 hover:bg-accent/50">✨ {s}</button>
                ))}
              </div>
            )}

            <div className="px-4 pb-2">
              <button
                onClick={handleGeneratePlayable}
                disabled={building || sending}
                className="w-full border-brutal shadow-brutal-sm rounded-xl bg-accent text-accent-foreground font-display font-bold py-2 hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-50"
              >
                {building ? "AI 正在寫真正可玩的遊戲程式…" : "⚡ AI 產生可玩的遊戲程式"}
              </button>
            </div>

            {pendingImages.length > 0 && (
              <div className="px-4 pb-2 flex gap-1">
                {pendingImages.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt="" className="h-16 w-16 object-cover rounded border border-foreground/20" />
                    <button onClick={() => setPendingImages((p) => p.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 text-xs">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-foreground/15 p-3 flex gap-2 items-end">
              <label className="cursor-pointer border-brutal rounded-lg px-2 py-2 text-sm bg-card hover:bg-muted" title="上傳圖片">
                📎
                <input type="file" accept="image/*" multiple hidden onChange={(e) => handleFile(e.target.files)} />
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => {
                  const files: File[] = [];
                  for (const item of Array.from(e.clipboardData.items)) {
                    const f = item.getAsFile();
                    if (f && f.type.startsWith("image/")) files.push(f);
                  }
                  if (files.length) { e.preventDefault(); handleFile(files as unknown as FileList); }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="用自然語言描述玩法；也可先寫額外要求再按「AI 產生可玩的遊戲程式」"
                rows={2}
                className="flex-1 border-brutal rounded-lg px-3 py-2 bg-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button onClick={handleSend} disabled={sending || building}
                className="border-brutal shadow-brutal-sm rounded-lg bg-primary text-primary-foreground font-bold px-4 py-2 hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-50">
                送出
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-center p-6">
            <div>
              <div className="text-6xl mb-3">🎨</div>
              <div className="font-display text-2xl font-bold mb-1">AI 遊戲工作室</div>
              <p className="text-muted-foreground max-w-md mx-auto text-sm">
                用聊天的方式描述你的遊戲構想，AI 會像資深企劃一樣一步步幫你完成設計、預覽與發布。<br />
                點左側「➕ 建立新遊戲」開始。
              </p>
            </div>
          </div>
        )}
      </section>

      {/* RIGHT — info panel */}
      <aside className={`${mobileTab === "info" ? "flex" : "hidden"} lg:flex border-l border-foreground/20 flex-col bg-card min-w-0 overflow-y-auto flex-1 lg:flex-none`}>
        {activeId ? (
          <div className="p-4 space-y-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-1">建立進度</div>
              <div className="h-3 rounded-full bg-muted overflow-hidden border border-foreground/20">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-right text-[11px] mt-1 text-muted-foreground">{progress}%</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">遊戲資訊</div>
              <div className="border border-foreground/15 rounded-lg p-2 space-y-1 text-xs">
                <Field label="名稱" v={spec.name} />
                <Field label="Emoji" v={spec.emoji} />
                <Field label="分類" v={spec.category} />
                <Field label="Primitive" v={spec.primitive} />
                <Field label="玩家" v={spec.min_players || spec.max_players ? `${spec.min_players ?? "?"} - ${spec.max_players ?? "?"}` : undefined} />
                <Field label="計時" v={spec.needs_timer ? `${spec.timer_seconds ?? "?"} 秒` : spec.needs_timer === false ? "否" : undefined} />
                <Field label="AI 對手" v={spec.needs_ai === undefined ? undefined : spec.needs_ai ? "是" : "否"} />
                <Field label="真人配對" v={spec.needs_matchmaking === undefined ? undefined : spec.needs_matchmaking ? "是" : "否"} />
                <Field label="排行榜" v={spec.needs_leaderboard === undefined ? undefined : spec.needs_leaderboard ? "是" : "否"} />
                <Field label="勝利條件" v={spec.win_condition} />
                <Field label="失敗條件" v={spec.lose_condition} />
                <Field label="關卡數" v={spec.levels?.toString()} />
              </div>
            </div>

            {spec.rules && spec.rules.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">規則</div>
                <ul className="text-xs list-disc pl-4 space-y-0.5">
                  {spec.rules.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-foreground/15">
              <div className="text-xs text-muted-foreground mb-1 font-bold">🎮 可玩遊戲程式（發布必填）</div>
              <div className="space-y-2 text-xs">
                <button
                  onClick={handleGeneratePlayable}
                  disabled={building}
                  className="w-full border-brutal shadow-brutal-sm rounded-lg bg-accent text-accent-foreground py-2 font-display font-bold hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-50"
                >
                  {building ? "生成中…" : spec.html_content ? "🔁 重新生成可玩遊戲" : "⚡ AI 生成真正可玩的遊戲"}
                </button>
                <div className="rounded-lg border border-foreground/15 bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
                  AI 會產生完整 HTML/CSS/JS 遊戲程式，含遊戲邏輯、分數、勝負、重新開始與手機/鍵盤操作；如果規格有多人，會加入同機多人或 AI 對手模式。
                </div>
                <div>
                  <label className="block text-muted-foreground mb-0.5">外部遊戲連結（optional）</label>
                  <input
                    type="url"
                    value={spec.play_url ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSpec((s) => ({ ...s, play_url: v }));
                      persistSession({ draft_spec: { ...spec, play_url: v } });
                    }}
                    placeholder="https://example.com/game"
                    className="w-full border-brutal rounded px-2 py-1 bg-input"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-0.5">或上傳/貼上 HTML 遊戲檔案</label>
                  <div className="flex gap-1 mb-1">
                    <label className="cursor-pointer border-brutal rounded px-2 py-1 bg-card hover:bg-muted text-[11px]">
                      📁 選擇 .html 檔
                      <input
                        type="file"
                        accept=".html,.htm,text/html"
                        hidden
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 2 * 1024 * 1024) { toast.error("HTML 超過 2MB"); return; }
                          const text = await f.text();
                          setSpec((s) => ({ ...s, html_content: text }));
                          persistSession({ draft_spec: { ...spec, html_content: text } });
                          toast.success(`已載入 ${f.name}`);
                        }}
                      />
                    </label>
                    {spec.html_content && (
                      <button
                        onClick={() => {
                          setSpec((s) => ({ ...s, html_content: undefined }));
                          persistSession({ draft_spec: { ...spec, html_content: undefined } });
                        }}
                        className="text-destructive text-[11px] underline"
                      >清除</button>
                    )}
                  </div>
                  <textarea
                    value={spec.html_content ?? ""}
                    onChange={(e) => setSpec((s) => ({ ...s, html_content: e.target.value }))}
                    onBlur={() => persistSession({ draft_spec: spec })}
                    placeholder="<!doctype html><html>...</html>"
                    rows={4}
                    className="w-full border-brutal rounded px-2 py-1 bg-input font-mono text-[10px]"
                  />
                  {spec.html_content && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      已載入 {(spec.html_content.length / 1024).toFixed(1)} KB，可直接預覽與發布
                    </div>
                  )}
                </div>

                {/* 3-column HTML/CSS/JS editor */}
                <div className="border border-foreground/15 rounded-lg p-2 bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[11px] font-bold">🎛️ 手動程式碼（HTML / CSS / JS）</div>
                    <div className="text-[10px] text-muted-foreground">三格可只填一個</div>
                  </div>
                  <div className="flex gap-1 mb-1">
                    {(["html", "css", "js"] as const).map((k) => (
                      <button key={k} onClick={() => setCodeTab(k)}
                        className={`text-[11px] border rounded px-2 py-0.5 ${codeTab === k ? "bg-primary text-primary-foreground border-primary" : "border-foreground/30 bg-card"}`}>
                        {k === "html" ? "HTML" : k === "css" ? "CSS" : "JS"}
                        {parts[k].trim() && <span className="ml-1">●</span>}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={parts[codeTab]}
                    onChange={(e) => setParts((p) => ({ ...p, [codeTab]: e.target.value }))}
                    placeholder={
                      codeTab === "html" ? "<div id='app'>Hello</div>" :
                      codeTab === "css" ? "body { background: #111; color: #fff; }" :
                      "console.log('hi'); // 前端 JS"
                    }
                    rows={6}
                    className="w-full border-brutal rounded px-2 py-1 bg-input font-mono text-[11px]"
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => {
                        const { html, css, js } = parts;
                        if (!html.trim() && !css.trim() && !js.trim()) {
                          toast.error("至少填入一個框");
                          return;
                        }
                        const composed = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${spec.name ?? "AI Game"}</title><style>html,body{margin:0;padding:0;height:100%;font-family:system-ui,sans-serif;}${css}</style></head><body>${html}<script>(function(){try{${js}}catch(e){console.error(e);}})();<\/script></body></html>`;
                        const nextExtras = { ...(spec.extras ?? {}), parts: { html, css, js } };
                        const nextSpec = { ...spec, html_content: composed, extras: nextExtras, generated_at: new Date().toISOString() };
                        setSpec(nextSpec);
                        persistSession({ draft_spec: nextSpec });
                        toast.success("已組合並套用到遊戲");
                      }}
                      className="flex-1 border-brutal shadow-brutal-sm rounded bg-primary text-primary-foreground text-[11px] font-bold py-1"
                    >⚙️ 組合並套用</button>
                    <button
                      onClick={() => {
                        setParts({ html: "", css: "", js: "" });
                        const nextExtras = { ...(spec.extras ?? {}), parts: undefined };
                        const nextSpec = { ...spec, extras: nextExtras };
                        setSpec(nextSpec);
                        persistSession({ draft_spec: nextSpec });
                      }}
                      className="border-brutal rounded bg-card text-[11px] px-2"
                    >清空</button>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    點「組合並套用」後會覆寫上方 HTML；只填一格也可以，發布時仍以組合後的 HTML 為主。
                  </div>
                </div>

                {spec.html_content && (
                  <div>
                    <div className="text-muted-foreground mb-0.5">內嵌預覽</div>
                    <div className="aspect-[4/3] overflow-hidden rounded-lg border-2 border-foreground/30 bg-black">
                      <iframe
                        key={spec.generated_at ?? spec.html_content.length}
                        srcDoc={spec.html_content}
                        title="AI 生成遊戲預覽"
                        className="h-full w-full bg-white"
                        sandbox="allow-scripts allow-pointer-lock"
                        referrerPolicy="no-referrer"
                        allow="autoplay; fullscreen; gamepad"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-muted-foreground mb-0.5">封面圖片 URL</label>
                  <input
                    type="url"
                    value={spec.cover_image_url ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSpec((s) => ({ ...s, cover_image_url: v }));
                    }}
                    onBlur={(e) => persistSession({ draft_spec: { ...spec, cover_image_url: e.currentTarget.value } })}
                    placeholder="https://…/cover.png"
                    className="w-full border-brutal rounded px-2 py-1 bg-input"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-0.5">玩法說明</label>
                  <textarea
                    value={spec.instructions ?? ""}
                    onChange={(e) => setSpec((s) => ({ ...s, instructions: e.target.value }))}
                    onBlur={(e) => persistSession({ draft_spec: { ...spec, instructions: e.currentTarget.value } })}
                    placeholder="按空白鍵跳躍…"
                    rows={2}
                    className="w-full border-brutal rounded px-2 py-1 bg-input"
                  />
                </div>
                {(spec.html_content || spec.play_url) && (
                  <a
                    href={spec.play_url || undefined}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      if (!spec.play_url && spec.html_content) {
                        e.preventDefault();
                        const w = window.open("about:blank");
                        if (w) { w.document.open(); w.document.write(spec.html_content); w.document.close(); }
                      }
                    }}
                    className="block text-center border-brutal shadow-brutal-sm rounded bg-secondary text-secondary-foreground py-1 font-bold hover:translate-y-0.5 hover:shadow-none transition"
                  >
                    👁️ 預覽遊戲
                  </a>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-foreground/15 space-y-2">
              {readyBuild && (
                <div className="text-xs bg-accent/30 border border-accent rounded-lg p-2">
                  ✅ AI 認為需求已足夠，可以進入建立階段。繼續聊天讓 AI 產出規格。
                </div>
              )}
              <button
                onClick={handlePublish}
                disabled={publishing || !spec.name || (!spec.html_content && !spec.play_url)}
                className={`w-full border-brutal shadow-brutal-sm rounded-xl font-display font-bold py-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  readyPublish ? "bg-accent text-accent-foreground animate-pulse" : "bg-primary text-primary-foreground"
                } hover:translate-y-0.5 hover:shadow-none`}
                title={!spec.name ? "缺少遊戲名稱" : (!spec.html_content && !spec.play_url) ? "請上傳遊戲 HTML 或填入外部連結" : ""}
              >
                {publishing ? "發布中…" : "🚀 發布遊戲"}
              </button>
              <p className="text-[10px] text-muted-foreground text-center">
                所有正式變更都必須由你按下發布才會生效。
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 text-xs text-muted-foreground">
            選擇左側的專案，或建立新遊戲以查看遊戲資訊與發布。
          </div>
        )}
      </aside>
    </main>
  );
}

function Field({ label, v }: { label: string; v?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right truncate ${v ? "font-medium" : "text-muted-foreground/50"}`}>{v ?? "—"}</span>
    </div>
  );
}
