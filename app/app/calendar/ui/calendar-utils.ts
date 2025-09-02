export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function startOfMonthGrid(year: number, month: number): Date {
  // Monday-first grid
  const first = new Date(year, month, 1);
  const day = (first.getDay() + 6) % 7; // 0 Monday ... 6 Sunday
  return addDays(first, -day);
}
export function monthDays(year: number, month: number): (Date|null)[] {
  // For year view headers; align to Monday
  const first = new Date(year, month, 1);
  const day = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date|null)[] = [];
  for (let i = 0; i < day; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}
export function getYearRange(year: number) {
  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31);
  return { from, to };
}
export function getMonthRange(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return { from, to };
}
export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
