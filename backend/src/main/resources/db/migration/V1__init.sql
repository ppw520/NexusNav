CREATE TABLE IF NOT EXISTS "groups" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    open_mode TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_cards_group FOREIGN KEY (group_id) REFERENCES "groups" (id)
);

CREATE TABLE IF NOT EXISTS layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    layout_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health_status (
    card_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    http_code INTEGER,
    latency_ms INTEGER,
    checked_at TEXT NOT NULL,
    message TEXT,
    frame_blocked INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_health_card FOREIGN KEY (card_id) REFERENCES cards (id)
);

CREATE TABLE IF NOT EXISTS app_meta (
    meta_key TEXT PRIMARY KEY,
    meta_value TEXT NOT NULL
);
