CREATE TABLE IF NOT EXISTS players (
  player_id TEXT PRIMARY KEY,
  credential_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS records (
  player_id TEXT NOT NULL,
  mine_count INTEGER NOT NULL CHECK (mine_count IN (15, 20, 25)),
  color_count INTEGER NOT NULL CHECK (color_count IN (3, 4)),
  time_ms INTEGER NOT NULL CHECK (time_ms >= 1000 AND time_ms <= 3600000),
  base_seed TEXT NOT NULL,
  first_row INTEGER NOT NULL CHECK (first_row BETWEEN 0 AND 8),
  first_col INTEGER NOT NULL CHECK (first_col BETWEEN 0 AND 8),
  attempt INTEGER NOT NULL CHECK (attempt >= 0),
  rule_version TEXT NOT NULL,
  app_version TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('verified', 'suspicious')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id, mine_count),
  FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_records_ranking
  ON records (mine_count, verification_status, time_ms, updated_at, player_id);

CREATE TABLE IF NOT EXISTS submission_log (
  submission_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  mine_count INTEGER NOT NULL CHECK (mine_count IN (15, 20, 25)),
  status TEXT NOT NULL CHECK (status IN ('verified', 'suspicious')),
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (submission_id, player_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_submission_log_player_created
  ON submission_log (player_id, created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  rate_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (rate_key, window_start)
);
