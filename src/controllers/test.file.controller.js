const TestFile = require('../models/test.file.model');
const TestFolder = require('../models/test.folder.model');
const Project = require('../models/project.model');
const { catchAsync } = require('../utils/error.util');
const crypto = require('crypto');

const calculateChecksum = (content) => {
    return crypto.createHash('sha256').update(content).digest('hex');
};

const createFile = catchAsync(async (req, res) => {
    const { projectId, folderId } = req.params;
    const { name, content = '', extension = 'txt', type = 'other', language = 'text' } = req.body;

    console.log(`[FILE_CREATE] Project: ${projectId}, Folder: ${folderId}, File: ${name}`);

    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: 'File name is required',
            code: 'FILE_NAME_REQUIRED'
        });
    }

    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const folder = await TestFolder.findOne({
        _id: folderId,
        project: projectId
    });

    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
            code: 'FOLDER_NOT_FOUND'
        });
    }

    const fileName = name.includes('.') ? name : `${name}.${extension}`;
    const filePath = `${folder.path}/${fileName}`;

    const existingFile = await TestFile.findOne({
        project: projectId,
        path: filePath,
        isDeleted: false
    });

    if (existingFile) {
        return res.status(409).json({
            success: false,
            message: 'File already exists',
            code: 'FILE_EXISTS'
        });
    }

    const fileSize = Buffer.byteLength(content, 'utf-8');
    const fileLines = content ? content.split('\n').length : 1;
    const checksum = calculateChecksum(content);

    const file = new TestFile({
        project: projectId,
        folder: folderId,
        name: fileName,
        fileName: fileName,
        path: filePath,
        extension: extension.startsWith('.') ? extension.slice(1) : extension,
        type: type,
        language: language,
        content: content,
        originalContent: content,
        size: fileSize,
        lines: fileLines,
        checksum: checksum,
        status: 'draft',
        isGenerated: false,
        generatedBy: 'user',
        isEditable: true,
        isSystemFile: false,
        createdBy: req.user._id,
        lastModifiedBy: req.user._id
    });

    await file.save();

    console.log(`[FILE_CREATE_SUCCESS] File created: ${filePath}`);

    return res.status(201).json({
        success: true,
        message: 'File created successfully',
        data: {
            file: {
                id: file._id,
                name: file.name,
                fileName: file.fileName,
                path: file.path,
                extension: file.extension,
                type: file.type,
                language: file.language,
                size: file.size,
                lines: file.lines,
                status: file.status,
                createdAt: file.createdAt
            }
        }
    });
});

const getFile = catchAsync(async (req, res) => {
    const { projectId, fileId } = req.params;

    console.log(`[FILE_GET] Project: ${projectId}, File: ${fileId}`);

    const file = await TestFile.findOne({
        _id: fileId,
        project: projectId,
        isDeleted: false
    }).populate('createdBy', 'firstName lastName email').populate('lastModifiedBy', 'firstName lastName email');

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
            code: 'FILE_NOT_FOUND'
        });
    }

    return res.json({
        success: true,
        data: { file }
    });
});

const getFilesByFolder = catchAsync(async (req, res) => {
    const { projectId, folderId } = req.params;

    console.log(`[FILE_GET_FOLDER] Project: ${projectId}, Folder: ${folderId}`);

    const folder = await TestFolder.findOne({
        _id: folderId,
        project: projectId
    });

    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
            code: 'FOLDER_NOT_FOUND'
        });
    }

    const files = await TestFile.find({
        folder: folderId,
        project: projectId,
        isDeleted: false
    }).select('_id name fileName extension type language size lines status createdAt').sort({ createdAt: -1 });

    return res.json({
        success: true,
        data: {
            folder: {
                id: folder._id,
                name: folder.name,
                path: folder.path
            },
            files: files,
            count: files.length
        }
    });
});

const updateFile = catchAsync(async (req, res) => {
    const { projectId, fileId } = req.params;
    const { content, status } = req.body;

    console.log(`[FILE_UPDATE] Project: ${projectId}, File: ${fileId}`);

    const file = await TestFile.findOne({
        _id: fileId,
        project: projectId,
        isDeleted: false
    });

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
            code: 'FILE_NOT_FOUND'
        });
    }

    if (!file.canEdit(req.user._id)) {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to edit this file',
            code: 'FILE_EDIT_FORBIDDEN'
        });
    }

    if (content !== undefined) {
        file.content = content;
        file.size = Buffer.byteLength(content, 'utf-8');
        file.lines = content.split('\n').length;
        file.checksum = calculateChecksum(content);
    }

    if (status && ['draft', 'modified', 'validated', 'compiled', 'error'].includes(status)) {
        file.status = status;
    }

    file.lastModifiedBy = req.user._id;
    file.lastModifiedAt = Date.now();
    file.version.current++;

    await file.save();

    console.log(`[FILE_UPDATE_SUCCESS] File updated: ${file.path}`);

    return res.json({
        success: true,
        message: 'File updated successfully',
        data: {
            file: {
                id: file._id,
                name: file.name,
                path: file.path,
                size: file.size,
                lines: file.lines,
                status: file.status,
                version: file.version.current,
                lastModifiedAt: file.lastModifiedAt
            }
        }
    });
});

const deleteFile = catchAsync(async (req, res) => {
    const { projectId, fileId } = req.params;
    const { permanent = false } = req.query;

    console.log(`[FILE_DELETE] Project: ${projectId}, File: ${fileId}, Permanent: ${permanent}`);

    const file = await TestFile.findOne({
        _id: fileId,
        project: projectId
    });

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
            code: 'FILE_NOT_FOUND'
        });
    }

    if (file.isSystemFile) {
        return res.status(403).json({
            success: false,
            message: 'Cannot delete system files',
            code: 'SYSTEM_FILE_DELETE_FORBIDDEN'
        });
    }

    if (permanent === 'true') {
        await TestFile.deleteOne({ _id: fileId });
        console.log(`[FILE_DELETE_PERMANENT] File permanently deleted: ${file.path}`);
    } else {
        await file.softDelete(req.user._id);
        console.log(`[FILE_DELETE_SOFT] File soft deleted: ${file.path}`);
    }

    return res.json({
        success: true,
        message: permanent === 'true' ? 'File permanently deleted' : 'File deleted successfully',
        data: {
            fileId: fileId,
            deleted: true
        }
    });
});

const restoreFile = catchAsync(async (req, res) => {
    const { projectId, fileId } = req.params;

    console.log(`[FILE_RESTORE] Project: ${projectId}, File: ${fileId}`);

    const file = await TestFile.findOne({
        _id: fileId,
        project: projectId,
        isDeleted: true
    });

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'Deleted file not found',
            code: 'FILE_NOT_FOUND'
        });
    }

    await file.restore();

    console.log(`[FILE_RESTORE_SUCCESS] File restored: ${file.path}`);

    return res.json({
        success: true,
        message: 'File restored successfully',
        data: {
            file: {
                id: file._id,
                name: file.name,
                path: file.path,
                status: file.status
            }
        }
    });
});

const lockFile = catchAsync(async (req, res) => {
    const { projectId, fileId } = req.params;

    console.log(`[FILE_LOCK] Project: ${projectId}, File: ${fileId}`);

    const file = await TestFile.findOne({
        _id: fileId,
        project: projectId,
        isDeleted: false
    });

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
            code: 'FILE_NOT_FOUND'
        });
    }

    if (file.isLocked() && file.lockedBy.toString() !== req.user._id.toString()) {
        return res.status(409).json({
            success: false,
            message: 'File is locked by another user',
            code: 'FILE_LOCKED'
        });
    }

    await file.lock(req.user._id);

    console.log(`[FILE_LOCK_SUCCESS] File locked: ${file.path}`);

    return res.json({
        success: true,
        message: 'File locked successfully',
        data: { fileId: file._id }
    });
});

const unlockFile = catchAsync(async (req, res) => {
    const { projectId, fileId } = req.params;

    console.log(`[FILE_UNLOCK] Project: ${projectId}, File: ${fileId}`);

    const file = await TestFile.findOne({
        _id: fileId,
        project: projectId,
        isDeleted: false
    });

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
            code: 'FILE_NOT_FOUND'
        });
    }

    if (file.lockedBy && file.lockedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'You cannot unlock this file',
            code: 'FILE_UNLOCK_FORBIDDEN'
        });
    }

    await file.unlock();

    console.log(`[FILE_UNLOCK_SUCCESS] File unlocked: ${file.path}`);

    return res.json({
        success: true,
        message: 'File unlocked successfully',
        data: { fileId: file._id }
    });
});

module.exports = {
    createFile,
    getFile,
    getFilesByFolder,
    updateFile,
    deleteFile,
    restoreFile,
    lockFile,
    unlockFile
};