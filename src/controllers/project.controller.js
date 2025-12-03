const Project = require('../models/project.model');
const ProjectAccess = require('../models/project.access.model');
const AuditLog = require('../models/audit.model');
const { catchAsync } = require('../utils/error.util');
const projectService = require('../services/project/project.service');
const projectSetupService = require('../services/project/project.setup.service');
const projectConfigService = require('../services/project/project.config.service');

const createProject = catchAsync(async (req, res) => {
    const { name, description, visibility, category, priority, teamId, testConfig, technology } = req.body;
    console.log(`[PROJECT_CONTROLLER] Creating project: ${name} for user: ${req.user._id}`);

    if (!name) {
        console.warn(`[PROJECT_CONTROLLER] Project creation failed: Name missing`);
        return res.status(400).json({
            success: false,
            message: 'Project name is required',
            code: 'NAME_REQUIRED'
        });
    }

    const project = await projectService.createProject(
        { name, description, visibility, category, priority, testConfig, technology },
        req.user._id,
        teamId || null,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Project created successfully: ${project._id}`);

    return res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: { project }
    });
});

const getProjectById = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Fetching project: ${projectId}`);

    const project = await projectService.getProjectById(projectId, req.user._id);

    if (!project) {
        console.warn(`[PROJECT_CONTROLLER] Project not found or unauthorized: ${projectId}`);
        return res.status(404).json({
            success: false,
            message: 'Project not found or you do not have access',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    console.log(`[PROJECT_CONTROLLER] Project fetched: ${project.name}`);

    return res.json({
        success: true,
        data: { project }
    });
});

const getUserProjects = catchAsync(async (req, res) => {
    const { page = 1, limit = 20, status, teamId } = req.query;
    console.log(`[PROJECT_CONTROLLER] Fetching projects for user: ${req.user._id}`);

    const { projects, total } = await projectService.getUserProjects(req.user._id, {
        skip: (page - 1) * limit,
        limit: parseInt(limit),
        status,
        teamId
    });

    console.log(`[PROJECT_CONTROLLER] Projects fetched: ${projects.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            projects,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});

const getTeamProjects = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    console.log(`[PROJECT_CONTROLLER] Fetching projects for team: ${teamId}`);

    const { projects, total } = await projectService.getTeamProjects(teamId, {
        skip: (page - 1) * limit,
        limit: parseInt(limit),
        status
    });

    console.log(`[PROJECT_CONTROLLER] Team projects fetched: ${projects.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            projects,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});

const updateProject = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const updates = req.body;
    console.log(`[PROJECT_CONTROLLER] Updating project: ${projectId}`);

    const project = await projectService.updateProject(
        projectId,
        updates,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Project updated successfully: ${projectId}`);

    return res.json({
        success: true,
        message: 'Project updated successfully',
        data: { project }
    });
});

const deleteProject = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Deleting project: ${projectId}`);

    const result = await projectService.deleteProject(
        projectId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Project deleted successfully: ${projectId}`);

    return res.json({
        success: true,
        message: 'Project deleted successfully',
        data: result
    });
});

const archiveProject = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Archiving project: ${projectId}`);

    const project = await projectService.archiveProject(
        projectId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Project archived successfully: ${projectId}`);

    return res.json({
        success: true,
        message: 'Project archived successfully',
        data: { project }
    });
});

const unarchiveProject = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Unarchiving project: ${projectId}`);

    const project = await projectService.updateProjectStatus(
        projectId,
        'active',
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Project unarchived successfully: ${projectId}`);

    return res.json({
        success: true,
        message: 'Project unarchived successfully',
        data: { project }
    });
});

const getProjectStats = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Fetching stats for project: ${projectId}`);

    const stats = await projectService.getProjectStats(projectId);

    console.log(`[PROJECT_CONTROLLER] Project stats fetched: ${projectId}`);

    return res.json({
        success: true,
        data: { stats }
    });
});

const connectRepository = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { repositoryUrl } = req.body;
    console.log(`[PROJECT_CONTROLLER] Connecting repository to project: ${projectId}`);

    if (!repositoryUrl) {
        console.warn(`[PROJECT_CONTROLLER] Repository connection failed: URL missing`);
        return res.status(400).json({
            success: false,
            message: 'Repository URL is required',
            code: 'REPOSITORY_URL_REQUIRED'
        });
    }

    const repository = await projectSetupService.connectRepository(
        projectId,
        repositoryUrl,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Repository connected successfully: ${repository._id}`);

    return res.status(201).json({
        success: true,
        message: 'Repository connected successfully',
        data: { repository }
    });
});

const analyzeRepository = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Analyzing repository for project: ${projectId}`);

    const result = await projectSetupService.analyzeRepository(
        projectId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Repository analysis completed: ${projectId}`);

    return res.json({
        success: true,
        message: 'Repository analyzed successfully',
        data: result
    });
});

const connectDatabase = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const dbConnectionData = req.body;
    console.log(`[PROJECT_CONTROLLER] Connecting database to project: ${projectId}`);

    if (!dbConnectionData.name || !dbConnectionData.type) {
        console.warn(`[PROJECT_CONTROLLER] Database connection failed: Missing required fields`);
        return res.status(400).json({
            success: false,
            message: 'Database name and type are required',
            code: 'MISSING_FIELDS'
        });
    }

    const dbConnection = await projectSetupService.connectDatabase(
        projectId,
        dbConnectionData,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Database connected successfully: ${dbConnection._id}`);

    return res.status(201).json({
        success: true,
        message: 'Database connected successfully',
        data: { dbConnection }
    });
});

const testDatabaseConnection = catchAsync(async (req, res) => {
    const { projectId, dbConnectionId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Testing database connection: ${dbConnectionId}`);

    const dbConnection = await projectSetupService.testDatabaseConnection(
        dbConnectionId,
        req.user._id
    );

    console.log(`[PROJECT_CONTROLLER] Database connection test completed: ${dbConnectionId}`);

    return res.json({
        success: true,
        message: 'Database connection tested successfully',
        data: { dbConnection }
    });
});

const analyzeDatabase = catchAsync(async (req, res) => {
    const { projectId, dbConnectionId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Analyzing database schema: ${dbConnectionId}`);

    const dbConnection = await projectSetupService.analyzeDatabase(
        dbConnectionId,
        req.user._id
    );

    console.log(`[PROJECT_CONTROLLER] Database schema analysis completed: ${dbConnectionId}`);

    return res.json({
        success: true,
        message: 'Database schema analyzed successfully',
        data: { dbConnection }
    });
});

const setupTestEnvironment = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const testConfigData = req.body;
    console.log(`[PROJECT_CONTROLLER] Setting up test environment for project: ${projectId}`);

    const project = await projectSetupService.setupTestEnvironment(
        projectId,
        testConfigData,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Test environment setup completed: ${projectId}`);

    return res.json({
        success: true,
        message: 'Test environment configured successfully',
        data: { project }
    });
});

const generateTestFolder = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Generating test folder for project: ${projectId}`);

    const result = await projectSetupService.generateTestFolder(
        projectId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Test folder generated successfully: ${projectId}`);

    return res.json({
        success: true,
        message: 'Test folder generated successfully',
        data: result
    });
});

const updateTestConfig = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const testConfig = req.body;
    console.log(`[PROJECT_CONTROLLER] Updating test config for project: ${projectId}`);

    const project = await projectConfigService.updateTestConfig(
        projectId,
        testConfig,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Test config updated successfully: ${projectId}`);

    return res.json({
        success: true,
        message: 'Test configuration updated successfully',
        data: { project }
    });
});

const addEnvironmentVariable = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { key, value, isSecret } = req.body;
    console.log(`[PROJECT_CONTROLLER] Adding environment variable to project: ${projectId}`);

    if (!key || !value) {
        console.warn(`[PROJECT_CONTROLLER] Add env variable failed: Missing fields`);
        return res.status(400).json({
            success: false,
            message: 'Key and value are required',
            code: 'MISSING_FIELDS'
        });
    }

    const project = await projectConfigService.addEnvironmentVariable(
        projectId,
        key,
        value,
        isSecret || false,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Environment variable added: ${key}`);

    return res.status(201).json({
        success: true,
        message: 'Environment variable added successfully',
        data: { project }
    });
});

const updateEnvironmentVariable = catchAsync(async (req, res) => {
    const { projectId, key } = req.params;
    const { value } = req.body;
    console.log(`[PROJECT_CONTROLLER] Updating environment variable: ${key}`);

    if (!value) {
        console.warn(`[PROJECT_CONTROLLER] Update env variable failed: Value missing`);
        return res.status(400).json({
            success: false,
            message: 'Value is required',
            code: 'VALUE_REQUIRED'
        });
    }

    const project = await projectConfigService.updateEnvironmentVariable(
        projectId,
        key,
        value,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Environment variable updated: ${key}`);

    return res.json({
        success: true,
        message: 'Environment variable updated successfully',
        data: { project }
    });
});

const removeEnvironmentVariable = catchAsync(async (req, res) => {
    const { projectId, key } = req.params;
    console.log(`[PROJECT_CONTROLLER] Removing environment variable: ${key}`);

    const project = await projectConfigService.removeEnvironmentVariable(
        projectId,
        key,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Environment variable removed: ${key}`);

    return res.json({
        success: true,
        message: 'Environment variable removed successfully',
        data: { project }
    });
});

const setupCICD = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const cicdConfig = req.body;
    console.log(`[PROJECT_CONTROLLER] Setting up CI/CD for project: ${projectId}`);

    const project = await projectSetupService.setupCICD(
        projectId,
        cicdConfig,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] CI/CD setup completed: ${projectId}`);

    return res.json({
        success: true,
        message: 'CI/CD configured successfully',
        data: { project }
    });
});

const setupNotifications = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const notificationConfig = req.body;
    console.log(`[PROJECT_CONTROLLER] Setting up notifications for project: ${projectId}`);

    const project = await projectSetupService.setupNotifications(
        projectId,
        notificationConfig,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Notifications setup completed: ${projectId}`);

    return res.json({
        success: true,
        message: 'Notifications configured successfully',
        data: { project }
    });
});

const setupSchedule = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const scheduleConfig = req.body;
    console.log(`[PROJECT_CONTROLLER] Setting up schedule for project: ${projectId}`);

    const project = await projectSetupService.setupSchedule(
        projectId,
        scheduleConfig,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Schedule setup completed: ${projectId}`);

    return res.json({
        success: true,
        message: 'Schedule configured successfully',
        data: { project }
    });
});

const getProjectConfig = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Fetching configuration for project: ${projectId}`);

    const config = await projectConfigService.getProjectConfig(projectId, req.user._id);

    console.log(`[PROJECT_CONTROLLER] Project configuration fetched: ${projectId}`);

    return res.json({
        success: true,
        data: { config }
    });
});

const validateProjectConfig = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Validating configuration for project: ${projectId}`);

    const validation = await projectConfigService.validateProjectConfig(projectId);

    console.log(`[PROJECT_CONTROLLER] Project configuration validated: ${projectId}`);

    return res.json({
        success: true,
        data: { validation }
    });
});

const completeProjectSetup = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Completing project setup: ${projectId}`);

    const project = await projectSetupService.completeProjectSetup(
        projectId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Project setup completed: ${projectId}`);

    return res.json({
        success: true,
        message: 'Project setup completed successfully',
        data: { project }
    });
});

const addCollaborator = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { userId } = req.body;
    console.log(`[PROJECT_CONTROLLER] Adding collaborator to project: ${projectId}`);

    if (!userId) {
        console.warn(`[PROJECT_CONTROLLER] Add collaborator failed: User ID missing`);
        return res.status(400).json({
            success: false,
            message: 'User ID is required',
            code: 'USER_ID_REQUIRED'
        });
    }

    const project = await projectService.addCollaborator(
        projectId,
        userId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Collaborator added successfully: ${userId}`);

    return res.status(201).json({
        success: true,
        message: 'Collaborator added successfully',
        data: { project }
    });
});

const removeCollaborator = catchAsync(async (req, res) => {
    const { projectId, collaboratorId } = req.params;
    console.log(`[PROJECT_CONTROLLER] Removing collaborator from project: ${projectId}`);

    const project = await projectService.removeCollaborator(
        projectId,
        collaboratorId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[PROJECT_CONTROLLER] Collaborator removed successfully: ${collaboratorId}`);

    return res.json({
        success: true,
        message: 'Collaborator removed successfully',
        data: { project }
    });
});

const grantProjectAccess = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { userId, accessLevel, permissions } = req.body;
    console.log(`[PROJECT_CONTROLLER] Granting project access: ${projectId}`);

    if (!userId) {
        console.warn(`[PROJECT_CONTROLLER] Grant access failed: User ID missing`);
        return res.status(400).json({
            success: false,
            message: 'User ID is required',
            code: 'USER_ID_REQUIRED'
        });
    }

    const projectAccess = new ProjectAccess({
        project: projectId,
        user: userId,
        accessLevel: accessLevel || 'view',
        permissions: permissions || {},
        grantedBy: req.user._id,
        status: 'active'
    });

    await projectAccess.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'access_granted',
        actionCategory: 'project',
        entityType: 'project',
        entityId: projectId,
        status: 'success',
        severity: 'info',
        details: {
            description: `Project access granted`,
            grantedTo: userId,
            accessLevel: accessLevel || 'view'
        },
        affectedUsers: [userId],
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[PROJECT_CONTROLLER] Project access granted successfully: ${userId}`);

    return res.status(201).json({
        success: true,
        message: 'Project access granted successfully',
        data: { projectAccess }
    });
});

const revokeProjectAccess = catchAsync(async (req, res) => {
    const { projectId, accessId } = req.params;
    const { reason } = req.body;
    console.log(`[PROJECT_CONTROLLER] Revoking project access: ${accessId}`);

    const projectAccess = await ProjectAccess.findById(accessId);

    if (!projectAccess) {
        console.warn(`[PROJECT_CONTROLLER] Project access not found: ${accessId}`);
        return res.status(404).json({
            success: false,
            message: 'Project access not found',
            code: 'ACCESS_NOT_FOUND'
        });
    }

    await projectAccess.revoke(req.user._id, reason);

    await AuditLog.create({
        user: req.user._id,
        action: 'access_revoked',
        actionCategory: 'project',
        entityType: 'project',
        entityId: projectId,
        status: 'success',
        severity: 'warning',
        details: {
            description: `Project access revoked`,
            revokedFrom: projectAccess.user,
            reason
        },
        affectedUsers: [projectAccess.user],
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[PROJECT_CONTROLLER] Project access revoked successfully: ${accessId}`);

    return res.json({
        success: true,
        message: 'Project access revoked successfully',
        data: { projectAccess }
    });
});

const updateProjectAccess = catchAsync(async (req, res) => {
    const { projectId, accessId } = req.params;
    const { accessLevel, permissions } = req.body;
    console.log(`[PROJECT_CONTROLLER] Updating project access: ${accessId}`);

    const projectAccess = await ProjectAccess.findById(accessId);

    if (!projectAccess) {
        console.warn(`[PROJECT_CONTROLLER] Project access not found: ${accessId}`);
        return res.status(404).json({
            success: false,
            message: 'Project access not found',
            code: 'ACCESS_NOT_FOUND'
        });
    }

    if (accessLevel) {
        projectAccess.accessLevel = accessLevel;
    }

    if (permissions) {
        projectAccess.permissions = { ...projectAccess.permissions, ...permissions };
    }

    await projectAccess.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'permission_changed',
        actionCategory: 'project',
        entityType: 'project',
        entityId: projectId,
        status: 'success',
        severity: 'info',
        details: {
            description: `Project access updated`,
            updatedFor: projectAccess.user,
            newAccessLevel: accessLevel
        },
        affectedUsers: [projectAccess.user],
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[PROJECT_CONTROLLER] Project access updated successfully: ${accessId}`);

    return res.json({
        success: true,
        message: 'Project access updated successfully',
        data: { projectAccess }
    });
});

const getProjectAccessList = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    console.log(`[PROJECT_CONTROLLER] Fetching access list for project: ${projectId}`);

    const query = { project: projectId };

    if (status) {
        query.status = status;
    }

    const skip = (page - 1) * limit;

    const accessList = await ProjectAccess.find(query)
        .populate('user', 'firstName lastName email avatar')
        .populate('grantedBy', 'firstName lastName email')
        .sort({ grantedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await ProjectAccess.countDocuments(query);

    console.log(`[PROJECT_CONTROLLER] Access list fetched: ${accessList.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            accessList,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});

const searchProjects = catchAsync(async (req, res) => {
    const { query, page = 1, limit = 20 } = req.query;
    console.log(`[PROJECT_CONTROLLER] Searching projects with query: ${query}`);

    if (!query) {
        console.warn(`[PROJECT_CONTROLLER] Search failed: Query missing`);
        return res.status(400).json({
            success: false,
            message: 'Search query is required',
            code: 'QUERY_REQUIRED'
        });
    }

    const { projects, total } = await projectService.searchProjects(query, req.user._id, {
        skip: (page - 1) * limit,
        limit: parseInt(limit)
    });

    console.log(`[PROJECT_CONTROLLER] Projects found: ${projects.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            projects,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});

const getProjectsByTags = catchAsync(async (req, res) => {
    const { tags, page = 1, limit = 20 } = req.query;
    console.log(`[PROJECT_CONTROLLER] Fetching projects by tags: ${tags}`);

    if (!tags) {
        console.warn(`[PROJECT_CONTROLLER] Fetch by tags failed: Tags missing`);
        return res.status(400).json({
            success: false,
            message: 'Tags are required',
            code: 'TAGS_REQUIRED'
        });
    }

    const tagsArray = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());

    const { projects, total } = await projectService.getProjectsByTags(tagsArray, req.user._id, {
        skip: (page - 1) * limit,
        limit: parseInt(limit)
    });

    console.log(`[PROJECT_CONTROLLER] Projects found by tags: ${projects.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            projects,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});
