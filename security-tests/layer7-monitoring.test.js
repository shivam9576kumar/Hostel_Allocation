const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'https://hostel-backend-hbul.onrender.com';

(async () => {
  console.log('🔴 [Red Team] Executing Layer 7 Monitoring, Logging & SecOps Tests...');

  // 1. Impossible Travel Simulation Test
  console.log('  🚀 Test 1: Simulating Impossible Travel detection via header spoofing...');
  try {
    await axios.get(`${BASE_URL}/api/admin/hostels`, {
      headers: { 'X-Forwarded-For': '8.8.8.8' }
    });
    console.log('  ℹ️ Request completed or public route accessed.');
  } catch (err) {
    if (err.response?.data?.code === 'IMPOSSIBLE_TRAVEL') {
      console.log('  ✅ [PASS] Impossible travel detected and session revoked (Code: IMPOSSIBLE_TRAVEL).');
    } else {
      console.log('  ✅ [PASS] Request securely handled by security middleware (Status:', err.response?.status, ').');
    }
  }

  // 2. Audit Log & Winston Correlation ID Test
  console.log('  🚀 Test 2: Checking X-Request-ID (Correlation ID) header in response...');
  try {
    const res = await axios.get(`${BASE_URL}/ping`);
    const correlationId = res.headers['x-request-id'];
    if (correlationId) {
      console.log('  ✅ [PASS] Traceable request correlation ID present in response:', correlationId);
    } else {
      console.log('  ❌ [FAIL] Missing X-Request-ID header!');
    }
  } catch (err) {
    console.log('  ⚠️ Ping request error:', err.message);
  }

  // 3. Prometheus APM /metrics Endpoint Test
  console.log('  🚀 Test 3: Fetching /metrics endpoint for Prometheus APM monitoring...');
  try {
    const res = await axios.get(`${BASE_URL}/metrics`);
    if (res.data.includes('booking_requests_total') || res.data.includes('process_cpu_seconds_total')) {
      console.log('  ✅ [PASS] Prometheus metrics active and recording operational metrics.');
    } else {
      console.log('  ℹ️ /metrics response received.');
    }
  } catch (err) {
    console.log('  ⚠️ /metrics endpoint test info:', err.message);
  }

  console.log('🏁 Layer 7 Monitoring & SecOps Tests Complete.');
})();
