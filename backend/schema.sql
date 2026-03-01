CREATE TABLE IF NOT EXISTS users (
    user_id       TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    preferences   TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    job_id          TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    step            INTEGER NOT NULL DEFAULT 0,
    source_key      TEXT,
    output_key      TEXT,
    target_language TEXT,
    created_at      TEXT NOT NULL,
    completed_at    TEXT,
    error           TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Migration for existing databases:
-- ALTER TABLE jobs ADD COLUMN step INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

CREATE TABLE IF NOT EXISTS voice_presets (
    voice_preset_id         TEXT PRIMARY KEY,
    user_id                 TEXT NOT NULL,
    name                    TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'PENDING',
    audio_key               TEXT,
    checkpoint_volume_path  TEXT,
    duration_sec            REAL,
    created_at              TEXT NOT NULL,
    completed_at            TEXT,
    error                   TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_voice_presets_user_id ON voice_presets(user_id);
