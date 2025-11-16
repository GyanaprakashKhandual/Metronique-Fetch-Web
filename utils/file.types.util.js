const FILE_TYPES = {
    TEST: 'test',
    FEATURE: 'feature',
    STEP_DEFINITION: 'step_definition',
    CONFIG: 'config',
    UTIL: 'util',
    HELPER: 'helper',
    DATA: 'data',
    POM: 'pom',
    TESTNG: 'testng',
    PROPERTIES: 'properties',
    JAVA: 'java',
    XML: 'xml',
    JSON: 'json',
    YAML: 'yaml',
    MARKDOWN: 'markdown',
    JAVASCRIPT: 'javascript',
    TYPESCRIPT: 'typescript',
    PYTHON: 'python',
    GHERKIN: 'gherkin',
    SQL: 'sql',
    CSV: 'csv',
    TEXT: 'text',
    OTHER: 'other'
};

const FILE_EXTENSIONS = {
    JAVA: '.java',
    JAVASCRIPT: '.js',
    TYPESCRIPT: '.ts',
    PYTHON: '.py',
    XML: '.xml',
    JSON: '.json',
    YAML: '.yaml',
    YML: '.yml',
    PROPERTIES: '.properties',
    FEATURE: '.feature',
    MARKDOWN: '.md',
    SQL: '.sql',
    CSV: '.csv',
    TXT: '.txt',
    HTML: '.html',
    CSS: '.css',
    GHERKIN: '.feature'
};

const FILE_CATEGORIES = {
    SOURCE: 'source',
    TEST: 'test',
    CONFIGURATION: 'configuration',
    DATA: 'data',
    DOCUMENTATION: 'documentation',
    RESOURCE: 'resource',
    BUILD: 'build'
};

const LANGUAGE_EXTENSIONS = {
    java: ['.java'],
    javascript: ['.js', '.jsx'],
    typescript: ['.ts', '.tsx'],
    python: ['.py'],
    xml: ['.xml'],
    json: ['.json'],
    yaml: ['.yaml', '.yml'],
    properties: ['.properties'],
    gherkin: ['.feature'],
    markdown: ['.md'],
    text: ['.txt'],
    sql: ['.sql'],
    csv: ['.csv']
};

const MIME_TYPES = {
    'text/plain': ['.txt', '.log'],
    'application/json': ['.json'],
    'application/xml': ['.xml'],
    'text/xml': ['.xml'],
    'text/yaml': ['.yaml', '.yml'],
    'text/csv': ['.csv'],
    'text/markdown': ['.md'],
    'text/html': ['.html'],
    'text/css': ['.css'],
    'application/javascript': ['.js'],
    'application/typescript': ['.ts'],
    'text/x-java-source': ['.java'],
    'text/x-python': ['.py'],
    'application/sql': ['.sql']
};

const FILE_SIZE_LIMITS = {
    SMALL: 100 * 1024,
    MEDIUM: 1024 * 1024,
    LARGE: 5 * 1024 * 1024,
    XLARGE: 10 * 1024 * 1024
};

const EDITABLE_FILE_TYPES = [
    FILE_TYPES.TEST,
    FILE_TYPES.FEATURE,
    FILE_TYPES.STEP_DEFINITION,
    FILE_TYPES.CONFIG,
    FILE_TYPES.UTIL,
    FILE_TYPES.HELPER,
    FILE_TYPES.DATA,
    FILE_TYPES.JAVA,
    FILE_TYPES.JAVASCRIPT,
    FILE_TYPES.TYPESCRIPT,
    FILE_TYPES.PYTHON,
    FILE_TYPES.XML,
    FILE_TYPES.JSON,
    FILE_TYPES.YAML,
    FILE_TYPES.PROPERTIES,
    FILE_TYPES.SQL,
    FILE_TYPES.TEXT
];

const SYSTEM_FILE_TYPES = [
    FILE_TYPES.POM,
    FILE_TYPES.TESTNG
];

const getFileType = (filename) => {
    console.log(`Determining file type for: ${filename}`);

    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    console.log(`File extension: ${extension}`);

    const typeMap = {
        [FILE_EXTENSIONS.JAVA]: FILE_TYPES.JAVA,
        [FILE_EXTENSIONS.JAVASCRIPT]: FILE_TYPES.JAVASCRIPT,
        [FILE_EXTENSIONS.TYPESCRIPT]: FILE_TYPES.TYPESCRIPT,
        [FILE_EXTENSIONS.PYTHON]: FILE_TYPES.PYTHON,
        [FILE_EXTENSIONS.XML]: FILE_TYPES.XML,
        [FILE_EXTENSIONS.JSON]: FILE_TYPES.JSON,
        [FILE_EXTENSIONS.YAML]: FILE_TYPES.YAML,
        [FILE_EXTENSIONS.YML]: FILE_TYPES.YAML,
        [FILE_EXTENSIONS.PROPERTIES]: FILE_TYPES.PROPERTIES,
        [FILE_EXTENSIONS.FEATURE]: FILE_TYPES.FEATURE,
        [FILE_EXTENSIONS.MARKDOWN]: FILE_TYPES.MARKDOWN,
        [FILE_EXTENSIONS.SQL]: FILE_TYPES.SQL,
        [FILE_EXTENSIONS.CSV]: FILE_TYPES.CSV,
        [FILE_EXTENSIONS.TXT]: FILE_TYPES.TEXT
    };

    const fileType = typeMap[extension] || FILE_TYPES.OTHER;
    console.log(`File type determined: ${fileType}`);
    return fileType;
};

const getFileLanguage = (filename) => {
    console.log(`Determining language for file: ${filename}`);

    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    console.log(`File extension: ${extension}`);

    const languageMap = {
        [FILE_EXTENSIONS.JAVA]: 'java',
        [FILE_EXTENSIONS.JAVASCRIPT]: 'javascript',
        [FILE_EXTENSIONS.TYPESCRIPT]: 'typescript',
        [FILE_EXTENSIONS.PYTHON]: 'python',
        [FILE_EXTENSIONS.XML]: 'xml',
        [FILE_EXTENSIONS.JSON]: 'json',
        [FILE_EXTENSIONS.YAML]: 'yaml',
        [FILE_EXTENSIONS.YML]: 'yaml',
        [FILE_EXTENSIONS.PROPERTIES]: 'properties',
        [FILE_EXTENSIONS.FEATURE]: 'gherkin',
        [FILE_EXTENSIONS.MARKDOWN]: 'markdown',
        [FILE_EXTENSIONS.SQL]: 'sql',
        [FILE_EXTENSIONS.TXT]: 'text'
    };

    const language = languageMap[extension] || 'text';
    console.log(`File language: ${language}`);
    return language;
};

const getFileCategory = (fileType) => {
    console.log(`Getting category for file type: ${fileType}`);

    const categoryMap = {
        [FILE_TYPES.TEST]: FILE_CATEGORIES.TEST,
        [FILE_TYPES.FEATURE]: FILE_CATEGORIES.TEST,
        [FILE_TYPES.STEP_DEFINITION]: FILE_CATEGORIES.TEST,
        [FILE_TYPES.CONFIG]: FILE_CATEGORIES.CONFIGURATION,
        [FILE_TYPES.PROPERTIES]: FILE_CATEGORIES.CONFIGURATION,
        [FILE_TYPES.XML]: FILE_CATEGORIES.CONFIGURATION,
        [FILE_TYPES.YAML]: FILE_CATEGORIES.CONFIGURATION,
        [FILE_TYPES.DATA]: FILE_CATEGORIES.DATA,
        [FILE_TYPES.JSON]: FILE_CATEGORIES.DATA,
        [FILE_TYPES.CSV]: FILE_CATEGORIES.DATA,
        [FILE_TYPES.MARKDOWN]: FILE_CATEGORIES.DOCUMENTATION,
        [FILE_TYPES.POM]: FILE_CATEGORIES.BUILD,
        [FILE_TYPES.TESTNG]: FILE_CATEGORIES.BUILD
    };

    const category = categoryMap[fileType] || FILE_CATEGORIES.SOURCE;
    console.log(`File category: ${category}`);
    return category;
};

const isEditableFile = (fileType) => {
    console.log(`Checking if file type ${fileType} is editable`);
    const editable = EDITABLE_FILE_TYPES.includes(fileType);
    console.log(`Editable check result: ${editable}`);
    return editable;
};

const isSystemFile = (fileType, filename) => {
    console.log(`Checking if file is system file: ${filename}`);

    if (SYSTEM_FILE_TYPES.includes(fileType)) {
        console.log(`File type ${fileType} is system file`);
        return true;
    }

    const systemFiles = ['pom.xml', 'testng.xml', 'build.gradle', 'package.json'];
    const isSystem = systemFiles.includes(filename.toLowerCase());
    console.log(`System file check result: ${isSystem}`);
    return isSystem;
};

const validateFileName = (filename) => {
    console.log(`Validating filename: ${filename}`);

    if (!filename || filename.trim().length === 0) {
        console.log('Filename is empty');
        return { valid: false, error: 'Filename cannot be empty' };
    }

    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(filename)) {
        console.log('Filename contains invalid characters');
        return { valid: false, error: 'Filename contains invalid characters' };
    }

    if (filename.length > 255) {
        console.log('Filename too long');
        return { valid: false, error: 'Filename too long (max 255 characters)' };
    }

    console.log('Filename is valid');
    return { valid: true };
};

const getFileIcon = (fileType, filename) => {
    console.log(`Getting icon for file type: ${fileType}`);

    const icons = {
        [FILE_TYPES.JAVA]: '☕',
        [FILE_TYPES.JAVASCRIPT]: '📜',
        [FILE_TYPES.TYPESCRIPT]: '📘',
        [FILE_TYPES.PYTHON]: '🐍',
        [FILE_TYPES.XML]: '📄',
        [FILE_TYPES.JSON]: '📋',
        [FILE_TYPES.YAML]: '📝',
        [FILE_TYPES.PROPERTIES]: '⚙️',
        [FILE_TYPES.FEATURE]: '📗',
        [FILE_TYPES.MARKDOWN]: '📖',
        [FILE_TYPES.TEST]: '🧪',
        [FILE_TYPES.CONFIG]: '⚙️',
        [FILE_TYPES.DATA]: '💾',
        [FILE_TYPES.SQL]: '🗄️'
    };

    const icon = icons[fileType] || '📄';
    console.log(`File icon: ${icon}`);
    return icon;
};

const getMimeType = (filename) => {
    console.log(`Getting MIME type for: ${filename}`);

    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    console.log(`File extension: ${extension}`);

    for (const [mimeType, extensions] of Object.entries(MIME_TYPES)) {
        if (extensions.includes(extension)) {
            console.log(`MIME type: ${mimeType}`);
            return mimeType;
        }
    }

    console.log('MIME type: text/plain (default)');
    return 'text/plain';
};

const formatFileSize = (bytes) => {
    console.log(`Formatting file size: ${bytes} bytes`);

    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];

    console.log(`Formatted size: ${formatted}`);
    return formatted;
};

const isWithinSizeLimit = (size, limit = FILE_SIZE_LIMITS.LARGE) => {
    console.log(`Checking if size ${size} is within limit ${limit}`);
    const within = size <= limit;
    console.log(`Size limit check: ${within}`);
    return within;
};

module.exports = {
    FILE_TYPES,
    FILE_EXTENSIONS,
    FILE_CATEGORIES,
    LANGUAGE_EXTENSIONS,
    MIME_TYPES,
    FILE_SIZE_LIMITS,
    EDITABLE_FILE_TYPES,
    SYSTEM_FILE_TYPES,
    getFileType,
    getFileLanguage,
    getFileCategory,
    isEditableFile,
    isSystemFile,
    validateFileName,
    getFileIcon,
    getMimeType,
    formatFileSize,
    isWithinSizeLimit
};