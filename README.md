# surmon.me.ai

[![nodepress](https://raw.githubusercontent.com/surmon-china/nodepress/main/branding/badge.svg)](https://github.com/surmon-china/nodepress)
&nbsp;
[![GitHub stars](https://img.shields.io/github/stars/surmon-china/surmon.me.ai.svg?style=for-the-badge)](https://github.com/surmon-china/surmon.me.ai/stargazers)
&nbsp;
[![GitHub issues](https://img.shields.io/github/issues/surmon-china/surmon.me.ai.svg?style=for-the-badge)](https://github.com/surmon-china/surmon.me.ai/issues)
&nbsp;
[![GitHub license](https://img.shields.io/github/license/surmon-china/surmon.me.ai.svg?style=for-the-badge)](/LICENSE)

**The AI Agent service for the [surmon.me](https://github.com/stars/surmon-china/lists/surmon-me) ecosystem, built on Cloudflare Workers. It connects CMS content (NodePress), the frontend website, and external knowledge sources into a unified conversational interface powered by Gemini 2.5 Flash and RAG.**

For a full breakdown of the architecture, data flows, and deployment steps, see [ARCHITECTURE.md](./ARCHITECTURE.md).

**为 [surmon.me](https://github.com/stars/surmon-china/lists/surmon-me) 生态构建的自包含 AI Agent 服务。基于 Tool-driven 的 Agent 架构，将 CMS 内容（NodePress）、前端网站（Surmon.me）与外部知识源统一接入智能对话能力。**

有关设计、架构、部署的问题，请参阅 [中文架构文档](./ARCHITECTURE.zh-CN.md)。

**Related projects:**

- **[NodePress](https://github.com/surmon-china/nodepress)** - RESTful API service (CMS core).
- **[surmon.me](https://github.com/surmon-china/surmon.me)** - SSR blog website
- **[surmon.me.admin](https://github.com/surmon-china/surmon.me.admin)** - Blog admin site

---

## Development

```bash
pnpm install
```

```bash
pnpm run dev
```

If connecting to remote resources (D1/R2) with network restrictions:

```bash
HTTPS_PROXY=http://127.0.0.1:6152 pnpm run dev
```

## Deployment

Configure secrets before deploying:

```bash
wrangler secret put CF_ACCOUNT_ID
wrangler secret put CF_AIG_TOKEN
wrangler secret put CHAT_TOKEN_SECRET
wrangler secret put WEBHOOK_SECRET
```

```bash
pnpm run deploy
```

## License

[MIT](/LICENSE)
