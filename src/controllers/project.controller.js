const Project = require('../models/project.model');
const TestFolder = require('../models/test.folder.model');
const TestFile = require('../models/test.file.model');
const ProjectService = require('../services/project/project.service');
const ProjectConfigService = require('../services/project/project.config.service');
const { catchAsync } = require('../utils/error.util');
const fs = require('fs').promises;
const path = require('path');

const TEMPLATE_FILES = {
    'Base.java': `package com.{company}.{project}.base;

import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.AfterClass;

public class Base {
    protected String baseURI;
    protected String basePath;

    @BeforeClass
    public void setup() {
        baseURI = System.getProperty("baseURI", "http://localhost:8080");
        basePath = "/api";
        RestAssured.baseURI = baseURI;
        RestAssured.basePath = basePath;
    }

    @AfterClass
    public void tearDown() {
        RestAssured.reset();
    }

    protected Response get(String endpoint) {
        return RestAssured.given().when().get(endpoint);
    }

    protected Response post(String endpoint, Object body) {
        return RestAssured.given()
            .contentType("application/json")
            .body(body)
            .when()
            .post(endpoint);
    }

    protected Response put(String endpoint, Object body) {
        return RestAssured.given()
            .contentType("application/json")
            .body(body)
            .when()
            .put(endpoint);
    }

    protected Response delete(String endpoint) {
        return RestAssured.given().when().delete(endpoint);
    }
}
`,

    'ConfigReader.java': `package com.{company}.{project}.config;

import java.io.IOException;
import java.util.Properties;

public class ConfigReader {
    private static Properties properties;

    static {
        properties = new Properties();
        try {
            properties.load(ConfigReader.class.getResourceAsStream("/application.properties"));
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static String getProperty(String key) {
        return properties.getProperty(key);
    }

    public static String getBaseUrl() {
        return getProperty("base.url");
    }

    public static int getTimeout() {
        return Integer.parseInt(getProperty("timeout"));
    }

    public static int getRetryCount() {
        return Integer.parseInt(getProperty("retry.count"));
    }
}
`,

    'application.properties': `base.url=http://localhost:8080
timeout=30000
retry.count=2
log.level=INFO
`,

    '.gitignore': `# Maven
target/
*.class
*.jar
*.war
*.ear
*.zip
*.tar.gz

# IDE
.idea/
*.iml
*.iws
*.ipr
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test Reports
reports/
allure-results/

# Dependencies
.classpath
.project
.settings/
bin/

# Logs
*.log
logs/
`,

    'README.md': `# {projectName} API Tests

Automated API Testing Suite for {projectName}

## Tech Stack
- REST-Assured
- TestNG
- Cucumber (BDD)
- Maven

## Project Structure

\`\`\`
src/
├── test/
│   ├── java/
│   │   └── com/{company}/{project}/
│   │       ├── base/              # Base test classes
│   │       ├── tests/             # Test classes
│   │       ├── features/          # Cucumber scenarios
│   │       ├── steps/             # Step definitions
│   │       ├── hooks/             # Before/After hooks
│   │       ├── utilities/         # Helper classes
│   │       ├── config/            # Configuration
│   │       ├── models/            # POJOs
│   │       ├── listeners/         # TestNG listeners
│   │       └── data/              # Test data
│   └── resources/
│       ├── application.properties
│       ├── features/
│       └── testng.xml
pom.xml
\`\`\`

## Running Tests

\`\`\`bash
# Run all tests
mvn test

# Run specific test suite
mvn test -Dsuites=testng.xml

# Generate Allure report
mvn allure:report
\`\`\`

## Configuration

Edit \`application.properties\` to configure:
- Base URL
- Timeout values
- Retry counts
- Log levels
`,

    'testng.xml': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE suite SYSTEM "http://testng.org/testng-current.dtd">
<suite name="API Test Suite" parallel="methods" thread-count="5">
    <test name="Regression Tests">
        <classes>
            <!-- Test classes will be added here -->
        </classes>
    </test>
</suite>
`
};

const generateFolderStructure = async (projectId, userId) => {
    const folderTypes = [
        { name: 'base', type: 'base', description: 'Base test classes' },
        { name: 'tests', type: 'test', description: 'Test classes' },
        { name: 'features', type: 'feature', description: 'Cucumber feature files' },
        { name: 'steps', type: 'step', description: 'Step definitions' },
        { name: 'hooks', type: 'hook', description: 'Before/After hooks' },
        { name: 'utilities', type: 'utility', description: 'Helper classes and utilities' },
        { name: 'config', type: 'config', description: 'Configuration files' },
        { name: 'models', type: 'model', description: 'API response/request models' },
        { name: 'listeners', type: 'listener', description: 'TestNG listeners' },
        { name: 'data', type: 'resource', description: 'Test data files' }
    ];

    const createdFolders = [];

    for (const folderConfig of folderTypes) {
        const folder = new TestFolder({
            project: projectId,
            name: folderConfig.name,
            path: folderConfig.name,
            type: folderConfig.type,
            level: 0,
            description: folderConfig.description,
            createdBy: userId,
            isSystemFolder: true
        });

        await folder.save();
        createdFolders.push(folder);
    }

    return createdFolders;
};

const generateTemplateFiles = async (projectId, folders, userId, projectName, company = 'company') => {
    const createdFiles = [];
    const configFolder = folders.find(f => f.name === 'config');
    const baseFolder = folders.find(f => f.name === 'base');

    for (const [fileName, content] of Object.entries(TEMPLATE_FILES)) {
        let targetFolder = configFolder;
        let fileType = 'config';
        let fileLanguage = 'properties';

        if (fileName === 'Base.java') {
            targetFolder = baseFolder;
            fileType = 'test';
            fileLanguage = 'java';
        } else if (fileName === '.gitignore') {
            fileLanguage = 'text';
            fileType = 'config';
        } else if (fileName === 'README.md') {
            fileLanguage = 'markdown';
            fileType = 'config';
        } else if (fileName === 'testng.xml') {
            fileLanguage = 'xml';
            fileType = 'testng';
        }

        const processedContent = content
            .replace(/{company}/g, company)
            .replace(/{project}/g, projectName.toLowerCase().replace(/\s+/g, ''))
            .replace(/{projectName}/g, projectName);

        const file = new TestFile({
            project: projectId,
            folder: targetFolder._id,
            name: fileName,
            fileName: fileName,
            path: `${targetFolder.path}/${fileName}`,
            extension: fileName.split('.').pop(),
            type: fileType,
            language: fileLanguage,
            content: processedContent,
            originalContent: processedContent,
            size: Buffer.byteLength(processedContent, 'utf-8'),
            lines: processedContent.split('\n').length,
            status: 'draft',
            isGenerated: true,
            generatedBy: 'system',
            isEditable: false,
            isSystemFile: true,
            createdBy: userId
        });

        await file.save();
        createdFiles.push(file);
    }

    return createdFiles;
};

const createProject = catchAsync(async (req, res) => {
    const { name, description, visibility = 'private', category = 'web-api', priority = 'medium', teamId = null } = req.body;

    console.log(`[PROJECT_CREATE] Name: ${name}, User: ${req.user._id}, Team: ${teamId}`);

    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Project name is required',
            code: 'PROJECT_NAME_REQUIRED'
        });
    }

    const projectData = {
        name: name.trim(),
        description: description || '',
        visibility,
        category,
        priority,
        testConfig: {
            framework: 'rest-assured',
            language: 'java',
            buildTool: 'maven',
            baseUrl: '',
            timeout: 30000,
            retryCount: 2,
            parallel: false,
            threadCount: 1,
            environmentVariables: [],
            defaultHeaders: []
        }
    };

    try {
        const newProject = await ProjectService.createProject(projectData, req.user._id, teamId, {
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        console.log(`[PROJECT_CREATE_STRUCTURE] Generating folder structure for: ${newProject._id}`);

        const folders = await generateFolderStructure(newProject._id, req.user._id);
        console.log(`[PROJECT_FOLDERS_CREATED] Created ${folders.length} folders`);

        const files = await generateTemplateFiles(newProject._id, folders, req.user._id, name);
        console.log(`[PROJECT_FILES_CREATED] Created ${files.length} template files`);

        const updatedProject = await Project.findById(newProject._id).populate('owner', 'firstName lastName email');

        console.log(`[PROJECT_CREATE_SUCCESS] Project created: ${newProject._id}`);

        return res.status(201).json({
            success: true,
            message: 'Project created successfully with auto-generated structure',
            data: {
                project: {
                    id: updatedProject._id,
                    name: updatedProject.name,
                    description: updatedProject.description,
                    status: updatedProject.status,
                    visibility: updatedProject.visibility,
                    category: updatedProject.category,
                    priority: updatedProject.priority,
                    owner: updatedProject.owner,
                    structure: {
                        foldersCreated: folders.length,
                        filesCreated: files.length
                    },
                    createdAt: updatedProject.createdAt
                }
            }
        });
    } catch (error) {
        console.error(`[PROJECT_CREATE_ERROR] ${error.message}`);
        return res.status(400).json({
            success: false,
            message: error.message,
            code: 'PROJECT_CREATE_FAILED'
        });
    }
});

const getProjectById = catchAsync(async (req, res) => {
    const { projectId } = req.params;

    console.log(`[PROJECT_GET] Project: ${projectId}`);

    const project = await Project.findById(projectId)
        .populate('owner', 'firstName lastName email avatar')
        .populate('team', 'name')
        .populate('databaseConnections', 'name type environment status isDefault')
        .populate('repository', 'name fullName language isPrivate connection');

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
            message: 'Access denied to this project',
            code: 'PROJECT_ACCESS_DENIED'
        });
    }

    const rootFolders = await TestFolder.find({
        project: projectId,
        parentFolder: null,
        isDeleted: false
    }).select('_id name path type level metadata');

    const buildHierarchy = async (folderId) => {
        const subFolders = await TestFolder.find({
            parentFolder: folderId,
            project: projectId,
            isDeleted: false
        }).select('_id name path type level metadata');

        const files = await TestFile.find({
            folder: folderId,
            project: projectId,
            isDeleted: false
        }).select('_id name fileName extension type language size lines status');

        return {
            subFolders: await Promise.all(
                subFolders.map(async (sf) => ({
                    id: sf._id,
                    name: sf.name,
                    path: sf.path,
                    type: sf.type,
                    level: sf.level,
                    metadata: sf.metadata,
                    children: await buildHierarchy(sf._id)
                }))
            ),
            files: files.map(f => ({
                id: f._id,
                name: f.name,
                fileName: f.fileName,
                extension: f.extension,
                type: f.type,
                language: f.language,
                size: f.size,
                lines: f.lines,
                status: f.status
            }))
        };
    };

    const hierarchy = await Promise.all(
        rootFolders.map(async (rf) => ({
            id: rf._id,
            name: rf.name,
            path: rf.path,
            type: rf.type,
            level: rf.level,
            metadata: rf.metadata,
            children: await buildHierarchy(rf._id)
        }))
    );

    return res.json({
        success: true,
        data: {
            project: {
                id: project._id,
                name: project.name,
                description: project.description,
                slug: project.slug,
                status: project.status,
                visibility: project.visibility,
                category: project.category,
                priority: project.priority,
                owner: project.owner,
                team: project.team,
                repository: project.repository,
                databaseConnections: project.databaseConnections,
                stats: project.stats,
                technology: project.technology,
                testConfig: project.testConfig,
                loadTesting: project.loadTesting,
                cicd: project.cicd,
                notifications: project.notifications,
                schedule: project.schedule,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt
            },
            folderStructure: hierarchy
        }
    });
});

const getProjectHierarchy = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { format = 'tree' } = req.query;

    console.log(`[PROJECT_HIERARCHY] Project: ${projectId}, Format: ${format}`);

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
            message: 'Access denied to this project',
            code: 'PROJECT_ACCESS_DENIED'
        });
    }

    const rootFolders = await TestFolder.find({
        project: projectId,
        parentFolder: null,
        isDeleted: false
    }).select('_id name path type level metadata');

    const buildHierarchy = async (folderId) => {
        const subFolders = await TestFolder.find({
            parentFolder: folderId,
            project: projectId,
            isDeleted: false
        }).select('_id name path type level metadata');

        const files = await TestFile.find({
            folder: folderId,
            project: projectId,
            isDeleted: false
        }).select('_id name fileName extension type size lines status');

        return {
            subFolders: await Promise.all(
                subFolders.map(async (sf) => ({
                    id: sf._id,
                    name: sf.name,
                    path: sf.path,
                    type: sf.type,
                    level: sf.level,
                    metadata: sf.metadata,
                    children: await buildHierarchy(sf._id)
                }))
            ),
            files: files.map(f => ({
                id: f._id,
                name: f.name,
                fileName: f.fileName,
                extension: f.extension,
                type: f.type,
                size: f.size,
                lines: f.lines,
                status: f.status
            }))
        };
    };

    const hierarchy = await Promise.all(
        rootFolders.map(async (rf) => ({
            id: rf._id,
            name: rf.name,
            path: rf.path,
            type: rf.type,
            level: rf.level,
            metadata: rf.metadata,
            children: await buildHierarchy(rf._id)
        }))
    );

    const calculateStats = (hierarchyArray) => {
        let totalFolders = 0;
        let totalFiles = 0;
        let totalSize = 0;

        const traverse = (node) => {
            if (node.children) {
                if (node.children.subFolders) {
                    node.children.subFolders.forEach(folder => {
                        totalFolders++;
                        traverse(folder);
                    });
                }
                if (node.children.files) {
                    node.children.files.forEach(file => {
                        totalFiles++;
                        totalSize += file.size || 0;
                    });
                }
            }
        };

        hierarchyArray.forEach(root => {
            totalFolders++;
            traverse(root);
        });

        return { totalFolders, totalFiles, totalSize };
    };

    const stats = calculateStats(hierarchy);

    console.log(`[PROJECT_HIERARCHY_SUCCESS] Retrieved hierarchy for project ${projectId}`);

    return res.json({
        success: true,
        data: {
            hierarchy,
            statistics: {
                totalFolders: stats.totalFolders,
                totalFiles: stats.totalFiles,
                totalSize: stats.totalSize
            }
        }
    });
});

const getProjectConfig = catchAsync(async (req, res) => {
    const { projectId } = req.params;

    console.log(`[PROJECT_CONFIG_GET] Project: ${projectId}`);

    const project = await Project.findById(projectId)
        .populate('repository', 'name fullName branch language')
        .populate('databaseConnections', 'name type environment status isDefault');

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
            message: 'Access denied to this project',
            code: 'PROJECT_ACCESS_DENIED'
        });
    }

    const config = await ProjectConfigService.getProjectConfig(projectId, req.user._id);

    return res.json({
        success: true,
        data: {
            config,
            technology: project.technology,
            repository: project.repository,
            databaseConnections: project.databaseConnections
        }
    });
});

const getUserProjects = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { status, teamId, skip = 0, limit = 20 } = req.query;

    console.log(`[PROJECT_GET_USER] User: ${userId}, Status: ${status}`);

    const { projects, total } = await ProjectService.getUserProjects(userId, {
        status,
        teamId,
        skip: parseInt(skip),
        limit: parseInt(limit)
    });

    return res.json({
        success: true,
        data: {
            projects: projects.map(p => ({
                id: p._id,
                name: p.name,
                description: p.description,
                slug: p.slug,
                status: p.status,
                visibility: p.visibility,
                category: p.category,
                priority: p.priority,
                owner: p.owner,
                team: p.team,
                stats: p.stats,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
            })),
            total,
            skip: parseInt(skip),
            limit: parseInt(limit)
        }
    });
});

const getTeamProjects = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    const { status, skip = 0, limit = 20 } = req.query;

    console.log(`[PROJECT_GET_TEAM] Team: ${teamId}, Status: ${status}`);

    const { projects, total } = await ProjectService.getTeamProjects(teamId, {
        status,
        skip: parseInt(skip),
        limit: parseInt(limit)
    });

    return res.json({
        success: true,
        data: {
            projects: projects.map(p => ({
                id: p._id,
                name: p.name,
                description: p.description,
                slug: p.slug,
                status: p.status,
                visibility: p.visibility,
                category: p.category,
                priority: p.priority,
                owner: p.owner,
                team: p.team,
                stats: p.stats,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
            })),
            total,
            skip: parseInt(skip),
            limit: parseInt(limit)
        }
    });
});

module.exports = {
    createProject,
    getProjectById,
    getProjectHierarchy,
    getProjectConfig,
    getUserProjects,
    getTeamProjects
};