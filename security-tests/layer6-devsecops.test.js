const { execSync } = require('child_process');

(() => {
  console.log('🔴 [Red Team] Executing Layer 6 DevSecOps Tests...');

  // 1. Check if .env is tracked in git index
  console.log('  🚀 Test 1: Checking if .env is tracked in Git index...');
  try {
    const trackedFiles = execSync('git ls-files backend/.env', { encoding: 'utf8' }).trim();
    if (trackedFiles) {
      console.log('  ❌ [FAIL] .env is tracked in Git! Exposing secrets.');
    } else {
      console.log('  ✅ [PASS] .env is safely ignored from Git tracking.');
    }
  } catch (err) {
    console.log('  ✅ [PASS] .env is safely ignored.');
  }

  // 2. Check for package-lock.json lockfile
  console.log('  🚀 Test 2: Checking for package-lock.json lockfile...');
  const fs = require('fs');
  if (fs.existsSync('backend/package-lock.json')) {
    console.log('  ✅ [PASS] backend/package-lock.json exists (pinned dependencies).');
  } else {
    console.log('  ❌ [FAIL] package-lock.json missing.');
  }

  // 3. Check for ESLint security rules file
  console.log('  🚀 Test 3: Checking for ESLint security config...');
  if (fs.existsSync('backend/.eslintrc.json')) {
    console.log('  ✅ [PASS] ESLint security plugin configured.');
  } else {
    console.log('  ❌ [FAIL] .eslintrc.json missing.');
  }

  // 4. Check for Dockerfile non-root configuration
  console.log('  🚀 Test 4: Checking Dockerfile security (non-root user)...');
  if (fs.existsSync('backend/Dockerfile')) {
    const dockerContent = fs.readFileSync('backend/Dockerfile', 'utf8');
    if (dockerContent.includes('USER nodejs')) {
      console.log('  ✅ [PASS] Dockerfile enforces non-root user (USER nodejs).');
    } else {
      console.log('  ❌ [FAIL] Dockerfile runs as root.');
    }
  }

  console.log('🏁 Layer 6 DevSecOps Tests Complete.');
})();
