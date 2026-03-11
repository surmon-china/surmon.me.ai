import type { Context, Next } from 'hono'
import { fail } from './response'

type ContextWithEnv = Context<{ Bindings: Env }>

const getClientIp = (ctx: ContextWithEnv): string => {
  return ctx.req.header('CF-Connecting-IP') ?? 'unknown'
}

export const ipRateLimit = (getRateLimiter: (ctx: ContextWithEnv) => RateLimit) => {
  return async (ctx: ContextWithEnv, next: Next) => {
    const ip = getClientIp(ctx)
    const { success } = await getRateLimiter(ctx).limit({ key: ip })
    if (!success) {
      return ctx.json(fail('Rate limit exceeded, please try again later.'), 429)
    }
    await next()
  }
}
