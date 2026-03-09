import { z } from 'zod'
import type { ValidationTargets } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator as zodValidator } from '@hono/zod-validator'

export const zValidator = <T extends z.ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T
) =>
  zodValidator(target, schema, (result, ctx) => {
    if (!result.success) {
      throw new HTTPException(400, {
        message: result.error.issues[0].message,
        cause: result.error
      })
    }
  })
