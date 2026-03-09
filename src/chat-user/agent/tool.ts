import { z } from 'zod'

export interface Tool<TInput extends z.core.$ZodType = z.core.$ZodType, TOutput = unknown> {
  description: string
  inputSchema: TInput
  execute: (input: z.infer<TInput>) => Promise<TOutput>
}

/**
 * @example
 * const myTool = defineTool({
 *   description: '...',
 *   inputSchema: z.object({ query: z.string() }),
 *   execute: async ({ query }) => { ... }
 * })
 */
export const defineTool = <TInput extends z.core.$ZodType, TOutput>(
  tool: Tool<TInput, TOutput>
): Tool<TInput, TOutput> => tool
