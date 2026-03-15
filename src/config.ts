export const AUTHOR_INFO_MARKDOWN_FILE_NAME = 'static/author_info.md'
export const SITE_INFO_MARKDOWN_FILE_NAME = 'static/site_info.md'

export const CHAT_API_TOKEN_HEADER_NAME = 'X-Token'
export const CHAT_API_USER_HISTORY_LIST_LIMIT = 50

export const CHAT_AGENT_PROMPT_SITE_NAME = 'Surmon.me'
export const CHAT_AGENT_PROMPT_SITE_MASTER_NAME = 'Surmon'

export const CHAT_AGENT_RATE_LIMIT_ROLLING_WINDOW_HOURS = 6
export const CHAT_AGENT_RATE_LIMIT_MAX_MESSAGES = 30
export const CHAT_AGENT_RATE_LIMIT_MAX_TOKENS = 60000

// Maximum allowed length (in characters) for a single user message.
export const CHAT_AGENT_USER_MESSAGE_MAX_LENGTH = 300

// Maximum number of agentic tool-call iterations per request.
// Prevents infinite loops in multi-step tool chains.
export const CHAT_AGENT_TOOL_CALL_MAX_STEPS = 3

// Maximum number of conversation rounds passed to the model as context history.
// Tool-related messages are excluded; each round counts as one user + one assistant message.
export const CHAT_AGENT_USER_HISTORY_MESSAGES_MAX_ROUNDS = 2

// Maximum number of chunks returned per RAG retrieval.
// Fewer results reduce token usage but may lower answer quality — tune carefully.
export const CHAT_AGENT_RAG_SEARCH_MAX_RESULTS = 4
// Maximum number of characters to include per RAG chunk in the context.
export const CHAT_AGENT_RAG_CHUNK_MAX_LENGTH = 600
