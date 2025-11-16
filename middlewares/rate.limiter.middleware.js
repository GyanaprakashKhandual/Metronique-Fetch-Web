const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    enable_offline_queue: false
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

const createRateLimiter = (options = {}) => {
    const defaultOptions = {
        windowMs: options.windowMs || 15 * 60 * 1000,
        max: options.max || 100,
        message: options.message || {
            success: false,
            message: 'Too many requests from this IP, please try again later.',
            retryAfter: options.windowMs || 15 * 60 * 1000
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            if (options.skipSuccessfulRequests && req.user?.role === 'super_admin') {
                return true;
            }
            return false;
        },
        keyGenerator: (req) => {
            return req.user?._id?.toString() || req.ip;
        },
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                message: options.message?.message || 'Too many requests, please try again later.',
                retryAfter: Math.ceil(options.windowMs / 1000)
            });
        }
    };

    if (process.env.REDIS_ENABLED === 'true') {
        defaultOptions.store = new RedisStore({
            client: redisClient,
            prefix: options.prefix || 'rl:',
            sendCommand: (...args) => redisClient.sendCommand(args)
        });
    }

    return rateLimit(defaultOptions);
};

const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes.',
        retryAfter: 15 * 60
    },
    prefix: 'rl:auth:',
    skipSuccessfulRequests: true
});

const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes.',
        retryAfter: 15 * 60
    },
    prefix: 'rl:login:'
});

const registerLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: 'Too many registration attempts, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:register:'
});

const passwordResetLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: 'Too many password reset attempts, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:password-reset:'
});

const emailVerificationLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many verification email requests, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:email-verify:'
});

const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'API rate limit exceeded, please try again later.',
        retryAfter: 15 * 60
    },
    prefix: 'rl:api:'
});

const strictApiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        message: 'API rate limit exceeded, please try again later.',
        retryAfter: 15 * 60
    },
    prefix: 'rl:api:strict:'
});

const githubSyncLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Too many repository sync requests, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:github-sync:'
});

const aiAnalysisLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'AI analysis rate limit exceeded, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:ai-analysis:'
});

const testExecutionLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        message: 'Test execution rate limit exceeded, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:test-execution:'
});

const loadTestLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Load test rate limit exceeded, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:load-test:'
});

const reportGenerationLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: {
        success: false,
        message: 'Report generation rate limit exceeded, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:report-gen:'
});

const fileUploadLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'File upload rate limit exceeded, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:file-upload:'
});

const fileOperationLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
        success: false,
        message: 'File operation rate limit exceeded, please try again later.',
        retryAfter: 15 * 60
    },
    prefix: 'rl:file-op:'
});

const databaseConnectionLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 15,
    message: {
        success: false,
        message: 'Database connection rate limit exceeded, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:db-connection:'
});

const invitationLimiter = createRateLimiter({
    windowMs: 24 * 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'Invitation rate limit exceeded, please try again after 24 hours.',
        retryAfter: 24 * 60 * 60
    },
    prefix: 'rl:invitation:'
});

const webhookLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Webhook rate limit exceeded.',
        retryAfter: 15 * 60
    },
    prefix: 'rl:webhook:'
});

const searchLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: {
        success: false,
        message: 'Search rate limit exceeded, please try again later.',
        retryAfter: 15 * 60
    },
    prefix: 'rl:search:'
});

const exportLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Export rate limit exceeded, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:export:'
});

const notificationLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: {
        success: false,
        message: 'Notification rate limit exceeded, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:notification:'
});

const teamOperationLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: {
        success: false,
        message: 'Team operation rate limit exceeded, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:team-op:'
});

const projectOperationLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 40,
    message: {
        success: false,
        message: 'Project operation rate limit exceeded, please try again after 1 hour.',
        retryAfter: 60 * 60
    },
    prefix: 'rl:project-op:'
});

const dynamicLimiter = (limitConfig) => {
    return (req, res, next) => {
        const userPlan = req.user?.subscription?.plan || 'free';

        const limits = {
            free: limitConfig.free || 10,
            starter: limitConfig.starter || 50,
            professional: limitConfig.professional || 200,
            enterprise: limitConfig.enterprise || 1000,
            custom: limitConfig.custom || 5000
        };

        const limiter = createRateLimiter({
            windowMs: limitConfig.windowMs || 60 * 60 * 1000,
            max: limits[userPlan],
            message: {
                success: false,
                message: `Rate limit exceeded for ${userPlan} plan. Upgrade for higher limits.`,
                retryAfter: (limitConfig.windowMs || 60 * 60 * 1000) / 1000
            },
            prefix: `rl:dynamic:${limitConfig.operation}:`
        });

        return limiter(req, res, next);
    };
};

const ipBasedLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 200,
    keyGenerator: (req) => req.ip,
    message: {
        success: false,
        message: 'Too many requests from this IP address.',
        retryAfter: 15 * 60
    },
    prefix: 'rl:ip:'
});

const globalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    keyGenerator: () => 'global',
    message: {
        success: false,
        message: 'System is experiencing high load, please try again later.',
        retryAfter: 15 * 60
    },
    prefix: 'rl:global:'
});

module.exports = {
    createRateLimiter,
    authLimiter,
    loginLimiter,
    registerLimiter,
    passwordResetLimiter,
    emailVerificationLimiter,
    apiLimiter,
    strictApiLimiter,
    githubSyncLimiter,
    aiAnalysisLimiter,
    testExecutionLimiter,
    loadTestLimiter,
    reportGenerationLimiter,
    fileUploadLimiter,
    fileOperationLimiter,
    databaseConnectionLimiter,
    invitationLimiter,
    webhookLimiter,
    searchLimiter,
    exportLimiter,
    notificationLimiter,
    teamOperationLimiter,
    projectOperationLimiter,
    dynamicLimiter,
    ipBasedLimiter,
    globalLimiter
};