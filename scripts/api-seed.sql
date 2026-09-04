INSERT INTO players (player_id, credential_hash, display_name) VALUES
  ('p-fast', 'unused', 'FAST'),
  ('p-self', 'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb', 'SELF'),
  ('p-slow', 'unused', 'SLOW'),
  ('p-15', 'unused', 'FIFTEEN'),
  ('p-25', 'unused', 'TWENTYFIVE');

INSERT INTO records (
  player_id, mine_count, color_count, time_ms, base_seed, first_row, first_col, attempt,
  rule_version, app_version, actions_json, verification_status
) VALUES
  ('p-fast', 20, 4, 10000, 'seed-fast', 4, 4, 0, 'time-attack-c-v1', 'test', '[]', 'verified'),
  ('p-self', 20, 3, 11000, 'seed-self', 4, 4, 0, 'time-attack-c-v1', 'test', '[]', 'verified'),
  ('p-slow', 20, 3, 12000, 'seed-slow', 4, 4, 0, 'time-attack-c-v1', 'test', '[]', 'verified'),
  ('p-15', 15, 3, 15000, 'seed-15', 4, 4, 0, 'time-attack-c-v1', 'test', '[]', 'verified'),
  ('p-25', 25, 4, 25000, 'seed-25', 4, 4, 0, 'time-attack-c-v1', 'test', '[]', 'verified');
