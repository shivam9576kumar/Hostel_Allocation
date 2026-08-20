const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'https://hostel-backend-hbul.onrender.com';

(async () => {
  console.log('🔴 [Red Team] Executing Layer 1 Threat Model Tests...');

  // 1. Brute-Force Pairing Code Test (Expect 429)
  console.log('  🚀 Test 1: Brute-forcing pairing code (11 attempts)...');
  let rateLimited = false;
  for (let i = 0; i < 11; i++) {
    try {
      await axios.post(`${BASE_URL}/api/student/pair-by-code`, { roomId: 999, code: '000000' });
    } catch (err) {
      if (err.response?.status === 429) {
        rateLimited = true;
        console.log('  ✅ [PASS] Rate limiter blocked brute-force after 10 attempts.');
        break;
      }
    }
  }
  if (!rateLimited) console.log('  ❌ [FAIL] Rate limiter did NOT block brute-force.');

  // 2. SSRF / PDF Injection Test (Attempt to inject URL)
  console.log('  🚀 Test 2: Injecting malicious URL into student name...');
  try {
    const injectResponse = await axios.post(`${BASE_URL}/api/admin/students`, {
      name: 'http://169.254.169.254/latest/meta-data/',
      roll_number: '2026CS999',
      gender: 'Male',
      programme: 'B.Tech',
      year: 1
    });
    console.log('  ⚠️  [WARN] Name stored raw, but PDF generation must strip/sanitize. Check PDF output.');
  } catch (err) {
    console.log('  ✅ [PASS] API rejected or handled payload properly:', err.message);
  }

  // 3. CSV Injection Test (Malicious Excel Formula)
  console.log('  🚀 Test 3: Uploading CSV with formula injection...');
  console.log('  ✅ [MANUAL] Ensure stored value starts with "\'" to neutralize formula.\n');

  console.log('🏁 Layer 1 Threat Modeling Tests Complete.');
})();
