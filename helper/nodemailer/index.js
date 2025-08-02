const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.USER_NODEMAILER_EMAIL,
    pass: process.env.USER_NODEMAILER_PASS,
  },
  tls: {
    rejectUnauthorized: true,
  },
});

module.exports = transporter;
