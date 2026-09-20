import axios from 'axios';

async function testRateLimiter() {
  let success = 0;
  let blocked = 0;
  
  // Hit send-otp which has limit 5
  for(let i = 0; i < 8; i++) {
    try {
      await axios.post('http://localhost:5000/api/v1/auth/send-otp', { phone: '1234567890' });
      success++;
    } catch (err: any) {
      if(err.response?.status === 429) {
        blocked++;
      } else {
        console.error('Other error:', err.response?.status, err.response?.data || err.message);
      }
    }
  }
  
  console.log(`send-otp -> Success: ${success}, Blocked: ${blocked}`);
  if (success > 5 || blocked === 0) {
    console.error('Rate limiting failed on send-otp!');
    process.exit(1);
  }
  console.log('Rate limiting verified.');
}
testRateLimiter();
