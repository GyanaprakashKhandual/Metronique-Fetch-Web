const passport = require('passport');
const LocalStrategy = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20');
const GitHubStrategy = require('passport-github2');
const JwtStrategy = require('passport-jwt');
const User = require('../models/user.model');
const { generateTokenPair } = require('../configs/jwt.config');

const JwtStrategyFromAuthorizationHeaderBearer = JwtStrategy.Strategy;
const ExtractJwt = JwtStrategy.ExtractJwt;

console.log(`[PASSPORT_INIT] START | Initializing Passport strategies`);

passport.use(
    'local',
    new LocalStrategy.Strategy(
        {
            usernameField: 'email',
            passwordField: 'password'
        },
        async (email, password, done) => {
            const startTime = Date.now();

            try {
                console.log(`[PASSPORT_LOCAL] START | Email: ${email}`);

                const user = await User.findOne({ email: email.toLowerCase() });

                if (!user) {
                    console.warn(`[PASSPORT_LOCAL] USER_NOT_FOUND | Email: ${email}`);
                    return done(null, false, {
                        message: 'User not found with this email',
                        code: 'USER_NOT_FOUND'
                    });
                }

                console.log(`[PASSPORT_LOCAL] USER_FOUND | User ID: ${user._id} | Email: ${email}`);

                if (!user.isEmailVerified) {
                    console.warn(`[PASSPORT_LOCAL] EMAIL_NOT_VERIFIED | User ID: ${user._id} | Email: ${email}`);
                    return done(null, false, {
                        message: 'Please verify your email first',
                        code: 'EMAIL_NOT_VERIFIED'
                    });
                }

                if (!user.isActive) {
                    console.warn(`[PASSPORT_LOCAL] ACCOUNT_INACTIVE | User ID: ${user._id} | Email: ${email}`);
                    return done(null, false, {
                        message: 'Your account is inactive',
                        code: 'ACCOUNT_INACTIVE'
                    });
                }

                if (user.isSuspended) {
                    console.warn(`[PASSPORT_LOCAL] ACCOUNT_SUSPENDED | User ID: ${user._id} | Email: ${email} | Reason: ${user.suspensionReason}`);
                    return done(null, false, {
                        message: 'Your account has been suspended',
                        code: 'ACCOUNT_SUSPENDED',
                        reason: user.suspensionReason
                    });
                }

                if (user.isDeleted) {
                    console.warn(`[PASSPORT_LOCAL] ACCOUNT_DELETED | User ID: ${user._id} | Email: ${email}`);
                    return done(null, false, {
                        message: 'Your account has been deleted',
                        code: 'ACCOUNT_DELETED'
                    });
                }

                if (user.isLocked) {
                    console.warn(`[PASSPORT_LOCAL] ACCOUNT_LOCKED | User ID: ${user._id} | Email: ${email} | Locked Until: ${user.lockUntil}`);
                    return done(null, false, {
                        message: 'Your account is temporarily locked due to multiple failed login attempts',
                        code: 'ACCOUNT_LOCKED'
                    });
                }

                const isPasswordMatch = await user.comparePassword(password);

                if (!isPasswordMatch) {
                    console.warn(`[PASSPORT_LOCAL] INVALID_PASSWORD | User ID: ${user._id} | Email: ${email} | Attempts: ${user.loginAttempts + 1}`);
                    await user.incLoginAttempts();
                    return done(null, false, {
                        message: 'Password is incorrect',
                        code: 'INVALID_PASSWORD'
                    });
                }

                console.log(`[PASSPORT_LOCAL] PASSWORD_VERIFIED | User ID: ${user._id} | Email: ${email}`);

                await user.resetLoginAttempts();

                user.lastLogin = new Date();
                user.lastLoginIP = '';
                await user.save();

                console.log(`[PASSPORT_LOCAL] SUCCESS | User ID: ${user._id} | Email: ${email} | Duration: ${Date.now() - startTime}ms`);

                return done(null, user);
            } catch (error) {
                console.error(`[PASSPORT_LOCAL] ERROR | Email: ${email} | Error: ${error.message} | Stack: ${error.stack} | Duration: ${Date.now() - startTime}ms`);
                return done(error);
            }
        }
    )
);

passport.use(
    'google',
    new GoogleStrategy.Strategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
            passReqToCallback: true
        },
        async (req, accessToken, refreshToken, profile, done) => {
            const startTime = Date.now();

            try {
                const email = profile.emails?.[0]?.value;
                const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0];
                const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
                const avatar = profile.photos?.[0]?.value;
                const googleId = profile.id;

                console.log(`[PASSPORT_GOOGLE] START | Email: ${email} | Google ID: ${googleId}`);

                if (!email) {
                    console.warn(`[PASSPORT_GOOGLE] NO_EMAIL | Google ID: ${googleId}`);
                    return done(null, false, {
                        message: 'Email not provided by Google',
                        code: 'NO_EMAIL_PROVIDED'
                    });
                }

                let user = await User.findOne({ email: email.toLowerCase() });

                if (user) {
                    console.log(`[PASSPORT_GOOGLE] USER_EXISTS | User ID: ${user._id} | Email: ${email}`);

                    if (!user.isActive) {
                        console.warn(`[PASSPORT_GOOGLE] USER_INACTIVE | User ID: ${user._id} | Email: ${email}`);
                        return done(null, false, {
                            message: 'Your account is inactive',
                            code: 'USER_INACTIVE'
                        });
                    }

                    if (user.isSuspended) {
                        console.warn(`[PASSPORT_GOOGLE] USER_SUSPENDED | User ID: ${user._id} | Email: ${email}`);
                        return done(null, false, {
                            message: 'Your account has been suspended',
                            code: 'USER_SUSPENDED'
                        });
                    }

                    if (user.isDeleted) {
                        console.warn(`[PASSPORT_GOOGLE] USER_DELETED | User ID: ${user._id} | Email: ${email}`);
                        return done(null, false, {
                            message: 'Your account has been deleted',
                            code: 'USER_DELETED'
                        });
                    }

                    user.lastLogin = new Date();
                    user.isEmailVerified = true;

                    if (avatar && !user.avatar?.url) {
                        user.avatar = { url: avatar };
                    }

                    await user.save();

                    console.log(`[PASSPORT_GOOGLE] USER_UPDATED | User ID: ${user._id} | Last Login: ${user.lastLogin}`);
                    console.log(`[PASSPORT_GOOGLE] SUCCESS | User ID: ${user._id} | Email: ${email} | Duration: ${Date.now() - startTime}ms`);

                    return done(null, user);
                }

                console.log(`[PASSPORT_GOOGLE] NEW_USER | Email: ${email} | Google ID: ${googleId}`);

                const newUser = new User({
                    firstName: firstName,
                    lastName: lastName,
                    email: email.toLowerCase(),
                    avatar: avatar ? { url: avatar } : null,
                    isEmailVerified: true,
                    isActive: true,
                    lastLogin: new Date(),
                    metadata: {
                        signupSource: 'web'
                    }
                });

                await newUser.save();

                console.log(`[PASSPORT_GOOGLE] USER_CREATED | User ID: ${newUser._id} | Email: ${email}`);
                console.log(`[PASSPORT_GOOGLE] SUCCESS | User ID: ${newUser._id} | Email: ${email} | Duration: ${Date.now() - startTime}ms`);

                return done(null, newUser);
            } catch (error) {
                console.error(`[PASSPORT_GOOGLE] ERROR | Email: ${email} | Error: ${error.message} | Stack: ${error.stack} | Duration: ${Date.now() - startTime}ms`);
                return done(error);
            }
        }
    )
);

passport.use(
    'github',
    new GitHubStrategy.Strategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
            passReqToCallback: true
        },
        async (req, accessToken, refreshToken, profile, done) => {
            const startTime = Date.now();

            try {
                const email = profile.emails?.[0]?.value;
                const firstName = profile.displayName?.split(' ')[0] || profile.username;
                const lastName = profile.displayName?.split(' ').slice(1).join(' ') || '';
                const avatar = profile.photos?.[0]?.value;
                const githubId = profile.id;
                const bio = profile._json?.bio;

                console.log(`[PASSPORT_GITHUB] START | Email: ${email} | GitHub ID: ${githubId}`);

                if (!email) {
                    console.warn(`[PASSPORT_GITHUB] NO_EMAIL | GitHub ID: ${githubId} | Username: ${profile.username}`);
                    return done(null, false, {
                        message: 'Email not provided by GitHub. Please make your email public on GitHub.',
                        code: 'NO_EMAIL_PROVIDED'
                    });
                }

                let user = await User.findOne({ email: email.toLowerCase() });

                if (user) {
                    console.log(`[PASSPORT_GITHUB] USER_EXISTS | User ID: ${user._id} | Email: ${email}`);

                    if (!user.isActive) {
                        console.warn(`[PASSPORT_GITHUB] USER_INACTIVE | User ID: ${user._id} | Email: ${email}`);
                        return done(null, false, {
                            message: 'Your account is inactive',
                            code: 'USER_INACTIVE'
                        });
                    }

                    if (user.isSuspended) {
                        console.warn(`[PASSPORT_GITHUB] USER_SUSPENDED | User ID: ${user._id} | Email: ${email}`);
                        return done(null, false, {
                            message: 'Your account has been suspended',
                            code: 'USER_SUSPENDED'
                        });
                    }

                    if (user.isDeleted) {
                        console.warn(`[PASSPORT_GITHUB] USER_DELETED | User ID: ${user._id} | Email: ${email}`);
                        return done(null, false, {
                            message: 'Your account has been deleted',
                            code: 'USER_DELETED'
                        });
                    }

                    user.lastLogin = new Date();
                    user.isEmailVerified = true;

                    if (avatar && !user.avatar?.url) {
                        user.avatar = { url: avatar };
                    }

                    if (bio && !user.bio) {
                        user.bio = bio;
                    }

                    await user.save();

                    console.log(`[PASSPORT_GITHUB] USER_UPDATED | User ID: ${user._id} | Last Login: ${user.lastLogin}`);
                    console.log(`[PASSPORT_GITHUB] SUCCESS | User ID: ${user._id} | Email: ${email} | Duration: ${Date.now() - startTime}ms`);

                    return done(null, user);
                }

                console.log(`[PASSPORT_GITHUB] NEW_USER | Email: ${email} | GitHub ID: ${githubId}`);

                const newUser = new User({
                    firstName: firstName,
                    lastName: lastName,
                    email: email.toLowerCase(),
                    avatar: avatar ? { url: avatar } : null,
                    bio: bio,
                    isEmailVerified: true,
                    isActive: true,
                    lastLogin: new Date(),
                    metadata: {
                        signupSource: 'web'
                    }
                });

                await newUser.save();

                console.log(`[PASSPORT_GITHUB] USER_CREATED | User ID: ${newUser._id} | Email: ${email}`);
                console.log(`[PASSPORT_GITHUB] SUCCESS | User ID: ${newUser._id} | Email: ${email} | Duration: ${Date.now() - startTime}ms`);

                return done(null, newUser);
            } catch (error) {
                console.error(`[PASSPORT_GITHUB] ERROR | Email: ${email} | Error: ${error.message} | Stack: ${error.stack} | Duration: ${Date.now() - startTime}ms`);
                return done(error);
            }
        }
    )
);

passport.use(
    'jwt',
    new JwtStrategyFromAuthorizationHeaderBearer(
        {
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                ExtractJwt.fromUrlQueryParameter('token'),
                (req) => {
                    if (req.cookies && req.cookies.token) {
                        return req.cookies.token;
                    }
                    return null;
                }
            ]),
            secretOrKey: process.env.JWT_SECRET
        },
        async (jwtPayload, done) => {
            const startTime = Date.now();

            try {
                console.log(`[PASSPORT_JWT] START | User ID: ${jwtPayload.id}`);

                const user = await User.findById(jwtPayload.id).select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken');

                if (!user) {
                    console.warn(`[PASSPORT_JWT] USER_NOT_FOUND | User ID: ${jwtPayload.id}`);
                    return done(null, false);
                }

                console.log(`[PASSPORT_JWT] USER_FOUND | User ID: ${user._id} | Email: ${user.email}`);

                if (!user.isActive) {
                    console.warn(`[PASSPORT_JWT] USER_INACTIVE | User ID: ${user._id}`);
                    return done(null, false);
                }

                if (user.isSuspended) {
                    console.warn(`[PASSPORT_JWT] USER_SUSPENDED | User ID: ${user._id} | Reason: ${user.suspensionReason}`);
                    return done(null, false);
                }

                if (user.isDeleted) {
                    console.warn(`[PASSPORT_JWT] USER_DELETED | User ID: ${user._id}`);
                    return done(null, false);
                }

                console.log(`[PASSPORT_JWT] SUCCESS | User ID: ${user._id} | Email: ${user.email} | Duration: ${Date.now() - startTime}ms`);

                return done(null, user);
            } catch (error) {
                console.error(`[PASSPORT_JWT] ERROR | User ID: ${jwtPayload?.id} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);
                return done(error);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    try {
        console.log(`[PASSPORT_SERIALIZE] User ID: ${user._id}`);
        done(null, user._id);
    } catch (error) {
        console.error(`[PASSPORT_SERIALIZE] ERROR | Error: ${error.message}`);
        done(error);
    }
});

passport.deserializeUser(async (id, done) => {
    try {
        console.log(`[PASSPORT_DESERIALIZE] START | User ID: ${id}`);

        const user = await User.findById(id).select('-password -twoFactorSecret -backupCodes -emailVerificationToken -passwordResetToken');

        if (!user) {
            console.warn(`[PASSPORT_DESERIALIZE] USER_NOT_FOUND | User ID: ${id}`);
            return done(null, false);
        }

        console.log(`[PASSPORT_DESERIALIZE] SUCCESS | User ID: ${user._id} | Email: ${user.email}`);

        done(null, user);
    } catch (error) {
        console.error(`[PASSPORT_DESERIALIZE] ERROR | User ID: ${id} | Error: ${error.message}`);
        done(error);
    }
});

console.log(`[PASSPORT_INIT] COMPLETE | All strategies initialized successfully`);

module.exports = passport;