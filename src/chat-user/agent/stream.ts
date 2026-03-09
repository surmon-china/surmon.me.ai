export interface ParsedChunk {
  textDelta?: string
  toolCallDelta?: {
    index: number
    id?: string
    name?: string
    argumentsDelta?: string
  }
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  finishReason?: string
}

export async function* parseModelStream(response: Response): AsyncGenerator<ParsedChunk> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()!

    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const raw = line.slice(5).trim()
      if (!raw || raw === '[DONE]') continue

      try {
        const data = JSON.parse(raw)

        if (data.usage) {
          yield {
            usage: {
              inputTokens: data.usage.prompt_tokens ?? 0,
              outputTokens: data.usage.completion_tokens ?? 0
            }
          }
        }

        const choice = data.choices?.[0]
        if (!choice) continue

        if (choice.finish_reason) {
          yield { finishReason: choice.finish_reason }
        }

        const delta = choice.delta
        if (!delta) continue

        if (delta.content) {
          yield { textDelta: delta.content }
        }

        for (const toolCall of delta.tool_calls ?? []) {
          yield {
            toolCallDelta: {
              index: toolCall.index,
              id: toolCall.id,
              name: toolCall.function?.name,
              argumentsDelta: toolCall.function?.arguments
            }
          }
        }
      } catch {}
    }
  }
}
