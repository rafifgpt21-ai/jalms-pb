export function isDirectMessagingEnabled() {
  return process.env.DIRECT_MESSAGES_ENABLED === "true"
}
