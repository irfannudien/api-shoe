const transporter = require("../../helper/nodemailer");
const { runQuery } = require("../../utils");
const db = require("../../db");

module.exports = {
  insertNewsletterSubscriber: async (req, res) => {
    const { email } = req.body;

    try {
      const checkExistingEmail = `
      SELECT * FROM newsletter_subscriber WHERE email = ${email}`;
      await db.query(checkExistingEmail, (err, result) => {
        if (result.length > 0) {
          return res.status(200).send("Email sudah terdaftar");
        }
      });

      const insertQuery = `INSERT INTO newsletter_subscriber (email) VALUES (?)`;
      await runQuery(db, insertQuery, [email]);

      const mailToUser = {
        to: email,
        subject: "Terima kasih telah berlangganan!",
        text: "Anda telah berhasil berlangganan newsletter kami.",
        from: "your@email.com",
      };

      const triggerMail = await transporter.sendMail(mailToUser);
      res.status(200).send(triggerMail.response);
    } catch (err) {
      return res.status(500).send(err);
    }
  },
};
