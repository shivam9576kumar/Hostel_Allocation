// test-pairing-redis.js
// Verification of Pairing Code storage & TTL in Upstash Redis

const redisClient = require('./src/config/redis');
const { Student, Room, Floor, Block, Hostel, Booking, AllocationRule, sequelize } = require('./src/models');
const { generatePairingCode } = require('./src/utils/codeGenerator');

async function testPairingCodeRedisStorage() {
  console.log('🧪 Starting Verification of Pairing Code Storage in Upstash Redis...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL database.');

    // Find a test vacant room
    let room = await Room.findOne({ where: { status: 'Vacant' } });
    if (!room) {
      console.log('ℹ️ No vacant room found, creating a test vacant room...');
      room = await Room.create({
        floor_id: 1,
        room_number: '999',
        capacity: 2,
        current_occupancy: 0,
        status: 'Vacant',
        is_reserved: false
      });
    }

    console.log(`✅ Using Room ID: ${room.room_id} (Room Number: ${room.room_number})`);

    // Generate 8-character pairing code
    const pairingCode = generatePairingCode();
    console.log(`✅ Generated 8-character Pairing Code: "${pairingCode}"`);

    const roomKey = `room:code:${room.room_id}`;
    const codeKey = `code:${pairingCode}`;

    // Store in Upstash Redis with 600s (10 minutes) TTL
    console.log(`🔄 Storing keys in Upstash Redis with 600s (10 min) TTL...`);
    await redisClient.set(roomKey, pairingCode, 'EX', 600);
    await redisClient.set(codeKey, room.room_id.toString(), 'EX', 600);

    // 1. Verify room:code:{roomId}
    const storedCode = await redisClient.get(roomKey);
    const ttlRoomKey = await redisClient.ttl(roomKey);
    console.log(`\n📌 Key [${roomKey}]:`);
    console.log(`   - Stored Value: "${storedCode}" (Expected: "${pairingCode}")`);
    console.log(`   - Remaining TTL: ${ttlRoomKey} seconds (Expected: ~600s)`);

    if (storedCode !== pairingCode) {
      throw new Error(`Value mismatch for ${roomKey}! Expected ${pairingCode}, got ${storedCode}`);
    }

    // 2. Verify code:{pairingCode}
    const storedRoomId = await redisClient.get(codeKey);
    const ttlCodeKey = await redisClient.ttl(codeKey);
    console.log(`\n📌 Key [${codeKey}]:`);
    console.log(`   - Stored Value: "${storedRoomId}" (Expected: "${room.room_id}")`);
    console.log(`   - Remaining TTL: ${ttlCodeKey} seconds (Expected: ~600s)`);

    if (storedRoomId !== room.room_id.toString()) {
      throw new Error(`Value mismatch for ${codeKey}! Expected ${room.room_id}, got ${storedRoomId}`);
    }

    if (ttlRoomKey <= 0 || ttlCodeKey <= 0) {
      throw new Error(`Invalid TTL! roomKey TTL: ${ttlRoomKey}, codeKey TTL: ${ttlCodeKey}`);
    }

    console.log('\n🎉 ALL STEP 5 PAIRING CODE REDIS VERIFICATION CHECKS PASSED SUCCESSFULLY!');
    
    // Clean up test keys
    await redisClient.del(roomKey);
    await redisClient.del(codeKey);
    console.log('✅ Temporary verification keys cleaned up.');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

testPairingCodeRedisStorage();
