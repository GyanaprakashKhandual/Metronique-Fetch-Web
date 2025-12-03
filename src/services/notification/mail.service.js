const { transporter, getFromAddress, getSupportAddress } = require('../../configs/mail.config');
const onboardLinkTemplate = require('../../templates/notification/onboard.link.template');
const passwordResetTemplate = require('../../templates/notification/password.reset.template');
const verificationTemplate = require('../../templates/notification/verification.template');
const utilTemplate = require('../../templates/notification/util.template');

const sendEmail = async (mailOptions) => {
    try {
        console.log('[Mail Service] Preparing to send email to:', mailOptions.to);

        const info = await transporter.sendMail({
            from: getFromAddress(),
            ...mailOptions,
        });

        console.log('[Mail Service] Email sent successfully. Message ID:', info.messageId);
        console.log('[Mail Service] Recipient:', mailOptions.to);

        return {
            success: true,
            messageId: info.messageId,
        };
    } catch (error) {
        console.error('[Mail Service] Failed to send email:', error.message);
        console.error('[Mail Service] Error details:', {
            recipient: mailOptions.to,
            subject: mailOptions.subject,
            error: error.stack,
        });

        return {
            success: false,
            error: error.message,
        };
    }
};

const sendVerificationEmail = async (email, verificationLink, firstName) => {
    const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL,
        to: email,
        subject: 'Verify Your Email Address',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Verify Your Email Address</h2>
                <p>Hello ${firstName},</p>
                <p>Thank you for signing up with Fetch. To complete your registration and access your account, please verify your email address by clicking the button below.</p>
                
                <a href="${verificationLink}" style="display: inline-block; padding: 12px 30px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                    Verify Email Address
                </a>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p><a href="${verificationLink}">${verificationLink}</a></p>
                
                <p>This verification link will expire in 24 hours. If you did not create an account, please ignore this email.</p>
                
                <p>Need help? Contact our support team at support@metronique.com</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

const sendOnboardingEmail = async (to, name, link) => {
    console.log('[Mail Service] Initiating onboarding email');
    console.log('[Mail Service] Recipient:', to);
    console.log('[Mail Service] Name:', name);

    const mailOptions = {
        to,
        subject: 'Welcome to Fetch - Get Started',
        html: onboardLinkTemplate(name, link),
    };

    return await sendEmail(mailOptions);
};

const sendPasswordResetEmail = async (to, name, link) => {
    console.log('[Mail Service] Initiating password reset email');
    console.log('[Mail Service] Recipient:', to);
    console.log('[Mail Service] Name:', name);

    const mailOptions = {
        to,
        subject: 'Reset Your Password',
        html: passwordResetTemplate(name, link),
    };

    return await sendEmail(mailOptions);
};

const sendUtilityEmail = async (to, options) => {
    console.log('[Mail Service] Initiating utility email');
    console.log('[Mail Service] Recipient:', to);
    console.log('[Mail Service] Options:', options);

    const mailOptions = {
        to,
        subject: options.subject || 'Message from Fetch',
        html: utilTemplate(options),
    };

    return await sendEmail(mailOptions);
};

const sendSupportEmail = async (to, options) => {
    console.log('[Mail Service] Initiating support email');
    console.log('[Mail Service] Recipient:', to);

    const mailOptions = {
        from: getSupportAddress(),
        to,
        subject: options.subject,
        html: utilTemplate(options),
    };

    return await sendEmail(mailOptions);
};

module.exports = {
    sendVerificationEmail,
    sendOnboardingEmail,
    sendPasswordResetEmail,
    sendUtilityEmail,
    sendSupportEmail,
};
