// Test utilities that work in both Node.js and Obsidian environments

// Mock TFile for testing
class MockTFile {
  constructor(name, path) {
    this.name = name;
    this.path = path;
    this.stat = { mtime: Date.now() };
  }
}

// Core utility functions (extracted from plugin for standalone testing)
class TestableRecurringUpkeepUtils {
  static calculateIntervalInDays(interval, intervalUnit) {
    const normalizedUnit = intervalUnit?.toLowerCase();

    if (normalizedUnit === "day" || normalizedUnit === "days") {
      return Number(interval);
    } else if (normalizedUnit === "week" || normalizedUnit === "weeks") {
      return Number(interval) * 7;
    } else if (normalizedUnit === "month" || normalizedUnit === "months") {
      return Number(interval) * 30;
    } else if (normalizedUnit === "year" || normalizedUnit === "years") {
      return Number(interval) * 365;
    }
    return Number(interval);
  }

  static getFrequencyDescription(interval, intervalUnit) {
    const normalizedUnit = intervalUnit?.toLowerCase();

    if (interval === 1) {
      if (normalizedUnit === "day" || normalizedUnit === "days") return "daily";
      if (normalizedUnit === "week" || normalizedUnit === "weeks") return "weekly";
      if (normalizedUnit === "month" || normalizedUnit === "months") return "monthly";
      if (normalizedUnit === "year" || normalizedUnit === "years") return "yearly";
    }

    let displayUnit = normalizedUnit;
    if (normalizedUnit === "day") displayUnit = "days";
    if (normalizedUnit === "week") displayUnit = "weeks";
    if (normalizedUnit === "month") displayUnit = "months";
    if (normalizedUnit === "year") displayUnit = "years";

    return `every ${interval} ${displayUnit}`;
  }

  static parseLocalDate(dateInput) {
    if (!dateInput) {
      return new Date(NaN);
    }

    if (dateInput && typeof dateInput === 'object' && dateInput.toString) {
      try {
        if (typeof dateInput.toFormat === 'function') {
          dateInput = dateInput.toFormat('yyyy-MM-dd');
        } else if (dateInput instanceof Date) {
          dateInput = dateInput.toISOString().split('T')[0];
        } else {
          dateInput = dateInput.toString();
        }
      } catch (e) {
        console.error("Error extracting date from DateTime object:", e);
        return new Date(NaN);
      }
    }

    if (dateInput instanceof Date) {
      dateInput = dateInput.toISOString().split('T')[0];
    }

    const dateString = String(dateInput);

    let cleanDateString = dateString;
    if (dateString.includes('T')) {
      cleanDateString = dateString.split('T')[0];
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDateString)) {
      console.error("Invalid date format, expected YYYY-MM-DD but got:", dateString);
      return new Date(NaN);
    }

    const parts = cleanDateString.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error("Failed to parse date components:", { year, month, day, cleanDateString });
      return new Date(NaN);
    }

    return new Date(year, month, day);
  }

  static calculateNextDueDate(lastDoneDate, interval, intervalUnit) {
    if (!lastDoneDate) return null;

    let date;
    try {
      date = new Date(lastDoneDate);
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", lastDoneDate);
        return null;
      }
    } catch (e) {
      console.error("Error parsing date:", e);
      return null;
    }

    const nextDue = new Date(date);
    const numInterval = Number(interval);
    if (isNaN(numInterval) || numInterval <= 0) {
      console.error("Invalid interval:", interval);
      return null;
    }

    const normalizedUnit = intervalUnit?.toLowerCase();

    if (normalizedUnit === "day" || normalizedUnit === "days") {
      nextDue.setDate(nextDue.getDate() + numInterval);
    } else if (normalizedUnit === "week" || normalizedUnit === "weeks") {
      nextDue.setDate(nextDue.getDate() + (numInterval * 7));
    } else if (normalizedUnit === "month" || normalizedUnit === "months") {
      const targetDay = nextDue.getDate();
      nextDue.setMonth(nextDue.getMonth() + numInterval);
      if (nextDue.getDate() !== targetDay) {
        nextDue.setDate(0);
      }
    } else if (normalizedUnit === "year" || normalizedUnit === "years") {
      nextDue.setFullYear(nextDue.getFullYear() + numInterval);
    } else {
      console.error("Unknown interval unit:", intervalUnit);
      return null;
    }

    if (isNaN(nextDue.getTime())) {
      console.error("Calculated next due date is invalid:", nextDue);
      return null;
    }

    const resultYear = nextDue.getFullYear();
    const resultMonth = (nextDue.getMonth() + 1).toString().padStart(2, '0');
    const resultDay = nextDue.getDate().toString().padStart(2, '0');

    return `${resultYear}-${resultMonth}-${resultDay}`;
  }

  static calculateDaysRemaining(dueDate, now = null) {
    if (!dueDate) {
      return -9999;
    }

    const todayStr = now || new Date().toISOString().split('T')[0];
    const today = this.parseLocalDate(todayStr);
    const due = this.parseLocalDate(dueDate);

    if (isNaN(due.getTime()) || isNaN(today.getTime())) {
      console.error("calculateDaysRemaining: Invalid date(s):", { dueDate, todayStr });
      return -9999;
    }

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  static isToday(dateString, now = null) {
    if (!dateString) return false;

    const date = this.parseLocalDate(dateString);
    const todayStr = now || new Date().toISOString().split('T')[0];
    const today = this.parseLocalDate(todayStr);

    if (isNaN(date.getTime()) || isNaN(today.getTime())) {
      return false;
    }

    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  static determineTaskStatus(task, now = null) {
    if (!task.last_done || task.last_done === "" || task.last_done === "never") {
      return {
        status: "⚠️ Overdue",
        statusColor: "#d32f2f",
        daysRemaining: -9999,
        isEligibleForCompletion: true,
        calculatedNextDue: null
      };
    }

    const nextDue = this.calculateNextDueDate(task.last_done, task.interval, task.interval_unit);
    const daysRemaining = this.calculateDaysRemaining(nextDue, now);

    let status, statusColor, isEligibleForCompletion;

    if (this.isToday(task.last_done, now)) {
      const intervalInDays = this.calculateIntervalInDays(task.interval, task.interval_unit);

      return {
        status: "✅ Up to date",
        statusColor: "#2e7d32",
        daysRemaining: intervalInDays,
        isEligibleForCompletion: false,
        calculatedNextDue: nextDue
      };
    }

    // Simple logic: only overdue tasks (daysRemaining <= 0) can be completed
    isEligibleForCompletion = daysRemaining <= 0;

    // Binary decision - if eligible for completion, show as overdue
    // Otherwise, show as up to date
    if (isEligibleForCompletion) {
      status = "⚠️ Overdue";
      statusColor = "#d32f2f";
    } else {
      status = "✅ Up to date";
      statusColor = "#2e7d32";
    }

    return {
      status,
      statusColor,
      daysRemaining,
      isEligibleForCompletion,
      calculatedNextDue: nextDue
    };
  }

  // Completion history helper function for testing
  static smartAppendToTable(content, newRow) {
    // If content doesn't end with newline, add one before the new row
    if (!content.endsWith('\n')) {
      return content + '\n' + newRow;
    }
    // If content already ends with newline, just append the row
    return content + newRow;
  }
}

// Completion History Tests
class CompletionHistoryTests {
  static runTests() {
    console.log("\n🧪 Running Completion History Tests");
    console.log("==================================");

    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
      if (condition) {
        console.log(`✅ ${message}`);
        passed++;
      } else {
        console.log(`❌ ${message}`);
        failed++;
      }
    };

    const assertEqual = (actual, expected, message) => {
      if (actual === expected) {
        console.log(`✅ ${message}`);
        passed++;
      } else {
        console.log(`❌ ${message}`);
        console.log(`   Expected: ${JSON.stringify(expected)}`);
        console.log(`   Actual: ${JSON.stringify(actual)}`);
        failed++;
      }
    };

    // Test 1: New table creation
    console.log("\n📝 Test 1: New table creation");
    const baseContent = `---
tags:
  - recurring-task
last_done: 2025-06-04
interval: 1
interval_unit: months
---

# My Task

This is a recurring task.`;

    const expectedNewTable = baseContent + `

## Completion history

| Date | Time | Days Since Last | Days Scheduled | User |
|------|------|----------------|----------------|------|
| 2025-06-04 | 22:57 | 30 | 14 | filip |`;

    const newRow = `| 2025-06-04 | 22:57 | 30 | 14 | filip |`;
    const tableSection = `\n\n## Completion history\n\n| Date | Time | Days Since Last | Days Scheduled | User |\n|------|------|----------------|----------------|------|\n` + newRow;
    const resultNewTable = baseContent + tableSection;

    assertEqual(resultNewTable, expectedNewTable, "New table should be created correctly");

    // Test 2: Existing table - content ends with newline
    console.log("\n📝 Test 2: Existing table - content ends with newline");
    const existingTableWithNewline = `---
tags:
  - recurring-task
last_done: 2025-06-04
interval: 1
interval_unit: months
---

# My Task

## Completion history

| Date | Time | Days Since Last | Days Scheduled | User |
|------|------|----------------|----------------|------|
| 2025-06-04 | 08:56 | 25 | 14 | filip |
| 2025-06-04 | 13:15 | 31 | 14 | filip |
`;

    const expectedWithNewline = `---
tags:
  - recurring-task
last_done: 2025-06-04
interval: 1
interval_unit: months
---

# My Task

## Completion history

| Date | Time | Days Since Last | Days Scheduled | User |
|------|------|----------------|----------------|------|
| 2025-06-04 | 08:56 | 25 | 14 | filip |
| 2025-06-04 | 13:15 | 31 | 14 | filip |
| 2025-06-04 | 22:57 | 30 | 14 | filip |`;

    // Smart append approach
    const correctResult = TestableRecurringUpkeepUtils.smartAppendToTable(existingTableWithNewline, newRow);

    assertEqual(correctResult, expectedWithNewline, "Should append new row correctly when content ends with newline");

    // Test 3: Existing table - content doesn't end with newline
    console.log("\n📝 Test 3: Existing table - content doesn't end with newline");
    const existingTableNoNewline = `---
tags:
  - recurring-task
last_done: 2025-06-04
interval: 1
interval_unit: months
---

# My Task

## Completion history

| Date | Time | Days Since Last | Days Scheduled | User |
|------|------|----------------|----------------|------|
| 2025-06-04 | 08:56 | 25 | 14 | filip |
| 2025-06-04 | 13:15 | 31 | 14 | filip |`;

    const expectedNoNewline = `---
tags:
  - recurring-task
last_done: 2025-06-04
interval: 1
interval_unit: months
---

# My Task

## Completion history

| Date | Time | Days Since Last | Days Scheduled | User |
|------|------|----------------|----------------|------|
| 2025-06-04 | 08:56 | 25 | 14 | filip |
| 2025-06-04 | 13:15 | 31 | 14 | filip |
| 2025-06-04 | 22:57 | 30 | 14 | filip |`;

    const correctResultNoNewline = TestableRecurringUpkeepUtils.smartAppendToTable(existingTableNoNewline, newRow);
    
    assertEqual(correctResultNoNewline, expectedNoNewline, "Should add newline when content doesn't end with one");

    // Test 4: Demonstrating the original bug
    console.log("\n🐛 Test 4: Demonstrating the original bug");
    
    // This was the original problematic approach - always adding newline
    const buggyResult = existingTableWithNewline + '\n' + newRow;
    const expectedBuggyResult = existingTableWithNewline + '\n' + newRow;
    
    // Show that the buggy approach creates extra newlines
    assert(buggyResult !== expectedWithNewline, "Buggy approach should NOT match expected result");
    assert(buggyResult.includes('\n\n|'), "Buggy approach creates double newlines before table rows");

    // Test 5: Real-world scenario simulation
    console.log("\n🌍 Test 5: Real-world scenario simulation");
    
    // Simulate what happens when Obsidian saves files
    let simulatedContent = baseContent;
    
    // First completion - create table
    if (!simulatedContent.includes('## Completion history')) {
      const tableSection = `\n\n## Completion history\n\n| Date | Time | Days Since Last | Days Scheduled | User |\n|------|------|----------------|----------------|------|\n| 2025-06-04 | 08:56 | 25 | 14 | filip |`;
      simulatedContent = simulatedContent + tableSection;
    }
    
    // Second completion - append row
    const secondRow = `| 2025-06-04 | 13:15 | 31 | 14 | filip |`;
    simulatedContent = TestableRecurringUpkeepUtils.smartAppendToTable(simulatedContent, secondRow);
    
    // Third completion - append row
    const thirdRow = `| 2025-06-04 | 22:57 | 30 | 14 | filip |`;
    simulatedContent = TestableRecurringUpkeepUtils.smartAppendToTable(simulatedContent, thirdRow);
    
    // Check that the final result has proper table structure
    const lines = simulatedContent.split('\n');
    const tableStartIndex = lines.findIndex(line => line.includes('## Completion history'));
    const tableLines = lines.slice(tableStartIndex);
    
    assert(tableStartIndex !== -1, "Should have completion history section");
    assert(tableLines.some(line => line.includes('08:56')), "Should have first entry");
    assert(tableLines.some(line => line.includes('13:15')), "Should have second entry");
    assert(tableLines.some(line => line.includes('22:57')), "Should have third entry");
    
    // Check for no malformed rows (extra columns)
    const dataRows = tableLines.filter(line => line.startsWith('| 2025-'));
    const columnCounts = dataRows.map(row => row.split('|').length);
    const expectedColumns = 7; // | Date | Time | Days | Days | User | (plus empty strings at start/end)
    
    assert(columnCounts.every(count => count === expectedColumns), 
           `All table rows should have ${expectedColumns} columns, got: ${columnCounts.join(', ')}`);

    // Test 6: Edge case - multiple newlines at end
    console.log("\n🔍 Test 6: Edge case - multiple newlines at end");
    const contentWithMultipleNewlines = existingTableNoNewline + '\n\n';
    const expectedMultipleNewlines = contentWithMultipleNewlines + newRow;
    const resultMultiple = TestableRecurringUpkeepUtils.smartAppendToTable(contentWithMultipleNewlines, newRow);
    
    assertEqual(resultMultiple, expectedMultipleNewlines, "Should handle multiple newlines correctly");

    // Summary
    console.log("\n📊 Completion History Test Results");
    console.log("=================================");
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed === 0) {
      console.log("🎉 All completion history tests passed!");
    } else {
      console.log("🔧 Some completion history tests failed - check the issues above.");
    }

    return { passed, failed, total: passed + failed };
  }
}

// Test runner
function runAllTests() {
  console.log("🧪 Running Recurring Upkeep Scheduler Unit Tests");
  console.log("================================================");

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ ${message}`);
      passed++;
    } else {
      console.log(`❌ ${message}`);
      failed++;
    }
  };

  const assertEqual = (actual, expected, message) => {
    const condition = actual === expected;
    if (condition) {
      console.log(`✅ ${message}`);
      passed++;
    } else {
      console.log(`❌ ${message}`);
      console.log(`   Expected: ${expected}`);
      console.log(`   Actual: ${actual}`);
      failed++;
    }
  };

  // Test 1: Calculate interval in days
  console.log("\n📅 Test 1: calculateIntervalInDays");
  assertEqual(TestableRecurringUpkeepUtils.calculateIntervalInDays(1, "days"), 1, "1 day should be 1 day");
  assertEqual(TestableRecurringUpkeepUtils.calculateIntervalInDays(2, "weeks"), 14, "2 weeks should be 14 days");
  assertEqual(TestableRecurringUpkeepUtils.calculateIntervalInDays(1, "months"), 30, "1 month should be 30 days");
  assertEqual(TestableRecurringUpkeepUtils.calculateIntervalInDays(1, "years"), 365, "1 year should be 365 days");

  // Test 2: Next due date calculation
  console.log("\n📅 Test 2: calculateNextDueDate");
  const nextDueDaily = TestableRecurringUpkeepUtils.calculateNextDueDate("2024-01-01", 1, "days");
  assertEqual(nextDueDaily, "2024-01-02", "Daily task should be due next day");

  const nextDueWeekly = TestableRecurringUpkeepUtils.calculateNextDueDate("2024-01-01", 1, "weeks");
  assertEqual(nextDueWeekly, "2024-01-08", "Weekly task should be due in 7 days");

  const nextDueMonthly = TestableRecurringUpkeepUtils.calculateNextDueDate("2024-01-15", 1, "months");
  assertEqual(nextDueMonthly, "2024-02-15", "Monthly task should be due same day next month");

  // Test 3: Days remaining calculation
  console.log("\n📅 Test 3: calculateDaysRemaining");
  const testNow = "2024-01-15";
  assertEqual(TestableRecurringUpkeepUtils.calculateDaysRemaining("2024-01-16", testNow), 1, "Tomorrow should be 1 day remaining");
  assertEqual(TestableRecurringUpkeepUtils.calculateDaysRemaining("2024-01-15", testNow), 0, "Today should be 0 days remaining");
  assertEqual(TestableRecurringUpkeepUtils.calculateDaysRemaining("2024-01-14", testNow), -1, "Yesterday should be -1 days remaining");

  // Test 4: isToday function
  console.log("\n📅 Test 4: isToday");
  const today = "2024-01-15";
  assert(TestableRecurringUpkeepUtils.isToday("2024-01-15", today), "Should detect today correctly");
  assert(!TestableRecurringUpkeepUtils.isToday("2024-01-14", today), "Should not detect yesterday as today");
  assert(!TestableRecurringUpkeepUtils.isToday("2024-01-16", today), "Should not detect tomorrow as today");

  // Test 5: Task completed today
  console.log("\n🐛 Test 5: Task completed today (BUG FIX)");
  const mockFile = new MockTFile("test-task.md", "test-task.md");
  const taskCompletedToday = {
    file: mockFile,
    last_done: "2024-01-15",
    interval: 1,
    interval_unit: "months"
  };
  const statusToday = TestableRecurringUpkeepUtils.determineTaskStatus(taskCompletedToday, "2024-01-15");
  assertEqual(statusToday.status, "✅ Up to date", "Task completed today should show up to date");
  assertEqual(statusToday.daysRemaining, 30, "Monthly task completed today should show 30 days remaining");
  assert(!statusToday.isEligibleForCompletion, "Task completed today should not be eligible for completion");

  // Test 6: Never completed task
  console.log("\n❓ Test 6: Never completed task");
  const neverDoneTask = {
    file: mockFile,
    last_done: undefined,
    interval: 1,
    interval_unit: "days"
  };
  const statusNever = TestableRecurringUpkeepUtils.determineTaskStatus(neverDoneTask, "2024-01-15");
  assertEqual(statusNever.status, "⚠️ Overdue", "Should show overdue status");
  assertEqual(statusNever.daysRemaining, -9999, "Never done task should have -9999 days remaining");
  assert(statusNever.isEligibleForCompletion, "Never done task should be eligible for completion");

  // Test 7: Frequency descriptions
  console.log("\n📝 Test 7: Frequency descriptions");
  assertEqual(TestableRecurringUpkeepUtils.getFrequencyDescription(1, "days"), "daily", "Should show 'daily'");
  assertEqual(TestableRecurringUpkeepUtils.getFrequencyDescription(1, "weeks"), "weekly", "Should show 'weekly'");
  assertEqual(TestableRecurringUpkeepUtils.getFrequencyDescription(1, "months"), "monthly", "Should show 'monthly'");
  assertEqual(TestableRecurringUpkeepUtils.getFrequencyDescription(2, "weeks"), "every 2 weeks", "Should show 'every 2 weeks'");

  // Test 8: Real Obsidian date formats
  console.log("\n🔧 Test 8: Real Obsidian date formats");
  const isoDate1 = TestableRecurringUpkeepUtils.parseLocalDate("2025-05-19T00:00:00.000+02:00");
  assert(!isNaN(isoDate1.getTime()), "Should parse ISO datetime with timezone");
  assertEqual(isoDate1.getFullYear(), 2025, "Should extract year from ISO datetime");
  assertEqual(isoDate1.getMonth(), 4, "Should extract month from ISO datetime (0-indexed)");
  assertEqual(isoDate1.getDate(), 19, "Should extract day from ISO datetime");

  // Test 9: Interval unit normalization
  assertEqual(TestableRecurringUpkeepUtils.calculateIntervalInDays(1, "month"), 30, "Should handle singular 'month'");
  assertEqual(TestableRecurringUpkeepUtils.calculateIntervalInDays(1, "months"), 30, "Should handle plural 'months'");
  assertEqual(TestableRecurringUpkeepUtils.calculateIntervalInDays(2, "week"), 14, "Should handle singular 'week'");
  assertEqual(TestableRecurringUpkeepUtils.calculateIntervalInDays(2, "weeks"), 14, "Should handle plural 'weeks'");

  // Run completion history tests
  const historyResults = CompletionHistoryTests.runTests();
  passed += historyResults.passed;
  failed += historyResults.failed;

  // Summary
  console.log("\n📊 Test Results Summary");
  console.log("================================================");
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  const result = { passed, failed, total: passed + failed };

  if (failed === 0) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("🔧 Some tests failed - please check the issues above.");
  }

  return result;
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    runAllTests,
    TestableRecurringUpkeepUtils,
    CompletionHistoryTests
  };
} else if (typeof window !== 'undefined') {
  // Browser/Obsidian environment
  window.RecurringUpkeepTests = {
    runAllTests,
    TestableRecurringUpkeepUtils,
    CompletionHistoryTests
  };
}

// Auto-run if executed directly in Node.js
if (typeof require !== 'undefined' && require.main === module) {
  const results = runAllTests();
  process.exit(results.failed > 0 ? 1 : 0);
}
