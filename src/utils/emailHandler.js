const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASS } = process.env;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: `"Admin Notifications" <${EMAIL_USER}>`,
            to,
            subject,
            text,
        });
    } catch (error) {
        // console.error('Error sending email:', error);
        throw new Error('Unable to send email');
    }
};
const userNotifications = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: `"User Notifications" <${EMAIL_USER}>`,
            to,
            subject,
            text,
        });
    } catch (error) {
        // console.error('Error sending email:', error);
        throw new Error('Unable to send email');
    }



};

module.exports = { sendEmail, userNotifications: userNotifications, };