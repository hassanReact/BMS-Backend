import nodemailer from 'nodemailer';
// import getJWTPayload from './payload';
import { findSmtpDetails } from '../../services/company.services.js';

// Function to send an email
const sendEmail = async (to, subject, text, CompanyId) => {
  // const payload = await getJWTPayload(token);
  // const CompanyId = payload?.companyId;
  const smtpDetails = await findSmtpDetails(CompanyId);

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: smtpDetails.mail,
        pass: smtpDetails.key,
      },
    });

    const mailOptions = {
      from: 'jairajlakher018@gmail.com',  
      to: to,                          
      subject: subject,                 
      html: text,
    };

    const info = await transporter.sendMail(mailOptions);
    // console.log('Email sent: ' + info.response);
    return info.response;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

export { sendEmail };
