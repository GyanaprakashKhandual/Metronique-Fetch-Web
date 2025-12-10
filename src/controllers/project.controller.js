const Project = require('../models/project.model');
const TestFolder = require('../models/test.folder.model');
const TestFile = require('../models/test.file.model');
const AuditLog = require('../models/audit.model');
const DatabaseConnection = require('../models/database.connection.model');
const { catchAsync } = require('../utils/error.util');

const UNIFIED_STRUCTURE = {
    folders: [
        { name: 'src/test/java/com/api/tests', path: '/src/test/java/com/api/tests', type: 'test', level: 1 },
        { name: 'src/test/java/com/api/tests/api', path: '/src/test/java/com/api/tests/api', type: 'test', level: 2 },
        { name: 'src/test/java/com/api/tests/integration', path: '/src/test/java/com/api/tests/integration', type: 'test', level: 2 },
        { name: 'src/test/java/com/api/tests/smoke', path: '/src/test/java/com/api/tests/smoke', type: 'test', level: 2 },
        { name: 'src/test/java/com/api/tests/regression', path: '/src/test/java/com/api/tests/regression', type: 'test', level: 2 },
        { name: 'src/test/java/com/api/stepdefinitions', path: '/src/test/java/com/api/stepdefinitions', type: 'step', level: 1 },
        { name: 'src/test/java/com/api/stepdefinitions/api', path: '/src/test/java/com/api/stepdefinitions/api', type: 'step', level: 2 },
        { name: 'src/test/java/com/api/stepdefinitions/database', path: '/src/test/java/com/api/stepdefinitions/database', type: 'step', level: 2 },
        { name: 'src/test/java/com/api/stepdefinitions/auth', path: '/src/test/java/com/api/stepdefinitions/auth', type: 'step', level: 2 },
        { name: 'src/test/java/com/api/hooks', path: '/src/test/java/com/api/hooks', type: 'hook', level: 1 },
        { name: 'src/test/java/com/api/runners', path: '/src/test/java/com/api/runners', type: 'runner', level: 1 },
        { name: 'src/test/java/com/api/utils', path: '/src/test/java/com/api/utils', type: 'utility', level: 1 },
        { name: 'src/test/java/com/api/utils/api', path: '/src/test/java/com/api/utils/api', type: 'utility', level: 2 },
        { name: 'src/test/java/com/api/utils/database', path: '/src/test/java/com/api/utils/database', type: 'utility', level: 2 },
        { name: 'src/test/java/com/api/utils/auth', path: '/src/test/java/com/api/utils/auth', type: 'utility', level: 2 },
        { name: 'src/test/java/com/api/utils/common', path: '/src/test/java/com/api/utils/common', type: 'utility', level: 2 },
        { name: 'src/test/java/com/api/config', path: '/src/test/java/com/api/config', type: 'config', level: 1 },
        { name: 'src/test/java/com/api/base', path: '/src/test/java/com/api/base', type: 'base', level: 1 },
        { name: 'src/test/java/com/api/listeners', path: '/src/test/java/com/api/listeners', type: 'listener', level: 1 },
        { name: 'src/test/java/com/api/helpers', path: '/src/test/java/com/api/helpers', type: 'helper', level: 1 },
        { name: 'src/test/java/com/api/dataproviders', path: '/src/test/java/com/api/dataproviders', type: 'provider', level: 1 },
        { name: 'src/test/java/com/api/models', path: '/src/test/java/com/api/models', type: 'model', level: 1 },
        { name: 'src/test/java/com/api/models/request', path: '/src/test/java/com/api/models/request', type: 'model', level: 2 },
        { name: 'src/test/java/com/api/models/response', path: '/src/test/java/com/api/models/response', type: 'model', level: 2 },
        { name: 'src/test/resources', path: '/src/test/resources', type: 'resource', level: 1 },
        { name: 'src/test/resources/features', path: '/src/test/resources/features', type: 'feature', level: 2 },
        { name: 'src/test/resources/features/api', path: '/src/test/resources/features/api', type: 'feature', level: 3 },
        { name: 'src/test/resources/features/database', path: '/src/test/resources/features/database', type: 'feature', level: 3 },
        { name: 'src/test/resources/features/auth', path: '/src/test/resources/features/auth', type: 'feature', level: 3 },
        { name: 'src/test/resources/features/integration', path: '/src/test/resources/features/integration', type: 'feature', level: 3 },
        { name: 'src/test/resources/testdata', path: '/src/test/resources/testdata', type: 'resource', level: 2 },
        { name: 'src/test/resources/config', path: '/src/test/resources/config', type: 'resource', level: 2 },
        { name: 'src/test/resources/schemas', path: '/src/test/resources/schemas', type: 'resource', level: 2 },
        { name: 'src/test/resources/schemas/request', path: '/src/test/resources/schemas/request', type: 'resource', level: 3 },
        { name: 'src/test/resources/schemas/response', path: '/src/test/resources/schemas/response', type: 'resource', level: 3 }
    ],

    javaFiles: {
        'src/test/java/com/api/runners': ['TestRunner.java', 'ApiTestRunner.java', 'SmokeTestRunner.java', 'RegressionTestRunner.java'],
        'src/test/java/com/api/hooks': ['Hooks.java', 'TestContext.java'],
        'src/test/java/com/api/stepdefinitions/api': ['UserApiSteps.java', 'ProductApiSteps.java', 'AuthApiSteps.java'],
        'src/test/java/com/api/stepdefinitions/database': ['DatabaseSteps.java'],
        'src/test/java/com/api/stepdefinitions/auth': ['AuthenticationSteps.java'],
        'src/test/java/com/api/utils/api': ['RestAssuredUtil.java', 'RequestBuilder.java', 'ApiClient.java'],
        'src/test/java/com/api/utils/database': ['DatabaseUtil.java', 'QueryExecutor.java'],
        'src/test/java/com/api/utils/auth': ['AuthUtil.java', 'TokenManager.java'],
        'src/test/java/com/api/utils/common': ['JsonUtil.java', 'FileUtil.java'],
        'src/test/java/com/api/config': ['TestConfig.java', 'EnvironmentConfig.java', 'ApiConfig.java'],
        'src/test/java/com/api/base': ['BaseTest.java', 'BaseApiTest.java'],
        'src/test/java/com/api/listeners': ['TestListener.java', 'RetryListener.java', 'ReportListener.java'],
        'src/test/java/com/api/helpers': ['AuthHelper.java', 'AssertionHelper.java', 'DataHelper.java'],
        'src/test/java/com/api/dataproviders': ['ApiDataProvider.java'],
        'src/test/java/com/api/tests/api': ['UserApiTest.java', 'ProductApiTest.java'],
        'src/test/java/com/api/tests/integration': ['IntegrationTest.java'],
        'src/test/java/com/api/tests/smoke': ['SmokeTest.java'],
        'src/test/java/com/api/tests/regression': ['RegressionTest.java'],
        'src/test/java/com/api/models/request': ['UserRequest.java', 'ProductRequest.java'],
        'src/test/java/com/api/models/response': ['UserResponse.java', 'ProductResponse.java']
    },

    featureFiles: {
        'src/test/resources/features/api': ['user-api.feature', 'product-api.feature'],
        'src/test/resources/features/database': ['database.feature'],
        'src/test/resources/features/auth': ['authentication.feature'],
        'src/test/resources/features/integration': ['integration.feature']
    },

    configFiles: {
        'src/test/resources/testdata': ['users.json', 'products.json', 'auth-tokens.json'],
        'src/test/resources/config': ['test.properties', 'log4j2.xml', 'cucumber.properties'],
        'src/test/resources/schemas/request': ['user-request-schema.json', 'product-request-schema.json'],
        'src/test/resources/schemas/response': ['user-response-schema.json', 'product-response-schema.json']
    },

    rootFiles: ['pom.xml', 'testng.xml', 'README.md', '.gitignore']
};

const createProjectWithUnifiedStructure = catchAsync(async (req, res) => {
    const {
        name,
        description,
        team,
        visibility,
        repository,
        technology,
        databaseConnections
    } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: 'Project name is required',
            code: 'NAME_REQUIRED'
        });
    }

    const project = new Project({
        name: name.trim(),
        description: description?.trim(),
        owner: req.user._id,
        team: team || null,
        visibility: visibility || 'private',
        status: 'active',
        repository: repository ? {
            connected: repository.connected || false,
            url: repository.url,
            fullName: repository.fullName,
            owner: repository.owner,
            name: repository.name,
            branch: repository.branch || 'main',
            lastSync: repository.lastSync || null,
            accessToken: repository.accessToken,
            webhookId: repository.webhookId,
            webhookSecret: repository.webhookSecret
        } : {
            connected: false
        },
        technology: technology || {
            language: 'java',
            framework: 'spring-boot',
            database: ['mongodb'],
            orm: 'hibernate'
        },
        testConfig: {
            framework: 'unified',
            language: 'java',
            buildTool: 'maven',
            timeout: 30000,
            retryCount: 2,
            parallel: true,
            threadCount: 4
        },
        stats: {
            totalTests: 0,
            totalTestsPassed: 0,
            totalTestsFailed: 0,
            totalTestsSkipped: 0,
            successRate: 0,
            averageExecutionTime: 0,
            totalExecutions: 0
        }
    });

    let dbConnections = [];
    if (databaseConnections && Array.isArray(databaseConnections)) {
        for (const dbConfig of databaseConnections) {
            const dbConnection = new DatabaseConnection({
                project: project._id,
                name: dbConfig.name,
                type: dbConfig.type,
                host: dbConfig.host,
                port: dbConfig.port,
                username: dbConfig.username,
                password: dbConfig.password,
                database: dbConfig.database,
                connectionString: dbConfig.connectionString,
                createdBy: req.user._id
            });
            const saved = await dbConnection.save();
            dbConnections.push(saved._id);
        }
        project.databaseConnections = dbConnections;
    }

    await project.save();

    const rootFolder = new TestFolder({
        project: project._id,
        name: project.slug,
        path: `/${project.slug}`,
        type: 'root',
        level: 0,
        description: 'Unified API Testing Environment (Cucumber + REST Assured + TestNG)',
        isSystemFolder: true,
        createdBy: req.user._id
    });

    await rootFolder.save();

    const folderMap = { '/': rootFolder._id };
    let totalFolders = 1;
    let totalFiles = UNIFIED_STRUCTURE.rootFiles.length;

    for (const folderConfig of UNIFIED_STRUCTURE.folders) {
        const folder = new TestFolder({
            project: project._id,
            name: folderConfig.name.split('/').pop(),
            path: `/${project.slug}${folderConfig.path}`,
            parentFolder: rootFolder._id,
            type: folderConfig.type,
            level: folderConfig.level,
            description: folderConfig.name,
            isSystemFolder: true,
            createdBy: req.user._id
        });

        await folder.save();
        folderMap[folderConfig.path] = folder._id;
        totalFolders++;
    }

    for (const [folderPath, fileList] of Object.entries(UNIFIED_STRUCTURE.javaFiles)) {
        const parentFolderId = folderMap[folderPath];
        if (!parentFolderId) continue;

        for (const fileName of fileList) {
            const javaTemplate = `package com.api;

public class ${fileName.replace('.java', '')} {
    // Auto-generated stub
}`;

            const file = new TestFile({
                project: project._id,
                folder: parentFolderId,
                name: fileName,
                fileName: fileName,
                path: `/${project.slug}${folderPath}/${fileName}`,
                extension: 'java',
                type: 'java',
                language: 'java',
                content: javaTemplate,
                originalContent: javaTemplate,
                size: Buffer.byteLength(javaTemplate),
                lines: javaTemplate.split('\n').length,
                syntax: { valid: true, errors: [] },
                status: 'validated',
                isGenerated: true,
                generatedBy: 'system',
                isEditable: true,
                createdBy: req.user._id
            });

            await file.save();
            totalFiles++;
        }
    }

    for (const [folderPath, fileList] of Object.entries(UNIFIED_STRUCTURE.featureFiles)) {
        const parentFolderId = folderMap[folderPath];
        if (!parentFolderId) continue;

        for (const fileName of fileList) {
            const featureTemplate = `Feature: ${fileName.replace('.feature', '').replace('-', ' ')}
  
  Scenario: Sample scenario
    Given step one
    When step two
    Then step three`;

            const file = new TestFile({
                project: project._id,
                folder: parentFolderId,
                name: fileName,
                fileName: fileName,
                path: `/${project.slug}${folderPath}/${fileName}`,
                extension: 'feature',
                type: 'feature',
                language: 'gherkin',
                content: featureTemplate,
                originalContent: featureTemplate,
                size: Buffer.byteLength(featureTemplate),
                lines: featureTemplate.split('\n').length,
                syntax: { valid: true, errors: [] },
                status: 'validated',
                isGenerated: true,
                generatedBy: 'system',
                isEditable: true,
                createdBy: req.user._id
            });

            await file.save();
            totalFiles++;
        }
    }

    for (const [folderPath, fileList] of Object.entries(UNIFIED_STRUCTURE.configFiles)) {
        const parentFolderId = folderMap[folderPath];
        if (!parentFolderId) continue;

        for (const fileName of fileList) {
            let configContent = '';

            if (fileName.endsWith('.json')) {
                configContent = JSON.stringify({ data: 'Test data' }, null, 2);
            } else {
                configContent = `# ${fileName}\n# Configuration`;
            }

            const file = new TestFile({
                project: project._id,
                folder: parentFolderId,
                name: fileName,
                fileName: fileName,
                path: `/${project.slug}${folderPath}/${fileName}`,
                extension: fileName.split('.').pop(),
                type: 'config',
                language: fileName.endsWith('.json') ? 'json' : 'properties',
                content: configContent,
                originalContent: configContent,
                size: Buffer.byteLength(configContent),
                lines: configContent.split('\n').length,
                syntax: { valid: true, errors: [] },
                status: 'validated',
                isGenerated: true,
                generatedBy: 'system',
                isEditable: true,
                createdBy: req.user._id
            });

            await file.save();
            totalFiles++;
        }
    }

    for (const rootFileName of UNIFIED_STRUCTURE.rootFiles) {
        let rootContent = '';

        if (rootFileName === 'pom.xml') {
            rootContent = `<?xml version="1.0"?>
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.api</groupId>
    <artifactId>${project.slug}</artifactId>
    <version>1.0.0</version>
</project>`;
        } else if (rootFileName === 'testng.xml') {
            rootContent = `<?xml version="1.0"?>
<suite name="API Tests">
</suite>`;
        } else if (rootFileName === 'README.md') {
            rootContent = `# ${name}\n\nUnified API Testing Environment`;
        } else if (rootFileName === '.gitignore') {
            rootContent = `target/\n.idea/\n*.class`;
        }

        const file = new TestFile({
            project: project._id,
            folder: rootFolder._id,
            name: rootFileName,
            fileName: rootFileName,
            path: `/${project.slug}/${rootFileName}`,
            extension: rootFileName.split('.').pop(),
            type: 'config',
            language: 'text',
            content: rootContent,
            originalContent: rootContent,
            size: Buffer.byteLength(rootContent),
            lines: rootContent.split('\n').length,
            syntax: { valid: true, errors: [] },
            status: 'validated',
            isGenerated: true,
            generatedBy: 'system',
            isEditable: true,
            createdBy: req.user._id
        });

        await file.save();
    }

    project.testFolder = {
        generated: true,
        generatedAt: Date.now(),
        rootPath: rootFolder.path,
        totalFiles: totalFiles,
        totalFolders: totalFolders,
        framework: 'unified',
        integrated: ['cucumber', 'rest-assured', 'testng']
    };

    await project.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'project_created_unified_structure',
        actionCategory: 'project',
        entityType: 'project',
        entityId: project._id,
        status: 'success',
        severity: 'info',
        details: {
            name,
            framework: 'unified',
            totalFolders,
            totalFiles,
            repositoryConnected: repository?.connected || false,
            databasesConnected: dbConnections.length
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    return res.status(201).json({
        success: true,
        message: 'Unified API Testing Environment created successfully',
        data: {
            project: {
                id: project._id,
                name: project.name,
                slug: project.slug,
                status: project.status,
                framework: 'unified',
                integrated: ['Cucumber', 'REST Assured', 'TestNG'],
                owner: project.owner,
                repository: project.repository,
                technology: project.technology,
                databaseConnections: dbConnections,
                createdAt: project.createdAt,
                structure: { totalFolders, totalFiles, rootPath: rootFolder.path }
            }
        }
    });
});

const createProject = catchAsync(async (req, res) => {
    const {
        name,
        description,
        team,
        visibility,
        repository,
        technology,
        databaseConnections
    } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: 'Project name is required',
            code: 'NAME_REQUIRED'
        });
    }

    const project = new Project({
        name: name.trim(),
        description: description?.trim(),
        owner: req.user._id,
        team: team || null,
        visibility: visibility || 'private',
        status: 'draft',
        repository: repository ? {
            connected: repository.connected || false,
            url: repository.url,
            fullName: repository.fullName,
            owner: repository.owner,
            name: repository.name,
            branch: repository.branch || 'main',
            lastSync: repository.lastSync || null,
            accessToken: repository.accessToken,
            webhookId: repository.webhookId,
            webhookSecret: repository.webhookSecret
        } : {
            connected: false
        },
        technology: technology || {
            language: 'java',
            framework: 'spring-boot',
            database: ['mongodb'],
            orm: 'hibernate'
        },
        testConfig: {
            framework: 'rest-assured',
            language: 'java',
            buildTool: 'maven',
            timeout: 30000,
            retryCount: 2,
            parallel: false,
            threadCount: 1
        },
        stats: {
            totalTests: 0,
            totalTestsPassed: 0,
            totalTestsFailed: 0,
            totalTestsSkipped: 0,
            successRate: 0,
            averageExecutionTime: 0,
            totalExecutions: 0
        }
    });

    let dbConnections = [];
    if (databaseConnections && Array.isArray(databaseConnections)) {
        for (const dbConfig of databaseConnections) {
            const dbConnection = new DatabaseConnection({
                project: project._id,
                name: dbConfig.name,
                type: dbConfig.type,
                host: dbConfig.host,
                port: dbConfig.port,
                username: dbConfig.username,
                password: dbConfig.password,
                database: dbConfig.database,
                connectionString: dbConfig.connectionString,
                createdBy: req.user._id
            });
            const saved = await dbConnection.save();
            dbConnections.push(saved._id);
        }
        project.databaseConnections = dbConnections;
    }

    await project.save();

    const rootFolder = new TestFolder({
        project: project._id,
        name: project.slug,
        path: `/${project.slug}`,
        type: 'root',
        level: 0,
        description: 'Root folder for test project',
        isSystemFolder: true,
        createdBy: req.user._id
    });

    await rootFolder.save();

    project.testFolder = {
        generated: false,
        generatedAt: null,
        rootPath: rootFolder.path,
        totalFiles: 0,
        totalFolders: 1
    };

    await project.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'project_created',
        actionCategory: 'project',
        entityType: 'project',
        entityId: project._id,
        status: 'success',
        severity: 'info',
        details: {
            name,
            team,
            repositoryConnected: repository?.connected || false,
            databasesConnected: dbConnections.length
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    return res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: {
            project: {
                id: project._id,
                name: project.name,
                slug: project.slug,
                status: project.status,
                owner: project.owner,
                team: project.team,
                repository: project.repository,
                technology: project.technology,
                databaseConnections: dbConnections,
                createdAt: project.createdAt
            }
        }
    });
});

const getProjectById = catchAsync(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
        .populate('owner', 'firstName lastName email avatar')
        .populate('team', 'name avatar')
        .populate('databaseConnections')
        .lean();

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const hasAccess = await Project.findById(projectId).then(p => p.hasAccess(req.user._id));

    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'You do not have access to this project',
            code: 'ACCESS_DENIED'
        });
    }

    return res.json({
        success: true,
        data: { project }
    });
});

const getUserProjects = catchAsync(async (req, res) => {
    const { page = 1, limit = 10, status, search } = req.query;

    const query = {
        $or: [
            { owner: req.user._id },
            { 'collaborators.user': req.user._id }
        ],
        isDeleted: false
    };

    if (status) {
        query.status = status;
    }

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (page - 1) * limit;

    const projects = await Project.find(query)
        .populate('owner', 'firstName lastName email avatar')
        .populate('team', 'name avatar')
        .populate('databaseConnections')
        .select('-repository.accessToken -testConfig.environmentVariables')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await Project.countDocuments(query);

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

module.exports = {
    createProject,
    createProjectWithUnifiedStructure,
    getProjectById,
    getUserProjects
};