const transporter = require("../../helper/nodemailer");
const { runQuery } = require("../../utils");

module.exports = {
  insertNewsletterSubscriber: async (req, res) => {
    const { email } = req.body;

    try {
      const checkExistingEmail = `
      SELECT * FROM newsletter_subscriber WHERE email = ?`;
      const result = await runQuery(checkExistingEmail, [email]);

      if (result.length > 0) {
        return res.status(409).send("Email sudah terdaftar");
      }

      const insertQuery = `INSERT INTO newsletter_subscriber (email) VALUES (?)`;
      await runQuery(insertQuery, [email]);

      const mailToUser = {
        from: "KC Shoeshop <ridho@coursenese.com>",
        to: email,
        subject: "Welcome to KC Shoeshop",
        html: `
        <div style="text-align:center; margin-bottom:5%;">
          <img src="https://www.linkpicture.com/q/logo_308.png" style:"width:100%;"/>
        </div>
        <div>
          <h2>Dear, ${email}</h2>
        </div>
        <div style="text-align:center;">
          <h2>New Inquiry Received</h2>
          <h2>The Current Detail as Follow</h2>
        </div>
        <div style="height:5vh;">
        </div>
        <div style="text-align:center;">
          <h2>Email : ${email}</h2>
        </div>
        <div style="height:5vh;">
        </div>
        <div style="text-align:center; font-size:28px;">
          <p>Thank you for subscribing, you'll get our latest updates and information.</p>
        </div>
        <div style="height:5vh;">
        </div>
        <div style="margin-top:5%; text-align:center; font-size:15px;">
          <p>@ 2025 KC Shoeshop, All Rights Reserved</p>
        </div>
        `,
      };

      const triggerMail = await transporter.sendMail(mailToUser);
      res.status(200).send(triggerMail.response);
    } catch (err) {
      return res.status(500).send(err.message || "Internal Server Error");
    }
  },
};
