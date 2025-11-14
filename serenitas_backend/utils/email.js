/**
 * Email Utility
 * Placeholder for email sending functionality
 */

const logger = require('./logger');

/**
 * Send email (placeholder - integrate with email service)
 * @param {Object} emailData - Email information
 * @returns {Promise<void>}
 */
async function sendEmail(emailData) {
  const { to, subject, html, text } = emailData;
  
  logger.info('Enviando email', {
    to,
    subject
  });
  
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // For now, just log the email
  if (process.env.NODE_ENV === 'development') {
    logger.info('Email (desenvolvimento)', {
      to,
      subject,
      preview: text || html?.substring(0, 100)
    });
  }
  
  // In production, this would actually send the email
  // Example with nodemailer:
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html, text });
  
  return Promise.resolve();
}

module.exports = {
  sendEmail
};
