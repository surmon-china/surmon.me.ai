import type { ModelMessage, ModelToolCall } from '../database/model-message'
import type { InsertChatMessage } from '../database/save'
import type { Tool } from './tool'
import { callModel } from './model'
import { parseModelStream } from './stream'

export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; name: string }
  | { type: 'tool_end' }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface AgentOptions {
  env: Env
  model: string
  messages: ModelMessage[]
  tools?: Record<string, Tool>
  maxSteps?: number
  sessionId: string
  signal?: AbortSignal
  onStreamEvent: (event: StreamEvent) => Promise<void>
  onFinish?: (producedMessages: InsertChatMessage[]) => void | Promise<void>
}

// Agent State Machine
// - Utilizes a 'for' loop with a 'maxSteps' safeguard instead of 'while(true)' to prevent infinite recursion.
// - Appends context in each iteration to ensure conversation history integrity for multi-turn tool calls.
// - Passes the actual 'env' binding to 'tool.execute' instead of an empty object.
// - Input: 'ModelMessage[]' (for LLM consumption).
// - Output: 'InsertChatMessage[]' (for database persistence), while streaming events via 'onStreamEvent'.
export const runAgent = async (options: AgentOptions): Promise<void> => {
  const { env, model, tools, sessionId, signal, onStreamEvent, onFinish } = options
  const maxSteps = options.maxSteps ?? 5

  // context is the complete context of this agent run, appended in each round.
  let context: ModelMessage[] = [...options.messages]
  const produced: InsertChatMessage[] = []

  try {
    for (let step = 0; step < maxSteps; step++) {
      const response = await callModel({ env, model, messages: context, tools, signal })

      const toolCallsMap = new Map<number, ModelToolCall>()
      let assistantText = ''
      let inputTokens = 0
      let outputTokens = 0

      for await (const chunk of parseModelStream(response)) {
        if (chunk.textDelta) {
          assistantText += chunk.textDelta
          await onStreamEvent({ type: 'text', content: chunk.textDelta })
        }

        if (chunk.toolCallDelta) {
          const { index, id, name, argumentsDelta } = chunk.toolCallDelta
          if (!toolCallsMap.has(index)) {
            toolCallsMap.set(index, {
              id: id!,
              type: 'function',
              function: { name: name!, arguments: '' }
            })
            await onStreamEvent({ type: 'tool_start', name: name! })
          }
          if (argumentsDelta) {
            toolCallsMap.get(index)!.function.arguments += argumentsDelta
          }
        }

        if (chunk.usage) {
          inputTokens = chunk.usage.inputTokens
          outputTokens = chunk.usage.outputTokens
        }
      }

      const finalToolCalls = Array.from(toolCallsMap.values())

      // Assistant messages: written to both the context (ModelMessage) and the produced (ChatMessage) simultaneously.
      const assistantModelMessage: ModelMessage = {
        role: 'assistant',
        content: assistantText || null,
        ...(finalToolCalls.length ? { tool_calls: finalToolCalls } : {})
      }

      const assistantDatabaseMessage: InsertChatMessage = {
        session_id: sessionId,
        role: 'assistant',
        content: assistantText || null,
        model,
        tool_calls: finalToolCalls.length ? JSON.stringify(finalToolCalls) : null,
        input_tokens: inputTokens,
        output_tokens: outputTokens
      }

      context.push(assistantModelMessage)
      produced.push(assistantDatabaseMessage)

      // If no tools are invoked, this round of conversation ends.
      if (!finalToolCalls.length) break

      // Execute all tools concurrently (tool_call and tool_result must appear in pairs)
      const toolResults = await Promise.all(
        finalToolCalls.map(async (toolCall) => {
          const targetTool = tools?.[toolCall.function.name]
          let resultText: string

          if (!targetTool) {
            resultText = JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` })
          } else {
            try {
              const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {}
              const result = await targetTool.execute(args)
              resultText = typeof result === 'string' ? result : JSON.stringify(result)
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : String(error)
              resultText = JSON.stringify({ error: message })
            }
          }

          const toolModelMessage: ModelMessage = {
            role: 'tool',
            content: resultText,
            tool_call_id: toolCall.id
          }

          const toolDatabaseMessage: InsertChatMessage = {
            session_id: sessionId,
            role: 'tool',
            content: resultText,
            tool_call_id: toolCall.id,
            model
          }

          return { modelMessage: toolModelMessage, databaseMessage: toolDatabaseMessage }
        })
      )

      context.push(...toolResults.map((r) => r.modelMessage))
      produced.push(...toolResults.map((r) => r.databaseMessage))

      await onStreamEvent({ type: 'tool_end' })
    }

    // If the agent exhausted all steps without producing a final text response,
    // it means tool calls consumed all available steps. Emit an error so the client
    // can display a message, while still persisting all produced messages for debugging.
    const hasProducedText = produced.some((message) => message.role === 'assistant' && message.content)
    if (!hasProducedText) {
      await onStreamEvent({
        type: 'error',
        message: 'This request exceeds the maximum number of steps the agent can handle.'
      })
    }

    await onStreamEvent({ type: 'done' })
    await onFinish?.(produced)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    await onStreamEvent({ type: 'error', message })
    throw error
  }
}
