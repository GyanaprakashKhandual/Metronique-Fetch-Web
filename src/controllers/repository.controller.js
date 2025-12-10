const Project = require('../models/project.model');
const Repository = require('../models/repository.model');
const AuditLog = require('../models/audit.model');
const { catchAsync } = require('../utils/error.util');
const githubService = require('../services/github/github.service');
const encryptionService = require('../services/security/encryption.service');

const connectRepository = catchAsync(async (req, res) => {
    const { projectId, repositoryUrl, branch, accessToken } = req.body;
    console.log(`[REPOSITORY] Connecting repository to project: ${projectId}`);

    if (!projectId || !repositoryUrl || !accessToken) {
        console.warn(`[REPOSITORY] Connection failed: Missing required fields`);
        return res.status(400).json({
            success: false,
            message: 'Project ID, repository URL, and access token are required',
            code: 'MISSING_FIELDS'
        });
    }

    // Check project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    // Parse repository URL
    const urlParts = repositoryUrl.replace('https://github.com/', '').split('/');
    const repoOwner = urlParts[0];
    const repoName = urlParts[1]?.replace('.git', '');

    if (!repoOwner || !repoName) {
        return res.status(400).json({
            success: false,
            message: 'Invalid repository URL',
            code: 'INVALID_URL'
        });
    }

    // Encrypt access token
    const encryptedToken = await encryptionService.encrypt(accessToken);

    // Test GitHub access
    let repoDetails;
    try {
        repoDetails = await githubService.getRepositoryDetails(repoOwner, repoName, accessToken);
    } catch (error) {
        console.error(`[REPOSITORY] Failed to access repository:`, error);
        return res.status(400).json({
            success: false,
            message: 'Failed to access repository. Check your access token and repository URL.',
            code: 'ACCESS_FAILED'
        });
    }

    // Update project with repository details
    project.repository = {
        connected: true,
        url: repositoryUrl,
        fullName: `${repoOwner}/${repoName}`,
        owner: repoOwner,
        name: repoName,
        branch: branch || 'main',
        lastSync: Date.now(),
        accessToken: encryptedToken
    };

    // Detect technology
    if (repoDetails.language) {
        project.technology.language = repoDetails.language.toLowerCase();
    }

    await project.save();

    // Create repository record
    const repository = new Repository({
        project: projectId,
        provider: 'github',
        url: repositoryUrl,
        fullName: `${repoOwner}/${repoName}`,
        owner: repoOwner,
        name: repoName,
        branch: branch || 'main',
        accessToken: encryptedToken,
        status: 'connected',
        lastSync: Date.now(),
        createdBy: req.user._id
    });

    await repository.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'repository_connected',
        actionCategory: 'repository',
        entityType: 'repository',
        entityId: repository._id,
        status: 'success',
        severity: 'info',
        details: { projectId, repositoryUrl, branch },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[REPOSITORY] Repository connected: ${repository._id}`);

    return res.status(201).json({
        success: true,
        message: 'Repository connected successfully',
        data: {
            repository: {
                id: repository._id,
                fullName: repository.fullName,
                branch: repository.branch,
                status: repository.status,
                lastSync: repository.lastSync
            }
        }
    });
});

const getRepositoryDetails = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[REPOSITORY] Fetching repository for project: ${projectId}`);

    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    if (!project.repository.connected) {
        return res.status(404).json({
            success: false,
            message: 'No repository connected',
            code: 'NO_REPOSITORY'
        });
    }

    const repository = await Repository.findOne({ project: projectId })
        .select('-accessToken')
        .lean();

    console.log(`[REPOSITORY] Repository details fetched`);

    return res.json({
        success: true,
        data: { repository }
    });
});

module.exports = {
    connectRepository,
    getRepositoryDetails
};