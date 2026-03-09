const encoder = new TextEncoder()

const createKey = (secret: string) => {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify'
  ])
}

export const signToken = async (uuid: string, secret: string): Promise<string> => {
  const key = await createKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(uuid))
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${uuid}.${base64}`
}

export const verifyToken = async (token: string, secret: string): Promise<string | null> => {
  const [uuid, signatureBase64] = token.split('.')
  if (!uuid || !signatureBase64) return null

  const key = await createKey(secret)
  const normalized = signatureBase64.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const signature = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
  const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(uuid))
  return isValid ? uuid : null
}
