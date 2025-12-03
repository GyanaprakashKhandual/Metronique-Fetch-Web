const TestFile = require('../models/test.file.model');
const TestFolder = require('../models/test.folder.model');
const Project = require('../models/project.model');
const ProjectAccess = require('../models/project.access.model');
const { AuthorizationError, NotFoundError, BadRequestError } = require('../utils/error.util');
const { catchAsync } = require('../utils/error.util');

const canAccessFile = catchAsync(async (req, res, next) => {
    const fileId = req.params.fileId || req.body.fileId || req.query.fileId;
    const userId = req.user._id;

    if (!fileId) {
        throw new BadRequestError('File ID is required');
    }

    const file = await TestFile.findById(fileId).populate('project');

    if (!file) {
        throw new NotFoundError('File');
    }

    if (file.isDeleted) {
        throw new NotFoundError('File');
    }

    const project = file.project;

    if (project.owner.toString() === userId.toString()) {
        req.file = file;
        req.project = project;
        return next();
    }

    const access = await ProjectAccess.findOne({
        project: project._id,
        user: userId,
        status: 'active'
    });

    if (!access) {
        throw new AuthorizationError('You do not have access to this file');
    }

    req.file = file;
    req.project = project;
    req.projectAccess = access;
    next();
});

const canEditFile = catchAsync(async (req, res, next) => {
    const fileId = req.params.fileId || req.body.fileId || req.query.fileId;
    const userId = req.user._id;

    const file = await TestFile.findById(fileId).populate('project');

    if (!file) {
        throw new NotFoundError('File');
    }

    if (file.isDeleted) {
        throw new NotFoundError('File');
    }

    if (!file.isEditable) {
        throw new AuthorizationError('This file is not editable');
    }

    if (file.isSystemFile) {
        throw new AuthorizationError('System files cannot be edited');
    }

    if (file.isLocked() && file.lockedBy.toString() !== userId.toString()) {
        throw new AuthorizationError('This file is locked by another user');
    }

    const project = file.project;

    if (project.owner.toString() === userId.toString()) {
        req.file = file;
        req.project = project;
        return next();
    }

    const access = await ProjectAccess.findOne({
        project: project._id,
        user: userId,
        status: 'active'
    });

    if (!access) {
        throw new AuthorizationError('You do not have access to this file');
    }

    if (!access.hasPermission('canEditTestScripts')) {
        throw new AuthorizationError('You do not have permission to edit files in this project');
    }

    req.file = file;
    req.project = project;
    req.projectAccess = access;
    next();
});

const canDeleteFile = catchAsync(async (req, res, next) => {
    const fileId = req.params.fileId || req.body.fileId;
    const userId = req.user._id;

    const file = await TestFile.findById(fileId).populate('project');

    if (!file) {
        throw new NotFoundError('File');
    }

    if (file.isSystemFile) {
        throw new AuthorizationError('System files cannot be deleted');
    }

    const project = file.project;

    if (project.owner.toString() === userId.toString()) {
        req.file = file;
        req.project = project;
        return next();
    }

    const access = await ProjectAccess.findOne({
        project: project._id,
        user: userId,
        status: 'active'
    });

    if (!access) {
        throw new AuthorizationError('You do not have access to this file');
    }

    if (!access.hasPermission('canDeleteTestScripts')) {
        throw new AuthorizationError('You do not have permission to delete files in this project');
    }

    req.file = file;
    req.project = project;
    req.projectAccess = access;
    next();
});

const canCreateFile = catchAsync(async (req, res, next) => {
    const projectId = req.body.projectId || req.params.projectId || req.query.projectId;
    const userId = req.user._id;

    if (!projectId) {
        throw new BadRequestError('Project ID is required');
    }

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

    if (!access.hasPermission('canCreateTestScripts')) {
        throw new AuthorizationError('You do not have permission to create files in this project');
    }

    req.project = project;
    req.projectAccess = access;
    next();
});

const canAccessFolder = catchAsync(async (req, res, next) => {
    const folderId = req.params.folderId || req.body.folderId || req.query.folderId;
    const userId = req.user._id;

    if (!folderId) {
        throw new BadRequestError('Folder ID is required');
    }

    const folder = await TestFolder.findById(folderId).populate('project');

    if (!folder) {
        throw new NotFoundError('Folder');
    }

    if (folder.isDeleted) {
        throw new NotFoundError('Folder');
    }

    const project = folder.project;

    if (project.owner.toString() === userId.toString()) {
        req.folder = folder;
        req.project = project;
        return next();
    }

    const access = await ProjectAccess.findOne({
        project: project._id,
        user: userId,
        status: 'active'
    });
    if (!access) {
        throw new AuthorizationError('You do not have access to this folder');
    }

    req.folder = folder;
    req.project = project;
    req.projectAccess = access;
    next();
});
const canEditFolder = catchAsync(async (req, res, next) => {
    const folderId = req.params.folderId || req.body.folderId;
    const userId = req.user._id;
    const folder = await TestFolder.findById(folderId).populate('project');

    if (!folder) {
        throw new NotFoundError('Folder');
    }

    if (folder.isDeleted) {
        throw new NotFoundError('Folder');
    }

    if (folder.isSystemFolder) {
        throw new AuthorizationError('System folders cannot be edited');
    }

    if (!folder.permissions.canEdit) {
        throw new AuthorizationError('This folder cannot be edited');
    }

    const project = folder.project;

    if (project.owner.toString() === userId.toString()) {
        req.folder = folder;
        req.project = project;
        return next();
    }

    const access = await ProjectAccess.findOne({
        project: project._id,
        user: userId,
        status: 'active'
    });

    if (!access) {
        throw new AuthorizationError('You do not have access to this folder');
    }

    if (!access.hasPermission('canEditTestScripts')) {
        throw new AuthorizationError('You do not have permission to edit folders in this project');
    }

    req.folder = folder;
    req.project = project;
    req.projectAccess = access;
    next();
});
const canDeleteFolder = catchAsync(async (req, res, next) => {
    const folderId = req.params.folderId || req.body.folderId;
    const userId = req.user._id;
    const folder = await TestFolder.findById(folderId).populate('project');

    if (!folder) {
        throw new NotFoundError('Folder');
    }

    if (folder.isSystemFolder) {
        throw new AuthorizationError('System folders cannot be deleted');
    }

    if (!folder.permissions.canDelete) {
        throw new AuthorizationError('This folder cannot be deleted');
    }

    const project = folder.project;

    if (project.owner.toString() === userId.toString()) {
        req.folder = folder;
        req.project = project;
        return next();
    }

    const access = await ProjectAccess.findOne({
        project: project._id,
        user: userId,
        status: 'active'
    });

    if (!access) {
        throw new AuthorizationError('You do not have access to this folder');
    }

    if (!access.hasPermission('canDeleteTestScripts')) {
        throw new AuthorizationError('You do not have permission to delete folders in this project');
    }

    req.folder = folder;
    req.project = project;
    req.projectAccess = access;
    next();
});
const canCreateFolder = catchAsync(async (req, res, next) => {
    const projectId = req.body.projectId || req.params.projectId || req.query.projectId;
    const userId = req.user._id;
    if (!projectId) {
        throw new BadRequestError('Project ID is required');
    }

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

    if (!access.hasPermission('canCreateTestScripts')) {
        throw new AuthorizationError('You do not have permission to create folders in this project');
    }

    req.project = project;
    req.projectAccess = access;
    next();
});
const canRenameFile = catchAsync(async (req, res, next) => {
    const fileId = req.params.fileId || req.body.fileId;
    const userId = req.user._id;
    const file = await TestFile.findById(fileId).populate('project');

    if (!file) {
        throw new NotFoundError('File');
    }

    if (file.isSystemFile) {
        throw new AuthorizationError('System files cannot be renamed');
    }

    if (!file.isEditable) {
        throw new AuthorizationError('This file cannot be renamed');
    }

    const project = file.project;

    if (project.owner.toString() === userId.toString()) {
        req.file = file;
        req.project = project;
        return next();
    }

    const access = await ProjectAccess.findOne({
        project: project._id,
        user: userId,
        status: 'active'
    });

    if (!access) {
        throw new AuthorizationError('You do not have access to this file');
    }

    if (!access.hasPermission('canEditTestScripts')) {
        throw new AuthorizationError('You do not have permission to rename files in this project');
    }

    req.file = file;
    req.project = project;
    req.projectAccess = access;
    next();
});
const canRenameFolder = catchAsync(async (req, res, next) => {
    const folderId = req.params.folderId || req.body.folderId;
    const userId = req.user._id;
    const folder = await TestFolder.findById(folderId).populate('project');

    if (!folder) {
        throw new NotFoundError('Folder');
    }

    if (folder.isSystemFolder) {
        throw new AuthorizationError('System folders cannot be renamed');
    }

    if (!folder.permissions.canRename) {
        throw new AuthorizationError('This folder cannot be renamed');
    }

    const project = folder.project;

    if (project.owner.toString() === userId.toString()) {
        req.folder = folder;
        req.project = project;
        return next();
    }

    const access = await ProjectAccess.findOne({
        project: project._id,
        user: userId,
        status: 'active'
    });

    if (!access) {
        throw new AuthorizationError('You do not have access to this folder');
    }

    if (!access.hasPermission('canEditTestScripts')) {
        throw new AuthorizationError('You do not have permission to rename folders in this project');
    }

    req.folder = folder;
    req.project = project;
    req.projectAccess = access;
    next();
});
const canLockFile = catchAsync(async (req, res, next) => {
    const fileId = req.params.fileId || req.body.fileId;
    const userId = req.user._id;
    const file = await TestFile.findById(fileId).populate('project');

    if (!file) {
        throw new NotFoundError('File');
    }

    if (file.isLocked() && file.lockedBy.toString() !== userId.toString()) {
        throw new AuthorizationError('This file is already locked by another user');
    }

    const project = file.project;

    if (project.owner.toString() === userId.toString()) {
        req.file = file;
        req.project = project;
        return next();
    }

    const access = await ProjectAccess.findOne({
        project: project._id,
        user: userId,
        status: 'active'
    });

    if (!access) {
        throw new AuthorizationError('You do not have access to this file');
    }

    if (!access.hasPermission('canEditTestScripts')) {
        throw new AuthorizationError('You do not have permission to lock files in this project');
    }

    req.file = file;
    req.project = project;
    req.projectAccess = access;
    next();
});
const canUnlockFile = catchAsync(async (req, res, next) => {
    const fileId = req.params.fileId || req.body.fileId;
    const userId = req.user._id;
    const file = await TestFile.findById(fileId).populate('project');

    if (!file) {
        throw new NotFoundError('File');
    }

    if (!file.isLocked()) {
        throw new BadRequestError('This file is not locked');
    }

    const project = file.project;

    if (project.owner.toString() === userId.toString() ||
        file.lockedBy.toString() === userId.toString()) {
        req.file = file;
        req.project = project;
        return next();
    }

    const access = await ProjectAccess.findOne({
        project: project._id,
        user: userId,
        status: 'active'
    });

    if (!access || access.accessLevel !== 'admin') {
        throw new AuthorizationError('Only the file owner, project owner, or project admin can unlock this file');
    }

    req.file = file;
    req.project = project;
    req.projectAccess = access;
    next();
});
const validateFileType = catchAsync(async (req, res, next) => {
    const allowedExtensions = ['.java', '.js', '.ts', '.py', '.xml', '.json', '.yaml', '.yml', '.properties', '.feature', '.md', '.txt'];
    const fileName = req.body.fileName || req.body.name;
    if (!fileName) {
        throw new BadRequestError('File name is required');
    }

    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
        throw new BadRequestError(`File type ${extension} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
    }

    next();
});
const validateFileSize = (maxSizeInMB = 5) => {
    return catchAsync(async (req, res, next) => {
        const content = req.body.content;
        if (!content) {
            return next();
        }

        const sizeInBytes = Buffer.byteLength(content, 'utf-8');
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > maxSizeInMB) {
            throw new BadRequestError(`File size exceeds maximum allowed size of ${maxSizeInMB}MB`);
        }

        next();
    });
};
const preventSystemFileModification = catchAsync(async (req, res, next) => {
    const fileId = req.params.fileId || req.body.fileId;
    if (!fileId) {
        return next();
    }

    const file = await TestFile.findById(fileId);

    if (!file) {
        throw new NotFoundError('File');
    }

    if (file.isSystemFile) {
        throw new AuthorizationError('System files cannot be modified');
    }

    req.file = file;
    next();
});
const checkFileLock = catchAsync(async (req, res, next) => {
    const fileId = req.params.fileId || req.body.fileId;
    const userId = req.user._id;
    if (!fileId) {
        return next();
    }

    const file = await TestFile.findById(fileId);

    if (!file) {
        throw new NotFoundError('File');
    }

    if (file.isLocked() && file.lockedBy.toString() !== userId.toString()) {
        throw new AuthorizationError(`This file is locked by another user. Please wait until it is unlocked.`);
    }

    req.file = file;
    next();
});
module.exports = {
    canAccessFile,
    canEditFile,
    canDeleteFile,
    canCreateFile,
    canAccessFolder,
    canEditFolder,
    canDeleteFolder,
    canCreateFolder,
    canRenameFile,
    canRenameFolder,
    canLockFile,
    canUnlockFile,
    validateFileType,
    validateFileSize,
    preventSystemFileModification,
    checkFileLock
};