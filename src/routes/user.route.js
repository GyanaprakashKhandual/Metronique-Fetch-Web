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

router.post('/logout', protect, (req, res, next) => {
    console.log('[USER_ROUTE] POST /logout - Logout User | User: ' + req.user?._id);
    next();
}, userController.logout);

router.post('/refresh-token', (req, res, next) => {
    console.log('[USER_ROUTE] POST /refresh-token - Refresh Access Token');
    next();
}, userController.refreshAccessToken);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login`,
    session: false
}), userController.googleAuthCallback, (req, res) => {
    console.log('[USER_ROUTE] Redirecting to frontend /app after Google OAuth success');
    res.redirect(`${process.env.FRONTEND_URL}/app`);
});

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', passport.authenticate('github', {
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login`,
    session: false
}), userController.githubAuthCallback, (req, res) => {
    console.log('[USER_ROUTE] Redirecting to frontend /app after GitHub OAuth success');
    res.redirect(`${process.env.FRONTEND_URL}/app`);
});

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

router.delete('/account/delete', protect, (req, res, next) => {
    console.log('[USER_ROUTE] DELETE /account/delete - Delete Account | User: ' + req.user?._id);
    next();
}, userController.deleteAccount);

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