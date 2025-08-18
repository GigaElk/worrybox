/**
 * Export data from SQL Server to JSON files for migration to PostgreSQL
 * Usage: node scripts/exportDataFromSqlServer.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportData() {
  try {
    console.log('🔄 Starting data export from SQL Server...');
    
    // Create export directory
    const exportDir = path.join(__dirname, 'export');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    // Export all tables
    const tables = [
      'user',
      'post', 
      'comment',
      'follow',
      'like',
      'subscription',
      'worryAnalysis',
      'analyticsCache',
      'worryResolution',
      'guidedExercise',
      'userExerciseCompletion',
      'mentalHealthResource',
      'notification',
      'notificationPreferences',
      'supportedLanguage',
      'userLanguagePreference',
      'worryPrompt',
      'moderationQueue',
      'commentReport',
      'exercise',
      'exerciseStep',
      'copingTechnique',
      'resource',
      'exerciseProgress',
      'aiReprocessingQueue',
      'geographicAnalytics'
    ];

    const exportData = {};

    for (const table of tables) {
      try {
        console.log(`📊 Exporting ${table}...`);
        
        // Use findMany for each table
        const data = await prisma[table].findMany();
        exportData[table] = data;
        
        console.log(`✅ Exported ${data.length} records from ${table}`);
      } catch (error) {
        console.warn(`⚠️  Could not export ${table}:`, error.message);
        exportData[table] = [];
      }
    }

    // Write to JSON file
    const exportFile = path.join(exportDir, `worrybox_export_${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));

    console.log('🎉 Data export completed!');
    console.log(`📁 Export saved to: ${exportFile}`);
    
    // Print summary
    console.log('\n📋 Export Summary:');
    Object.entries(exportData).forEach(([table, data]) => {
      console.log(`  ${table}: ${data.length} records`);
    });

  } catch (error) {
    console.error('❌ Export failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();