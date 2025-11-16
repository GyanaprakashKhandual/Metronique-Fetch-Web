module.exports = (name, link) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; line-height: 1.6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <tr>
                        <td style="padding: 48px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #000000; letter-spacing: -0.5px;">Fetch</h1>
                            <p style="margin: 8px 0 0 0; font-size: 13px; color: #6b7280; font-weight: 500;">by Metronique</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 48px 40px;">
                            <h2 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #000000; letter-spacing: -0.5px;">Verify Your Email Address</h2>
                            <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6;">Hello ${name},</p>
                            <p style="margin: 0 0 32px 0; font-size: 16px; color: #374151; line-height: 1.6;">Thank you for signing up with Fetch. To complete your registration and access your account, please verify your email address by clicking the button below.</p>
                            <table role="presentation" style="margin: 0 auto;">
                                <tr>
                                    <td style="border-radius: 6px; background-color: #2563eb;">
                                        <a href="${link}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Verify Email Address</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 32px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="margin: 8px 0 0 0; font-size: 13px; color: #2563eb; word-break: break-all;">${link}</p>
                            <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">This verification link will expire in 24 hours. If you did not create an account, please ignore this email.</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px 40px; text-align: center; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">Need help? Contact our support team</p>
                            <p style="margin: 0; font-size: 13px; color: #2563eb; font-weight: 500;">support@metronique.com</p>
                            <p style="margin: 24px 0 0 0; font-size: 12px; color: #9ca3af;">© 2024 Metronique. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};