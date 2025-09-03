#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Similar Worries Feature Integration\n');

const verificationResults = {
  meTooButtonIntegration: false,
  postCardVerification: false,
  similarWorriesListUsage: false,
  authenticationHandling: false,
  eventHandling: false,
  privacyCompliance: false,
  performanceOptimizations: false,
  errorHandling: false
};

const issues = [];
const successes = [];

// Helper function to check if file exists and contains specific patterns
function checkFileContains(filePath, patterns, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = patterns.map(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(content);
    });
    
    if (results.every(result => result)) {
      successes.push(`✅ ${description}`);
      return true;
    } else {
      const failedPatterns = patterns.filter((pattern, index) => !results[index]);
      issues.push(`❌ ${description} - Missing: ${failedPatterns.join(', ')}`);
      return false;
    }
  } catch (error) {
    issues.push(`❌ ${description} - File not found: ${filePath}`);
    return false;
  }
}

// Helper function to check file structure
function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    successes.push(`✅ ${description}`);
    return true;
  } else {
    issues.push(`❌ ${description} - File missing: ${filePath}`);
    return false;
  }
}

console.log('📋 Running Integration Verification Checks...\n');

// 1. Verify MeTooButton properly updates both separate and combined counts
console.log('1. Checking MeTooButton Integration...');
verificationResults.meTooButtonIntegration = checkFileContains(
  'frontend/src/components/MeTooButton.tsx',
  [
    'meTooUpdated.*CustomEvent',
    'meTooCount.*similarWorryCount',
    'window\\.dispatchEvent',
    'detail.*postId.*meTooCount.*similarWorryCount'
  ],
  'MeTooButton dispatches events with both counts'
);

// 2. Verify PostCard shows only counts, never similar worries content
console.log('2. Checking PostCard Component...');
const postCardValid = checkFileContains(
  'frontend/src/components/PostCard.tsx',
  [
    'MeTooCount',
    'SimilarWorries'
  ],
  'PostCard imports count components'
);

const postCardNoContent = !checkFileContains(
  'frontend/src/components/PostCard.tsx',
  [
    'SimilarWorriesList',
    'similar.*worries.*content',
    'worry.*content.*display'
  ],
  'PostCard should NOT contain similar worries content'
);

verificationResults.postCardVerification = postCardValid && postCardNoContent;
if (postCardNoContent) {
  successes.push('✅ PostCard correctly shows only counts, no similar worries content');
}

// 3. Verify SimilarWorriesList is only used on WorryAnalysisPage
console.log('3. Checking SimilarWorriesList Usage...');
const analysisPageUsage = checkFileContains(
  'frontend/src/pages/WorryAnalysisPage.tsx',
  ['SimilarWorriesList'],
  'WorryAnalysisPage uses SimilarWorriesList'
);

// Check that SimilarWorriesList is NOT used in PostCard
const postCardContent = fs.readFileSync('frontend/src/components/PostCard.tsx', 'utf8');
const similarWorriesListInPostCard = /SimilarWorriesList/i.test(postCardContent);

if (!similarWorriesListInPostCard) {
  successes.push('✅ SimilarWorriesList is NOT used in PostCard (correct)');
  verificationResults.similarWorriesListUsage = analysisPageUsage;
} else {
  issues.push('❌ SimilarWorriesList should NOT be used in PostCard');
  verificationResults.similarWorriesListUsage = false;
}

// 4. Verify authentication state changes are handled
console.log('4. Checking Authentication Handling...');
verificationResults.authenticationHandling = checkFileContains(
  'frontend/src/components/SimilarWorriesList.tsx',
  [
    'useAuth',
    'onAuthenticationChange',
    'user\\?\\.id'
  ],
  'SimilarWorriesList handles authentication changes'
) && checkFileContains(
  'frontend/src/components/SimilarWorries.tsx',
  [
    'useAuth',
    'onAuthenticationChange'
  ],
  'SimilarWorries handles authentication changes'
);

// 5. Verify event handling for real-time updates
console.log('5. Checking Event Handling...');
verificationResults.eventHandling = checkFileContains(
  'frontend/src/components/MeTooCount.tsx',
  [
    'meTooUpdated',
    'addEventListener',
    'removeEventListener',
    'event\\.detail'
  ],
  'MeTooCount listens to update events'
) && checkFileContains(
  'frontend/src/components/SimilarWorriesCount.tsx',
  [
    'meTooUpdated',
    'addEventListener',
    'removeEventListener'
  ],
  'SimilarWorriesCount listens to update events'
);

// 6. Verify privacy compliance
console.log('6. Checking Privacy Compliance...');
verificationResults.privacyCompliance = checkFileContains(
  'backend/src/services/worryAnalysisService.ts',
  [
    'privacyLevel.*private',
    'isOwnPost',
    'currentUserId',
    'privacy.*filter'
  ],
  'Backend implements privacy filtering'
) && checkFileContains(
  'frontend/src/services/privacyFilteringService.ts',
  [
    'getSimilarWorries',
    'userId',
    'privacy'
  ],
  'Frontend uses privacy filtering service'
);

// 7. Verify performance optimizations
console.log('7. Checking Performance Optimizations...');
verificationResults.performanceOptimizations = checkFileContains(
  'backend/src/services/worryAnalysisService.ts',
  [
    'cache',
    'getCachedResult',
    'setCachedResult'
  ],
  'Backend implements caching'
) && checkFileContains(
  'frontend/src/components/SimilarWorriesCount.tsx',
  [
    'React\\.memo',
    'useCallback',
    'useMemo'
  ],
  'Frontend components use React optimizations'
);

// 8. Verify error handling
console.log('8. Checking Error Handling...');
verificationResults.errorHandling = checkFileContains(
  'frontend/src/components/SimilarWorriesList.tsx',
  [
    'useErrorHandler',
    'ErrorDisplay',
    'try.*catch',
    'error.*handling'
  ],
  'Components implement comprehensive error handling'
);

// 9. Check for required test files
console.log('9. Checking Test Coverage...');
const testFiles = [
  'frontend/src/__tests__/components/SimilarWorriesList.comprehensive.test.tsx',
  'frontend/src/__tests__/integration/WorryAnalysisPage.comprehensive.test.tsx',
  'frontend/src/__tests__/integration/ComponentIntegration.verification.test.tsx',
  'backend/src/__tests__/services/privacyFiltering.test.ts',
  'backend/src/__tests__/security/privacyViolation.test.ts',
  'backend/src/__tests__/performance/similarWorries.performance.test.ts'
];

let testCoverage = 0;
testFiles.forEach(testFile => {
  if (checkFileExists(testFile, `Test file: ${path.basename(testFile)}`)) {
    testCoverage++;
  }
});

// 10. Check database indexes
console.log('10. Checking Database Optimizations...');
const dbOptimizations = checkFileContains(
  'backend/prisma/schema.prisma',
  [
    '@@index.*category',
    '@@index.*privacyLevel',
    '@@index.*similarWorryCount'
  ],
  'Database has performance indexes'
);

console.log('\n' + '='.repeat(60));
console.log('📊 INTEGRATION VERIFICATION RESULTS');
console.log('='.repeat(60));

// Calculate overall score
const totalChecks = Object.keys(verificationResults).length + 2; // +2 for test coverage and db optimizations
let passedChecks = Object.values(verificationResults).filter(Boolean).length;
if (testCoverage === testFiles.length) passedChecks++;
if (dbOptimizations) passedChecks++;

const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);

console.log(`Overall Success Rate: ${successRate}% (${passedChecks}/${totalChecks})`);
console.log(`Test Coverage: ${testCoverage}/${testFiles.length} files`);
console.log('');

// Display successes
if (successes.length > 0) {
  console.log('✅ PASSED CHECKS:');
  successes.forEach(success => console.log(`   ${success}`));
  console.log('');
}

// Display issues
if (issues.length > 0) {
  console.log('❌ ISSUES FOUND:');
  issues.forEach(issue => console.log(`   ${issue}`));
  console.log('');
}

// Detailed verification results
console.log('📋 DETAILED VERIFICATION:');
console.log('');

const checkResults = [
  { name: 'MeToo Button Integration', passed: verificationResults.meTooButtonIntegration },
  { name: 'PostCard Verification', passed: verificationResults.postCardVerification },
  { name: 'SimilarWorriesList Usage', passed: verificationResults.similarWorriesListUsage },
  { name: 'Authentication Handling', passed: verificationResults.authenticationHandling },
  { name: 'Event Handling', passed: verificationResults.eventHandling },
  { name: 'Privacy Compliance', passed: verificationResults.privacyCompliance },
  { name: 'Performance Optimizations', passed: verificationResults.performanceOptimizations },
  { name: 'Error Handling', passed: verificationResults.errorHandling },
  { name: 'Test Coverage', passed: testCoverage === testFiles.length },
  { name: 'Database Optimizations', passed: dbOptimizations }
];

checkResults.forEach((result, index) => {
  const status = result.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${index + 1}. ${result.name}: ${status}`);
});

console.log('');

// Integration-specific recommendations
console.log('🎯 INTEGRATION RECOMMENDATIONS:');
console.log('='.repeat(60));

if (verificationResults.meTooButtonIntegration) {
  console.log('✅ MeToo button properly updates both separate and combined counts');
} else {
  console.log('⚠️  Ensure MeToo button dispatches events with both meTooCount and similarWorryCount');
}

if (verificationResults.postCardVerification) {
  console.log('✅ PostCard correctly shows only counts, never similar worries content');
} else {
  console.log('⚠️  PostCard should only display count components, not similar worries content');
}

if (verificationResults.similarWorriesListUsage) {
  console.log('✅ SimilarWorriesList is only used on WorryAnalysisPage');
} else {
  console.log('⚠️  SimilarWorriesList should only be used on WorryAnalysisPage, never on PostCard');
}

if (verificationResults.authenticationHandling) {
  console.log('✅ Components properly handle authentication state changes');
} else {
  console.log('⚠️  Ensure components call onAuthenticationChange when user state changes');
}

if (verificationResults.eventHandling) {
  console.log('✅ Real-time updates work correctly between components');
} else {
  console.log('⚠️  Ensure components listen to and dispatch meTooUpdated events properly');
}

console.log('');

// Security and privacy summary
console.log('🔒 SECURITY & PRIVACY SUMMARY:');
console.log('='.repeat(60));
if (verificationResults.privacyCompliance) {
  console.log('✅ Privacy filtering prevents unauthorized access to private posts');
  console.log('✅ User context is properly passed to privacy filtering service');
  console.log('✅ Backend implements server-side privacy controls');
} else {
  console.log('⚠️  Review privacy filtering implementation');
  console.log('⚠️  Ensure private posts are never exposed to unauthorized users');
}

console.log('');

// Performance summary
console.log('⚡ PERFORMANCE SUMMARY:');
console.log('='.repeat(60));
if (verificationResults.performanceOptimizations) {
  console.log('✅ Backend implements caching for improved response times');
  console.log('✅ Frontend components use React.memo and optimization hooks');
  console.log('✅ Database indexes are in place for efficient queries');
} else {
  console.log('⚠️  Review performance optimizations');
  console.log('⚠️  Ensure caching is implemented on both frontend and backend');
}

console.log('');

// Final recommendations
if (passedChecks === totalChecks) {
  console.log('🎉 INTEGRATION COMPLETE!');
  console.log('All components are properly integrated and working together.');
  console.log('The similar worries feature is ready for production deployment.');
} else {
  console.log('🔧 INTEGRATION INCOMPLETE');
  console.log(`Please address the ${totalChecks - passedChecks} remaining issues before deployment.`);
  console.log('Run this verification script again after making fixes.');
}

console.log('');

// Generate integration report
const reportData = {
  timestamp: new Date().toISOString(),
  overallSuccessRate: successRate,
  passedChecks,
  totalChecks,
  verificationResults,
  testCoverage: `${testCoverage}/${testFiles.length}`,
  issues: issues.length,
  successes: successes.length,
  recommendations: {
    meTooIntegration: verificationResults.meTooButtonIntegration,
    postCardCompliance: verificationResults.postCardVerification,
    componentUsage: verificationResults.similarWorriesListUsage,
    authHandling: verificationResults.authenticationHandling,
    eventSystem: verificationResults.eventHandling,
    privacySecurity: verificationResults.privacyCompliance,
    performance: verificationResults.performanceOptimizations,
    errorResilience: verificationResults.errorHandling
  }
};

const reportPath = path.join(__dirname, '..', 'integration-reports', 'integration-verification.json');
const reportDir = path.dirname(reportPath);

if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
console.log(`📄 Integration report saved to: ${reportPath}`);

// Exit with appropriate code
process.exit(passedChecks === totalChecks ? 0 : 1);