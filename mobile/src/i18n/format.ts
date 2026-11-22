import { getLanguage, LOCALES } from "./index";

// Dates are stored as calendar days, so they are written in UTC to avoid shifting a day.
const at = (iso: string) => new Date(`${iso}T00:00:00Z`);
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALES[getLanguage()], { ...o, timeZone: "UTC" });

export const formatDayHeading = (iso: string) => fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(at(iso));
export const formatShortDate = (iso: string) => fmt({ day: "numeric", month: "short", year: "numeric" }).format(at(iso));
/** "November 2026", from "2026-11". */
export const formatMonthTitle = (month: string) => fmt({ month: "long", year: "numeric" }).format(at(`${month}-01`));
/** "20 Nov", for the edges of a pay cycle. */
export const formatDayMonth = (iso: string) => fmt({ day: "numeric", month: "short" }).format(at(iso));
/** Short weekday names, Monday first. */
export const weekdayNames = (style: "narrow" | "short" = "short") => Array.from({ length: 7 }, (_, i) => fmt({ weekday: style }).format(at(`2026-11-${String(2 + i).padStart(2, "0")}`)));
/** "Nov", from "2026-11". */
export const formatMonthShort = (month: string) => fmt({ month: "short" }).format(at(`${month}-01`));
