/** "0s ago", "12s ago", "3 min ago", "2 h ago", "1 d ago". Negative ages (clock skew) count as 0. */
export function formatAge(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString();
}

/** Short date and time in the user's locale, e.g. "Oct 21, 10:42". */
export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
