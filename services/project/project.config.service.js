const mongoose = require('mongoose');
const Project = require('../models/project.model');
const Repository = require('../models/repository.model');
const DatabaseConnection = require('../models/database.connection.model');
const AuditLog = require('../models/audit.log.model');

class ProjectConfigService {
    async updateTestConfig(projectId, testConfig, userId, metadata = {}) {
        console.log(`[ProjectConfigService] Updating test config for project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to update test config');
            }

            const validFrameworks = ['rest-assured', 'cucumber', 'testng', 'jest', 'pytest', 'junit'];
            const validLanguages = ['java', 'javascript', 'typescript', 'python'];
            const validBuildTools = ['maven', 'gradle', 'npm', 'pip'];

            if (testConfig.framework && !validFrameworks.includes(testConfig.framework)) {
                throw new Error('Invalid test framework');
            }

            if (testConfig.language && !validLanguages.includes(testConfig.language)) {
                throw new Error('Invalid language');
            }

            if (testConfig.buildTool && !validBuildTools.includes(testConfig.buildTool)) {
                throw new Error('Invalid build tool');
            }

            const before = { ...project.testConfig };

            project.testConfig = {
                ...project.testConfig,
                framework: testConfig.framework || project.testConfig.framework,
                language: testConfig.language || project.testConfig.language,
                buildTool: testConfig.buildTool || project.testConfig.buildTool,
                baseUrl: testConfig.baseUrl || project.testConfig.baseUrl,
                timeout: testConfig.timeout || project.testConfig.timeout,
                retryCount: testConfig.retryCount !== undefined ? testConfig.retryCount : project.testConfig.retryCount,
                parallel: testConfig.parallel !== undefined ? testConfig.parallel : project.testConfig.parallel,
                threadCount: testConfig.threadCount || project.testConfig.threadCount,
                environmentVariables: testConfig.environmentVariables || project.testConfig.environmentVariables,
                defaultHeaders: testConfig.defaultHeaders || project.testConfig.defaultHeaders
            };

            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'settings_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                changes: { before, after: project.testConfig },
                details: { description: `Test configuration updated` },
                ...metadata
            });

            console.log(`[ProjectConfigService] Test config updated successfully for project ${projectId}`);
            return project;
        } catch (error) {
            console.error(`[ProjectConfigService] Error updating test config:`, error.message);
            throw error;
        }
    }

    async addEnvironmentVariable(projectId, key, value, isSecret = false, userId, metadata = {}) {
        console.log(`[ProjectConfigService] Adding environment variable ${key} to project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to add environment variable');
            }

            const exists = project.testConfig.environmentVariables.some(env => env.key === key);
            if (exists) {
                throw new Error('Environment variable already exists');
            }

            project.testConfig.environmentVariables.push({
                key,
                value,
                isSecret
            });

            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'settings_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: { description: `Environment variable added: ${key}` },
                ...metadata
            });

            console.log(`[ProjectConfigService] Environment variable added successfully: ${key}`);
            return project;
        } catch (error) {
            console.error(`[ProjectConfigService] Error adding environment variable:`, error.message);
            throw error;
        }
    }

    async updateEnvironmentVariable(projectId, key, value, userId, metadata = {}) {
        console.log(`[ProjectConfigService] Updating environment variable ${key} in project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to update environment variable');
            }

            const envVar = project.testConfig.environmentVariables.find(env => env.key === key);
            if (!envVar) {
                throw new Error('Environment variable not found');
            }

            envVar.value = value;
            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'settings_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: { description: `Environment variable updated: ${key}` },
                ...metadata
            });

            console.log(`[ProjectConfigService] Environment variable updated successfully: ${key}`);
            return project;
        } catch (error) {
            console.error(`[ProjectConfigService] Error updating environment variable:`, error.message);
            throw error;
        }
    }

    async removeEnvironmentVariable(projectId, key, userId, metadata = {}) {
        console.log(`[ProjectConfigService] Removing environment variable ${key} from project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to remove environment variable');
            }

            project.testConfig.environmentVariables = project.testConfig.environmentVariables.filter(
                env => env.key !== key
            );

            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'settings_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: { description: `Environment variable removed: ${key}` },
                ...metadata
            });

            console.log(`[ProjectConfigService] Environment variable removed successfully: ${key}`);
            return project;
        } catch (error) {
            console.error(`[ProjectConfigService] Error removing environment variable:`, error.message);
            throw error;
        }
    }

    async addDefaultHeader(projectId, key, value, userId, metadata = {}) {
        console.log(`[ProjectConfigService] Adding default header ${key} to project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to add default header');
            }

            const exists = project.testConfig.defaultHeaders.some(h => h.key === key);
            if (exists) {
                throw new Error('Header already exists');
            }

            project.testConfig.defaultHeaders.push({ key, value });
            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'settings_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: { description: `Default header added: ${key}` },
                ...metadata
            });

            console.log(`[ProjectConfigService] Default header added successfully: ${key}`);
            return project;
        } catch (error) {
            console.error(`[ProjectConfigService] Error adding default header:`, error.message);
            throw error;
        }
    }

    async updateDefaultHeader(projectId, key, value, userId, metadata = {}) {
        console.log(`[ProjectConfigService] Updating default header ${key} in project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to update default header');
            }

            const header = project.testConfig.defaultHeaders.find(h => h.key === key);
            if (!header) {
                throw new Error('Header not found');
            }

            header.value = value;
            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'settings_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: { description: `Default header updated: ${key}` },
                ...metadata
            });

            console.log(`[ProjectConfigService] Default header updated successfully: ${key}`);
            return project;
        } catch (error) {
            console.error(`[ProjectConfigService] Error updating default header:`, error.message);
            throw error;
        }
    }

    async removeDefaultHeader(projectId, key, userId, metadata = {}) {
        console.log(`[ProjectConfigService] Removing default header ${key} from project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to remove default header');
            }

            project.testConfig.defaultHeaders = project.testConfig.defaultHeaders.filter(h => h.key !== key);
            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'settings_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: { description: `Default header removed: ${key}` },
                ...metadata
            });

            console.log(`[ProjectConfigService] Default header removed successfully: ${key}`);
            return project;
        } catch (error) {
            console.error(`[ProjectConfigService] Error removing default header:`, error.message);
            throw error;
        }
    }

    async updateLoadTestConfig(projectId, loadTestConfig, userId, metadata = {}) {
        console.log(`[ProjectConfigService] Updating load test config for project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to update load test config');
            }

            const before = { ...project.loadTesting };

            project.loadTesting = {
                enabled: loadTestConfig.enabled !== undefined ? loadTestConfig.enabled : project.loadTesting.enabled,
                config: {
                    virtualUsers: loadTestConfig.virtualUsers || project.loadTesting.config.virtualUsers,
                    rampUpTime: loadTestConfig.rampUpTime || project.loadTesting.config.rampUpTime,
                    duration: loadTestConfig.duration || project.loadTesting.config.duration,
                    requestsPerSecond: loadTestConfig.requestsPerSecond || project.loadTesting.config.requestsPerSecond
                },
                lastRun: project.loadTesting.lastRun,
                results: project.loadTesting.results
            };

            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'settings_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                changes: { before, after: project.loadTesting },
                details: { description: `Load test configuration updated` },
                ...metadata
            });

            console.log(`[ProjectConfigService] Load test config updated successfully for project ${projectId}`);
            return project;
        } catch (error) {
            console.error(`[ProjectConfigService] Error updating load test config:`, error.message);
            throw error;
        }
    }

    async setDefaultDatabase(projectId, dbConnectionId, userId, metadata = {}) {
        console.log(`[ProjectConfigService] Setting default database for project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to set default database');
            }

            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                throw new Error('Database connection not found');
            }

            if (dbConnection.project.toString() !== projectId.toString()) {
                throw new Error('Database does not belong to this project');
            }

            await dbConnection.makeDefault();

            await AuditLog.create({
                user: userId,
                action: 'settings_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Default database set`,
                    dbConnectionId
                },
                ...metadata
            });

            console.log(`[ProjectConfigService] Default database set successfully for project ${projectId}`);
            return dbConnection;
        } catch (error) {
            console.error(`[ProjectConfigService] Error setting default database:`, error.message);
            throw error;
        }
    }

    async updateRepositoryBranch(projectId, newBranch, userId, metadata = {}) {
        console.log(`[ProjectConfigService] Updating repository branch for project ${projectId} to ${newBranch}`);

        try {
            const project = await Project.findById(projectId).populate('repository');

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to update repository branch');
            }

            if (!project.repository) {
                throw new Error('No repository connected');
            }

            const before = project.repository.selectedBranch;
            project.repository.selectedBranch = newBranch;
            project.repository.branch = newBranch;

            await project.repository.save();
            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'settings_updated',
                actionCategory: 'project',
                entityType: 'repository',
                entityId: project.repository._id,
                entityName: project.repository.fullName,
                status: 'success',
                severity: 'info',
                changes: { before, after: newBranch },
                details: { description: `Repository branch updated to ${newBranch}` },
                ...metadata
            });

            console.log(`[ProjectConfigService] Repository branch updated successfully to ${newBranch}`);
            return project.repository;
        } catch (error) {
            console.error(`[ProjectConfigService] Error updating repository branch:`, error.message);
            throw error;
        }
    }

    async updateRepositorySyncFrequency(projectId, syncFrequency, userId, metadata = {}) {
        console.log(`[ProjectConfigService] Updating repository sync frequency for project ${projectId}`);

        try {
            const project = await Project.findById(projectId).populate('repository');

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to update sync frequency');
            }

            if (!project.repository) {
                throw new Error('No repository connected');
            }

            const validFrequencies = ['manual', 'hourly', 'daily', 'weekly', 'on-commit'];
            if (!validFrequencies.includes(syncFrequency)) {
                throw new Error('Invalid sync frequency');
            }

            const before = project.repository.connection.syncFrequency;
            project.repository.connection.syncFrequency = syncFrequency;

            if (syncFrequency !== 'manual') {
                project.repository.connection.autoSync = true;
                await project.repository.scheduleNextSync();
            } else {
                project.repository.connection.autoSync = false;
            }

            await project.repository.save();

            await AuditLog.create({
                user: userId,
                action: 'settings_updated',
                actionCategory: 'project',
                entityType: 'repository',
                entityId: project.repository._id,
                entityName: project.repository.fullName,
                status: 'success',
                severity: 'info',
                changes: { before, after: syncFrequency },
                details: { description: `Repository sync frequency updated to ${syncFrequency}` },
                ...metadata
            });

            console.log(`[ProjectConfigService] Repository sync frequency updated successfully to ${syncFrequency}`);
            return project.repository;
        } catch (error) {
            console.error(`[ProjectConfigService] Error updating sync frequency:`, error.message);
            throw error;
        }
    }

    async getProjectConfig(projectId, userId) {
        console.log(`[ProjectConfigService] Fetching configuration for project ${projectId}`);

        try {
            const project = await Project.findById(projectId)
                .populate('repository')
                .populate('databaseConnections');

            if (!project) {
                throw new Error('Project not found');
            }

            const hasAccess = await project.hasAccess(userId);
            if (!hasAccess) {
                throw new Error('Unauthorized to view project configuration');
            }

            const config = {
                testConfig: project.testConfig,
                loadTesting: project.loadTesting,
                cicd: project.cicd,
                notifications: project.notifications,
                schedule: project.schedule,
                repository: project.repository ? {
                    name: project.repository.name,
                    fullName: project.repository.fullName,
                    branch: project.repository.selectedBranch,
                    syncFrequency: project.repository.connection.syncFrequency,
                    autoSync: project.repository.connection.autoSync
                } : null,
                databases: project.databaseConnections.map(db => ({
                    _id: db._id,
                    name: db.name,
                    type: db.type,
                    environment: db.environment,
                    isDefault: db.isDefault
                }))
            };

            console.log(`[ProjectConfigService] Configuration retrieved successfully for project ${projectId}`);
            return config;
        } catch (error) {
            console.error(`[ProjectConfigService] Error fetching project configuration:`, error.message);
            throw error;
        }
    }

    async validateProjectConfig(projectId) {
        console.log(`[ProjectConfigService] Validating configuration for project ${projectId}`);

        try {
            const project = await Project.findById(projectId)
                .populate('repository')
                .populate('databaseConnections');

            if (!project) {
                throw new Error('Project not found');
            }

            const validation = {
                repositoryConnected: !!project.repository && project.repository.connected,
                databaseConnected: project.databaseConnections && project.databaseConnections.length > 0,
                testConfigured: !!project.testConfig.baseUrl,
                testFolderGenerated: project.testFolder.generated,
                analysisCompleted: project.analysis.status === 'completed',
                allRequirementsMet: false
            };

            validation.allRequirementsMet = validation.repositoryConnected &&
                validation.databaseConnected &&
                validation.testConfigured &&
                validation.testFolderGenerated &&
                validation.analysisCompleted;

            console.log(`[ProjectConfigService] Configuration validation completed for project ${projectId}`, validation);
            return validation;
        } catch (error) {
            console.error(`[ProjectConfigService] Error validating project configuration:`, error.message);
            throw error;
        }
    }
}

module.exports = new ProjectConfigService();