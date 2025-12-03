const Project = require('../models/project.model');
const ProjectAccess = require('../models/project.access.model');
const TeamMember = require('../models/team.member.model');
const { AuthorizationError, NotFoundError } = require('../utils/error.util');
const { catchAsync } = require('../utils/error.util');

const checkProjectAccess = catchAsync(async (req, res, next) => {
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId || req.headers['x-project-id'];
    const userId = req.user._id;

    if (!projectId) {
        throw new AuthorizationError('Project ID is required');
    }

    const project = await Project.findById(projectId).populate('team');

    if (!project) {
        throw new NotFoundError('Project');
    }

    if (project.isDeleted) {
        throw new NotFoundError('Project');
    }

    const hasAccess = await project.hasAccess(userId);

    if (!hasAccess) {
        throw new AuthorizationError('You do not have access to this project');
    }

    req.project = project;
    next();
});

const checkProjectOwnership = catchAsync(async (req, res, next) => {
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
    const userId = req.user._id;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new NotFoundError('Project');
    }

    if (project.owner.toString() !== userId.toString()) {
        throw new AuthorizationError('Only the project owner can perform this action');
    }

    req.project = project;
    next();
});

const requireProjectPermission = (permission) => {
    return catchAsync(async (req, res, next) => {
        const projectId = req.params.projectId || req.body.projectId || req.query.projectId || req.headers['x-project-id'];
        const userId = req.user._id;

        const project = await Project.findById(projectId);

        if (!project) {
            throw new NotFoundError('Project');
        }

        if (project.owner.toString() === userId.toString()) {
            req.project = project;
            return next();
        }

        const access = await ProjectAccess.findOne({
            project: projectId,
            user: userId,
            status: 'active'
        });

        if (!access) {
            throw new AuthorizationError('You do not have access to this project');
        }

        if (!access.hasPermission(permission)) {
            throw new AuthorizationError(`You do not have permission to ${permission.replace('can', '').toLowerCase()}`);
        }

        req.project = project;
        req.projectAccess = access;
        next();
    });
};

const requireProjectAccessLevel = (...allowedLevels) => {
    return catchAsync(async (req, res, next) => {
        const projectId = req.params.projectId || req.body.projectId || req.query.projectId || req.headers['x-project-id'];
        const userId = req.user._id;

        const project = await Project.findById(projectId);

        if (!project) {
            throw new NotFoundError('Project');
        }

        if (project.owner.toString() === userId.toString()) {
            req.project = project;
            req.projectAccessLevel = 'owner';
            return next();
        }

        const access = await ProjectAccess.findOne({
            project: projectId,
            user: userId,
            status: 'active'
        });

        if (!access) {
            throw new AuthorizationError('You do not have access to this project');
        }

        if (!allowedLevels.includes(access.accessLevel)) {
            throw new AuthorizationError(`This action requires one of the following access levels: ${allowedLevels.join(', ')}`);
        }

        req.project = project;
        req.projectAccess = access;
        req.projectAccessLevel = access.accessLevel;
        next();
    });
};

const canViewProject = requireProjectPermission('canViewProject');

const canEditProject = requireProjectPermission('canEditProject');

const canDeleteProject = requireProjectPermission('canDeleteProject');

const canConnectRepository = requireProjectPermission('canConnectRepository');

const canSyncRepository = requireProjectPermission('canSyncRepository');

const canManageDatabases = requireProjectPermission('canManageDatabases');

const canViewTestScripts = requireProjectPermission('canViewTestScripts');

const canCreateTestScripts = requireProjectPermission('canCreateTestScripts');

const canEditTestScripts = requireProjectPermission('canEditTestScripts');

const canDeleteTestScripts = requireProjectPermission('canDeleteTestScripts');

const canRunTests = requireProjectPermission('canRunTests');

const canStopTests = requireProjectPermission('canStopTests');

const canScheduleTests = requireProjectPermission('canScheduleTests');

const canViewReports = requireProjectPermission('canViewReports');

const canExportReports = requireProjectPermission('canExportReports');

const canManageAccess = requireProjectPermission('canManageAccess');

const canInviteUsers = requireProjectPermission('canInviteUsers');

const canUploadFiles = requireProjectPermission('canUploadFiles');

const canDeleteFiles = requireProjectPermission('canDeleteFiles');

const checkProjectVisibility = catchAsync(async (req, res, next) => {
    const projectId = req.params.projectId || req.query.projectId;
    const userId = req.user?._id;

    const project = await Project.findById(projectId).populate('team');

    if (!project) {
        throw new NotFoundError('Project');
    }

    if (project.visibility === 'public') {
        req.project = project;
        return next();
    }

    if (!userId) {
        throw new AuthorizationError('Authentication required to access this project');
    }

    if (project.owner.toString() === userId.toString()) {
        req.project = project;
        return next();
    }

    if (project.visibility === 'team' && project.team) {
        const teamMember = await TeamMember.findOne({
            team: project.team._id,
            user: userId,
            status: 'active'
        });

        if (teamMember) {
            req.project = project;
            return next();
        }
    }

    const access = await ProjectAccess.findOne({
        project: projectId,
        user: userId,
        status: 'active'
    });

    if (!access) {
        throw new AuthorizationError('You do not have access to this project');
    }

    req.project = project;
    req.projectAccess = access;
    next();
});

const isProjectOwnerOrAdmin = catchAsync(async (req, res, next) => {
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
    const userId = req.user._id;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new NotFoundError('Project');
    }

    if (project.owner.toString() === userId.toString()) {
        req.project = project;
        return next();
    }

    const access = await ProjectAccess.findOne({
        project: projectId,
        user: userId,
        status: 'active'
    });

    if (!access || access.accessLevel !== 'admin') {
        throw new AuthorizationError('This action requires project owner or admin access');
    }

    req.project = project;
    req.projectAccess = access;
    next();
});

const checkProjectStatus = catchAsync(async (req, res, next) => {
    if (!req.project) {
        const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
        const project = await Project.findById(projectId);

        if (!project) {
            throw new NotFoundError('Project');
        }

        req.project = project;
    }

    if (req.project.status === 'archived') {
        throw new AuthorizationError('This project is archived. Unarchive it to perform this action.');
    }

    if (req.project.status === 'maintenance') {
        throw new AuthorizationError('This project is under maintenance. Please try again later.');
    }

    next();
});

const checkProjectStorage = catchAsync(async (req, res, next) => {
    if (!req.project) {
        const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
        const project = await Project.findById(projectId);

        if (!project) {
            throw new NotFoundError('Project');
        }

        req.project = project;
    }

    const fileSize = req.file?.size || req.body.fileSize || 0;
    const sizeInMB = fileSize / (1024 * 1024);

    if (!req.project.hasStorageAvailable(sizeInMB)) {
        throw new AuthorizationError('Project storage limit exceeded. Please upgrade or free up space.');
    }

    next();
});

const validateProjectAccess = catchAsync(async (req, res, next) => {
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
    const userId = req.user._id;

    const access = await ProjectAccess.findOne({
        project: projectId,
        user: userId
    });

    if (!access) {
        return next();
    }

    if (!access.isValid()) {
        throw new AuthorizationError('Your access to this project has expired or been revoked');
    }

    await access.updateLastAccessed();

    req.projectAccess = access;
    next();
});

module.exports = {
    checkProjectAccess,
    checkProjectOwnership,
    requireProjectPermission,
    requireProjectAccessLevel,
    canViewProject,
    canEditProject,
    canDeleteProject,
    canConnectRepository,
    canSyncRepository,
    canManageDatabases,
    canViewTestScripts,
    canCreateTestScripts,
    canEditTestScripts,
    canDeleteTestScripts,
    canRunTests,
    canStopTests,
    canScheduleTests,
    canViewReports,
    canExportReports,
    canManageAccess,
    canInviteUsers,
    canUploadFiles,
    canDeleteFiles,
    checkProjectVisibility,
    isProjectOwnerOrAdmin,
    checkProjectStatus,
    checkProjectStorage,
    validateProjectAccess
};
