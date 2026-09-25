import * as dotenv from 'dotenv';
dotenv.config();

import { WhatsAppService } from './src/services/whatsappService';

async function testWhatsApp() {
  console.log('Testing WhatsApp Service...');
  const result = await WhatsAppService.sendMessage('7540032060', 'Hello from E-commerce Backend! This is a test message.');
  console.log('Result:', result);
}

testWhatsApp();
