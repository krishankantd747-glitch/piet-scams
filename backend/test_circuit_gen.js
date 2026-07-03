const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'projectforge_ai_super_secret_jwt_key_2026';
const token = jwt.sign({ id: 4, email: 'student@projectforge.ai', role: 'user' }, JWT_SECRET);

function postJSON(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: body
          });
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("=== PROJECTFORGE AI CIRCUIT COMPILER TEST SUITE ===");
  
  // Test 1: Valid inputs for /api/ai/circuit
  console.log("\n--- TEST 1: Valid inputs for /api/ai/circuit ---");
  const res1 = await postJSON('/api/ai/circuit', {
    projectName: "Line Follower Robot",
    components: "Arduino Uno, IR Sensor Module, L298N Motor Driver"
  });
  console.log("Status:", res1.statusCode);
  console.log("Is Fallback:", res1.body.isFallback || false);
  console.log("Has circuitSvg:", !!res1.body.circuitSvg);
  console.log("Has wiringSvg:", !!res1.body.wiringSvg);
  console.log("Pin Mapping Count:", res1.body.pinMapping?.length || 0);
  console.log("Connection Table Count:", res1.body.connectionTable?.length || 0);
  
  // Test 2: Invalid inputs (brackets/parentheses) for /api/ai/circuit (should trigger fallback instead of crashing)
  console.log("\n--- TEST 2: Invalid inputs for /api/ai/circuit (trigger validation fallback) ---");
  const res2 = await postJSON('/api/ai/circuit', {
    projectName: "Line Follower Robot",
    components: "Arduino Uno, IR Sensor (with brackets), L298N Motor Driver"
  });
  console.log("Status:", res2.statusCode);
  console.log("Is Fallback:", res2.body.isFallback || false);
  console.log("Fallback Reason:", res2.body.fallbackReason);
  console.log("Has fallback circuitSvg:", !!res2.body.circuitSvg);
  console.log("Has fallback wiringSvg:", !!res2.body.wiringSvg);
  console.log("Fallback Pin Mapping Count:", res2.body.pinMapping?.length || 0);
  console.log("Fallback Connection Table Count:", res2.body.connectionTable?.length || 0);

  // Test 3: Valid inputs for /api/pcb/generate
  console.log("\n--- TEST 3: Valid inputs for /api/pcb/generate ---");
  const res3 = await postJSON('/api/pcb/generate', {
    projectName: "Line Follower Robot",
    components: "Arduino Uno, IR Sensor, L298N Motor Driver"
  });
  console.log("Status:", res3.statusCode);
  console.log("Is Fallback:", res3.body.isFallback || false);
  console.log("Has schematicUrl:", !!res3.body.schematicUrl);
  console.log("Has layoutUrl:", !!res3.body.layoutUrl);
  console.log("Has bomUrl:", !!res3.body.bomUrl);

  // Test 4: Invalid inputs (parentheses) for /api/pcb/generate (should trigger fallback instead of crashing)
  console.log("\n--- TEST 4: Invalid inputs for /api/pcb/generate (trigger validation fallback) ---");
  const res4 = await postJSON('/api/pcb/generate', {
    projectName: "Line Follower Robot",
    components: "Arduino Uno, IR Sensor (invalid; characters), L298N Motor Driver"
  });
  console.log("Status:", res4.statusCode);
  console.log("Is Fallback:", res4.body.isFallback || false);
  console.log("Fallback Reason:", res4.body.fallbackReason);
  console.log("Has fallback schematicUrl:", !!res4.body.schematicUrl);
  console.log("Has fallback layoutUrl:", !!res4.body.layoutUrl);
  console.log("Has fallback PCB previews:", !!res4.body.pcbPreviewSvg);
}

runTests().catch(console.error);
