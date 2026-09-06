WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 130
)
INSERT INTO players (player_id, credential_hash, display_name)
SELECT
  CASE n
    WHEN 1 THEN 'p-self-1'
    WHEN 11 THEN 'p-self-11'
    WHEN 12 THEN 'p-self-12'
    WHEN 127 THEN 'p-self-127'
    ELSE printf('p-%03d', n)
  END,
  CASE WHEN n IN (1, 11, 12, 127)
    THEN 'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb'
    ELSE 'unused'
  END,
  CASE n
    WHEN 1 THEN 'SELF1'
    WHEN 11 THEN 'SELF11'
    WHEN 12 THEN 'SELF12'
    WHEN 127 THEN 'SELF127'
    ELSE printf('PLAYER %03d', n)
  END
FROM seq;

WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 130
)
INSERT INTO records (
  player_id, mine_count, color_count, time_ms, base_seed, first_row, first_col, attempt,
  rule_version, app_version, actions_json, verification_status
)
SELECT
  CASE n
    WHEN 1 THEN 'p-self-1'
    WHEN 11 THEN 'p-self-11'
    WHEN 12 THEN 'p-self-12'
    WHEN 127 THEN 'p-self-127'
    ELSE printf('p-%03d', n)
  END,
  20,
  CASE WHEN n % 2 = 0 THEN 4 ELSE 3 END,
  9000 + n * 1000,
  printf('seed-%03d', n),
  4,
  4,
  0,
  'time-attack-c-v1',
  'test',
  '[]',
  'verified'
FROM seq;

INSERT INTO players (player_id, credential_hash, display_name) VALUES
  ('p-15', 'unused', 'FIFTEEN'),
  ('p-25', 'unused', 'TWENTYFIVE');

INSERT INTO records (
  player_id, mine_count, color_count, time_ms, base_seed, first_row, first_col, attempt,
  rule_version, app_version, actions_json, verification_status
) VALUES
  ('p-15', 15, 3, 15000, 'seed-15', 4, 4, 0, 'time-attack-c-v1', 'test', '[]', 'verified'),
  ('p-25', 25, 4, 25000, 'seed-25', 4, 4, 0, 'time-attack-c-v1', 'test', '[]', 'verified');
