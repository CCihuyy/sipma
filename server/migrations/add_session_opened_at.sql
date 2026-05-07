ALTER TABLE jadwal
  ADD COLUMN session_opened_at DATETIME NULL AFTER is_open;

CREATE INDEX idx_session_opened_at ON jadwal(session_opened_at);
