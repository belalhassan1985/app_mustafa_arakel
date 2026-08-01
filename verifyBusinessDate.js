// Scratch script to test the business day helper range logic

function getBusinessDayRange(now = new Date()) {
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

function getBusinessDate(dateVal = new Date()) {
  const dateObj = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  const { start } = getBusinessDayRange(dateObj);
  const businessDate = new Date(start);
  businessDate.setHours(0, 0, 0, 0);
  return businessDate;
}

// Test cases
const testCases = [
  {
    name: "Exactly at 12:00 AM (midnight) local time - should belong to previous day",
    input: new Date("2026-08-02T00:00:00"),
    expectedDate: "2026-08-01",
    expectedStart: "2026-08-01T03:00:00",
    expectedEnd: "2026-08-02T02:59:59"
  },
  {
    name: "At 1:30 AM local time - should belong to previous day",
    input: new Date("2026-08-02T01:30:00"),
    expectedDate: "2026-08-01",
    expectedStart: "2026-08-01T03:00:00",
    expectedEnd: "2026-08-02T02:59:59"
  },
  {
    name: "At 2:59 AM local time - should belong to previous day",
    input: new Date("2026-08-02T02:59:59"),
    expectedDate: "2026-08-01",
    expectedStart: "2026-08-01T03:00:00",
    expectedEnd: "2026-08-02T02:59:59"
  },
  {
    name: "Exactly at 3:00 AM local time - should transition to new business day",
    input: new Date("2026-08-02T03:00:00"),
    expectedDate: "2026-08-02",
    expectedStart: "2026-08-02T03:00:00",
    expectedEnd: "2026-08-03T02:59:59"
  },
  {
    name: "At 4:00 PM local time - should belong to current business day",
    input: new Date("2026-08-02T16:00:00"),
    expectedDate: "2026-08-02",
    expectedStart: "2026-08-02T03:00:00",
    expectedEnd: "2026-08-03T02:59:59"
  }
];

function formatLocal(date) {
  // Format to YYYY-MM-DDTHH:mm:ss in local timezone
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

let allPassed = true;
testCases.forEach((tc) => {
  const range = getBusinessDayRange(tc.input);
  const businessDate = getBusinessDate(tc.input);

  const formattedStart = formatLocal(range.start);
  const formattedEnd = formatLocal(range.end);
  const formattedBusDate = formatDate(businessDate);

  const isStartOk = formattedStart.startsWith(tc.expectedStart);
  const isEndOk = formattedEnd.startsWith(tc.expectedEnd);
  const isDateOk = formattedBusDate === tc.expectedDate;

  if (isStartOk && isEndOk && isDateOk) {
    console.log(`[PASS] ${tc.name}`);
  } else {
    console.log(`[FAIL] ${tc.name}`);
    console.log(`  Input:         ${formatLocal(tc.input)}`);
    console.log(`  Expected Date: ${tc.expectedDate}, Got: ${formattedBusDate}`);
    console.log(`  Expected Start: ${tc.expectedStart}, Got: ${formattedStart}`);
    console.log(`  Expected End:   ${tc.expectedEnd}, Got: ${formattedEnd}`);
    allPassed = false;
  }
});

if (allPassed) {
  console.log("\nAll Business Day tests passed successfully!");
} else {
  console.log("\nSome tests failed.");
  process.exit(1);
}
