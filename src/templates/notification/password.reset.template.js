module.exports = (name, link) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
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
                            <h2 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #000000; letter-spacing: -0.5px;">Reset Your Password</h2>
                            <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6;">Hello ${name},</p>
                            <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6;">We received a request to reset your password. If you made this request, click the button below to create a new password.</p>
                            <p style="margin: 0 0 32px 0; font-size: 16px; color: #374151; line-height: 1.6;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                            <table role="presentation" style="margin: 0 auto;">
                                <tr>
                                    <td style="border-radius: 6px; background-color: #2563eb;">
                                        <a href="${link}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset Password</a>
                                    </td>
                                </tr>
                            </table>
                            <div style="margin-top: 40px; padding: 24px; background-color: #fef2f2; border-radius: 6px; border-left: 4px solid #ef4444;">
                                <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">Security Notice</p>
                                <p style="margin: 8px 0 0 0; font-size: 14px; color: #7f1d1d; line-height: 1.6;">This password reset link will expire in 1 hour. For your security, never share this link with anyone.</p>
                            </div>
                            <p style="margin: 32px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="margin: 8px 0 0 0; font-size: 13px; color: #2563eb; word-break: break-all;">${link}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px 40px; text-align: center; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">Having trouble? Contact our support team</p>
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