# surmon.me.ai

[![nodepress](https://raw.githubusercontent.com/surmon-china/nodepress/main/branding/badge.svg)](https://github.com/surmon-china/nodepress)
&nbsp;
[![GitHub stars](https://img.shields.io/github/stars/surmon-china/surmon.me.ai.svg?style=for-the-badge)](https://github.com/surmon-china/surmon.me.ai/stargazers)
&nbsp;
[![GitHub issues](https://img.shields.io/github/issues/surmon-china/surmon.me.ai.svg?style=for-the-badge)](https://github.com/surmon-china/surmon.me.ai/issues)
&nbsp;
[![GitHub license](https://img.shields.io/github/license/surmon-china/surmon.me.ai.svg?style=for-the-badge)](/LICENSE)

The AI-native brain of [surmon.me](https://surmon.me/): An edge-computing AI service built with Cloudflare Workers, Vectorize, and Gemini.

---

```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```
