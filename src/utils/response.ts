export const ok = <T>(data: T, message = 'ok') => ({
  success: true,
  message,
  data
})

export const fail = (message: string, error: any = null) => ({
  success: false,
  message,
  error
})
