/**
 * Calculates the start and end boundaries for the current business day.
 * The business day starts at 3:00:00 AM and ends at 2:59:59.999 AM the next day.
 * 
 * @param {Date} now - The current reference time (defaults to current system time).
 * @returns {{start: Date, end: Date}} The business day boundaries.
 */
export function getBusinessDayRange(now = new Date()) {
  const start = new Date(now);
  if (now.getHours() < 3) {
    start.setDate(start.getDate() - 1);
  }
  start.setHours(3, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(2, 59, 59, 999);

  return { start, end };
}

/**
 * Calculates the date range for time filters ('today', 'week', 'month')
 * using the custom business day offset (shifting the day start by 3 hours).
 * 
 * @param {string} filterKey - The active filter key ('today', 'week', 'month', 'all').
 * @param {Date} now - The current reference time (defaults to current system time).
 * @returns {{start: Date|null, end: Date|null}} The date range boundaries.
 */
export function getBusinessDateRange(filterKey, now = new Date()) {
  const currentBusinessDay = getBusinessDayRange(now);

  if (filterKey === 'today') {
    return currentBusinessDay;
  }

  if (filterKey === 'week') {
    // Start of the week is the Sunday of the current business day
    const start = new Date(currentBusinessDay.start);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(3, 0, 0, 0);

    return { start, end: currentBusinessDay.end };
  }

  if (filterKey === 'month') {
    // Start of the month is the 1st day of the month of the current business day
    const start = new Date(currentBusinessDay.start);
    start.setDate(1);
    start.setHours(3, 0, 0, 0);

    return { start, end: currentBusinessDay.end };
  }

  return { start: null, end: null };
}

/**
 * Returns the calendar date corresponding to the current business day.
 * For example, if it is 1:00 AM on August 2nd, the business date is August 1st.
 * 
 * @param {Date|string} dateVal - The reference time (defaults to current system time).
 * @returns {Date} The business day date (midnight of the business day).
 */
export function getBusinessDate(dateVal = new Date()) {
  const dateObj = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  const { start } = getBusinessDayRange(dateObj);
  const businessDate = new Date(start);
  businessDate.setHours(0, 0, 0, 0);
  return businessDate;
}

