#!/usr/bin/env node

/**
 * Simple CLI test runner for the Recurring Upkeep Scheduler
 * Run with: node test-runner.js
 */

// Mock Obsidian APIs for CLI context
const mockTFile = {
  name: "test-task.md",
  path: "test-task.md",
  stat: { mtime: Date.now() }
};

const mockApp = {
  vault: {
    getAbstractFileByPath: () => mockTFile
  },
  fileManager: {
    processFrontMatter: async (file, callback) => {
      const frontmatter = {};
      callback(frontmatter);
      return frontmatter;
    }
  }
};

// Mock global objects that might be used
global.app = mockApp;

// Import the utility classes
const { RecurringUpkeepUtils } = require('./utils/RecurringUpkeepUtils');
const { RecurringUpkeepSchedulerTests } = require('./TestSuite');
const { DateUtils } = require('./utils/DateUtils');

console.log('🧪 CLI Test Runner for Recurring Upkeep Scheduler');
console.log('=================================================');

try {
  // Run the existing comprehensive tests
  const results = RecurringUpkeepSchedulerTests.runUnitTests();

  console.log('\n📊 Final Results:');
  console.log('=================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);

  // Exit with appropriate code for CI/CD
  if (results.failed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }

} catch (error) {
  console.error('\n💥 Test runner failed:', error);
  process.exit(1);
}
