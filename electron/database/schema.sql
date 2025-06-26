-- Hybrid Database Schema for Pelicanos
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 1000;
PRAGMA temp_store = MEMORY;

-- Telemetry Events
CREATE TABLE IF NOT EXISTS telemetry_events (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    category TEXT NOT NULL,
    event TEXT NOT NULL,
    data TEXT,
    session_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_category ON telemetry_events(category);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    cpu_usage REAL,
    memory_usage REAL,
    storage_usage REAL,
    ipc_calls INTEGER,
    render_time REAL,
    frame_rate REAL,
    session_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON performance_metrics(timestamp);

-- Agent History
CREATE TABLE IF NOT EXISTS agent_history (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    action TEXT NOT NULL,
    config_snapshot TEXT,
    timestamp INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_history_agent_id ON agent_history(agent_id);
