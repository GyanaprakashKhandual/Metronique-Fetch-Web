const TestFolder = require('../models/test.folder.model');
const TestFile = require('../models/test.file.model');
const Project = require('../models/project.model');
const { catchAsync } = require('../utils/error.util');

const createFolder = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { name, parentFolderId, type = 'custom', description } = req.body;

    console.log(`[FOLDER_CREATE] Project: ${projectId}, Name: ${name}, Parent: ${parentFolderId || 'root'}`);

    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Folder name is required',
            code: 'FOLDER_NAME_REQUIRED'
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

    let parentFolder = null;
    let folderPath = name;
    let folderLevel = 0;

    if (parentFolderId) {
        parentFolder = await TestFolder.findOne({
            _id: parentFolderId,
            project: projectId,
            isDeleted: false
        });

        if (!parentFolder) {
            return res.status(404).json({
                success: false,
                message: 'Parent folder not found',
                code: 'PARENT_FOLDER_NOT_FOUND'
            });
        }

        folderPath = `${parentFolder.path}/${name}`;
        folderLevel = parentFolder.level + 1;
    }

    const existingFolder = await TestFolder.findOne({
        project: projectId,
        path: folderPath,
        isDeleted: false
    });

    if (existingFolder) {
        return res.status(409).json({
            success: false,
            message: 'Folder already exists at this path',
            code: 'FOLDER_EXISTS'
        });
    }

    const folder = new TestFolder({
        project: projectId,
        name: name.trim(),
        path: folderPath,
        parentFolder: parentFolderId || null,
        type: type,
        level: folderLevel,
        description: description || '',
        createdBy: req.user._id
    });

    await folder.save();

    if (parentFolder) {
        await parentFolder.addSubFolder(folder._id);
    }

    console.log(`[FOLDER_CREATE_SUCCESS] Folder created: ${folderPath}`);

    return res.status(201).json({
        success: true,
        message: 'Folder created successfully',
        data: {
            folder: {
                id: folder._id,
                name: folder.name,
                path: folder.path,
                type: folder.type,
                level: folder.level,
                parentFolder: folder.parentFolder,
                createdAt: folder.createdAt
            }
        }
    });
});

const getFolder = catchAsync(async (req, res) => {
    const { projectId, folderId } = req.params;
    const { includeFiles = 'true', includeSubFolders = 'true' } = req.query;

    console.log(`[FOLDER_GET] Project: ${projectId}, Folder: ${folderId}`);

    const folder = await TestFolder.findOne({
        _id: folderId,
        project: projectId,
        isDeleted: false
    }).populate('createdBy', 'firstName lastName email');

    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
            code: 'FOLDER_NOT_FOUND'
        });
    }

    const response = {
        success: true,
        data: {
            folder: {
                id: folder._id,
                name: folder.name,
                path: folder.path,
                type: folder.type,
                level: folder.level,
                description: folder.description,
                parentFolder: folder.parentFolder,
                metadata: folder.metadata,
                permissions: folder.permissions,
                isSystemFolder: folder.isSystemFolder,
                createdAt: folder.createdAt,
                updatedAt: folder.updatedAt
            }
        }
    };

    if (includeFiles === 'true') {
        const files = await TestFile.find({
            folder: folderId,
            project: projectId,
            isDeleted: false
        }).select('_id name fileName extension type language size lines status createdAt').sort({ name: 1 });

        response.data.files = files;
    }

    if (includeSubFolders === 'true') {
        const subFolders = await TestFolder.find({
            parentFolder: folderId,
            project: projectId,
            isDeleted: false
        }).select('_id name path type level metadata createdAt').sort({ name: 1 });

        response.data.subFolders = subFolders;
    }

    return res.json(response);
});

const getFoldersByProject = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { parentFolderId, type, includeDeleted = 'false' } = req.query;

    console.log(`[FOLDER_GET_PROJECT] Project: ${projectId}, Parent: ${parentFolderId || 'all'}`);

    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const query = {
        project: projectId,
        isDeleted: includeDeleted === 'true' ? undefined : false
    };

    if (parentFolderId) {
        query.parentFolder = parentFolderId;
    }

    if (type) {
        query.type = type;
    }

    const folders = await TestFolder.find(query)
        .select('_id name path type level parentFolder metadata createdAt')
        .sort({ level: 1, name: 1 });

    return res.json({
        success: true,
        data: {
            folders: folders,
            count: folders.length
        }
    });
});

const getFolderHierarchy = catchAsync(async (req, res) => {
    const { projectId } = req.params;

    console.log(`[FOLDER_HIERARCHY] Project: ${projectId}`);

    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const rootFolders = await TestFolder.find({
        project: projectId,
        parentFolder: null,
        isDeleted: false
    }).select('_id name path type level metadata').sort({ name: 1 });

    const buildHierarchy = async (folderId) => {
        const subFolders = await TestFolder.find({
            parentFolder: folderId,
            project: projectId,
            isDeleted: false
        }).select('_id name path type level metadata').sort({ name: 1 });

        const files = await TestFile.find({
            folder: folderId,
            project: projectId,
            isDeleted: false
        }).select('_id name fileName extension type size').sort({ name: 1 });

        return {
            subFolders: await Promise.all(
                subFolders.map(async (sf) => ({
                    ...sf.toObject(),
                    children: await buildHierarchy(sf._id)
                }))
            ),
            files: files
        };
    };

    const hierarchy = await Promise.all(
        rootFolders.map(async (rf) => ({
            ...rf.toObject(),
            children: await buildHierarchy(rf._id)
        }))
    );

    return res.json({
        success: true,
        data: {
            hierarchy: hierarchy,
            totalRootFolders: rootFolders.length
        }
    });
});

const updateFolder = catchAsync(async (req, res) => {
    const { projectId, folderId } = req.params;
    const { name, description, type } = req.body;

    console.log(`[FOLDER_UPDATE] Project: ${projectId}, Folder: ${folderId}`);

    const folder = await TestFolder.findOne({
        _id: folderId,
        project: projectId,
        isDeleted: false
    });

    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
            code: 'FOLDER_NOT_FOUND'
        });
    }

    if (folder.isSystemFolder && !folder.permissions.canEdit) {
        return res.status(403).json({
            success: false,
            message: 'Cannot edit system folder',
            code: 'SYSTEM_FOLDER_EDIT_FORBIDDEN'
        });
    }

    if (!folder.permissions.canRename && name) {
        return res.status(403).json({
            success: false,
            message: 'Cannot rename this folder',
            code: 'FOLDER_RENAME_FORBIDDEN'
        });
    }

    if (name && name.trim() && name !== folder.name) {
        const oldPath = folder.path;
        const pathParts = oldPath.split('/');
        pathParts[pathParts.length - 1] = name.trim();
        const newPath = pathParts.join('/');

        const existingFolder = await TestFolder.findOne({
            project: projectId,
            path: newPath,
            isDeleted: false,
            _id: { $ne: folderId }
        });

        if (existingFolder) {
            return res.status(409).json({
                success: false,
                message: 'Folder with this name already exists',
                code: 'FOLDER_EXISTS'
            });
        }

        folder.name = name.trim();
        folder.path = newPath;

        const subFolders = await TestFolder.find({
            project: projectId,
            path: { $regex: `^${oldPath}/` }
        });

        for (const subFolder of subFolders) {
            subFolder.path = subFolder.path.replace(oldPath, newPath);
            await subFolder.save();
        }

        const files = await TestFile.find({
            project: projectId,
            path: { $regex: `^${oldPath}/` }
        });

        for (const file of files) {
            file.path = file.path.replace(oldPath, newPath);
            await file.save();
        }
    }

    if (description !== undefined) {
        folder.description = description;
    }

    if (type && ['root', 'test', 'step', 'hook', 'runner', 'utility', 'config', 'base', 'listener', 'helper', 'provider', 'model', 'feature', 'resource', 'custom'].includes(type)) {
        folder.type = type;
    }

    folder.updatedBy = req.user._id;
    await folder.save();

    console.log(`[FOLDER_UPDATE_SUCCESS] Folder updated: ${folder.path}`);

    return res.json({
        success: true,
        message: 'Folder updated successfully',
        data: {
            folder: {
                id: folder._id,
                name: folder.name,
                path: folder.path,
                type: folder.type,
                description: folder.description,
                updatedAt: folder.updatedAt
            }
        }
    });
});

const deleteFolder = catchAsync(async (req, res) => {
    const { projectId, folderId } = req.params;
    const { permanent = 'false', recursive = 'true' } = req.query;

    console.log(`[FOLDER_DELETE] Project: ${projectId}, Folder: ${folderId}, Permanent: ${permanent}, Recursive: ${recursive}`);

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

    if (folder.isSystemFolder && !folder.permissions.canDelete) {
        return res.status(403).json({
            success: false,
            message: 'Cannot delete system folder',
            code: 'SYSTEM_FOLDER_DELETE_FORBIDDEN'
        });
    }

    if (recursive === 'true') {
        const subFolders = await TestFolder.find({
            project: projectId,
            path: { $regex: `^${folder.path}/` }
        });

        for (const subFolder of subFolders) {
            if (permanent === 'true') {
                await TestFolder.deleteOne({ _id: subFolder._id });
            } else {
                await subFolder.softDelete(req.user._id);
            }
        }

        const files = await TestFile.find({
            project: projectId,
            path: { $regex: `^${folder.path}/` }
        });

        for (const file of files) {
            if (permanent === 'true') {
                await TestFile.deleteOne({ _id: file._id });
            } else {
                await file.softDelete(req.user._id);
            }
        }
    } else {
        const hasSubFolders = await TestFolder.countDocuments({
            parentFolder: folderId,
            isDeleted: false
        });

        const hasFiles = await TestFile.countDocuments({
            folder: folderId,
            isDeleted: false
        });

        if (hasSubFolders > 0 || hasFiles > 0) {
            return res.status(400).json({
                success: false,
                message: 'Folder is not empty. Use recursive=true to delete all contents',
                code: 'FOLDER_NOT_EMPTY'
            });
        }
    }

    if (permanent === 'true') {
        await TestFolder.deleteOne({ _id: folderId });
        console.log(`[FOLDER_DELETE_PERMANENT] Folder permanently deleted: ${folder.path}`);
    } else {
        await folder.softDelete(req.user._id);
        console.log(`[FOLDER_DELETE_SOFT] Folder soft deleted: ${folder.path}`);
    }

    if (folder.parentFolder) {
        const parentFolder = await TestFolder.findById(folder.parentFolder);
        if (parentFolder) {
            await parentFolder.removeSubFolder(folderId);
        }
    }

    return res.json({
        success: true,
        message: permanent === 'true' ? 'Folder permanently deleted' : 'Folder deleted successfully',
        data: {
            folderId: folderId,
            deleted: true
        }
    });
});

const restoreFolder = catchAsync(async (req, res) => {
    const { projectId, folderId } = req.params;

    console.log(`[FOLDER_RESTORE] Project: ${projectId}, Folder: ${folderId}`);

    const folder = await TestFolder.findOne({
        _id: folderId,
        project: projectId,
        isDeleted: true
    });

    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Deleted folder not found',
            code: 'FOLDER_NOT_FOUND'
        });
    }

    if (folder.parentFolder) {
        const parentFolder = await TestFolder.findOne({
            _id: folder.parentFolder,
            isDeleted: false
        });

        if (!parentFolder) {
            return res.status(400).json({
                success: false,
                message: 'Cannot restore folder: parent folder is deleted',
                code: 'PARENT_FOLDER_DELETED'
            });
        }
    }

    folder.isDeleted = false;
    folder.deletedAt = undefined;
    folder.deletedBy = undefined;
    await folder.save();

    console.log(`[FOLDER_RESTORE_SUCCESS] Folder restored: ${folder.path}`);

    return res.json({
        success: true,
        message: 'Folder restored successfully',
        data: {
            folder: {
                id: folder._id,
                name: folder.name,
                path: folder.path,
                type: folder.type
            }
        }
    });
});

const moveFolder = catchAsync(async (req, res) => {
    const { projectId, folderId } = req.params;
    const { targetParentFolderId } = req.body;

    console.log(`[FOLDER_MOVE] Project: ${projectId}, Folder: ${folderId}, Target: ${targetParentFolderId || 'root'}`);

    const folder = await TestFolder.findOne({
        _id: folderId,
        project: projectId,
        isDeleted: false
    });

    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
            code: 'FOLDER_NOT_FOUND'
        });
    }

    if (folder.isSystemFolder) {
        return res.status(403).json({
            success: false,
            message: 'Cannot move system folder',
            code: 'SYSTEM_FOLDER_MOVE_FORBIDDEN'
        });
    }

    let targetParent = null;
    let newPath = folder.name;
    let newLevel = 0;

    if (targetParentFolderId) {
        targetParent = await TestFolder.findOne({
            _id: targetParentFolderId,
            project: projectId,
            isDeleted: false
        });

        if (!targetParent) {
            return res.status(404).json({
                success: false,
                message: 'Target parent folder not found',
                code: 'TARGET_FOLDER_NOT_FOUND'
            });
        }

        if (targetParent.path.startsWith(folder.path)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot move folder into its own subfolder',
                code: 'INVALID_MOVE_TARGET'
            });
        }

        newPath = `${targetParent.path}/${folder.name}`;
        newLevel = targetParent.level + 1;
    }

    const oldPath = folder.path;
    const oldParentId = folder.parentFolder;

    folder.path = newPath;
    folder.parentFolder = targetParentFolderId || null;
    folder.level = newLevel;
    await folder.save();

    const subFolders = await TestFolder.find({
        project: projectId,
        path: { $regex: `^${oldPath}/` }
    });

    for (const subFolder of subFolders) {
        subFolder.path = subFolder.path.replace(oldPath, newPath);
        subFolder.level = subFolder.level - folder.level + newLevel;
        await subFolder.save();
    }

    const files = await TestFile.find({
        project: projectId,
        path: { $regex: `^${oldPath}/` }
    });

    for (const file of files) {
        file.path = file.path.replace(oldPath, newPath);
        await file.save();
    }

    if (oldParentId) {
        const oldParent = await TestFolder.findById(oldParentId);
        if (oldParent) {
            await oldParent.removeSubFolder(folderId);
        }
    }

    if (targetParent) {
        await targetParent.addSubFolder(folderId);
    }

    console.log(`[FOLDER_MOVE_SUCCESS] Folder moved from ${oldPath} to ${newPath}`);

    return res.json({
        success: true,
        message: 'Folder moved successfully',
        data: {
            folder: {
                id: folder._id,
                name: folder.name,
                path: folder.path,
                level: folder.level,
                parentFolder: folder.parentFolder
            }
        }
    });
});

module.exports = {
    createFolder,
    getFolder,
    getFoldersByProject,
    getFolderHierarchy,
    updateFolder,
    deleteFolder,
    restoreFolder,
    moveFolder
};