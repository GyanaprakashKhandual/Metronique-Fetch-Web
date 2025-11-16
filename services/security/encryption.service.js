const crypto = require('crypto');
const AuditLog = require('../models/audit.log.model');

class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.masterKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
        this.saltRounds = 12;
        this.keyRotationDays = 90;
    }

    encryptData(plaintext, additionalData = null) {
        console.log(`[EncryptionService] Encrypting data with AES-256-GCM`);

        try {
            if (!plaintext) {
                throw new Error('Plaintext cannot be empty');
            }

            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

            if (additionalData) {
                cipher.setAAD(Buffer.from(additionalData));
            }

            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            const encryptedPayload = {
                iv: iv.toString('hex'),
                data: encrypted,
                authTag: authTag.toString('hex'),
                algorithm: this.algorithm
            };

            console.log(`[EncryptionService] Data encrypted successfully`);
            return Buffer.from(JSON.stringify(encryptedPayload)).toString('base64');
        } catch (error) {
            console.error(`[EncryptionService] Error encrypting data:`, error.message);
            throw error;
        }
    }

    decryptData(encryptedPayload, additionalData = null) {
        console.log(`[EncryptionService] Decrypting data with AES-256-GCM`);

        try {
            if (!encryptedPayload) {
                throw new Error('Encrypted payload cannot be empty');
            }

            const decoded = JSON.parse(Buffer.from(encryptedPayload, 'base64').toString('utf8'));
            const iv = Buffer.from(decoded.iv, 'hex');
            const authTag = Buffer.from(decoded.authTag, 'hex');
            const encrypted = decoded.data;

            const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
            decipher.setAuthTag(authTag);

            if (additionalData) {
                decipher.setAAD(Buffer.from(additionalData));
            }

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            console.log(`[EncryptionService] Data decrypted successfully`);
            return decrypted;
        } catch (error) {
            console.error(`[EncryptionService] Error decrypting data:`, error.message);
            throw new Error('Failed to decrypt data - possible tampering detected');
        }
    }

    hashData(plaintext, algorithm = 'sha256') {
        console.log(`[EncryptionService] Hashing data with ${algorithm}`);

        try {
            if (!plaintext) {
                throw new Error('Plaintext cannot be empty');
            }

            const hash = crypto.createHash(algorithm);
            hash.update(plaintext);

            console.log(`[EncryptionService] Data hashed successfully`);
            return hash.digest('hex');
        } catch (error) {
            console.error(`[EncryptionService] Error hashing data:`, error.message);
            throw error;
        }
    }

    encryptConnectionString(host, port, username, password, database) {
        console.log(`[EncryptionService] Encrypting database connection string`);

        try {
            const connectionString = `${username}:${password}@${host}:${port}/${database}`;
            const encrypted = this.encryptData(connectionString, 'database-connection');

            console.log(`[EncryptionService] Connection string encrypted successfully`);
            return encrypted;
        } catch (error) {
            console.error(`[EncryptionService] Error encrypting connection string:`, error.message);
            throw error;
        }
    }

    decryptConnectionString(encryptedString) {
        console.log(`[EncryptionService] Decrypting database connection string`);

        try {
            const decrypted = this.decryptData(encryptedString, 'database-connection');
            const parts = decrypted.match(/^(.+?):(.+)@(.+?):(\d+)\/(.+)$/);

            if (!parts) {
                throw new Error('Invalid connection string format');
            }

            console.log(`[EncryptionService] Connection string decrypted successfully`);

            return {
                username: parts[1],
                password: parts[2],
                host: parts[3],
                port: parseInt(parts[4]),
                database: parts[5]
            };
        } catch (error) {
            console.error(`[EncryptionService] Error decrypting connection string:`, error.message);
            throw error;
        }
    }

    encryptAPIKey(apiKey, service) {
        console.log(`[EncryptionService] Encrypting API key for service: ${service}`);

        try {
            const encrypted = this.encryptData(apiKey, `api-key-${service}`);

            console.log(`[EncryptionService] API key encrypted successfully`);
            return encrypted;
        } catch (error) {
            console.error(`[EncryptionService] Error encrypting API key:`, error.message);
            throw error;
        }
    }

    decryptAPIKey(encryptedKey, service) {
        console.log(`[EncryptionService] Decrypting API key for service: ${service}`);

        try {
            const decrypted = this.decryptData(encryptedKey, `api-key-${service}`);

            console.log(`[EncryptionService] API key decrypted successfully`);
            return decrypted;
        } catch (error) {
            console.error(`[EncryptionService] Error decrypting API key:`, error.message);
            throw error;
        }
    }

    generateSecureRandomString(length = 32, encoding = 'hex') {
        console.log(`[EncryptionService] Generating secure random string (${length} bytes)`);

        try {
            const randomBytes = crypto.randomBytes(length);
            const randomString = randomBytes.toString(encoding);

            console.log(`[EncryptionService] Secure random string generated`);
            return randomString;
        } catch (error) {
            console.error(`[EncryptionService] Error generating random string:`, error.message);
            throw error;
        }
    }

    generateHMAC(message, secret, algorithm = 'sha256') {
        console.log(`[EncryptionService] Generating HMAC with ${algorithm}`);

        try {
            const hmac = crypto.createHmac(algorithm, secret);
            hmac.update(message);

            console.log(`[EncryptionService] HMAC generated successfully`);
            return hmac.digest('hex');
        } catch (error) {
            console.error(`[EncryptionService] Error generating HMAC:`, error.message);
            throw error;
        }
    }

    verifyHMAC(message, signature, secret, algorithm = 'sha256') {
        console.log(`[EncryptionService] Verifying HMAC signature`);

        try {
            const expectedSignature = this.generateHMAC(message, secret, algorithm);
            const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

            console.log(`[EncryptionService] HMAC verification: ${isValid ? 'valid' : 'invalid'}`);
            return isValid;
        } catch (error) {
            console.error(`[EncryptionService] Error verifying HMAC:`, error.message);
            return false;
        }
    }

    encryptFieldInObject(obj, fieldsToEncrypt) {
        console.log(`[EncryptionService] Encrypting ${fieldsToEncrypt.length} fields in object`);

        try {
            const encrypted = { ...obj };

            fieldsToEncrypt.forEach(field => {
                if (encrypted[field]) {
                    encrypted[field] = this.encryptData(encrypted[field].toString());
                }
            });

            console.log(`[EncryptionService] Object fields encrypted successfully`);
            return encrypted;
        } catch (error) {
            console.error(`[EncryptionService] Error encrypting object fields:`, error.message);
            throw error;
        }
    }

    decryptFieldInObject(obj, fieldsToDecrypt) {
        console.log(`[EncryptionService] Decrypting ${fieldsToDecrypt.length} fields in object`);

        try {
            const decrypted = { ...obj };

            fieldsToDecrypt.forEach(field => {
                if (decrypted[field]) {
                    decrypted[field] = this.decryptData(decrypted[field]);
                }
            });

            console.log(`[EncryptionService] Object fields decrypted successfully`);
            return decrypted;
        } catch (error) {
            console.error(`[EncryptionService] Error decrypting object fields:`, error.message);
            throw error;
        }
    }

    rotateEncryptionKey(newMasterKey) {
        console.log(`[EncryptionService] Rotating encryption master key`);

        try {
            if (!newMasterKey || newMasterKey.length !== 64) {
                throw new Error('Invalid master key format');
            }

            const oldKey = this.masterKey;
            this.masterKey = Buffer.from(newMasterKey, 'hex');

            console.log(`[EncryptionService] Encryption master key rotated successfully`);

            return {
                success: true,
                message: 'Master key rotated successfully',
                nextRotationDue: new Date(Date.now() + this.keyRotationDays * 24 * 60 * 60 * 1000)
            };
        } catch (error) {
            console.error(`[EncryptionService] Error rotating encryption key:`, error.message);
            throw error;
        }
    }

    secureStringComparison(string1, string2) {
        console.log(`[EncryptionService] Comparing strings securely (timing-safe)`);

        try {
            const buf1 = Buffer.from(string1);
            const buf2 = Buffer.from(string2);

            if (buf1.length !== buf2.length) {
                return false;
            }

            return crypto.timingSafeEqual(buf1, buf2);
        } catch (error) {
            console.error(`[EncryptionService] Error in string comparison:`, error.message);
            return false;
        }
    }

    async auditEncryptionOperation(operation, resource, userId, status, metadata = {}) {
        console.log(`[EncryptionService] Auditing encryption operation: ${operation}`);

        try {
            await AuditLog.create({
                user: userId,
                action: 'encryption_' + operation,
                actionCategory: 'security',
                entityType: 'encryption',
                status: status,
                severity: 'info',
                details: {
                    description: `Encryption operation: ${operation}`,
                    resource: resource
                },
                ...metadata
            });

            console.log(`[EncryptionService] Encryption operation audited`);
        } catch (error) {
            console.error(`[EncryptionService] Error auditing operation:`, error.message);
        }
    }

    validateEncryptionStrength() {
        console.log(`[EncryptionService] Validating encryption configuration strength`);

        const validation = {
            algorithm: this.algorithm,
            keyLength: this.masterKey.length * 8,
            saltRounds: this.saltRounds,
            keyRotationDays: this.keyRotationDays,
            isSecure: true,
            issues: []
        };

        if (this.masterKey.length < 32) {
            validation.isSecure = false;
            validation.issues.push('Master key is less than 256 bits');
        }

        if (this.saltRounds < 10) {
            validation.isSecure = false;
            validation.issues.push('Salt rounds should be at least 10');
        }

        if (this.keyRotationDays > 180) {
            validation.issues.push('Key rotation period exceeds 6 months');
        }

        console.log(`[EncryptionService] Encryption validation: ${validation.isSecure ? 'SECURE' : 'ISSUES DETECTED'}`);
        return validation;
    }
}

module.exports = new EncryptionService();