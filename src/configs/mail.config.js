const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
});

transporter.verify((error) => {
    if (error) {
        console.error('SMTP Connection Error:', error.message);
        process.exit(1);
    }
    console.log('SMTP Server Connected Successfully');
});

const emailConfig = {
    from: {
        name: process.env.SMTP_FROM_NAME || 'Metronique Fetch',
        email: process.env.SMTP_FROM_EMAIL || 'noreply@metronique.com'
    },
    support: {
        email: process.env.SUPPORT_EMAIL || 'support@metronique.com'
    },
    defaults: {
        charset: 'UTF-8',
        encoding: 'base64'
    }
};

const getFromAddress = () => {
    return `"${emailConfig.from.name}" <${emailConfig.from.email}>`;
};

const getSupportAddress = () => {
    return `"${emailConfig.from.name} Support" <${emailConfig.support.email}>`;
};

module.exports = {
    transporter,
    emailConfig,
    getFromAddress,
    getSupportAddress
};