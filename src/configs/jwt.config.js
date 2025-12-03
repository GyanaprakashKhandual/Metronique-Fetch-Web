const jwt = require('jsonwebtoken');

const jwtConfig = {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY,
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY,
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE
};

const validateConfig = () => {
    if (!jwtConfig.secret) {
        console.error('JWT Configuration Error: JWT_SECRET is required');
        process.exit(1);
    }
    if (!jwtConfig.refreshSecret) {
        console.error('JWT Configuration Error: JWT_REFRESH_SECRET is required');
        process.exit(1);
    }
    if (jwtConfig.secret.length < 32) {
        console.error('JWT Configuration Error: JWT_SECRET must be at least 32 characters');
        process.exit(1);
    }
    console.log('JWT Configuration Validated Successfully');
};

const generateAccessToken = (payload) => {
    try {
        const token = jwt.sign(payload, jwtConfig.secret, {
            expiresIn: jwtConfig.accessTokenExpiry,
            algorithm: jwtConfig.algorithm,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        });
        console.log(`Access Token Generated for User: ${payload.id || payload.userId}`);
        return token;
    } catch (error) {
        console.error('Access Token Generation Error:', error.message);
        throw error;
    }
};

const generateRefreshToken = (payload) => {
    try {
        const token = jwt.sign(payload, jwtConfig.refreshSecret, {
            expiresIn: jwtConfig.refreshTokenExpiry,
            algorithm: jwtConfig.algorithm,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        });
        console.log(`Refresh Token Generated for User: ${payload.id || payload.userId}`);
        return token;
    } catch (error) {
        console.error('Refresh Token Generation Error:', error.message);
        throw error;
    }
};

const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, jwtConfig.secret, {
            algorithms: [jwtConfig.algorithm],
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        });
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.error('Access Token Expired:', error.message);
        } else if (error.name === 'JsonWebTokenError') {
            console.error('Access Token Invalid:', error.message);
        } else {
            console.error('Access Token Verification Error:', error.message);
        }
        throw error;
    }
};

const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, jwtConfig.refreshSecret, {
            algorithms: [jwtConfig.algorithm],
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        });
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.error('Refresh Token Expired:', error.message);
        } else if (error.name === 'JsonWebTokenError') {
            console.error('Refresh Token Invalid:', error.message);
        } else {
            console.error('Refresh Token Verification Error:', error.message);
        }
        throw error;
    }
};

const decodeToken = (token) => {
    try {
        const decoded = jwt.decode(token, { complete: true });
        return decoded;
    } catch (error) {
        console.error('Token Decode Error:', error.message);
        return null;
    }
};

const generateTokenPair = (payload) => {
    try {
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);
        console.log(`Token Pair Generated for User: ${payload.id || payload.userId}`);
        return { accessToken, refreshToken };
    } catch (error) {
        console.error('Token Pair Generation Error:', error.message);
        throw error;
    }
};

const getTokenExpiry = (token) => {
    try {
        const decoded = decodeToken(token);
        if (decoded && decoded.payload && decoded.payload.exp) {
            const expiryDate = new Date(decoded.payload.exp * 1000);
            return expiryDate;
        }
        return null;
    } catch (error) {
        console.error('Token Expiry Extraction Error:', error.message);
        return null;
    }
};

const isTokenExpired = (token) => {
    try {
        const expiry = getTokenExpiry(token);
        if (!expiry) return true;
        return expiry < new Date();
    } catch (error) {
        console.error('Token Expiry Check Error:', error.message);
        return true;
    }
};

validateConfig();

module.exports = {
    jwtConfig,
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
    generateTokenPair,
    getTokenExpiry,
    isTokenExpired
};