const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '../../.env');
console.log('[ENV_CONFIG] Looking for .env at:', envPath);
console.log('[ENV_CONFIG] .env exists:', fs.existsSync(envPath));

const result = dotenv.config({ path: envPath });

if (result.error && result.error.code !== 'ENOENT') {
    console.error('Environment Configuration Error:', result.error.message);
    console.error('Looking for .env file at:', envPath);
    process.exit(1);
}

console.log('Environment Variables Loaded Successfully');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('[ENV_CONFIG] MONGODB_URI_DEV loaded:', !!process.env.MONGODB_URI_DEV);

const environment = {
    node: {
        env: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT, 10) || 5000,
        host: process.env.HOST || 'localhost',
        apiVersion: process.env.API_VERSION || 'v1',
        appName: process.env.APP_NAME || 'ImageFetch'
    },

    database: {
        dev: process.env.MONGODB_URI_DEV,
        staging: process.env.MONGODB_URI_STAGING,
        prod: process.env.MONGODB_URI_PROD,
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 10,
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE, 10) || 5,
        debugMode: process.env.DEBUG_MONGO === 'true'
    },

    jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
        issuer: process.env.JWT_ISSUER || 'metronique-fetch',
        audience: process.env.JWT_AUDIENCE || 'metronique-users'
    },

    oauth: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackUrl: process.env.GOOGLE_CALLBACK_URL
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackUrl: process.env.GITHUB_CALLBACK_URL,
            webhookSecret: process.env.GITHUB_WEBHOOK_SECRET
        }
    },

    ai: {
        anthropic: {
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
            maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS, 10) || 4096,
            temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE) || 0.7
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 4096,
            temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
        }
    },

    frontend: {
        url: process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL_PROD
            : process.env.FRONTEND_URL || 'http://localhost:3000'
    },

    backend: {
        url: process.env.NODE_ENV === 'production'
            ? process.env.BACKEND_URL_PROD
            : process.env.BACKEND_URL || 'http://localhost:5000'
    },

    email: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        from: {
            email: process.env.SMTP_FROM_EMAIL,
            name: process.env.SMTP_FROM_NAME || 'Metronique Fetch'
        },
        support: process.env.SUPPORT_EMAIL || 'support@metronique.com'
    },

    session: {
        secret: process.env.SESSION_SECRET,
        timeout: process.env.SESSION_TIMEOUT || '24h',
        cookie: {
            secure: process.env.COOKIE_SECURE === 'true',
            httpOnly: process.env.COOKIE_HTTP_ONLY !== 'false',
            sameSite: process.env.COOKIE_SAME_SITE || 'lax',
            maxAge: parseInt(process.env.COOKIE_MAX_AGE, 10) || 86400000
        }
    },

    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        s3: {
            bucket: process.env.AWS_S3_BUCKET,
            url: process.env.AWS_S3_URL,
            publicBucket: process.env.AWS_S3_PUBLIC_BUCKET
        }
    },

    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB, 10) || 0,
        ttl: parseInt(process.env.REDIS_TTL, 10) || 3600
    },

    fileUpload: {
        maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 104857600,
        maxSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 100,
        allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'doc', 'docx', 'txt', 'java', 'js', 'ts', 'json', 'xml'],
        uploadDir: process.env.UPLOAD_DIR || './uploads',
        tempDir: process.env.TEMP_DIR || './uploads/temp'
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        dir: process.env.LOG_DIR || './logs',
        maxSize: process.env.LOG_MAX_SIZE || '20m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 14,
        compress: process.env.LOG_COMPRESS === 'true'
    },

    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
            skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true'
        },
        corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        corsCredentials: process.env.CORS_CREDENTIALS === 'true',
        helmetEnabled: process.env.HELMET_ENABLED !== 'false',
        csrfEnabled: process.env.CSRF_ENABLED === 'true'
    },

    debug: {
        enabled: process.env.DEBUG === 'true',
        mongo: process.env.DEBUG_MONGO === 'true',
        routes: process.env.DEBUG_ROUTES === 'true',
        sql: process.env.DEBUG_SQL === 'true'
    },

    websocket: {
        enabled: process.env.WS_ENABLED !== 'false',
        port: parseInt(process.env.WS_PORT, 10) || 3001,
        path: process.env.WS_PATH || '/socket.io',
        pingTimeout: parseInt(process.env.WS_PING_TIMEOUT, 10) || 60000,
        pingInterval: parseInt(process.env.WS_PING_INTERVAL, 10) || 25000
    },

    stripe: {
        publicKey: process.env.STRIPE_PUBLIC_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        currency: process.env.STRIPE_CURRENCY || 'usd'
    },

    slack: {
        botToken: process.env.SLACK_BOT_TOKEN,
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#general'
    },

    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.SENDGRID_FROM_EMAIL
    },

    api: {
        docsEnabled: process.env.API_DOCS_ENABLED === 'true',
        swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
        prefix: process.env.API_PREFIX || '/api/v1'
    },

    monitoring: {
        sentryDsn: process.env.SENTRY_DSN,
        sentryEnvironment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
        mixpanelToken: process.env.MIXPANEL_TOKEN,
        enabled: process.env.MONITORING_ENABLED === 'true'
    },

    testing: {
        testTimeout: parseInt(process.env.TEST_TIMEOUT, 10) || 30000,
        maxRetries: parseInt(process.env.TEST_MAX_RETRIES, 10) || 3,
        parallelTests: parseInt(process.env.TEST_PARALLEL, 10) || 1
    },

    cache: {
        enabled: process.env.CACHE_ENABLED !== 'false',
        ttl: parseInt(process.env.CACHE_TTL, 10) || 3600,
        maxSize: parseInt(process.env.CACHE_MAX_SIZE, 10) || 1000
    }
};

const validateEnvironment = () => {
    console.log('Validating Environment Configuration...');

    const required = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'SESSION_SECRET'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('Missing Required Environment Variables:', missing.join(', '));
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (environment.jwt.secret.length < 32) {
        console.error('JWT_SECRET must be at least 32 characters long');
        throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    if (environment.jwt.refreshSecret.length < 32) {
        console.error('JWT_REFRESH_SECRET must be at least 32 characters long');
        throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
    }

    if (environment.node.env === 'production') {
        const prodRequired = [
            'MONGODB_URI_PROD',
            'FRONTEND_URL_PROD',
            'BACKEND_URL_PROD'
        ];

        const prodMissing = prodRequired.filter(key => !process.env[key]);

        if (prodMissing.length > 0) {
            console.error('Missing Production Environment Variables:', prodMissing.join(', '));
            throw new Error(`Missing production environment variables: ${prodMissing.join(', ')}`);
        }

        if (!environment.ai.anthropic.apiKey && !environment.ai.openai.apiKey) {
            console.warn('Warning: No AI provider API keys configured');
        }

        if (!environment.email.host || !environment.email.user || !environment.email.password) {
            console.warn('Warning: Email configuration incomplete');
        }
    }

    console.log('Environment Configuration Validated Successfully');
};

const getMongoURI = () => {
    const env = environment.node.env;

    if (env === 'production') {
        if (!environment.database.prod) {
            console.error('Production MongoDB URI not configured');
            throw new Error('MONGODB_URI_PROD is required in production');
        }
        console.log('Using Production MongoDB Connection');
        return environment.database.prod;
    } else if (env === 'staging') {
        if (!environment.database.staging) {
            console.error('Staging MongoDB URI not configured');
            throw new Error('MONGODB_URI_STAGING is required in staging');
        }
        console.log('Using Staging MongoDB Connection');
        return environment.database.staging;
    } else {
        if (!environment.database.dev) {
            console.error('Development MongoDB URI not configured');
            throw new Error('MONGODB_URI_DEV is required in development');
        }
        console.log('Using Development MongoDB Connection');
        return environment.database.dev;
    }
};

const isProduction = () => environment.node.env === 'production';
const isDevelopment = () => environment.node.env === 'development';
const isStaging = () => environment.node.env === 'staging';
const isTest = () => environment.node.env === 'test';

const getEnvironmentInfo = () => {
    return {
        environment: environment.node.env,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
    };
};

const logEnvironmentInfo = () => {
    const info = getEnvironmentInfo();
    console.log('Environment Information:');
    console.log(`- Environment: ${info.environment}`);
    console.log(`- Node Version: ${info.nodeVersion}`);
    console.log(`- Platform: ${info.platform}`);
    console.log(`- Architecture: ${info.arch}`);
    console.log(`- Process ID: ${info.pid}`);
    console.log(`- Port: ${environment.node.port}`);
    console.log(`- Host: ${environment.node.host}`);
    console.log(`- API Version: ${environment.node.apiVersion}`);
};

const getConfigSummary = () => {
    return {
        node: {
            env: environment.node.env,
            port: environment.node.port,
            host: environment.node.host
        },
        database: {
            configured: !!getMongoURI(),
            poolSize: environment.database.maxPoolSize
        },
        ai: {
            anthropic: !!environment.ai.anthropic.apiKey,
            openai: !!environment.ai.openai.apiKey
        },
        email: {
            configured: !!(environment.email.host && environment.email.user)
        },
        oauth: {
            google: !!environment.oauth.google.clientId,
            github: !!environment.oauth.github.clientId
        },
        features: {
            websocket: environment.websocket.enabled,
            cache: environment.cache.enabled,
            monitoring: environment.monitoring.enabled
        }
    };
};

validateEnvironment();

module.exports = environment;
module.exports.validateEnvironment = validateEnvironment;
module.exports.getMongoURI = getMongoURI;
module.exports.isProduction = isProduction;
module.exports.isDevelopment = isDevelopment;
module.exports.isStaging = isStaging;
module.exports.isTest = isTest;
module.exports.getEnvironmentInfo = getEnvironmentInfo;
module.exports.logEnvironmentInfo = logEnvironmentInfo;
module.exports.getConfigSummary = getConfigSummary;