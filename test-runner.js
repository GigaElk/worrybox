#!/usr/bin/env node

const { execSync } = require('child_process')
const path = require('path')

console.log('🧪 Running User Experience Improvements Test Suite\n')

// Test configurations
const tests = [
  {
    name: 'Frontend Unit Tests',
    command: 'npm test',
    cwd: './frontend',
    description: 'Testing React components, hooks, and utilities'
  },
  {
    name: 'Backend Integration Tests', 
    command: 'npm test',
    cwd: './backend',
    description: 'Testing API endpoints and service integration'
  }
]

let totalPassed = 0
let totalFailed = 0

for (const test of tests) {
  console.log(`\n📋 ${test.name}`)
  console.log(`   ${test.description}`)
  console.log('   ' + '─'.repeat(50))
  
  try {
    const output = execSync(test.command, {
      cwd: test.cwd,
      encoding: 'utf8',
      stdio: 'pipe'
    })
    
    console.log('✅ PASSED')
    
    // Extract test results if available
    const passedMatch = output.match(/(\d+) passed/)
    const failedMatch = output.match(/(\d+) failed/)
    
    if (passedMatch) {
      const passed = parseInt(passedMatch[1])
      totalPassed += passed
      console.log(`   ${passed} tests passed`)
    }
    
    if (failedMatch) {
      const failed = parseInt(failedMatch[1])
      totalFailed += failed
      console.log(`   ${failed} tests failed`)
    }
    
  } catch (error) {
    console.log('❌ FAILED')
    console.log(`   Error: ${error.message}`)
    
    // Try to extract test results from error output
    const output = error.stdout || error.stderr || ''
    const failedMatch = output.match(/(\d+) failed/)
    const passedMatch = output.match(/(\d+) passed/)
    
    if (failedMatch) {
      totalFailed += parseInt(failedMatch[1])
    }
    if (passedMatch) {
      totalPassed += parseInt(passedMatch[1])
    }
  }
}

// Summary
console.log('\n' + '═'.repeat(60))
console.log('📊 TEST SUMMARY')
console.log('═'.repeat(60))
console.log(`✅ Total Passed: ${totalPassed}`)
console.log(`❌ Total Failed: ${totalFailed}`)
console.log(`📈 Success Rate: ${totalPassed + totalFailed > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0}%`)

if (totalFailed === 0) {
  console.log('\n🎉 All tests passed! Ready for deployment.')
  process.exit(0)
} else {
  console.log('\n⚠️  Some tests failed. Please review and fix before deployment.')
  process.exit(1)
}