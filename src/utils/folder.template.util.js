const FOLDER_TEMPLATES = {
    REST_ASSURED: {
        name: 'REST Assured Test Project',
        framework: 'rest-assured',
        buildTool: 'maven',
        language: 'java',
        structure: {
            'src/test/java/com/{company}/{project}': {
                'tests/api': 'API endpoint tests',
                'tests/integration': 'Integration tests',
                'tests/smoke': 'Smoke tests',
                'tests/regression': 'Regression tests',
                'utils': 'Utility classes',
                'config': 'Configuration classes',
                'helpers': 'Helper classes',
                'base': 'Base test classes',
                'listeners': 'TestNG listeners',
                'models/request': 'Request models',
                'models/response': 'Response models'
            },
            'src/test/resources': {
                'features': 'Cucumber feature files',
                'testdata': 'Test data files',
                'config': 'Configuration files',
                'schemas/request-schemas': 'Request JSON schemas',
                'schemas/response-schemas': 'Response JSON schemas'
            }
        },
        rootFiles: ['pom.xml', 'testng.xml', 'cucumber.properties', 'README.md', '.gitignore']
    },

    CUCUMBER: {
        name: 'Cucumber BDD Test Project',
        framework: 'cucumber',
        buildTool: 'maven',
        language: 'java',
        structure: {
            'src/test/java/com/{company}/{project}': {
                'stepdefinitions': 'Step definition classes',
                'hooks': 'Test hooks',
                'runners': 'Test runner classes',
                'utils': 'Utility classes',
                'config': 'Configuration classes',
                'helpers': 'Helper classes',
                'models/request': 'Request models',
                'models/response': 'Response models'
            },
            'src/test/resources': {
                'features/api': 'API feature files',
                'features/smoke': 'Smoke test features',
                'features/regression': 'Regression test features',
                'testdata': 'Test data files',
                'config': 'Configuration files'
            }
        },
        rootFiles: ['pom.xml', 'cucumber.properties', 'README.md', '.gitignore']
    },

    TESTNG: {
        name: 'TestNG Test Project',
        framework: 'testng',
        buildTool: 'maven',
        language: 'java',
        structure: {
            'src/test/java/com/{company}/{project}': {
                'tests/functional': 'Functional test classes',
                'tests/api': 'API test classes',
                'tests/database': 'Database test classes',
                'tests/integration': 'Integration test classes',
                'base': 'Base test classes',
                'utils': 'Utility classes',
                'config': 'Configuration classes',
                'listeners': 'TestNG listeners',
                'dataproviders': 'Data provider classes',
                'helpers': 'Helper classes',
                'models/request': 'Request models',
                'models/response': 'Response models'
            },
            'src/test/resources': {
                'testdata': 'Test data files',
                'config': 'Configuration files'
            }
        },
        rootFiles: ['pom.xml', 'testng.xml', 'README.md', '.gitignore']
    },

    JEST: {
        name: 'Jest Test Project',
        framework: 'jest',
        buildTool: 'npm',
        language: 'javascript',
        structure: {
            'tests': {
                'api': 'API tests',
                'integration': 'Integration tests',
                'unit': 'Unit tests'
            },
            'utils': 'Utility functions',
            'config': 'Configuration files',
            'helpers': 'Helper functions',
            'fixtures': 'Test fixtures',
            'mocks': 'Mock data'
        },
        rootFiles: ['package.json', 'jest.config.js', 'README.md', '.gitignore']
    },

    PYTEST: {
        name: 'PyTest Test Project',
        framework: 'pytest',
        buildTool: 'pip',
        language: 'python',
        structure: {
            'tests': {
                'api': 'API tests',
                'integration': 'Integration tests',
                'unit': 'Unit tests'
            },
            'utils': 'Utility modules',
            'config': 'Configuration modules',
            'helpers': 'Helper modules',
            'fixtures': 'Test fixtures',
            'data': 'Test data'
        },
        rootFiles: ['pytest.ini', 'requirements.txt', 'README.md', '.gitignore']
    }
};

const STANDARD_FOLDERS = {
    TESTS: 'tests',
    UTILS: 'utils',
    CONFIG: 'config',
    HELPERS: 'helpers',
    DATA: 'data',
    RESOURCES: 'resources',
    MODELS: 'models',
    FIXTURES: 'fixtures',
    MOCKS: 'mocks'
};

const FOLDER_PURPOSES = {
    TESTS: 'Test case files',
    UTILS: 'Utility and helper functions',
    CONFIG: 'Configuration files',
    HELPERS: 'Helper classes and functions',
    DATA: 'Test data files',
    RESOURCES: 'Resource files',
    MODELS: 'Data models',
    FIXTURES: 'Test fixtures',
    MOCKS: 'Mock data and implementations',
    REPORTS: 'Test reports',
    LOGS: 'Log files'
};

const getTemplate = (framework) => {
    console.log(`Getting folder template for framework: ${framework}`);
    const template = FOLDER_TEMPLATES[framework.toUpperCase().replace('-', '_')];

    if (!template) {
        console.log(`Template not found for framework: ${framework}`);
        return null;
    }

    console.log(`Template found: ${template.name}`);
    return template;
};

const generateFolderStructure = (framework, company, project) => {
    console.log(`Generating folder structure for ${framework}`);
    console.log(`Company: ${company}, Project: ${project}`);

    const template = getTemplate(framework);
    if (!template) {
        console.log('Template not found, returning null');
        return null;
    }

    const replacePlaceholders = (path) => {
        return path
            .replace(/{company}/g, company)
            .replace(/{project}/g, project);
    };

    const processStructure = (structure) => {
        const processed = {};

        for (const [path, value] of Object.entries(structure)) {
            const processedPath = replacePlaceholders(path);

            if (typeof value === 'object') {
                processed[processedPath] = processStructure(value);
            } else {
                processed[processedPath] = value;
            }
        }

        return processed;
    };

    const folderStructure = {
        name: template.name,
        framework: template.framework,
        buildTool: template.buildTool,
        language: template.language,
        structure: processStructure(template.structure),
        rootFiles: template.rootFiles
    };

    console.log('Folder structure generated successfully');
    return folderStructure;
};

const getFolderPath = (basePath, ...subPaths) => {
    console.log(`Building folder path from: ${basePath}`);
    console.log(`Sub paths: ${subPaths.join(', ')}`);

    const path = [basePath, ...subPaths]
        .filter(p => p && p.length > 0)
        .join('/');

    console.log(`Generated path: ${path}`);
    return path;
};

const validateFolderStructure = (structure) => {
    console.log('Validating folder structure');

    if (!structure || typeof structure !== 'object') {
        console.log('Invalid structure: not an object');
        return { valid: false, error: 'Structure must be an object' };
    }

    if (!structure.framework) {
        console.log('Invalid structure: missing framework');
        return { valid: false, error: 'Framework is required' };
    }

    if (!structure.structure) {
        console.log('Invalid structure: missing structure definition');
        return { valid: false, error: 'Structure definition is required' };
    }

    console.log('Folder structure is valid');
    return { valid: true };
};

const getStandardFolders = (framework) => {
    console.log(`Getting standard folders for framework: ${framework}`);

    const standardFolders = {
        'rest-assured': [
            'tests/api',
            'tests/integration',
            'tests/smoke',
            'tests/regression',
            'utils',
            'config',
            'helpers',
            'base',
            'listeners'
        ],
        'cucumber': [
            'stepdefinitions',
            'hooks',
            'runners',
            'utils',
            'config',
            'helpers'
        ],
        'testng': [
            'tests/functional',
            'tests/api',
            'tests/database',
            'tests/integration',
            'base',
            'utils',
            'config',
            'listeners',
            'dataproviders'
        ],
        'jest': [
            'tests/api',
            'tests/integration',
            'tests/unit',
            'utils',
            'config',
            'helpers',
            'fixtures',
            'mocks'
        ],
        'pytest': [
            'tests/api',
            'tests/integration',
            'tests/unit',
            'utils',
            'config',
            'helpers',
            'fixtures',
            'data'
        ]
    };

    const folders = standardFolders[framework.toLowerCase()] || [];
    console.log(`Standard folders: ${folders.join(', ')}`);
    return folders;
};

const getFolderDepth = (path) => {
    console.log(`Calculating folder depth for: ${path}`);
    const depth = path.split('/').filter(p => p.length > 0).length;
    console.log(`Folder depth: ${depth}`);
    return depth;
};

const normalizeFolderPath = (path) => {
    console.log(`Normalizing folder path: ${path}`);

    const normalized = path
        .replace(/\\/g, '/')
        .replace(/\/+/g, '/')
        .replace(/^\/|\/$/g, '');

    console.log(`Normalized path: ${normalized}`);
    return normalized;
};

const createFolderTree = (structure, basePath = '') => {
    console.log(`Creating folder tree from structure`);
    console.log(`Base path: ${basePath}`);

    const tree = [];

    const processNode = (node, currentPath, level = 0) => {
        for (const [name, value] of Object.entries(node)) {
            const fullPath = currentPath ? `${currentPath}/${name}` : name;

            tree.push({
                name,
                path: fullPath,
                level,
                type: typeof value === 'object' ? 'folder' : 'description',
                description: typeof value === 'string' ? value : null
            });

            if (typeof value === 'object') {
                processNode(value, fullPath, level + 1);
            }
        }
    };

    processNode(structure, basePath);
    console.log(`Folder tree created with ${tree.length} nodes`);
    return tree;
};

const getAllFolderPaths = (structure) => {
    console.log('Extracting all folder paths from structure');

    const paths = [];

    const extractPaths = (node, currentPath = '') => {
        for (const [name, value] of Object.entries(node)) {
            const fullPath = currentPath ? `${currentPath}/${name}` : name;
            paths.push(fullPath);

            if (typeof value === 'object') {
                extractPaths(value, fullPath);
            }
        }
    };

    extractPaths(structure);
    console.log(`Extracted ${paths.length} folder paths`);
    return paths;
};

module.exports = {
    FOLDER_TEMPLATES,
    STANDARD_FOLDERS,
    FOLDER_PURPOSES,
    getTemplate,
    generateFolderStructure,
    getFolderPath,
    validateFolderStructure,
    getStandardFolders,
    getFolderDepth,
    normalizeFolderPath,
    createFolderTree,
    getAllFolderPaths
};