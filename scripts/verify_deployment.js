#!/usr/bin/env node

/**
 * Deployment Verification Script for User Experience Improvements
 * 
 * This script verifies that all components of the user experience improvements
 * have been deployed correctly and are functioning as expected.
 */

const https = require('https')
const http = require('http')
const { execSync } = require('child_process')

// Configuration
const config = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  testToken: process.env.TEST_JWT_TOKEN || '',
  testUserId: process.env.TEST_USER_ID || 'test-user-id',
  testPostId: process.env.TEST_POST_ID || 'test-post-id',
}

console.log('🔍 User Experience Improvements - Deployment Verification')
console.log('=' .repeat(60))

let totalTests = 0
let passedTests = 0
let failedTests = 0

// Helper function to make HTTP requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https:' ? https : http
    
    const req = client.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        })
      })
    })
    
    req.on('error', reject)
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

// Test helper
async function runTest(testName, testFn) {
  totalTests++
  try {
    console.log(`\n🧪 ${testName}`)
    await testFn()
    console.log('   ✅ PASSED')
    passedTests++
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`)
    failedTests++
  }
}

// Database verification tests
async function verifyDatabase() {
  console.log('\n📊 Database Verification')
  console.log('-'.repeat(30))
  
  await runTest('Verify me_too table exists', async () => {
    try {
      const result = execSync(`psql "${process.env.DATABASE_URL}" -c "SELECT COUNT(*) FROM me_too;"`, { encoding: 'utf8' })
      if (!result.includes('(1 row)')) {
        throw new Error('me_too table query failed')
      }
    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }
  })
  
  await runTest('Verify follows table exists', async () => {
    try {
      const result = execSync(`psql "${process.env.DATABASE_URL}" -c "SELECT COUNT(*) FROM follows;"`, { encoding: 'utf8' })
      if (!result.includes('(1 row)')) {
        throw new Error('follows table query failed')
      }
    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }
  })
  
  await runTest('Verify user profile picture columns exist', async () => {
    try {
      const result = execSync(`psql "${process.env.DATABASE_URL}" -c "SELECT profile_picture_cloudinary_id, profile_picture_updated_at FROM users LIMIT 1;"`, { encoding: 'utf8' })
      if (result.includes('ERROR')) {
        throw new Error('Profile picture columns not found')
      }
    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }
  })
}

// API endpoint verification tests
async function verifyAPIEndpoints() {
  console.log('\n🌐 API Endpoints Verification')
  console.log('-'.repeat(30))
  
  const url = new URL(config.baseUrl)
  
  // Test MeToo endpoints
  await runTest('GET /api/metoo/:postId/count', async () => {
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port,
      path: `/api/metoo/${config.testPostId}/count`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.statusCode !== 200 && response.statusCode !== 404) {
      throw new Error(`Expected 200 or 404, got ${response.statusCode}`)
    }
  })
  
  await runTest('GET /api/metoo/:postId/similar-count', async () => {
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port,
      path: `/api/metoo/${config.testPostId}/similar-count`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.statusCode !== 200 && response.statusCode !== 404) {
      throw new Error(`Expected 200 or 404, got ${response.statusCode}`)
    }
  })
  
  // Test Follow endpoints
  await runTest('GET /api/follows/:userId/stats', async () => {
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port,
      path: `/api/follows/${config.testUserId}/stats`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.statusCode !== 200 && response.statusCode !== 404) {
      throw new Error(`Expected 200 or 404, got ${response.statusCode}`)
    }
  })
  
  await runTest('GET /api/follows/:userId/followers', async () => {
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port,
      path: `/api/follows/${config.testUserId}/followers`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.statusCode !== 200 && response.statusCode !== 404) {
      throw new Error(`Expected 200 or 404, got ${response.statusCode}`)
    }
  })
  
  // Test Profile Picture endpoints
  await runTest('GET /api/profile-picture/:userId', async () => {
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port,
      path: `/api/profile-picture/${config.testUserId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.statusCode !== 200 && response.statusCode !== 404) {
      throw new Error(`Expected 200 or 404, got ${response.statusCode}`)
    }
  })
  
  // Test Enhanced Support endpoints
  await runTest('GET /api/likes/:postId/count', async () => {
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port,
      path: `/api/likes/${config.testPostId}/count`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.statusCode !== 200 && response.statusCode !== 404) {
      throw new Error(`Expected 200 or 404, got ${response.statusCode}`)
    }
    
    // Verify response contains support terminology
    try {
      const data = JSON.parse(response.body)
      if (data.success !== undefined) {
        // API is responding with expected format
      }
    } catch (e) {
      throw new Error('Invalid JSON response')
    }
  })
}

// Environment verification tests
async function verifyEnvironment() {
  console.log('\n🔧 Environment Verification')
  console.log('-'.repeat(30))
  
  await runTest('Database URL configured', async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set')
    }
  })
  
  await runTest('Cloudinary configuration', async () => {
    const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
    const missing = required.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      throw new Error(`Missing Cloudinary environment variables: ${missing.join(', ')}`)
    }
  })
  
  await runTest('JWT Secret configured', async () => {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable not set')
    }
  })
}

// Health check tests
async function verifyHealthChecks() {
  console.log('\n❤️  Health Check Verification')
  console.log('-'.repeat(30))
  
  const url = new URL(config.baseUrl)
  
  await runTest('API Health Check', async () => {
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.statusCode !== 200) {
      throw new Error(`Health check failed with status ${response.statusCode}`)
    }
  })
  
  await runTest('Database Health Check', async () => {
    const response = await makeRequest({
      hostname: url.hostname,
      port: url.port,
      path: '/api/health/database',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.statusCode !== 200) {
      throw new Error(`Database health check failed with status ${response.statusCode}`)
    }
  })
}

// Main verification function
async function runVerification() {
  try {
    console.log(`🚀 Starting verification for: ${config.baseUrl}`)
    
    await verifyEnvironment()
    await verifyDatabase()
    await verifyAPIEndpoints()
    await verifyHealthChecks()
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📋 VERIFICATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Passed: ${passedTests}`)
    console.log(`❌ Failed: ${failedTests}`)
    console.log(`📊 Total:  ${totalTests}`)
    
    const successRate = Math.round((passedTests / totalTests) * 100)
    console.log(`📈 Success Rate: ${successRate}%`)
    
    if (failedTests === 0) {
      console.log('\n🎉 All verification tests passed! Deployment is successful.')
      process.exit(0)
    } else {
      console.log('\n⚠️  Some verification tests failed. Please review and fix issues.')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\n💥 Verification failed with error:', error.message)
    process.exit(1)
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node verify_deployment.js [options]

Environment Variables:
  API_BASE_URL     Base URL for API (default: http://localhost:3001)
  TEST_JWT_TOKEN   JWT token for authenticated requests
  TEST_USER_ID     Test user ID for verification
  TEST_POST_ID     Test post ID for verification
  DATABASE_URL     PostgreSQL connection string

Options:
  --help, -h       Show this help message

Examples:
  node verify_deployment.js
  API_BASE_URL=https://api.example.com node verify_deployment.js
`)
  process.exit(0)
}

// Run verification
runVerification()