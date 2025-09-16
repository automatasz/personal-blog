export function formatDateToYYYYMMDD(date: Date): string {
  return date.toISOString().substring(0, 10);
}

export function daysAgo(date: Date): number {
  const now = new Date();
  // Zero out time to avoid partial day differences
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfInput = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = startOfToday.getTime() - startOfInput.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function daysAgoWord(days: number): string {
  if (days === 0) {
    return "today";
  }

  if (days === 1) {
    return "yesterday";
  }

  return `${days} days ago`;
}

export function getTime(date: Date): string {
  const minutes = `0${date.getMinutes()}`;
  return `${date.getHours()}:${minutes.slice(-2)}`;
}
