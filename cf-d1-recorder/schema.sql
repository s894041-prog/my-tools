-- 直笛小遊戲：練習紀錄（共用 school_apps 庫，表名前綴 recorder_）
CREATE TABLE IF NOT EXISTS recorder_practice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school TEXT NOT NULL,
  grade INTEGER NOT NULL,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
);
CREATE INDEX IF NOT EXISTS idx_recorder_board ON recorder_practice(school, grade, score DESC);
