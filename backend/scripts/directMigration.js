/**
 * Direct migration using raw database connections (no Prisma)
 * Usage: node scripts/directMigration.js
 */

const sql = require('mssql');
const { Client: PostgresClient } = require('pg');

// SQL Server connection config
const sqlConfig = {
  user: 'wbprojcon',
  password: 'phZIMC7YADGH8yhI',
  server: 'worrybox.database.windows.net',
  database: 'worryboxdb',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// PostgreSQL connection
const postgresUrl = "postgresql://neondb_owner:npg_LsJO3FtPpy0n@ep-raspy-haze-a1k550si-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function directMigration() {
  console.log('🔄 Starting direct database migration...');
  
  let sqlPool;
  let pgClient;

  try {
    // Connect to SQL Server
    console.log('🔌 Connecting to SQL Server...');
    sqlPool = await sql.connect(sqlConfig);
    console.log('✅ Connected to SQL Server');
    
    // Connect to PostgreSQL
    console.log('🔌 Connecting to PostgreSQL...');
    pgClient = new PostgresClient({
      connectionString: postgresUrl,
      ssl: { rejectUnauthorized: false }
    });
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL');

    // Migrate Users
    console.log('\n👥 Migrating users...');
    const usersResult = await sqlPool.request().query('SELECT * FROM users');
    console.log(`📥 Found ${usersResult.recordset.length} users in SQL Server`);
    
    for (const user of usersResult.recordset) {
      try {
        await pgClient.query(`
          INSERT INTO users (
            id, email, password_hash, username, display_name, bio, avatar_url, 
            email_verified, country, region, city, location_sharing, 
            welcome_email_sent, welcome_email_sent_at, role, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO NOTHING
        `, [
          user.id, user.email, user.password_hash, user.username, user.display_name,
          user.bio, user.avatar_url, user.email_verified, user.country, user.region,
          user.city, user.location_sharing, user.welcome_email_sent, user.welcome_email_sent_at,
          user.role || 'USER', user.created_at, user.updated_at
        ]);
      } catch (err) {
        console.warn(`⚠️  Failed to insert user ${user.email}:`, err.message);
      }
    }
    console.log(`✅ Migrated users`);

    // Migrate Posts
    console.log('\n📝 Migrating posts...');
    const postsResult = await sqlPool.request().query('SELECT * FROM posts');
    console.log(`📥 Found ${postsResult.recordset.length} posts in SQL Server`);
    
    for (const post of postsResult.recordset) {
      try {
        await pgClient.query(`
          INSERT INTO posts (
            id, user_id, short_content, long_content, worry_prompt, privacy_level,
            comments_enabled, is_scheduled, scheduled_for, published_at, detected_language,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `, [
          post.id, post.user_id, post.short_content, post.long_content, post.worry_prompt,
          post.privacy_level, post.comments_enabled, post.is_scheduled, post.scheduled_for,
          post.published_at, post.detected_language, post.created_at, post.updated_at
        ]);
      } catch (err) {
        console.warn(`⚠️  Failed to insert post ${post.id}:`, err.message);
      }
    }
    console.log(`✅ Migrated posts`);

    // Migrate Comments
    console.log('\n💬 Migrating comments...');
    const commentsResult = await sqlPool.request().query('SELECT * FROM comments');
    console.log(`📥 Found ${commentsResult.recordset.length} comments in SQL Server`);
    
    for (const comment of commentsResult.recordset) {
      try {
        await pgClient.query(`
          INSERT INTO comments (
            id, post_id, user_id, content, moderation_status, moderation_score,
            parent_comment_id, detected_language, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [
          comment.id, comment.post_id, comment.user_id, comment.content, 
          comment.moderation_status, comment.moderation_score, comment.parent_comment_id,
          comment.detected_language, comment.created_at, comment.updated_at
        ]);
      } catch (err) {
        console.warn(`⚠️  Failed to insert comment ${comment.id}:`, err.message);
      }
    }
    console.log(`✅ Migrated comments`);

    // Migrate Subscriptions
    console.log('\n💳 Migrating subscriptions...');
    const subsResult = await sqlPool.request().query('SELECT * FROM subscriptions');
    console.log(`📥 Found ${subsResult.recordset.length} subscriptions in SQL Server`);
    
    for (const sub of subsResult.recordset) {
      try {
        await pgClient.query(`
          INSERT INTO subscriptions (
            id, user_id, tier, status, paypal_subscription_id, paypal_plan_id,
            current_period_start, current_period_end, trial_ends_at, renews_at, ends_at,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `, [
          sub.id, sub.user_id, sub.tier, sub.status, sub.paypal_subscription_id, sub.paypal_plan_id,
          sub.current_period_start, sub.current_period_end, sub.trial_ends_at, sub.renews_at, sub.ends_at,
          sub.created_at, sub.updated_at
        ]);
      } catch (err) {
        console.warn(`⚠️  Failed to insert subscription ${sub.id}:`, err.message);
      }
    }
    console.log(`✅ Migrated subscriptions`);

    // Verification
    console.log('\n📊 Migration Summary:');
    const userCount = await pgClient.query('SELECT COUNT(*) FROM users');
    console.log(`👥 Users in PostgreSQL: ${userCount.rows[0].count}`);
    
    const postCount = await pgClient.query('SELECT COUNT(*) FROM posts');
    console.log(`📝 Posts in PostgreSQL: ${postCount.rows[0].count}`);
    
    const commentCount = await pgClient.query('SELECT COUNT(*) FROM comments');
    console.log(`💬 Comments in PostgreSQL: ${commentCount.rows[0].count}`);

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (sqlPool) await sqlPool.close();
    if (pgClient) await pgClient.end();
  }
}

directMigration();