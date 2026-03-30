export function isIgnorableTelegramRevokeError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("user not found") ||
    message.includes("user_id_invalid") ||
    message.includes("participant_id_invalid") ||
    message.includes("member not found") ||
    message.includes("chat not found") ||
    message.includes("can't remove chat owner")
  );
}
