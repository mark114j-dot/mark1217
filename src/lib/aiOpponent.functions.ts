import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

/**
 * Ask the AI to pick the next move in a generic board/game state.
 * Input: gameId, a compact text description of state, list of legal moves as strings.
 * Output: { move: string, reason: string }
 */
export const aiPickMove = createServerFn({ method: "POST" })
  .inputValidator((data: { gameId: string; state: string; legalMoves: string[]; persona?: string }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI 未設定");
    if (data.legalMoves.length === 0) return { move: "", reason: "no moves" };
    if (data.legalMoves.length === 1) return { move: data.legalMoves[0], reason: "only option" };

    const persona = data.persona ?? "你是一位友善但聰明的桌遊對手，會選擇能贏的最佳走法。";
    const prompt = `遊戲：${data.gameId}\n目前狀態：${data.state}\n合法走法（請只回傳其中一個，完全一致）：${data.legalMoves.join(", ")}`;

    try {
      const r = await fetch(GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: persona + " 只用 JSON 回應：{\"move\":\"...\",\"reason\":\"...\"}。move 必須是合法走法清單中的一個字串。" },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) {
        return { move: data.legalMoves[Math.floor(Math.random() * data.legalMoves.length)], reason: "ai fallback" };
      }
      const j = await r.json();
      const content = j.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      const move = typeof parsed.move === "string" && data.legalMoves.includes(parsed.move)
        ? parsed.move
        : data.legalMoves[Math.floor(Math.random() * data.legalMoves.length)];
      return { move, reason: parsed.reason ?? "" };
    } catch {
      return { move: data.legalMoves[Math.floor(Math.random() * data.legalMoves.length)], reason: "error fallback" };
    }
  });