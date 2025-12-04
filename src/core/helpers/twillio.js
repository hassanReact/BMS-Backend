// sendMessage.js
import 'dotenv/config';
import twilio from 'twilio';

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM,
} = process.env;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);


const sendWhatsApp = async (to, message) => {
  try {
    const msg = await client.messages.create({
      body: message,
      from: TWILIO_WHATSAPP_FROM,
      to: `whatsapp:+91${to}`, 
    });
  
  } catch (err) {
    console.error('❌ Error sending WhatsApp message:', err.message);
  }
};

export default sendWhatsApp;
