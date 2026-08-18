// test-upstash.js
const redis = require('./src/config/redis');

async function test() {
  try {
    console.log('🔄 Testing Upstash Redis connection...');

    // 1. Set a test key with 10-second expiry
    await redis.set('test:key', 'hello-from-upstash', 'EX', 10);
    console.log('✅ Set test:key = "hello-from-upstash"');

    // 2. Get the key
    const value = await redis.get('test:key');
    console.log('✅ Get test:key =', value);

    // 3. Verify the value matches
    if (value === 'hello-from-upstash') {
      console.log('✅ Value matches! Redis is working correctly.');
    } else {
      console.error('❌ Value mismatch! Expected "hello-from-upstash", got', value);
      process.exit(1);
    }

    // 4. Delete the key
    await redis.del('test:key');
    console.log('✅ Deleted test:key');

    // 5. Verify deletion
    const deletedValue = await redis.get('test:key');
    if (deletedValue === null) {
      console.log('✅ Key successfully deleted.');
    } else {
      console.error('❌ Key still exists after deletion.');
      process.exit(1);
    }

    console.log('🎉 Upstash Redis test passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Redis test failed:', err.message);
    process.exit(1);
  }
}

test();
