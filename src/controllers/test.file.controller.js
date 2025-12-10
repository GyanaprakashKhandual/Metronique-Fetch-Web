const TestFile = require('../models/test.file.model');
const TestFolder = require('../models/test.folder.model');
const Project = require('../models/project.model');
const FileVersion = require('../models/file.version.model');
const AuditLog = require('../models/audit.model');
const { catchAsync } = require('../utils/error.util');
const fileValidationService = require('../services/file-manager/file.validation.service');

const createTestFile = catchAsync(async (req, res) => {
    const { projectId, folderId, name, content, type, language } = req.body;
    console.log(`[TEST_FILE] Creating file: ${name}`);

    if (!projectId || !folderId || !name || !content) {
        return res.status(400).json({
            success: false,
            message: 'Project ID, folder ID, name, and content are required',
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

    // Check folder exists
    const folder = await TestFolder.findById(folderId);
    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
            code: 'FOLDER_NOT_FOUND'
        });
    }

    // Extract file extension
    const fileName = name.trim();
    const extension = fileName.split('.').pop().toLowerCase();
    const filePath = `${folder.path}/${fileName}`;

    // Check if file already exists
    const existingFile = await TestFile.findOne({
        project: projectId,
        path: filePath
    });

    if (existingFile && !existingFile.isDeleted) {
        return res.status(400).json({
            success: false,
            message: 'File already exists at this path',
            code: 'FILE_EXISTS'
        });
    }

    // Validate syntax
    let syntaxValidation = { valid: true, errors: [] };
    try {
        syntaxValidation = await fileValidationService.validateSyntax(content, language || extension);
    } catch (error) {
        console.warn(`[TEST_FILE] Syntax validation failed:`, error);
    }

    // Create file
    const testFile = new TestFile({
        project: projectId,
        folder: folderId,
        name: fileName,
        fileName: fileName,
        path: filePath,
        extension: extension,
        type: type || 'other',
        language: language || detectLanguage(extension),
        content: content,
        originalContent: content,
        size: Buffer.byteLength(content, 'utf-8'),
        lines: content.split('\n').length,
        syntax: syntaxValidation,
        status: syntaxValidation.valid ? 'validated' : 'error',
        isGenerated: false,
        generatedBy: 'user',
        isEditable: true,
        createdBy: req.user._id
    });

    await testFile.save();

    // Create initial version
    const initialVersion = new FileVersion({
        file: testFile._id,
        project: projectId,
        version: 1,
        content: content,
        changes: 'Initial version',
        size: testFile.size,
        createdBy: req.user._id
    });

    await initialVersion.save();

    testFile.version.history.push(initialVersion._id);
    await testFile.save();

    // Update folder
    await folder.addFile(testFile._id, testFile.size);

    // Update project stats
    project.testFolder.totalFiles++;
    await project.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'file_created',
        actionCategory: 'file_management',
        entityType: 'test_file',
        entityId: testFile._id,
        status: 'success',
        severity: 'info',
        details: { projectId, folderId, name, path: filePath },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[TEST_FILE] File created: ${testFile._id}`);

    return res.status(201).json({
        success: true,
        message: 'File created successfully',
        data: {
            file: {
                id: testFile._id,
                name: testFile.name,
                path: testFile.path,
                type: testFile.type,
                language: testFile.language,
                status: testFile.status,
                size: testFile.size,
                lines: testFile.lines
            }
        }
    });
});

const getTestFile = catchAsync(async (req, res) => {
    const { fileId } = req.params;
    console.log(`[TEST_FILE] Fetching file: ${fileId}`);

    const testFile = await TestFile.findById(fileId)
        .populate('project', 'name slug')
        .populate('folder', 'name path')
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email')
        .populate('lockedBy', 'firstName lastName email')
        .lean();

    if (!testFile) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
            code: 'FILE_NOT_FOUND'
        });
    }

    // Check access
    const project = await Project.findById(testFile.project._id);
    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    console.log(`[TEST_FILE] File fetched: ${testFile.name}`);

    return res.json({
        success: true,
        data: { file: testFile }
    });
});

const getFilesByFolder = catchAsync(async (req, res) => {
    const { folderId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    console.log(`[TEST_FILE] Fetching files for folder: ${folderId}`);

    const folder = await TestFolder.findById(folderId);
    if (!folder) {
        return res.status(404).json({
            success: false,
            message: 'Folder not found',
            code: 'FOLDER_NOT_FOUND'
        });
    }

    // Check access
    const project = await Project.findById(folder.project);
    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    const skip = (page - 1) * limit;

    const files = await TestFile.find({
        folder: folderId,
        isDeleted: false
    })
        .select('-content -originalContent')
        .populate('createdBy', 'firstName lastName')
        .populate('lastModifiedBy', 'firstName lastName')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await TestFile.countDocuments({
        folder: folderId,
        isDeleted: false
    });

    console.log(`[TEST_FILE] Files fetched: ${files.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            files,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});

function detectLanguage(extension) {
    const languageMap = {
        'java': 'java',
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'xml': 'xml',
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'properties': 'properties',
        'feature': 'gherkin',
        'md': 'markdown',
        'txt': 'text'
    };
    return languageMap[extension] || 'text';
}

module.exports = {
    createTestFile,
    getTestFile,
    getFilesByFolder
};