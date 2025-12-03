const mongoose = require('mongoose');
const Project = require('../../models/project.model');
const Repository = require('../../models/repository.model');
const DatabaseConnection = require('../../models/database.connection.model');
const ApiEndpoint = require('../../models/api.endpoint.model');
const AuditLog = require('../../models/audit.model');
const githubService = require('./github/github.service');
const aiAnalysisService = require('./ai/code.analysis.service');
const testFolderGeneratorService = require('./testing/test.folder.generator.service');

class ProjectSetupService {
    async connectRepository(projectId, repositoryUrl, userId, metadata = {}) {
        console.log(`[ProjectSetupService] Connecting repository to project ${projectId}: ${repositoryUrl}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const project = await Project.findById(projectId).session(session);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to setup project');
            }

            const repoData = await githubService.getRepositoryData(repositoryUrl);

            const repository = new Repository({
                project: projectId,
                owner: userId,
                provider: 'github',
                name: repoData.name,
                fullName: repoData.fullName,
                url: repoData.url,
                cloneUrl: repoData.cloneUrl,
                repositoryOwner: repoData.owner,
                repositoryId: repoData.id,
                defaultBranch: repoData.defaultBranch || 'main',
                selectedBranch: repoData.defaultBranch || 'main',
                isPrivate: repoData.isPrivate,
                description: repoData.description,
                language: repoData.language,
                connection: {
                    status: 'connected',
                    connectedAt: Date.now()
                }
            });

            await repository.save({ session });

            project.repository.connected = true;
            project.repository.url = repoData.url;
            project.repository.fullName = repoData.fullName;
            project.repository.owner = repoData.owner;
            project.repository.name = repoData.name;
            project.repository.branch = repoData.defaultBranch || 'main';

            await project.save({ session });

            await AuditLog.create([{
                user: userId,
                action: 'repository_connected',
                actionCategory: 'project',
                entityType: 'repository',
                entityId: repository._id,
                entityName: repository.fullName,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Repository connected to project`,
                    projectId,
                    repositoryUrl
                },
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[ProjectSetupService] Repository connected successfully: ${repository._id}`);

            return repository;
        } catch (error) {
            await session.abortTransaction();
            console.error(`[ProjectSetupService] Error connecting repository:`, error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async analyzeRepository(projectId, userId, metadata = {}) {
        console.log(`[ProjectSetupService] Starting repository analysis for project ${projectId}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const project = await Project.findById(projectId).populate('repository').session(session);

            if (!project) {
                throw new Error('Project not found');
            }

            if (!project.repository || !project.repository.connected) {
                throw new Error('No connected repository found');
            }

            project.analysis.status = 'analyzing';
            project.analysis.startedAt = Date.now();
            await project.save({ session });

            const analysisResult = await aiAnalysisService.analyzeRepository(project.repository);

            project.analysis.status = 'completed';
            project.analysis.completedAt = Date.now();
            project.analysis.totalFiles = analysisResult.totalFiles || 0;
            project.analysis.totalRoutes = analysisResult.totalRoutes || 0;
            project.analysis.totalControllers = analysisResult.totalControllers || 0;
            project.analysis.totalModels = analysisResult.totalModels || 0;
            project.analysis.totalEndpoints = analysisResult.totalEndpoints || 0;
            project.analysis.routesAnalyzed = true;
            project.analysis.controllersAnalyzed = true;
            project.analysis.modelsAnalyzed = true;

            if (analysisResult.technology) {
                project.technology.language = analysisResult.technology.language;
                project.technology.framework = analysisResult.technology.framework;
                project.technology.database = analysisResult.technology.database || [];
                project.technology.orm = analysisResult.technology.orm;
            }

            await project.save({ session });

            if (analysisResult.endpoints && analysisResult.endpoints.length > 0) {
                const endpoints = analysisResult.endpoints.map(ep => ({
                    ...ep,
                    project: projectId
                }));

                await ApiEndpoint.insertMany(endpoints, { session });
                project.endpoints = endpoints.map(ep => ep._id);
                await project.save({ session });
            }

            await AuditLog.create([{
                user: userId,
                action: 'repository_synced',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Repository analyzed successfully`,
                    totalEndpoints: analysisResult.totalEndpoints,
                    technology: analysisResult.technology
                },
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[ProjectSetupService] Repository analysis completed for project ${projectId}`);

            return {
                project,
                analysis: {
                    totalFiles: analysisResult.totalFiles,
                    totalRoutes: analysisResult.totalRoutes,
                    totalEndpoints: analysisResult.totalEndpoints,
                    technology: analysisResult.technology
                }
            };
        } catch (error) {
            await session.abortTransaction();
            project.analysis.status = 'failed';
            project.analysis.failedAt = Date.now();
            project.analysis.errorMessage = error.message;
            await project.save();

            console.error(`[ProjectSetupService] Error analyzing repository:`, error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async connectDatabase(projectId, dbConnectionData, userId, metadata = {}) {
        console.log(`[ProjectSetupService] Connecting database to project ${projectId}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const project = await Project.findById(projectId).session(session);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to setup project');
            }

            const dbConnection = new DatabaseConnection({
                project: projectId,
                owner: userId,
                createdBy: userId,
                ...dbConnectionData,
                status: 'inactive'
            });

            await dbConnection.save({ session });

            project.databaseConnections.push(dbConnection._id);
            await project.save({ session });

            await AuditLog.create([{
                user: userId,
                action: 'database_connected',
                actionCategory: 'project',
                entityType: 'database',
                entityId: dbConnection._id,
                entityName: dbConnection.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Database connected to project`,
                    dbType: dbConnection.type,
                    environment: dbConnection.environment
                },
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[ProjectSetupService] Database connected successfully: ${dbConnection._id}`);

            return dbConnection;
        } catch (error) {
            await session.abortTransaction();
            console.error(`[ProjectSetupService] Error connecting database:`, error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async testDatabaseConnection(dbConnectionId, userId) {
        console.log(`[ProjectSetupService] Testing database connection: ${dbConnectionId}`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                throw new Error('Database connection not found');
            }

            if (dbConnection.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to test connection');
            }

            const testResult = await dbConnection.testConnection();

            console.log(`[ProjectSetupService] Database connection test completed: ${testResult}`);
            return dbConnection;
        } catch (error) {
            console.error(`[ProjectSetupService] Error testing database connection:`, error.message);
            throw error;
        }
    }

    async analyzeDatabase(dbConnectionId, userId) {
        console.log(`[ProjectSetupService] Analyzing database schema: ${dbConnectionId}`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                throw new Error('Database connection not found');
            }

            if (dbConnection.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to analyze database');
            }

            const schemaData = await aiAnalysisService.analyzeDatabase(dbConnection);
            await dbConnection.updateSchema(schemaData);

            console.log(`[ProjectSetupService] Database schema analyzed successfully: ${dbConnectionId}`);
            return dbConnection;
        } catch (error) {
            console.error(`[ProjectSetupService] Error analyzing database:`, error.message);
            throw error;
        }
    }

    async setupTestEnvironment(projectId, testConfigData, userId, metadata = {}) {
        console.log(`[ProjectSetupService] Setting up test environment for project ${projectId}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const project = await Project.findById(projectId).session(session);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to setup project');
            }

            project.testConfig = {
                ...project.testConfig,
                ...testConfigData,
                environmentVariables: testConfigData.environmentVariables || [],
                defaultHeaders: testConfigData.defaultHeaders || []
            };

            await project.save({ session });

            await AuditLog.create([{
                user: userId,
                action: 'test_config_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Test environment configured`,
                    framework: testConfigData.framework,
                    language: testConfigData.language
                },
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[ProjectSetupService] Test environment setup completed for project ${projectId}`);

            return project;
        } catch (error) {
            await session.abortTransaction();
            console.error(`[ProjectSetupService] Error setting up test environment:`, error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async generateTestFolder(projectId, userId, metadata = {}) {
        console.log(`[ProjectSetupService] Generating test folder structure for project ${projectId}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const project = await Project.findById(projectId)
                .populate('repository')
                .populate('endpoints')
                .session(session);

            if (!project) {
                throw new Error('Project not found');
            }

            if (!project.endpoints || project.endpoints.length === 0) {
                throw new Error('No endpoints found in project');
            }

            const testFolderStructure = await testFolderGeneratorService.generateTestFolder(project);

            project.testFolder.generated = true;
            project.testFolder.generatedAt = Date.now();
            project.testFolder.structure = testFolderStructure.structure;
            project.testFolder.rootPath = testFolderStructure.rootPath;
            project.testFolder.totalFiles = testFolderStructure.totalFiles;
            project.testFolder.totalFolders = testFolderStructure.totalFolders;

            await project.save({ session });

            await AuditLog.create([{
                user: userId,
                action: 'test_script_generated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Test folder generated`,
                    totalFiles: testFolderStructure.totalFiles,
                    totalFolders: testFolderStructure.totalFolders
                },
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[ProjectSetupService] Test folder generated successfully for project ${projectId}`);

            return {
                project,
                testFolder: testFolderStructure
            };
        } catch (error) {
            await session.abortTransaction();
            console.error(`[ProjectSetupService] Error generating test folder:`, error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async setupCICD(projectId, cicdConfig, userId, metadata = {}) {
        console.log(`[ProjectSetupService] Setting up CI/CD for project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to setup CI/CD');
            }

            project.cicd = {
                enabled: cicdConfig.enabled !== false,
                provider: cicdConfig.provider,
                webhookUrl: cicdConfig.webhookUrl,
                triggerOnCommit: cicdConfig.triggerOnCommit !== false,
                triggerOnPR: cicdConfig.triggerOnPR !== false,
                autoRun: cicdConfig.autoRun || false,
                branch: cicdConfig.branch || 'main'
            };

            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'integration_connected',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `CI/CD configured`,
                    provider: cicdConfig.provider
                },
                ...metadata
            });

            console.log(`[ProjectSetupService] CI/CD setup completed for project ${projectId}`);
            return project;
        } catch (error) {
            console.error(`[ProjectSetupService] Error setting up CI/CD:`, error.message);
            throw error;
        }
    }

    async setupNotifications(projectId, notificationConfig, userId, metadata = {}) {
        console.log(`[ProjectSetupService] Setting up notifications for project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to setup notifications');
            }

            project.notifications = {
                email: {
                    enabled: notificationConfig.email?.enabled || false,
                    recipients: notificationConfig.email?.recipients || [],
                    onSuccess: notificationConfig.email?.onSuccess || false,
                    onFailure: notificationConfig.email?.onFailure !== false
                },
                slack: {
                    enabled: notificationConfig.slack?.enabled || false,
                    webhookUrl: notificationConfig.slack?.webhookUrl,
                    channel: notificationConfig.slack?.channel,
                    onSuccess: notificationConfig.slack?.onSuccess || false,
                    onFailure: notificationConfig.slack?.onFailure !== false
                },
                webhook: {
                    enabled: notificationConfig.webhook?.enabled || false,
                    url: notificationConfig.webhook?.url,
                    events: notificationConfig.webhook?.events || []
                }
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
                details: { description: `Notifications configured` },
                ...metadata
            });

            console.log(`[ProjectSetupService] Notifications setup completed for project ${projectId}`);
            return project;
        } catch (error) {
            console.error(`[ProjectSetupService] Error setting up notifications:`, error.message);
            throw error;
        }
    }

    async setupSchedule(projectId, scheduleConfig, userId, metadata = {}) {
        console.log(`[ProjectSetupService] Setting up schedule for project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to setup schedule');
            }

            project.schedule = {
                enabled: scheduleConfig.enabled || false,
                cron: scheduleConfig.cron,
                timezone: scheduleConfig.timezone || 'UTC',
                nextRun: scheduleConfig.nextRun,
                lastRun: null
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
                details: {
                    description: `Schedule configured`,
                    cron: scheduleConfig.cron
                },
                ...metadata
            });

            console.log(`[ProjectSetupService] Schedule setup completed for project ${projectId}`);
            return project;
        } catch (error) {
            console.error(`[ProjectSetupService] Error setting up schedule:`, error.message);
            throw error;
        }
    }

    async completeProjectSetup(projectId, userId, metadata = {}) {
        console.log(`[ProjectSetupService] Completing project setup for ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to complete setup');
            }

            const setupComplete = project.repository.connected &&
                project.analysis.status === 'completed' &&
                project.testFolder.generated &&
                project.testConfig.baseUrl;

            if (!setupComplete) {
                throw new Error('Project setup is incomplete. Please complete all required steps.');
            }

            project.status = 'active';
            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'project_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: { description: `Project setup completed and activated` },
                ...metadata
            });

            console.log(`[ProjectSetupService] Project setup completed and activated: ${projectId}`);
            return project;
        } catch (error) {
            console.error(`[ProjectSetupService] Error completing project setup:`, error.message);
            throw error;
        }
    }
}

module.exports = new ProjectSetupService();