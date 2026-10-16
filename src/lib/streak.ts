const DAY_MS = 86_400_000;
const EAT_OFFSET_MS = 3 * 3_600_000;

export interface Streak {
  current: number;
  longest: number;
  lastDay: string | null;
  doneToday: boolean;
}

const dayIndex = (iso: string) => Math.floor((new Date(iso).getTime() + EAT_OFFSET_MS) / DAY_MS);

const dayLabel = (index: number) => new Date(index * DAY_MS).toISOString().slice(0, 10);

export function computeStreak(resolvedAt: string[], now: Date = new Date()): Streak {
  const days = [...new Set(resolvedAt.filter((s) => !Number.isNaN(new Date(s).getTime())).map(dayIndex))].sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, longest: 0, lastDay: null, doneToday: false };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const today = dayIndex(now.toISOString());
  const last = days[days.length - 1];
  const doneToday = last === today;
  const alive = doneToday || last === today - 1;
  return { current: alive ? run : 0, longest, lastDay: dayLabel(last), doneToday };
}
