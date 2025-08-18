/**
 * Import data from JSON export to PostgreSQL
 * Usage: node scripts/importDataToPostgreSQL.js <export-file.json>
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importData(exportFilePath) {
  try {
    console.log('🔄 Starting data import to PostgreSQL...');
    
    if (!fs.existsSync(exportFilePath)) {
      console.error(`❌ Export file not found: ${exportFilePath}`);
      process.exit(1);
    }

    // Read export data
    const exportData = JSON.parse(fs.readFileSync(exportFilePath, 'utf8'));
    
    // Import order matters due to foreign key constraints
    const importOrder = [
      'supportedLanguage',
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

    for (const table of importOrder) {
      const data = exportData[table];
      if (!data || data.length === 0) {
        console.log(`⏭️  Skipping ${table} (no data)`);
        continue;
      }

      try {
        console.log(`📥 Importing ${data.length} records to ${table}...`);
        
        // Convert date strings back to Date objects
        const processedData = data.map(record => {
          const processed = { ...record };
          
          // Convert date fields
          Object.keys(processed).forEach(key => {
            if (processed[key] && typeof processed[key] === 'string') {
              // Check if it looks like a date
              if (processed[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                processed[key] = new Date(processed[key]);
              }
            }
          });
          
          return processed;
        });

        // Use createMany for bulk insert
        await prisma[table].createMany({
          data: processedData,
          skipDuplicates: true
        });
        
        console.log(`✅ Imported ${data.length} records to ${table}`);
      } catch (error) {
        console.error(`❌ Failed to import ${table}:`, error.message);
        
        // Try individual inserts for better error reporting
        console.log(`🔄 Trying individual inserts for ${table}...`);
        let successCount = 0;
        
        for (const record of data) {
          try {
            await prisma[table].create({ data: record });
            successCount++;
          } catch (recordError) {
            console.warn(`⚠️  Failed to import record in ${table}:`, recordError.message);
          }
        }
        
        console.log(`✅ Imported ${successCount}/${data.length} records to ${table}`);
      }
    }

    console.log('🎉 Data import completed!');

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get export file from command line arguments
const exportFile = process.argv[2];

if (!exportFile) {
  console.error('❌ Please provide the export file path');
  console.log('Usage: node scripts/importDataToPostgreSQL.js <export-file.json>');
  console.log('Example: node scripts/importDataToPostgreSQL.js scripts/export/worrybox_export_2025-08-13.json');
  process.exit(1);
}

importData(exportFile);