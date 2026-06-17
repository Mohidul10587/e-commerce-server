"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localDayRange = localDayRange;
exports.buildDateFilter = buildDateFilter;
/**
 * Converts a "YYYY-MM-DD" date string + browser tzOffset (minutes, from getTimezoneOffset())
 * into UTC Date boundaries that represent the start/end of that local day.
 *
 * Example: "2026-06-17", tzOffset=-360 (UTC+6)
 *   → start = 2026-06-16T18:00:00.000Z  (June 17 00:00 in BD)
 *   → end   = 2026-06-17T17:59:59.999Z  (June 17 23:59:59 in BD)
 */
function localDayRange(dateStr, tzOffsetMinutes) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - tzOffsetMinutes * 60 * 1000);
    const lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - tzOffsetMinutes * 60 * 1000);
    return { gte, lte };
}
/**
 * Builds a { gte, lte } filter from startDate + endDate query params + tzOffset.
 * Returns undefined if params are missing.
 */
function buildDateFilter(startDate, endDate, tzOffset) {
    if (!startDate || !endDate)
        return undefined;
    const { gte } = localDayRange(startDate, tzOffset);
    const { lte } = localDayRange(endDate, tzOffset);
    return { gte, lte };
}
