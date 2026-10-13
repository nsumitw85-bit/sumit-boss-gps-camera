/**
 * Time and date formatting utilities for Sumit Boss.
 * Strictly adheres to 12-hour format with AM/PM (e.g., 08:54:15 PM, 09:15:30 AM).
 */

export function formatTime12Hour(dateInput: Date | number = new Date()): string {
  const date = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  const rawHours = date.getHours();
  const period = rawHours >= 12 ? 'PM' : 'AM';
  const hours12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hoursStr = pad(hours12);
  const minutesStr = pad(date.getMinutes());
  const secondsStr = pad(date.getSeconds());
  return `${hoursStr}:${minutesStr}:${secondsStr} ${period}`;
}

export function formatDateString(dateInput: Date | number = new Date()): string {
  const date = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Normalizes any timestamp or time string into 12-hour format with AM/PM.
 * Converts legacy 24-hour strings (e.g., '20:54:15' -> '08:54:15 PM') cleanly.
 */
export function normalizeTime12Hour(timeStr?: string, timestamp?: number): string {
  if (timestamp) {
    return formatTime12Hour(timestamp);
  }
  if (!timeStr) {
    return formatTime12Hour(new Date());
  }
  if (/am|pm/i.test(timeStr)) {
    return timeStr;
  }
  const parts = timeStr.trim().split(':');
  if (parts.length >= 2) {
    const rawHours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const seconds = parts[2] ? parts[2].split(' ')[0] : '00';
    if (!isNaN(rawHours)) {
      const period = rawHours >= 12 ? 'PM' : 'AM';
      const hours12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(hours12)}:${minutes}:${seconds} ${period}`;
    }
  }
  return timeStr;
}
