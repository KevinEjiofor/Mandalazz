const cron = require('node-cron');
const User = require('../user/data/models/userModel');
const { sendEmail } = require('./emailHandler');

// Configure the cron job for email verification reminders
const scheduleEmailVerificationReminders = () => {
    // Run daily at midnight - the correct syntax is '0 0 * * *'
    // (five asterisks for minute, hour, day of month, month, day of week)
    cron.schedule('0 0 * * *', async () => {
        console.log('Running scheduled email verification reminders...');

        try {
            // Find users who signed up more than 24 hours ago but less than 7 days ago and haven't verified email
            const unverifiedUsers = await User.find({
                emailVerified: false,
                createdAt: {
                    $lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // More than 24 hours ago
                    $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Less than 7 days ago
                }
            });

            console.log(`Found ${unverifiedUsers.length} users with unverified emails`);

            for (const user of unverifiedUsers) {
                // Send reminder email
                const subject = 'Reminder: Verify Your Email';
                const text = `Hi ${user.firstName},

Please remember to verify your email address to fully activate your account. You can request a new verification code by visiting our website.

Thank you!
The Team`;

                await sendEmail(user.email, subject, text);
                console.log(`Reminder email sent to ${user.email}`);
            }
        } catch (error) {
            console.error('Error sending reminder emails:', error);
        }
    });

    console.log('Email verification reminder scheduler initialized');
};

module.exports = { scheduleEmailVerificationReminders };