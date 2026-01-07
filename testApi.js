// testApi.js
import axios from "axios";

const API_BASE = "https://adex-trade-backend.onrender.com";

// Test user info
const testUser = {
  fullName: "Test User",
  email: `testuser${Math.floor(Math.random() * 10000)}@example.com`,
  password: "StrongPassword123"
};

let token = ""; // Will store access token

async function testRegister() {
  try {
    const res = await axios.post(`${API_BASE}/api/auth/register`, testUser);
    console.log("✅ Register success:", res.data);
  } catch (err) {
    console.error("❌ Register error:", err.response?.data || err.message);
  }
}

async function testLogin() {
  try {
    const res = await axios.post(`${API_BASE}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log("✅ Login success:", res.data);
    token = res.data.data.accessToken; // Correct path to token
  } catch (err) {
    console.error("❌ Login error:", err.response?.data || err.message);
  }
}

async function testProfile() {
  if (!token) {
    console.warn("⚠️ Skipping profile test, no token");
    return;
  }
  try {
    const res = await axios.get(`${API_BASE}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Profile success:", res.data);
  } catch (err) {
    console.error("❌ Profile error:", err.response?.data || err.message);
  }
}

async function testWallet() {
  if (!token) {
    console.warn("⚠️ Skipping wallet test, no token");
    return;
  }
  try {
    const res = await axios.get(`${API_BASE}/api/wallet`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Wallet success:", res.data);
  } catch (err) {
    console.error("❌ Wallet error:", err.response?.data || err.message);
  }
}

async function testInvestments() {
  if (!token) {
    console.warn("⚠️ Skipping investments test, no token");
    return;
  }
  try {
    const res = await axios.get(`${API_BASE}/api/investments/my-investments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Investments success:", res.data);
  } catch (err) {
    console.error("❌ Investments error:", err.response?.data || err.message);
  }
}

async function runTests() {
  console.log("🧪 Starting API tests...");
  await testRegister();
  await testLogin();
  await testProfile();
  await testWallet();
  await testInvestments();
  console.log("🧪 API tests complete");
}

runTests();
