export interface WeekDay {
  iso: string;
  label: string;
  dayNumber: number;
}

const dayLabels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export function getWeekDays(reference: Date = new Date(), weekOffset = 0): WeekDay[] {
  const base =
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()) +
    weekOffset * 7 * 24 * 60 * 60 * 1000;
  const weekday = new Date(base).getUTCDay();
  const offsetToMonday = (weekday + 6) % 7;
  const mondayMs = base - offsetToMonday * 24 * 60 * 60 * 1000;

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(mondayMs + index * 24 * 60 * 60 * 1000);
    return {
      iso: day.toISOString().slice(0, 10),
      label: dayLabels[day.getUTCDay()],
      dayNumber: day.getUTCDate()
    };
  });
}

export interface MonthDay {
  iso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  weekOffsetFromToday: number;
}

export function getMonthDays(reference: Date = new Date(), monthOffset = 0): MonthDay[] {
  const monthStart = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + monthOffset, 1));
  const monthIndex = monthStart.getUTCMonth();
  const weekday = monthStart.getUTCDay();
  const offsetToMonday = (weekday + 6) % 7;
  const gridStartMs = monthStart.getTime() - offsetToMonday * 24 * 60 * 60 * 1000;

  const today = new Date();
  const todayMondayMs =
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
    ((today.getUTCDay() + 6) % 7) * 24 * 60 * 60 * 1000;

  const totalCells = 42;
  return Array.from({ length: totalCells }, (_, index) => {
    const dayMs = gridStartMs + index * 24 * 60 * 60 * 1000;
    const day = new Date(dayMs);
    const dayMondayMs = dayMs - ((day.getUTCDay() + 6) % 7) * 24 * 60 * 60 * 1000;
    return {
      iso: day.toISOString().slice(0, 10),
      dayNumber: day.getUTCDate(),
      inCurrentMonth: day.getUTCMonth() === monthIndex,
      weekOffsetFromToday: Math.round((dayMondayMs - todayMondayMs) / (7 * 24 * 60 * 60 * 1000))
    };
  });
}

export function formatMonthLabel(reference: Date = new Date(), monthOffset = 0): string {
  const monthStart = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + monthOffset, 1));
  const label = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthStart);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekRange(days: WeekDay[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) {
    return "";
  }
  const lastDate = new Date(`${last.iso}T00:00:00.000Z`);
  const month = new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: "UTC" }).format(lastDate);
  const year = lastDate.getUTCFullYear();
  return `Semana del ${first.dayNumber} al ${last.dayNumber} de ${month} de ${year}`;
}

export function formatLongDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 6) {
    return "Buenas noches";
  }
  if (hour < 14) {
    return "Buenos dias";
  }
  if (hour < 21) {
    return "Buenas tardes";
  }
  return "Buenas noches";
}
