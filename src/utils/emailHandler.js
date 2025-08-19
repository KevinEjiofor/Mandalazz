const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASS } = process.env;

const createTransporter = () => {
    try {
        return nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            rateDelta: 20000,
            rateLimit: 5,
        });
    } catch (error) {
        throw new Error('Email service configuration error');
    }
};

const transporter = createTransporter();

const sendEmail = async (to, subject, text, html = null) => {
    try {
        if (!to || !subject || !text) {
            throw new Error('Missing required email parameters: to, subject, or text');
        }

        if (!EMAIL_USER) {
            throw new Error('EMAIL_USER not configured in environment variables');
        }

        const mailOptions = {
            from: `"Admin Notifications" <${EMAIL_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            text: text,
            ...(html && { html: html }),
            headers: {
                'X-Priority': '1',
                'X-MSMail-Priority': 'High',
                'X-Mailer': 'Admin System v1.0'
            }
        };

        const info = await transporter.sendMail(mailOptions);

        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };

    } catch (error) {
        if (error.code === 'EAUTH') {
            throw new Error('Email authentication failed. Check credentials.');
        } else if (error.code === 'ECONNECTION') {
            throw new Error('Failed to connect to email server. Check network connection.');
        } else if (error.code === 'EMESSAGE') {
            throw new Error('Invalid email message format.');
        } else {
            throw new Error(`Email delivery failed: ${error.message}`);
        }
    }
};

const userNotifications = async (to, subject, text, options = {}) => {
    try {
        if (!to || !subject || !text) {
            throw new Error('Missing required notification parameters');
        }

        const defaultOptions = {
            priority: 'normal',
            category: 'general',
            includeUnsubscribe: true
        };

        const config = { ...defaultOptions, ...options };

        let enhancedText = text;

        if (config.includeUnsubscribe) {
            enhancedText += `

═══════════════════════════════════════════════════════

Company Information:
Everything Mandalazz
123 Business Street, Suite 100
Business City, BC 12345
+1-800-SUPPORT
https://yourcompany.com

This email was sent to: ${to}
© 2025 Your Company Name. All rights reserved.`;
        }

        const priorityHeaders = {};
        if (config.priority === 'high') {
            priorityHeaders['X-Priority'] = '1';
            priorityHeaders['X-MSMail-Priority'] = 'High';
            priorityHeaders['Importance'] = 'high';
        } else if (config.priority === 'low') {
            priorityHeaders['X-Priority'] = '5';
            priorityHeaders['X-MSMail-Priority'] = 'Low';
            priorityHeaders['Importance'] = 'low';
        }

        const mailOptions = {
            from: `"User Notifications" <${EMAIL_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            text: enhancedText,
            headers: {
                'X-Category': config.category,
                'X-Mailer': 'User Notification System v1.0',
                'List-Unsubscribe': `<https://yourcompany.com/unsubscribe?email=${encodeURIComponent(to)}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                ...priorityHeaders
            }
        };

        const info = await transporter.sendMail(mailOptions);

        return {
            success: true,
            messageId: info.messageId,
            response: info.response,
            category: config.category,
            priority: config.priority,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        throw new Error('Unable to send notification. Please try again or contact support.');
    }
};

const sendBulkEmails = async (recipients, subject, text, options = {}) => {
    try {
        const results = {
            successful: [],
            failed: []
        };

        const batchSize = options.batchSize || 10;
        const delay = options.delay || 1000;

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);

            const batchPromises = batch.map(async (recipient) => {
                try {
                    await userNotifications(recipient, subject, text, options);
                    results.successful.push(recipient);
                } catch (error) {
                    results.failed.push({ recipient, error: error.message });
                }
            });

            await Promise.all(batchPromises);

            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return results;
    } catch (error) {
        throw new Error('Bulk email operation failed');
    }
};

const testEmailConnection = async () => {
    try {
        await transporter.verify();
        return { success: true, message: 'Email server is ready' };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const closeConnection = () => {
    if (transporter && transporter.close) {
        transporter.close();
    }
};

module.exports = {
    sendEmail,
    userNotifications,
    sendBulkEmails,
    testEmailConnection,
    closeConnection
};