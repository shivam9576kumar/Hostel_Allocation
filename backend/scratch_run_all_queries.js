const { Sequelize, QueryTypes } = require('sequelize');
const path = require('path');
const http = require('http');

const dbPath = path.join(__dirname, 'hostel_booking.sqlite');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

async function runAllQueries() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.\n');

    // Query 1: Total Students
    console.log('=== QUERY 1: Total number of students ===');
    const q1 = await sequelize.query('SELECT COUNT(*) AS total_students FROM students;', { type: QueryTypes.SELECT });
    console.table(q1);

    // Query 2: Check for NULL or missing values
    console.log('\n=== QUERY 2: Check for NULL or missing values in key columns ===');
    const q2 = await sequelize.query(`
      SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN roll_number IS NULL THEN 1 ELSE 0 END) AS null_roll,
          SUM(CASE WHEN full_name IS NULL THEN 1 ELSE 0 END) AS null_name,
          SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) AS null_email,
          SUM(CASE WHEN gender IS NULL THEN 1 ELSE 0 END) AS null_gender,
          SUM(CASE WHEN programme IS NULL THEN 1 ELSE 0 END) AS null_programme,
          SUM(CASE WHEN year IS NULL THEN 1 ELSE 0 END) AS null_year
      FROM students;
    `, { type: QueryTypes.SELECT });
    console.table(q2);

    // Query 3: Distinct programme and year
    console.log('\n=== QUERY 3: Check distinct values for programme and year ===');
    const q3 = await sequelize.query('SELECT DISTINCT programme, year FROM students ORDER BY programme, year;', { type: QueryTypes.SELECT });
    console.table(q3);

    // Query 4: Distinct booking_status
    console.log('\n=== QUERY 4: Check distinct booking_status values ===');
    const q4 = await sequelize.query('SELECT DISTINCT booking_status FROM students;', { type: QueryTypes.SELECT });
    console.table(q4);

    // Query 5: Rows with NULL roll_number or email
    console.log('\n=== QUERY 5: Check for any rows causing errors (NULL roll_number or email) ===');
    const q5 = await sequelize.query('SELECT * FROM students WHERE roll_number IS NULL OR email IS NULL;', { type: QueryTypes.SELECT });
    console.log(`Found ${q5.length} invalid row(s).`);
    if (q5.length > 0) console.table(q5);

    // Query 6: Count for programme = 'B.Tech'
    console.log('\n=== QUERY 6: Count for programme = "B.Tech" ===');
    const q6 = await sequelize.query("SELECT COUNT(*) AS count_btech FROM students WHERE programme = 'B.Tech';", { type: QueryTypes.SELECT });
    console.table(q6);

    // Query 7: Complex filter (status + programme + year)
    console.log('\n=== QUERY 7: Complex filter (Pending + B.Tech + Year 3) ===');
    const q7 = await sequelize.query("SELECT COUNT(*) AS count_complex FROM students WHERE booking_status = 'Pending' AND programme = 'B.Tech' AND year = 3;", { type: QueryTypes.SELECT });
    console.table(q7);

    // Query 8: PRAGMA table_info(students)
    console.log('\n=== QUERY 8: Table info / schema for students ===');
    const q8 = await sequelize.query('PRAGMA table_info(students);', { type: QueryTypes.SELECT });
    console.table(q8);

    // Query 9: Search query with LIKE
    console.log('\n=== QUERY 9: Count with search term (LIKE) ===');
    const q9 = await sequelize.query("SELECT COUNT(*) AS search_count FROM students WHERE roll_number LIKE '%2022%' OR full_name LIKE '%Saurabh%' OR email LIKE '%@iit.ac.in%';", { type: QueryTypes.SELECT });
    console.table(q9);

    // Query 10: Expected columns check
    console.log('\n=== QUERY 10: Check if expected columns exist in students table ===');
    const q10 = await sequelize.query("SELECT name FROM pragma_table_info('students') WHERE name IN ('roll_number', 'full_name', 'email', 'gender', 'programme', 'year', 'booking_status', 'booked_room_id');", { type: QueryTypes.SELECT });
    console.table(q10);

  } catch (err) {
    console.error('Error running queries:', err);
  } finally {
    await sequelize.close();
  }
}

runAllQueries();
