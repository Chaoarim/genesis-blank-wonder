/**
 * Count business days in a month.
 * Business days = Monday–Friday + optionally Saturdays.
 * @param year Full year (e.g. 2026)
 * @param month 0-indexed month (0 = January)
 * @param includeSaturdays Whether Saturdays count as business days (default: true)
 */
export function getBusinessDaysInMonth(year: number, month: number, includeSaturdays = true): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay(); // 0=Sun, 6=Sat
    if (dow === 0) continue; // Sunday
    if (dow === 6 && !includeSaturdays) continue; // Saturday excluded
    count++;
  }
  return count;
}

/**
 * Count remaining business days from a given date (inclusive) to end of month.
 * @param date The reference date
 * @param includeSaturdays Whether Saturdays count as business days (default: true)
 */
export function getRemainingBusinessDays(date: Date, includeSaturdays = true): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const currentDay = date.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = currentDay; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow === 0) continue;
    if (dow === 6 && !includeSaturdays) continue;
    count++;
  }
  return count;
}

/**
 * Check if a given date is a business day.
 */
export function isBusinessDay(date: Date, includeSaturdays = true): boolean {
  const dow = date.getDay();
  if (dow === 0) return false;
  if (dow === 6 && !includeSaturdays) return false;
  return true;
}
