const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * @async
 * @author Abhishek Mohanta <ommohanta13579@gmail.com>
 * @param {string} email - Email id to which the email will be sent.
 * @param {string} emailBody - Contents of the email.
 */

module.exports = async (emailId, emailBody, emailSubject) => {
  console.log("sending mail");
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });


  let info = await transporter.sendMail({
    from: `test@changevu.com`,
    to: emailId,
    subject: emailSubject,
    text: `${emailBody}`,
    html: `<p>${emailBody}</p>`,
  }).catch((error) => {
    return new Error(error);
  });

  console.log(info);

  console.log(
    `Message sent: ${info.messageId} to ${emailId} at ${Date.now()}`
  );
}
