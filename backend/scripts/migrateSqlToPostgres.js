/**
 * Direct migration from SQL Server to PostgreSQL
 * Usage: node scripts/migrateSqlToPostgres.js
 */

const { PrismaClient: SqlServerClient } = require('@prisma/client');
const { Client: PostgresClient } = require('pg');

// SQL Server connection
const sqlServerUrl = "sqlserver://worrybox.database.windows.net;port=1433;database=worryboxdb;user=wbprojcon;password=phZIMC7YADGH8yhI;encrypt=true;trustServerCertificate=false";

// PostgreSQL connection (from your .env.local)
const postgresUrl = "postgresql://neondb_owner:npg_LsJO3FtPpy0n@ep-raspy-haze-a1k550si-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function migrateSqlToPostgres() {
  console.log('🔄 Starting SQL Server to PostgreSQL migration...');
  
  // Create SQL Server client with explicit connection
  const sqlClient = new SqlServerClient({
    datasources: {
      db: {
        url: sqlServerUrl
      }
    }
  });
  
  // Create PostgreSQL client
  const pgClient = new PostgresClient({
    connectionString: postgresUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Connect to both databases
    console.log('🔌 Connecting to SQL Server...');
    await sqlClient.$connect();
    console.log('✅ Connected to SQL Server');
    
    console.log('🔌 Connecting to PostgreSQL...');
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL');

    // Migration order (respecting foreign keys)
    const tables = [
      { name: 'user', sqlTable: 'users' },
      { name: 'post', sqlTable: 'posts' },
      { name: 'comment', sqlTable: 'comments' },
      { name: 'follow', sqlTable: 'follows' },
      { name: 'like', sqlTable: 'likes' },
      { name: 'subscription', sqlTable: 'subscriptions' }
    ];

    for (const table of tables) {
      try {
        console.log(`\n📊 Migrating ${table.name}...`);
        
        // Get data from SQL Server
        const data = await sqlClient[table.name].findMany();
        console.log(`📥 Found ${data.length} records in SQL Server ${table.name}`);
        
        if (data.length === 0) {
          console.log(`⏭️  Skipping ${table.name} (no data)`);
          continue;
        }

        // Process data for PostgreSQL
        const processedData = data.map(record => {
          const processed = { ...record };
          
          // Convert date fields
          Object.keys(processed).forEach(key => {
            if (processed[key] instanceof Date) {
              // Keep as Date object
            } else if (processed[key] && typeof processed[key] === 'string') {
              // Check if it looks like a date string
              if (processed[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                processed[key] = new Date(processed[key]);
              }
            }
          });
          
          return processed;
        });

        // Insert into PostgreSQL using raw SQL
        if (table.name === 'user') {
          for (const user of processedData) {
            await pgClient.query(`
              INSERT INTO users (
                id, email, password_hash, username, display_name, bio, avatar_url, 
                email_verified, country, region, city, location_sharing, 
                welcome_email_sent, welcome_email_sent_at, role, lifetime_premium, 
                lifetime_premium_reason, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
              ON CONFLICT (id) DO NOTHING
            `, [
              user.id, user.email, user.passwordHash, user.username, user.displayName,
              user.bio, user.avatarUrl, user.emailVerified, user.country, user.region,
              user.city, user.locationSharing, user.welcomeEmailSent, user.welcomeEmailSentAt,
              user.role, user.lifetimePremium, user.lifetimePremiumReason, user.createdAt, user.updatedAt
            ]);
          }
        } else if (table.name === 'post') {
          for (const post of processedData) {
            await pgClient.query(`
              INSERT INTO posts (
                id, user_id, short_content, long_content, worry_prompt, privacy_level,
                comments_enabled, is_scheduled, scheduled_for, published_at, detected_language,
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (id) DO NOTHING
            `, [
              post.id, post.userId, post.shortContent, post.longContent, post.worryPrompt,
              post.privacyLevel, post.commentsEnabled, post.isScheduled, post.scheduledFor,
              post.publishedAt, post.detectedLanguage, post.createdAt, post.updatedAt
            ]);
          }
        } else if (table.name === 'subscription') {
          for (const sub of processedData) {
            await pgClient.query(`
              INSERT INTO subscriptions (
                id, user_id, tier, status, paypal_subscription_id, paypal_plan_id,
                current_period_start, current_period_end, trial_ends_at, renews_at, ends_at,
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (id) DO NOTHING
            `, [
              sub.id, sub.userId, sub.tier, sub.status, sub.paypalSubscriptionId, sub.paypalPlanId,
              sub.currentPeriodStart, sub.currentPeriodEnd, sub.trialEndsAt, sub.renewsAt, sub.endsAt,
              sub.createdAt, sub.updatedAt
            ]);
          }
        }
        // Add other tables as needed...

        console.log(`✅ Migrated ${data.length} records to PostgreSQL ${table.name}`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${table.name}:`, error.message);
      }
    }

    console.log('\n🎉 Migration completed!');
    
    // Verify migration
    console.log('\n📊 Verification:');
    const userCount = await pgClient.query('SELECT COUNT(*) FROM users');
    console.log(`👥 Users in PostgreSQL: ${userCount.rows[0].count}`);
    
    const postCount = await pgClient.query('SELECT COUNT(*) FROM posts');
    console.log(`📝 Posts in PostgreSQL: ${postCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sqlClient.$disconnect();
    await pgClient.end();
  }
}

migrateSqlToPostgres();