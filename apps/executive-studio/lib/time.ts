/** Average weeks in a month. Shown in the formula so the figure can be checked. */
export const WEEKS_PER_MONTH = 52 / 12;

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export type TimeBurden = {
  weeklyMinutes: number;
  monthlyMinutes: number;
  monthlyHours: number;
  formula: string;
  guaranteedSavings: false;
  inputs: { frequencyPerWeek: number; minutesEach: number };
};

export function weeklyBurden(frequencyPerWeek: number, minutesEach: number): TimeBurden {
  const frequency = finite(frequencyPerWeek);
  const minutes = finite(minutesEach);
  const weeklyMinutes = frequency * minutes;
  const monthlyMinutes = weeklyMinutes * WEEKS_PER_MONTH;
  return {
    weeklyMinutes,
    monthlyMinutes,
    monthlyHours: monthlyMinutes / 60,
    formula: "frequency_per_week × minutes_per_occurrence × (52 / 12)",
    guaranteedSavings: false,
    inputs: { frequencyPerWeek: frequency, minutesEach: minutes },
  };
}

export type VolumeBurden = {
  monthlyMinutes: number;
  monthlyHours: number;
  formula: string;
  guaranteedSavings: false;
  inputs: { countPerMonth: number; minutesEach: number };
};

export function monthlyVolumeBurden(countPerMonth: number, minutesEach: number): VolumeBurden {
  const count = finite(countPerMonth);
  const minutes = finite(minutesEach);
  const monthlyMinutes = count * minutes;
  return {
    monthlyMinutes,
    monthlyHours: monthlyMinutes / 60,
    formula: "count_per_month × minutes_each",
    guaranteedSavings: false,
    inputs: { countPerMonth: count, minutesEach: minutes },
  };
}

export function renderedVideoMinutes(videos: number, averageSeconds: number): number {
  return (finite(videos) * finite(averageSeconds)) / 60;
}

function finite(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}
