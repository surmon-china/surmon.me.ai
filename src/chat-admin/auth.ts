import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

export const authMiddleware = (options: { verifyTokenEndpoint: string }) => {
  return createMiddleware(async (ctx, next) => {
    if (ctx.req.method === 'OPTIONS') {
      return next()
    }

    const authHeader = ctx.req.header('Authorization')
    if (!authHeader) {
      throw new HTTPException(401, { message: 'Unauthorized: Missing token' })
    }

    try {
      const verifyResponse = await fetch(options.verifyTokenEndpoint, {
        method: 'POST',
        headers: { Authorization: authHeader }
      })

      if (!verifyResponse.ok) {
        throw new HTTPException(401, { message: 'Unauthorized: Invalid token' })
      }

      await next()
    } catch (error) {
      if (error instanceof HTTPException) throw error
      console.error('[Admin Auth Error]', error)
      throw new HTTPException(502, { message: 'Bad Gateway: Auth service unavailable' })
    }
  })
}
