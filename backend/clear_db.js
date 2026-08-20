const { Client } = require('pg');
// Connect to your Render database using the DATABASE_URL environment variable
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearStudents() {
  try {
    await client.connect();
    console.log("✅ Connected to database. Emptying students table...");
    await client.query('TRUNCATE TABLE students RESTART IDENTITY CASCADE;');
    console.log("✅ Success! All 492 students have been deleted.");
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    await client.end();
  }
}
clearStudents();
