#!/usr/bin/env ts-node

/**
 * Reliability Test Runner
 * 
 * This script runs the comprehensive reliability test suite and generates
 * detailed reports on system reliability and resilience.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  tests: TestResult[];
}

interface ReliabilityReport {
  timestamp: string;
  environment: string;
  platform: string;
  nodeVersion: string;
  totalDuration: number;
  overallStatus: 'passed' | 'failed' | 'partial';
  suites: TestSuiteResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    successRate: number;
  };
  recommendations: string[];
}

class ReliabilityTestRunner {
  private report: ReliabilityReport;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      platform: process.platform,
      nodeVersion: process.version,
      totalDuration: 0,
      overallStatus: 'passed',
      suites: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        successRate: 0,
      },
      recommendations: [],
    };
  }

  /**
   * Run all reliability tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Reliability Test Suite');
    console.log('=====================================');
    console.log(`Environment: ${this.report.environment}`);
    console.log(`Platform: ${this.report.platform}`);
    console.log(`Node Version: ${this.report.nodeVersion}`);
    console.log(`Timestamp: ${this.report.timestamp}`);
    console.log('');

    const testSuites = [
      {
        name: 'Database Recovery Tests',
        pattern: 'src/tests/integration/reliability/database-recovery.test.ts',
      },
      {
        name: 'Memory Pressure Tests',
        pattern: 'src/tests/integration/reliability/memory-pressure.test.ts',
      },
      {
        name: 'Scheduler Resilience Tests',
        pattern: 'src/tests/integration/reliability/scheduler-resilience.test.ts',
      },
      {
        name: 'Health Check Validation Tests',
        pattern: 'src/tests/integration/reliability/health-check-validation.test.ts',
      },
      {
        name: 'Comprehensive Reliability Tests',
        pattern: 'src/tests/integration/reliability/reliability-test-suite.test.ts',
      },
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.pattern);
    }

    this.finalizeReport();
    this.generateRecommendations();
    this.printReport();
    this.saveReport();
  }

  /**
   * Run a specific test suite
   */
  private async runTestSuite(suiteName: string, pattern: string): Promise<void> {
    console.log(`📋 Running: ${suiteName}`);
    console.log(`   Pattern: ${pattern}`);

    const suiteStartTime = Date.now();
    let suiteResult: TestSuiteResult = {
      suiteName,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      tests: [],
    };

    try {
      // Run Jest with specific pattern
      const jestCommand = `npx jest --testPathPattern="${pattern}" --verbose --json --outputFile=test-results.json`;
      
      console.log(`   Executing: ${jestCommand}`);
      
      const output = execSync(jestCommand, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
      });

      // Parse Jest results
      const resultsPath = path.join(process.cwd(), 'test-results.json');
      if (fs.existsSync(resultsPath)) {
        const jestResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        suiteResult = this.parseJestResults(suiteName, jestResults);
        fs.unlinkSync(resultsPath); // Clean up
      }

      console.log(`   ✅ Completed: ${suiteResult.passedTests}/${suiteResult.totalTests} passed`);

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      suiteResult.failedTests = 1;
      suiteResult.totalTests = 1;
      suiteResult.tests.push({
        name: 'Suite Execution',
        status: 'failed',
        duration: 0,
        error: error.message,
      });
    }

    suiteResult.duration = Date.now() - suiteStartTime;
    this.report.suites.push(suiteResult);
    console.log('');
  }

  /**
   * Parse Jest test results
   */
  private parseJestResults(suiteName: string, jestResults: any): TestSuiteResult {
    const suite: TestSuiteResult = {
      suiteName,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      tests: [],
    };

    if (jestResults.testResults && jestResults.testResults.length > 0) {
      for (const testFile of jestResults.testResults) {
        suite.duration += testFile.endTime - testFile.startTime;
        
        if (testFile.assertionResults) {
          for (const assertion of testFile.assertionResults) {
            suite.totalTests++;
            
            const test: TestResult = {
              name: assertion.title,
              status: assertion.status === 'passed' ? 'passed' : 
                     assertion.status === 'pending' ? 'skipped' : 'failed',
              duration: assertion.duration || 0,
            };

            if (assertion.failureMessages && assertion.failureMessages.length > 0) {
              test.error = assertion.failureMessages.join('\n');
            }

            suite.tests.push(test);

            switch (test.status) {
              case 'passed':
                suite.passedTests++;
                break;
              case 'failed':
                suite.failedTests++;
                break;
              case 'skipped':
                suite.skippedTests++;
                break;
            }
          }
        }
      }
    }

    return suite;
  }

  /**
   * Finalize the test report
   */
  private finalizeReport(): void {
    this.report.totalDuration = Date.now() - this.startTime;

    // Calculate summary
    for (const suite of this.report.suites) {
      this.report.summary.totalTests += suite.totalTests;
      this.report.summary.passedTests += suite.passedTests;
      this.report.summary.failedTests += suite.failedTests;
      this.report.summary.skippedTests += suite.skippedTests;
    }

    this.report.summary.successRate = this.report.summary.totalTests > 0 
      ? (this.report.summary.passedTests / this.report.summary.totalTests) * 100
      : 0;

    // Determine overall status
    if (this.report.summary.failedTests === 0) {
      this.report.overallStatus = 'passed';
    } else if (this.report.summary.passedTests > this.report.summary.failedTests) {
      this.report.overallStatus = 'partial';
    } else {
      this.report.overallStatus = 'failed';
    }
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): void {
    const recommendations: string[] = [];

    // Success rate recommendations
    if (this.report.summary.successRate < 80) {
      recommendations.push('System reliability is below acceptable threshold (80%). Investigate failing tests immediately.');
    } else if (this.report.summary.successRate < 95) {
      recommendations.push('System reliability could be improved. Review failing tests and implement fixes.');
    }

    // Suite-specific recommendations
    for (const suite of this.report.suites) {
      const suiteSuccessRate = suite.totalTests > 0 
        ? (suite.passedTests / suite.totalTests) * 100 
        : 0;

      if (suiteSuccessRate < 70) {
        recommendations.push(`${suite.suiteName} has low success rate (${suiteSuccessRate.toFixed(1)}%). Priority investigation needed.`);
      }

      // Performance recommendations
      if (suite.duration > 60000) { // More than 1 minute
        recommendations.push(`${suite.suiteName} is taking too long (${(suite.duration / 1000).toFixed(1)}s). Consider optimization.`);
      }
    }

    // General recommendations
    if (this.report.summary.failedTests > 0) {
      recommendations.push('Review failed test logs for specific error details and root causes.');
      recommendations.push('Consider running tests in isolation to identify intermittent failures.');
    }

    if (this.report.summary.skippedTests > 0) {
      recommendations.push('Review skipped tests to ensure they are not hiding important reliability issues.');
    }

    this.report.recommendations = recommendations;
  }

  /**
   * Print the test report to console
   */
  private printReport(): void {
    console.log('📊 RELIABILITY TEST REPORT');
    console.log('==========================');
    console.log('');

    // Overall status
    const statusIcon = this.report.overallStatus === 'passed' ? '✅' : 
                      this.report.overallStatus === 'partial' ? '⚠️' : '❌';
    console.log(`${statusIcon} Overall Status: ${this.report.overallStatus.toUpperCase()}`);
    console.log(`⏱️  Total Duration: ${(this.report.totalDuration / 1000).toFixed(1)}s`);
    console.log('');

    // Summary
    console.log('📈 SUMMARY');
    console.log('-----------');
    console.log(`Total Tests: ${this.report.summary.totalTests}`);
    console.log(`Passed: ${this.report.summary.passedTests} (${((this.report.summary.passedTests / this.report.summary.totalTests) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${this.report.summary.failedTests} (${((this.report.summary.failedTests / this.report.summary.totalTests) * 100).toFixed(1)}%)`);
    console.log(`Skipped: ${this.report.summary.skippedTests} (${((this.report.summary.skippedTests / this.report.summary.totalTests) * 100).toFixed(1)}%)`);
    console.log(`Success Rate: ${this.report.summary.successRate.toFixed(1)}%`);
    console.log('');

    // Suite details
    console.log('📋 SUITE DETAILS');
    console.log('----------------');
    for (const suite of this.report.suites) {
      const suiteIcon = suite.failedTests === 0 ? '✅' : '❌';
      console.log(`${suiteIcon} ${suite.suiteName}`);
      console.log(`   Tests: ${suite.passedTests}/${suite.totalTests} passed`);
      console.log(`   Duration: ${(suite.duration / 1000).toFixed(1)}s`);
      
      if (suite.failedTests > 0) {
        console.log('   Failed Tests:');
        suite.tests.filter(t => t.status === 'failed').forEach(test => {
          console.log(`     - ${test.name}`);
        });
      }
      console.log('');
    }

    // Recommendations
    if (this.report.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS');
      console.log('------------------');
      this.report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.log('');
    }

    // Final message
    if (this.report.overallStatus === 'passed') {
      console.log('🎉 All reliability tests passed! System is ready for production.');
    } else if (this.report.overallStatus === 'partial') {
      console.log('⚠️  Some reliability tests failed. Review and fix issues before production deployment.');
    } else {
      console.log('🚨 Reliability tests failed! System is not ready for production. Immediate attention required.');
    }
  }

  /**
   * Save the report to file
   */
  private saveReport(): void {
    const reportsDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFile = path.join(reportsDir, `reliability-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(this.report, null, 2));
    
    console.log(`📄 Report saved to: ${reportFile}`);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new ReliabilityTestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { ReliabilityTestRunner };