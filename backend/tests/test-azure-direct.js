// Test Azure SQL connection using native SQL Server driver
const sql = require('mssql');

async function testAzureConnection() {
  const config = {
    server: 'worrybox.database.windows.net',
    database: 'worryboxdb',
    user: 'worry_box_service_principal',
    password: 'phZIMC7YADGH8yhI',
    port: 1433,
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };

  try {
    console.log('🔍 Testing Azure SQL connection directly...');
    console.log('Server:', config.server);
    console.log('Database:', config.database);
    console.log('User:', config.user);
    
    const pool = await sql.connect(config);
    console.log('✅ Successfully connected to Azure SQL!');
    
    const result = await pool.request().query('SELECT 1 as test, GETDATE() as current_time');
    console.log('✅ Query successful:', result.recordset);
    
    await pool.close();
    console.log('✅ Azure SQL setup is working correctly!');
    
  } catch (error) {
    console.error('❌ Azure connection failed:', error.message);
    
    if (error.message.includes('Login failed')) {
      console.log('🔍 Issue: Authentication problem (username/password)');
    } else if (error.message.includes('Cannot open database')) {
      console.log('🔍 Issue: Database access problem');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.log('🔍 Issue: Server name problem');
    } else {
      console.log('🔍 Issue: Other Azure configuration problem');
    }
  }
}

testAzureConnection();