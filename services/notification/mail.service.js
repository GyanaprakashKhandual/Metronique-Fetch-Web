const { transporter, getFromAddress, getSupportAddress } = require('./mail.config');
const onboardLinkTemplate = require('./templates/onboard.link.template');
const passwordResetTemplate = require('./templates/password.reset.template');
const verificationTemplate = require('./templates/verification.template');
const utilTemplate = require('./templates/util.template');

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

const sendVerificationEmail = async (to, name, link) => {
    console.log('[Mail Service] Initiating verification email');
    console.log('[Mail Service] Recipient:', to);
    console.log('[Mail Service] Name:', name);

    const mailOptions = {
        to,
        subject: 'Verify Your Email Address',
        html: verificationTemplate(name, link),
    };

    return await sendEmail(mailOptions);
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
