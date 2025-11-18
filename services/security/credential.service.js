const crypto = require('crypto');
const encryptionService = require('./encryption.service');
const AuditLog = require('../../models/audit.model');

class CredentialVaultService {
    constructor() {
        this.vault = new Map();
        this.credentialMetadata = new Map();
        this.rotationIntervalDays = 90;
        this.maxCredentialAge = 365;
    }

    async storeCredential(credentialId, credentialData, userId, metadata = {}) {
        console.log(`[CredentialVaultService] Storing credential: ${credentialId}`);

        try {
            const encrypted = encryptionService.encryptData(JSON.stringify(credentialData), `credential-${credentialId}`);

            this.vault.set(credentialId, encrypted);

            this.credentialMetadata.set(credentialId, {
                userId: userId,
                type: metadata.type || 'api-key',
                service: metadata.service || 'unknown',
                createdAt: new Date(),
                lastAccessedAt: new Date(),
                lastRotatedAt: new Date(),
                rotationScheduled: false,
                accessCount: 0,
                description: metadata.description || ''
            });

            await AuditLog.create({
                user: userId,
                action: 'credential_stored',
                actionCategory: 'security',
                entityType: 'credential',
                entityId: credentialId,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Credential stored: ${credentialId}`,
                    credentialType: metadata.type,
                    service: metadata.service
                }
            });

            console.log(`[CredentialVaultService] Credential stored successfully: ${credentialId}`);
            return { success: true, credentialId: credentialId };
        } catch (error) {
            console.error(`[CredentialVaultService] Error storing credential:`, error.message);
            throw error;
        }
    }

    async retrieveCredential(credentialId, userId) {
        console.log(`[CredentialVaultService] Retrieving credential: ${credentialId}`);

        try {
            if (!this.vault.has(credentialId)) {
                throw new Error('Credential not found');
            }

            const metadata = this.credentialMetadata.get(credentialId);

            if (metadata.userId.toString() !== userId.toString()) {
                throw new Error('Unauthorized to access this credential');
            }

            const encrypted = this.vault.get(credentialId);
            const decrypted = encryptionService.decryptData(encrypted, `credential-${credentialId}`);

            metadata.lastAccessedAt = new Date();
            metadata.accessCount++;

            await AuditLog.create({
                user: userId,
                action: 'credential_accessed',
                actionCategory: 'security',
                entityType: 'credential',
                entityId: credentialId,
                status: 'success',
                severity: 'info',
                details: { description: `Credential accessed: ${credentialId}` }
            });

            console.log(`[CredentialVaultService] Credential retrieved successfully: ${credentialId}`);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error(`[CredentialVaultService] Error retrieving credential:`, error.message);
            throw error;
        }
    }

    async updateCredential(credentialId, newCredentialData, userId, metadata = {}) {
        console.log(`[CredentialVaultService] Updating credential: ${credentialId}`);

        try {
            const existing = this.credentialMetadata.get(credentialId);

            if (!existing) {
                throw new Error('Credential not found');
            }

            if (existing.userId.toString() !== userId.toString()) {
                throw new Error('Unauthorized to update this credential');
            }

            const encrypted = encryptionService.encryptData(JSON.stringify(newCredentialData), `credential-${credentialId}`);

            this.vault.set(credentialId, encrypted);

            existing.lastRotatedAt = new Date();
            existing.rotationScheduled = false;

            await AuditLog.create({
                user: userId,
                action: 'credential_updated',
                actionCategory: 'security',
                entityType: 'credential',
                entityId: credentialId,
                status: 'success',
                severity: 'info',
                details: { description: `Credential updated: ${credentialId}` }
            });

            console.log(`[CredentialVaultService] Credential updated successfully: ${credentialId}`);
            return { success: true, credentialId: credentialId };
        } catch (error) {
            console.error(`[CredentialVaultService] Error updating credential:`, error.message);
            throw error;
        }
    }

    async deleteCredential(credentialId, userId) {
        console.log(`[CredentialVaultService] Deleting credential: ${credentialId}`);

        try {
            const metadata = this.credentialMetadata.get(credentialId);

            if (!metadata) {
                throw new Error('Credential not found');
            }

            if (metadata.userId.toString() !== userId.toString()) {
                throw new Error('Unauthorized to delete this credential');
            }

            this.vault.delete(credentialId);
            this.credentialMetadata.delete(credentialId);

            await AuditLog.create({
                user: userId,
                action: 'credential_deleted',
                actionCategory: 'security',
                entityType: 'credential',
                entityId: credentialId,
                status: 'success',
                severity: 'warning',
                details: { description: `Credential deleted: ${credentialId}` }
            });

            console.log(`[CredentialVaultService] Credential deleted successfully: ${credentialId}`);
            return { success: true, message: 'Credential deleted successfully' };
        } catch (error) {
            console.error(`[CredentialVaultService] Error deleting credential:`, error.message);
            throw error;
        }
    }

    async scheduleRotation(credentialId, userId) {
        console.log(`[CredentialVaultService] Scheduling rotation for credential: ${credentialId}`);

        try {
            const metadata = this.credentialMetadata.get(credentialId);

            if (!metadata) {
                throw new Error('Credential not found');
            }

            if (metadata.userId.toString() !== userId.toString()) {
                throw new Error('Unauthorized to schedule rotation');
            }

            metadata.rotationScheduled = true;
            metadata.nextRotationDate = new Date(Date.now() + this.rotationIntervalDays * 24 * 60 * 60 * 1000);

            await AuditLog.create({
                user: userId,
                action: 'credential_rotation_scheduled',
                actionCategory: 'security',
                entityType: 'credential',
                entityId: credentialId,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Credential rotation scheduled`,
                    nextRotationDate: metadata.nextRotationDate
                }
            });

            console.log(`[CredentialVaultService] Rotation scheduled for credential: ${credentialId}`);
            return { success: true, nextRotationDate: metadata.nextRotationDate };
        } catch (error) {
            console.error(`[CredentialVaultService] Error scheduling rotation:`, error.message);
            throw error;
        }
    }

    getCredentialsForUser(userId) {
        console.log(`[CredentialVaultService] Retrieving credentials for user: ${userId}`);

        try {
            const credentials = [];

            for (const [credentialId, metadata] of this.credentialMetadata) {
                if (metadata.userId.toString() === userId.toString()) {
                    credentials.push({
                        id: credentialId,
                        type: metadata.type,
                        service: metadata.service,
                        createdAt: metadata.createdAt,
                        lastAccessedAt: metadata.lastAccessedAt,
                        lastRotatedAt: metadata.lastRotatedAt,
                        accessCount: metadata.accessCount,
                        description: metadata.description
                    });
                }
            }

            console.log(`[CredentialVaultService] Found ${credentials.length} credentials for user: ${userId}`);
            return credentials;
        } catch (error) {
            console.error(`[CredentialVaultService] Error retrieving user credentials:`, error.message);
            throw error;
        }
    }

    identifyCredentialsNeedingRotation() {
        console.log(`[CredentialVaultService] Identifying credentials needing rotation`);

        try {
            const needsRotation = [];
            const now = new Date();

            for (const [credentialId, metadata] of this.credentialMetadata) {
                const age = (now - metadata.lastRotatedAt) / (1000 * 60 * 60 * 24);

                if (age > this.rotationIntervalDays) {
                    needsRotation.push({
                        credentialId: credentialId,
                        service: metadata.service,
                        lastRotatedAt: metadata.lastRotatedAt,
                        daysOld: Math.floor(age)
                    });
                }
            }

            console.log(`[CredentialVaultService] Found ${needsRotation.length} credentials needing rotation`);
            return needsRotation;
        } catch (error) {
            console.error(`[CredentialVaultService] Error identifying credentials for rotation:`, error.message);
            throw error;
        }
    }

    async validateCredentialFormat(credentialData, type) {
        console.log(`[CredentialVaultService] Validating credential format: ${type}`);

        const validation = {
            type: type,
            isValid: true,
            errors: []
        };

        try {
            switch (type) {
                case 'api-key':
                    if (!credentialData.apiKey) {
                        validation.errors.push('API key is required');
                    }
                    if (credentialData.apiKey && credentialData.apiKey.length < 16) {
                        validation.errors.push('API key must be at least 16 characters');
                    }
                    break;

                case 'database-connection':
                    if (!credentialData.host) validation.errors.push('Host is required');
                    if (!credentialData.port) validation.errors.push('Port is required');
                    if (!credentialData.username) validation.errors.push('Username is required');
                    if (!credentialData.password) validation.errors.push('Password is required');
                    if (!credentialData.database) validation.errors.push('Database name is required');
                    break;

                case 'oauth-token':
                    if (!credentialData.accessToken) validation.errors.push('Access token is required');
                    if (!credentialData.refreshToken) validation.errors.push('Refresh token is required');
                    break;

                case 'ssh-key':
                    if (!credentialData.privateKey) validation.errors.push('Private key is required');
                    if (credentialData.privateKey && !credentialData.privateKey.includes('BEGIN')) {
                        validation.errors.push('Invalid SSH private key format');
                    }
                    break;

                case 'webhook-secret':
                    if (!credentialData.secret) validation.errors.push('Secret is required');
                    if (credentialData.secret && credentialData.secret.length < 32) {
                        validation.errors.push('Secret must be at least 32 characters');
                    }
                    break;

                default:
                    validation.errors.push('Unknown credential type');
            }

            validation.isValid = validation.errors.length === 0;

            console.log(`[CredentialVaultService] Validation completed: ${validation.isValid ? 'VALID' : 'INVALID'}`);
            return validation;
        } catch (error) {
            console.error(`[CredentialVaultService] Error validating credential:`, error.message);
            throw error;
        }
    }

    getVaultStats() {
        console.log(`[CredentialVaultService] Retrieving vault statistics`);

        try {
            const stats = {
                totalCredentials: this.vault.size,
                byType: {},
                byService: {},
                needsRotation: 0,
                oldestCredential: null,
                newestCredential: null
            };

            let oldestDate = null;
            let newestDate = null;

            for (const [credentialId, metadata] of this.credentialMetadata) {
                stats.byType[metadata.type] = (stats.byType[metadata.type] || 0) + 1;
                stats.byService[metadata.service] = (stats.byService[metadata.service] || 0) + 1;

                const age = (Date.now() - metadata.lastRotatedAt) / (1000 * 60 * 60 * 24);
                if (age > this.rotationIntervalDays) {
                    stats.needsRotation++;
                }

                if (!oldestDate || metadata.createdAt < oldestDate) {
                    oldestDate = metadata.createdAt;
                    stats.oldestCredential = credentialId;
                }

                if (!newestDate || metadata.createdAt > newestDate) {
                    newestDate = metadata.createdAt;
                    stats.newestCredential = credentialId;
                }
            }

            console.log(`[CredentialVaultService] Vault statistics retrieved`);
            return stats;
        } catch (error) {
            console.error(`[CredentialVaultService] Error getting vault stats:`, error.message);
            throw error;
        }
    }

    async purgeExpiredCredentials(maxAgeInDays = this.maxCredentialAge) {
        console.log(`[CredentialVaultService] Purging credentials older than ${maxAgeInDays} days`);

        try {
            const now = new Date();
            const purged = [];

            for (const [credentialId, metadata] of this.credentialMetadata) {
                const age = (now - metadata.createdAt) / (1000 * 60 * 60 * 24);

                if (age > maxAgeInDays) {
                    this.vault.delete(credentialId);
                    this.credentialMetadata.delete(credentialId);
                    purged.push(credentialId);
                }
            }

            console.log(`[CredentialVaultService] Purged ${purged.length} expired credentials`);
            return { purgedCount: purged.length, credentialIds: purged };
        } catch (error) {
            console.error(`[CredentialVaultService] Error purging expired credentials:`, error.message);
            throw error;
        }
    }
}

module.exports = new CredentialVaultService();