const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env' });

// Create sequelize instance
const sequelize = new Sequelize(
  'bossie', // process.env.DATABASE_NAME || 'bossie',
  'admin', // process.env.DATABASE_USERNAME || 'root',
  'bossie#483##in_', // process.env.DATABASE_PASSWORD || '',
  {
    host: '127.0.0.1', // process.env.DATABASE_HOST || 'localhost',
    dialect: 'mysql',
    port: 3306, // parseInt(process.env.DATABASE_PORT) || 3306,
    logging: console.log
  }
);

async function migrateUserNotificationTable() {
  try {
    console.log('🔍 Checking userNotification table structure...');
    
    // Check if columns already exist
    const [existingColumns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DATABASE_NAME || 'bossie'}' 
      AND TABLE_NAME = 'userNotification'
    `);
    
    const columnNames = existingColumns.map(col => col.COLUMN_NAME);
    console.log('Existing columns:', columnNames);
    
    // Define new columns to add
    const newColumns = [
      { name: 'reportId', type: 'INT NULL' },
      { name: 'contentDE', type: 'TEXT NULL' },
      { name: 'title', type: 'VARCHAR(255) NULL' },
      { name: 'Status', type: 'TEXT NULL' },
      { name: 'StatusKey', type: 'BIGINT NULL' },
      { name: 'isCustom', type: 'BOOLEAN NULL DEFAULT FALSE' },
      { name: 'metadata', type: 'JSON NULL' },
      { name: 'updatedBy', type: 'INT NULL' },
      { name: 'deletedBy', type: 'INT NULL' }
    ];
    
    // Add missing columns one by one
    for (const column of newColumns) {
      if (!columnNames.includes(column.name)) {
        console.log(`➕ Adding column: ${column.name}`);
        await sequelize.query(`
          ALTER TABLE userNotification 
          ADD COLUMN ${column.name} ${column.type}
        `);
        console.log(`✅ Added column: ${column.name}`);
      } else {
        console.log(`⏭️  Column already exists: ${column.name}`);
      }
    }
    
    // Add indexes for better performance
    console.log('🔍 Adding indexes...');
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_userNotification_reportId 
        ON userNotification(reportId)
      `);
      console.log('✅ Added index: idx_userNotification_reportId');
    } catch (error) {
      console.log('⏭️  Index already exists or error:', error.message);
    }
    
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_userNotification_isCustom 
        ON userNotification(isCustom)
      `);
      console.log('✅ Added index: idx_userNotification_isCustom');
    } catch (error) {
      console.log('⏭️  Index already exists or error:', error.message);
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration
migrateUserNotificationTable()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
