-- Distinguish old and new game URLs in existing aggregate gameplay analytics.
-- No URL/referrer/player identity is retained. All historical records are old.
ALTER TABLE gameplay_events
  ADD COLUMN site_variant TEXT NOT NULL DEFAULT 'legacy'
  CHECK (site_variant IN ('legacy', 'hub'));
CREATE INDEX IF NOT EXISTS gameplay_events_site_variant_received_at
  ON gameplay_events(site_variant, received_at);
