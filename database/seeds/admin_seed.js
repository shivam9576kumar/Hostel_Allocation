const path = require('path');
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  bcrypt = require(path.join(__dirname, '../../backend/node_modules/bcryptjs'));
}

const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'hostel_booking'
});

async function seedAdmins() {
  const password = 'Admin@123';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const admins = [
    {
      name: 'Baboo Boss',
      email: 'baboo.boss@admin.iit.ac.in',
      role: 'Super Admin'
    },
    {
      name: 'Shubham',
      email: 'shubham@admin.iit.ac.in',
      role: 'Admin'
    },
    {
      name: 'Ayesha Khan',
      email: 'ayesha.khan@admin.iit.ac.in',
      role: 'Admin'
    }
  ];

  console.log('Seeding admin accounts...');

  for (const admin of admins) {
    const query = `
      INSERT INTO admins (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) 
      DO UPDATE SET name = $1, password_hash = $3, role = $4
      RETURNING id, name, email, role;
    `;
    const res = await pool.query(query, [admin.name, admin.email, passwordHash, admin.role]);
    console.log(`Seeded admin: ${res.rows[0].name} (${res.rows[0].email}) - Role: ${res.rows[0].role}`);
  }

  console.log('Admin seeding completed successfully.');
  await pool.end();
}

seedAdmins().catch((err) => {
  console.error('Error seeding admins:', err.message);
  process.exit(1);
});
