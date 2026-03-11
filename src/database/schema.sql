DROP TABLE IF EXISTS chat_messages;

CREATE TABLE chat_messages (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  session_id    TEXT     NOT NULL,
  author_name   TEXT,
  author_email  TEXT,
  user_id       INTEGER,
  role          TEXT     NOT NULL CHECK(role IN ('system','user','assistant','tool')),
  content       TEXT,
  model         TEXT,
  tool_calls    TEXT,
  tool_call_id  TEXT,
  input_tokens  INTEGER  NOT NULL DEFAULT 0,
  output_tokens INTEGER  NOT NULL DEFAULT 0,
  created_at    INTEGER  NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_session_id    ON chat_messages (session_id, id);

CREATE INDEX idx_author_email  ON chat_messages (author_email);
CREATE INDEX idx_author_name   ON chat_messages (author_name);
CREATE INDEX idx_user_id       ON chat_messages (user_id);