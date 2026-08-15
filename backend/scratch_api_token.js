
const { sequelize, Student, Floor } = require('./src/models');
const jwt = require('jsonwebtoken');
const env = require('./src/config/env');

async function testApiWithToken() {
  const student = await Student.findOne({ where: { programme: 'B.Tech', year: 2 } });
  const token = jwt.sign({ email: student.email, type: 'student' }, env.jwtSecret, { expiresIn: '1h' });

  const sampleFloor = await Floor.findOne();
  const floorId = sampleFloor.floor_id;

  const res = await fetch('http://localhost:5000/api/student/floors/' + floorId + '/rooms', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const data = await res.json();
  console.log('--- API RESPONSE FOR /api/student/floors/' + floorId + '/rooms ---');
  console.log(JSON.stringify(data, null, 2));

  process.exit(0);
}

testApiWithToken().catch(console.error);
