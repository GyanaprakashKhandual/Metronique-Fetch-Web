const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

console.log('[USER_ROUTES] Initializing user routes');

router.post('/send-verification-link', (req, res, next) => {
    console.log('[USER_ROUTE] POST /send-verification-link - Send Verification Link | Email: ' + req.body.email);
    next();
}, userController.sendEmailVerificationLink);

router.post('/verify-email', (req, res, next) => {
    console.log('[USER_ROUTE] POST /verify-email - Verify Email Token');
    next();
}, userController.verifyEmailToken);

router.post('/register', (req, res, next) => {
    console.log('[USER_ROUTE] POST /register - Register User | Email: ' + req.body.email);
    next();
}, userController.register);

router.post('/login', (req, res, next) => {
    console.log('[USER_ROUTE] POST /login - Login User | Email: ' + req.body.email);
    next();
}, userController.login);

// OAuth - Google Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login`, 
    session: false 
}), userController.googleAuthCallback, (req, res) => {
    console.log('[USER_ROUTE] Redirecting to frontend /app after Google OAuth success');
    res.redirect(`${process.env.FRONTEND_URL}/app`);
});

// OAuth - GitHub Routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', passport.authenticate('github', { 
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login`, 
    session: false 
}), userController.githubAuthCallback, (req, res) => {
    console.log('[USER_ROUTE] Redirecting to frontend /app after GitHub OAuth success');
    res.redirect(`${process.env.FRONTEND_URL}/app`);
});

// Protected Routes
router.get('/me', protect, (req, res, next) => {
    console.log('[USER_ROUTE] GET /me - Get Current User | User: ' + req.user?._id);
    next();
}, userController.getCurrentUser);

router.put('/profile', protect, (req, res, next) => {
    console.log('[USER_ROUTE] PUT /profile - Update Profile | User: ' + req.user?._id);
    next();
}, userController.updateProfile);

router.post('/change-password', protect, (req, res, next) => {
    console.log('[USER_ROUTE] POST /change-password - Change Password | User: ' + req.user?._id);
    next();
}, userController.changePassword);

router.post('/forgot-password', (req, res, next) => {
    console.log('[USER_ROUTE] POST /forgot-password - Forgot Password | Email: ' + req.body.email);
    next();
}, userController.forgotPassword);

router.post('/reset-password', (req, res, next) => {
    console.log('[USER_ROUTE] POST /reset-password - Reset Password');
    next();
}, userController.resetPassword);

router.put('/preferences', protect, (req, res, next) => {
    console.log('[USER_ROUTE] PUT /preferences - Update Preferences | User: ' + req.user?._id);
    next();
}, userController.updatePreferences);

router.post('/avatar', protect, (req, res, next) => {
    console.log('[USER_ROUTE] POST /avatar - Update Avatar | User: ' + req.user?._id);
    next();
}, userController.updateAvatar);

router.get('/analytics', protect, (req, res, next) => {
    console.log('[USER_ROUTE] GET /analytics - Get User Analytics | User: ' + req.user?._id);
    next();
}, userController.getAnalytics);

router.post('/two-factor/setup', protect, (req, res, next) => {
    console.log('[USER_ROUTE] POST /two-factor/setup - Setup Two-Factor | User: ' + req.user?._id);
    next();
}, userController.setupTwoFactor);

router.post('/two-factor/verify', protect, (req, res, next) => {
    console.log('[USER_ROUTE] POST /two-factor/verify - Verify Two-Factor | User: ' + req.user?._id);
    next();
}, userController.verifyTwoFactor);

router.post('/two-factor/disable', protect, (req, res, next) => {
    console.log('[USER_ROUTE] POST /two-factor/disable - Disable Two-Factor | User: ' + req.user?._id);
    next();
}, userController.disableTwoFactor);

router.post('/integrations/:provider/connect', protect, (req, res, next) => {
    console.log('[USER_ROUTE] POST /integrations/:provider/connect - Connect Integration | Provider: ' + req.params.provider + ' | User: ' + req.user?._id);
    next();
}, userController.connectIntegration);

router.post('/integrations/:provider/disconnect', protect, (req, res, next) => {
    console.log('[USER_ROUTE] POST /integrations/:provider/disconnect - Disconnect Integration | Provider: ' + req.params.provider + ' | User: ' + req.user?._id);
    next();
}, userController.disconnectIntegration);

router.get('/integrations', protect, (req, res, next) => {
    console.log('[USER_ROUTE] GET /integrations - Get User Integrations | User: ' + req.user?._id);
    next();
}, userController.getUserIntegrations);

router.post('/referral/code', protect, (req, res, next) => {
    console.log('[USER_ROUTE] POST /referral/code - Generate Referral Code | User: ' + req.user?._id);
    next();
}, userController.generateReferralCode);

router.get('/referral/:code', (req, res, next) => {
    console.log('[USER_ROUTE] GET /referral/:code - Get Referral Info | Code: ' + req.params.code);
    next();
}, userController.getReferralInfo);

router.post('/subscription/update', protect, (req, res, next) => {
    console.log('[USER_ROUTE] POST /subscription/update - Update Subscription | Plan: ' + req.body.plan + ' | User: ' + req.user?._id);
    next();
}, userController.updateSubscription);

router.delete('/account/delete', protect, (req, res, next) => {
    console.log('[USER_ROUTE] DELETE /account/delete - Delete Account | User: ' + req.user?._id);
    next();
}, userController.deleteAccount);

// Admin Routes
router.get('/', protect, authorize('admin', 'super_admin'), (req, res, next) => {
    console.log('[USER_ROUTE] GET / - Get All Users | User: ' + req.user?._id);
    next();
}, userController.getAllUsers);

router.get('/:userId', protect, (req, res, next) => {
    console.log('[USER_ROUTE] GET /:userId - Get User By ID | UserId: ' + req.params.userId + ' | User: ' + req.user?._id);
    next();
}, userController.getUserById);

router.put('/:userId/role', protect, authorize('admin', 'super_admin'), (req, res, next) => {
    console.log('[USER_ROUTE] PUT /:userId/role - Update User Role | UserId: ' + req.params.userId + ' | Role: ' + req.body.role + ' | User: ' + req.user?._id);
    next();
}, userController.updateUserRole);

router.put('/:userId/status', protect, authorize('admin', 'super_admin'), (req, res, next) => {
    console.log('[USER_ROUTE] PUT /:userId/status - Update User Status | UserId: ' + req.params.userId + ' | Status: ' + req.body.status + ' | User: ' + req.user?._id);
    next();
}, userController.updateUserStatus);

router.post('/bulk-operation', protect, authorize('admin', 'super_admin'), (req, res, next) => {
    console.log('[USER_ROUTE] POST /bulk-operation - Bulk User Operation | Operation: ' + req.body.operation + ' | Count: ' + req.body.userIds?.length + ' | User: ' + req.user?._id);
    next();
}, userController.bulkUserOperation);

console.log('[USER_ROUTES] All user routes initialized successfully');

module.exports = router;