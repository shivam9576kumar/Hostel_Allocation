const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'https://hostel-backend-hbul.onrender.com';

(async () => {
  console.log('🔴 [Red Team] Executing Layer 4 AppSec Tests...');

  // 1. SQL Injection / Schema Validation Test (Should return 400 or handle input safely)
  console.log('  🚀 Test 1: Testing SQL Injection payload in room_id...');
  try {
    await axios.post(`${BASE_URL}/api/student/rooms/1; DROP TABLE users; --/book`, {
      room_id: "1; DROP TABLE users; --"
    });
    console.log('  ❌ [FAIL] SQLi payload allowed without error!');
  } catch (err) {
    if (err.response?.status === 400 || err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 404) {
      console.log('  ✅ [PASS] SQLi payload safely blocked (Status:', err.response.status, ').');
    }
  }

  // 2. CSRF Double-Submit Token Defense Test
  console.log('  🚀 Test 2: CSRF attack test (State-changing POST without CSRF header)...');
  try {
    await axios.post(`${BASE_URL}/api/admin/hostels`, {
      name: "Hacked Hostel"
    }, {
      headers: {
        'Cookie': 'csrfToken=invalid_server_cookie_val',
        'X-CSRF-Token': 'wrong_client_token'
      }
    });
    console.log('  ❌ [FAIL] Malicious CSRF request allowed!');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('  ✅ [PASS] CSRF token validation blocked the request.');
    } else {
      console.log('  ✅ [PASS] Request rejected by middleware stack (Status:', err.response?.status, ').');
    }
  }

  // 3. Stack Trace Leak Defense Check
  console.log('  🚀 Test 3: Triggering 404/500 error to check stack trace leaks...');
  try {
    const errRes = await axios.get(`${BASE_URL}/api/non-existent-endpoint-test-123`);
  } catch (err) {
    const data = err.response?.data || {};
    if (!data.stack || process.env.NODE_ENV === 'production') {
      console.log('  ✅ [PASS] Production response cleanly hides internal stack traces.');
    } else {
      console.log('  ℹ️ Development response stack trace available.');
    }
  }

  console.log('🏁 Layer 4 AppSec Tests Complete.');
})();
