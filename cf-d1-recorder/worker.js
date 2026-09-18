// 直笛小遊戲後端：練習紀錄 API（綁共用 school_apps 庫）
// 前端在 GitHub Pages，免登入匿名寫入（只收暱稱，不收真名）
const SCHOOLS = ['鐵山國小', '安定國小', '馬鳴國小'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };
    if (method === "OPTIONS") return new Response(null, { headers: cors });
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: cors });

    try {
      // 健康檢查
      if (path === "/api/health") return json({ ok: true });

      // 送出一次練習成績
      if (path === "/api/practice" && method === "POST") {
        const b = await request.json();
        const school = String(b.school || "");
        const grade = Number(b.grade);
        const nickname = String(b.nickname || "").trim().slice(0, 12);
        const score = Number(b.score);
        if (!SCHOOLS.includes(school)) return json({ error: "school 不正確" }, 400);
        if (!Number.isInteger(grade) || grade < 1 || grade > 6) return json({ error: "grade 需為 1-6" }, 400);
        if (!nickname) return json({ error: "nickname 必填（請用綽號）" }, 400);
        if (!Number.isInteger(score) || score < 0 || score > 999) return json({ error: "score 不正確" }, 400);
        // 簡易節流：同一人 30 秒內只收一次，避免連點灌水
        const last = await env.DB.prepare(
          "SELECT created_at FROM recorder_practice WHERE school=? AND grade=? AND nickname=? ORDER BY id DESC LIMIT 1"
        ).bind(school, grade, nickname).first();
        if (last) {
          const ok = await env.DB.prepare(
            "SELECT datetime('now', '+8 hours', '-30 seconds') < ? AS too_fast"
          ).bind(last.created_at).first();
          if (ok && ok.too_fast) return json({ error: "太快了，休息一下再送出" }, 429);
        }
        const r = await env.DB.prepare(
          "INSERT INTO recorder_practice (school, grade, nickname, score) VALUES (?,?,?,?)"
        ).bind(school, grade, nickname, score).run();
        return json({ ok: true, id: r.meta.last_row_id });
      }

      // 排行榜（依學校＋年級取最高分，每人只取最佳一次）
      if (path === "/api/board" && method === "GET") {
        const school = url.searchParams.get("school") || "";
        const grade = Number(url.searchParams.get("grade") || 0);
        const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);
        if (!SCHOOLS.includes(school)) return json({ error: "school 不正確" }, 400);
        let sql = "SELECT nickname, grade, MAX(score) AS best, COUNT(*) AS plays, MAX(created_at) AS last_play FROM recorder_practice WHERE school=?";
        const args = [school];
        if (grade >= 1 && grade <= 6) { sql += " AND grade=?"; args.push(grade); }
        sql += " GROUP BY school, grade, nickname ORDER BY best DESC, last_play ASC LIMIT ?";
        args.push(limit);
        const { results } = await env.DB.prepare(sql).bind(...args).all();
        return json(results);
      }

      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 500);
    }
  },
};
