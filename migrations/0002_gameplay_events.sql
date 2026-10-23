-- Independent of ranking identities. First opening is once per temporary tab visit.
CREATE TABLE IF NOT EXISTS gameplay_events (
  session_id TEXT NOT NULL,
  event TEXT NOT NULL CHECK(event IN ('visit','first_cell_open')),
  source TEXT NOT NULL,
  mine_count INTEGER NOT NULL,
  color_count INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  PRIMARY KEY(session_id,event)
);
CREATE INDEX IF NOT EXISTS gameplay_events_received_at ON gameplay_events(received_at);
