const TestFolder = require('../models/test.folder.model');
const Project = require('../models/project.model');
const AuditLog = require('../models/audit.model');
const { catchAsync } = require('../utils/error.util');
const testFolderGeneratorService = require('../services/testing/test.folder.generator.service');

const generateTestFolderStructure = catchAsync(async (req, res) => {
    const { projectId } = req.body;
    console.log(`[TEST_FOLDER] Generating test folder structure for project: ${projectId}`);

    if (!projectId) {
        return res.status(400).json({
            success: false,
            message: 'Project ID is required',
            code: 'PROJECT_ID_REQUIRED'
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

    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    if (project.testFolder.generated) {
        return res.status(400).json({
            success: false,
            message: 'Test folder structure already generated',
            code: 'ALREADY_GENERATED'
        });
    }

    // Generate folder structure based on framework
    const framework = project.testConfig.framework || 'rest-assured';
    const result = await testFolderGeneratorService.generateStructure(
        projectId,
        framework,
        req.user._id
    );

    // Update project
    project.testFolder.generated = true;
    project.testFolder.generatedAt = Date.now();
    project.testFolder.rootPath = result.rootPath;
    project.testFolder.totalFolders = result.totalFolders;
    project.testFolder.totalFiles = result.totalFiles;
    project.testFolder.structure = result.structure;
    await project.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'test_folder_generated',
        actionCategory: 'testing',
        entityType: 'project',
        entityId: project._id,
        status: 'success',
        severity: 'info',
        details: { framework, totalFolders: result.totalFolders, totalFiles: result.totalFiles },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[TEST_FOLDER] Test folder structure generated: ${result.totalFolders} folders, ${result.totalFiles} files`);

    return res.status(201).json({
        success: true,
        message: 'Test folder structure generated successfully',
        data: {
            structure: result.structure,
            totalFolders: result.totalFolders,
            totalFiles: result.totalFiles
        }
    });
});

const getTestFolderStructure = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[TEST_FOLDER] Fetching test folder structure: ${projectId}`);

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

    if (!project.testFolder.generated) {
        return res.status(404).json({
            success: false,
            message: 'Test folder structure not generated yet',
            code: 'NOT_GENERATED'
        });
    }

    // Get root folder
    const rootFolder = await TestFolder.findOne({
        project: projectId,
        type: 'root'
    })
        .populate({
            path: 'subFolders',
            populate: {
                path: 'subFolders files'
            }
        })
        .populate('files')
        .lean();

    // Build folder tree recursively
    const buildTree = async (folderId) => {
        const folder = await TestFolder.findById(folderId)
            .populate('subFolders')
            .populate('files')
            .lean();

        if (!folder) return null;

        const children = [];
        for (const subFolderId of folder.subFolders) {
            const child = await buildTree(subFolderId);
            if (child) children.push(child);
        }

        return {
            id: folder._id,
            name: folder.name,
            path: folder.path,
            type: folder.type,
            description: folder.description,
            files: folder.files,
            children: children,
            metadata: folder.metadata
        };
    };

    const folderTree = await buildTree(rootFolder._id);

    console.log(`[TEST_FOLDER] Folder structure fetched`);

    return res.json({
        success: true,
        data: {
            folderTree,
            totalFolders: project.testFolder.totalFolders,
            totalFiles: project.testFolder.totalFiles
        }
    });
});

const createFolder = catchAsync(async (req, res) => {
    const { projectId, parentFolderId, name, type, description } = req.body;
    console.log(`[TEST_FOLDER] Creating folder: ${name}`);

    if (!projectId || !name) {
        return res.status(400).json({
            success: false,
            message: 'Project ID and folder name are required',
            code: 'MISSING_FIELDS'
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

    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    // Get parent folder
    let parentFolder = null;
    let parentPath = '';
    let level = 0;

    if (parentFolderId) {
        parentFolder = await TestFolder.findById(parentFolderId);
        if (!parentFolder) {
            return res.status(404).json({
                success: false,
                message: 'Parent folder not found',
                code: 'PARENT_NOT_FOUND'
            });
        }
        parentPath = parentFolder.path;
        level = parentFolder.level + 1;
    } else {
        // Find root folder
        parentFolder = await TestFolder.findOne({ project: projectId, type: 'root' });
        if (parentFolder) {
            parentPath = parentFolder.path;
            level = 1;
        }
    }

    const folderPath = `${parentPath}/${name}`;

    // Check if folder already exists
    const existingFolder = await TestFolder.findOne({
        project: projectId,
        path: folderPath
    });

    if (existingFolder) {
        return res.status(400).json({
            success: false,
            message: 'Folder already exists at this path',
            code: 'FOLDER_EXISTS'
        });
    }

    // Create folder
    const newFolder = new TestFolder({
        project: projectId,
        name: name.trim(),
        path: folderPath,
        parentFolder: parentFolderId || parentFolder?._id,
        type: type || 'custom',
        level: level,
        description: description?.trim(),
        createdBy: req.user._id
    });

    await newFolder.save();

    // Update parent folder
    if (parentFolder) {
        await parentFolder.addSubFolder(newFolder._id);
    }

    // Update project stats
    project.testFolder.totalFolders++;
    await project.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'folder_created',
        actionCategory: 'file_management',
        entityType: 'test_folder',
        entityId: newFolder._id,
        status: 'success',
        severity: 'info',
        details: { projectId, name, path: folderPath },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[TEST_FOLDER] Folder created: ${newFolder._id}`);

    return res.status(201).json({
        success: true,
        message: 'Folder created successfully',
        data: {
            folder: {
                id: newFolder._id,
                name: newFolder.name,
                path: newFolder.path,
                type: newFolder.type
            }
        }
    });
});

module.exports = {
    generateTestFolderStructure,
    getTestFolderStructure,
    createFolder
};