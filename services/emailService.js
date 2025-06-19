// services/emailService.js
import postmark from "postmark";

const client = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);

/**
 * Send verification email
 */
export const sendVerificationEmail = async (toEmail, token) => {
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    const email = {
        From: process.env.POSTMARK_SENDER_EMAIL,
        To: toEmail,
        Subject: "Verify Your Email",
        HtmlBody: `<p>Please verify your email by clicking the link below:</p>
                   <p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        // or 'broadcast' if set up differently
    };

    await client.sendEmail(email);
};
