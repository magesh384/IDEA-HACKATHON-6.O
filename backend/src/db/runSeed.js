/**
 * Convenience script: applies schema.sql then seed.sql against the configured database.
 * Usage: npm run seed   (from the backend/ directory, after setting up .env)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const schemaSql = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8');
  const seedSql = fs.readFileSync(path.join(__dirname, '../../database/seed.sql'), 'utf8');

  console.log('Applying schema.sql ...');
  await connection.query(schemaSql);
  console.log('Applying seed.sql ...');
  await connection.query(seedSql);

  console.log('✅ Database ready. Demo login: owner@demo-store.com / Passw0rd!');
  await connection.end();
}

run().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
