const TEST_TYPES = {
    API: 'api',
    INTEGRATION: 'integration',
    FUNCTIONAL: 'functional',
    SMOKE: 'smoke',
    REGRESSION: 'regression',
    LOAD: 'load',
    STRESS: 'stress',
    PERFORMANCE: 'performance',
    SECURITY: 'security',
    E2E: 'e2e',
    UNIT: 'unit',
    DATABASE: 'database'
};

const TEST_FRAMEWORKS = {
    REST_ASSURED: 'rest-assured',
    CUCUMBER: 'cucumber',
    TESTNG: 'testng',
    JUNIT: 'junit',
    JEST: 'jest',
    PYTEST: 'pytest',
    MOCHA: 'mocha',
    POSTMAN: 'postman',
    KARATE: 'karate'
};

const TEST_LANGUAGES = {
    JAVA: 'java',
    JAVASCRIPT: 'javascript',
    TYPESCRIPT: 'typescript',
    PYTHON: 'python',
    CSHARP: 'csharp',
    GO: 'go',
    RUBY: 'ruby'
};

const TEST_BUILD_TOOLS = {
    MAVEN: 'maven',
    GRADLE: 'gradle',
    NPM: 'npm',
    YARN: 'yarn',
    PIP: 'pip',
    DOTNET: 'dotnet'
};

const TEST_STATUS = {
    PENDING: 'pending',
    QUEUED: 'queued',
    RUNNING: 'running',
    PASSED: 'passed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
    BLOCKED: 'blocked',
    CANCELLED: 'cancelled',
    TIMEOUT: 'timeout',
    ERROR: 'error'
};

const EXECUTION_STATUS = {
    PENDING: 'pending',
    INITIALIZING: 'initializing',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    TIMEOUT: 'timeout',
    PARTIAL: 'partial'
};

const TEST_PRIORITIES = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
};

const TEST_ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production',
    TEST: 'test',
    QA: 'qa',
    UAT: 'uat'
};

const EXECUTION_MODES = {
    SEQUENTIAL: 'sequential',
    PARALLEL: 'parallel',
    DISTRIBUTED: 'distributed'
};

const ASSERTION_TYPES = {
    EQUALS: 'equals',
    NOT_EQUALS: 'not_equals',
    CONTAINS: 'contains',
    NOT_CONTAINS: 'not_contains',
    GREATER_THAN: 'greater_than',
    LESS_THAN: 'less_than',
    REGEX_MATCH: 'regex_match',
    JSON_SCHEMA: 'json_schema',
    STATUS_CODE: 'status_code',
    RESPONSE_TIME: 'response_time'
};

const HTTP_METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS'
};

const TEST_DATA_TYPES = {
    JSON: 'json',
    XML: 'xml',
    CSV: 'csv',
    YAML: 'yaml',
    PROPERTIES: 'properties',
    SQL: 'sql'
};

const REPORT_FORMATS = {
    PDF: 'pdf',
    HTML: 'html',
    JSON: 'json',
    XML: 'xml',
    CSV: 'csv',
    EXCEL: 'excel'
};

const isValidTestType = (type) => {
    console.log(`Validating test type: ${type}`);
    const valid = Object.values(TEST_TYPES).includes(type);
    console.log(`Test type validation result: ${valid}`);
    return valid;
};

const isValidFramework = (framework) => {
    console.log(`Validating framework: ${framework}`);
    const valid = Object.values(TEST_FRAMEWORKS).includes(framework);
    console.log(`Framework validation result: ${valid}`);
    return valid;
};

const isValidLanguage = (language) => {
    console.log(`Validating language: ${language}`);
    const valid = Object.values(TEST_LANGUAGES).includes(language);
    console.log(`Language validation result: ${valid}`);
    return valid;
};

const isValidStatus = (status) => {
    console.log(`Validating status: ${status}`);
    const valid = Object.values(TEST_STATUS).includes(status);
    console.log(`Status validation result: ${valid}`);
    return valid;
};

const getTestTypeDescription = (type) => {
    console.log(`Getting description for test type: ${type}`);
    const descriptions = {
        [TEST_TYPES.API]: 'API endpoint testing',
        [TEST_TYPES.INTEGRATION]: 'Integration testing between components',
        [TEST_TYPES.FUNCTIONAL]: 'Functional behavior testing',
        [TEST_TYPES.SMOKE]: 'Quick health check tests',
        [TEST_TYPES.REGRESSION]: 'Full regression test suite',
        [TEST_TYPES.LOAD]: 'Load and performance testing',
        [TEST_TYPES.STRESS]: 'Stress and stability testing',
        [TEST_TYPES.PERFORMANCE]: 'Performance benchmarking',
        [TEST_TYPES.SECURITY]: 'Security vulnerability testing',
        [TEST_TYPES.E2E]: 'End-to-end workflow testing',
        [TEST_TYPES.UNIT]: 'Unit testing',
        [TEST_TYPES.DATABASE]: 'Database integrity testing'
    };
    const description = descriptions[type] || 'Unknown test type';
    console.log(`Test type description: ${description}`);
    return description;
};

const getFrameworkConfig = (framework) => {
    console.log(`Getting configuration for framework: ${framework}`);
    const configs = {
        [TEST_FRAMEWORKS.REST_ASSURED]: {
            language: TEST_LANGUAGES.JAVA,
            buildTool: TEST_BUILD_TOOLS.MAVEN,
            dependencies: ['rest-assured', 'testng', 'jackson-databind']
        },
        [TEST_FRAMEWORKS.CUCUMBER]: {
            language: TEST_LANGUAGES.JAVA,
            buildTool: TEST_BUILD_TOOLS.MAVEN,
            dependencies: ['cucumber-java', 'cucumber-testng', 'rest-assured']
        },
        [TEST_FRAMEWORKS.TESTNG]: {
            language: TEST_LANGUAGES.JAVA,
            buildTool: TEST_BUILD_TOOLS.MAVEN,
            dependencies: ['testng', 'rest-assured']
        },
        [TEST_FRAMEWORKS.JEST]: {
            language: TEST_LANGUAGES.JAVASCRIPT,
            buildTool: TEST_BUILD_TOOLS.NPM,
            dependencies: ['jest', 'axios', 'supertest']
        },
        [TEST_FRAMEWORKS.PYTEST]: {
            language: TEST_LANGUAGES.PYTHON,
            buildTool: TEST_BUILD_TOOLS.PIP,
            dependencies: ['pytest', 'requests', 'pytest-html']
        }
    };
    const config = configs[framework] || null;
    console.log(`Framework config retrieved: ${JSON.stringify(config)}`);
    return config;
};

const isPassingStatus = (status) => {
    console.log(`Checking if status ${status} is passing`);
    const passing = status === TEST_STATUS.PASSED;
    console.log(`Passing status check: ${passing}`);
    return passing;
};

const isFailingStatus = (status) => {
    console.log(`Checking if status ${status} is failing`);
    const failing = [TEST_STATUS.FAILED, TEST_STATUS.ERROR].includes(status);
    console.log(`Failing status check: ${failing}`);
    return failing;
};

const isCompletedStatus = (status) => {
    console.log(`Checking if status ${status} is completed`);
    const completed = [
        TEST_STATUS.PASSED,
        TEST_STATUS.FAILED,
        TEST_STATUS.SKIPPED,
        TEST_STATUS.ERROR,
        TEST_STATUS.TIMEOUT,
        TEST_STATUS.CANCELLED
    ].includes(status);
    console.log(`Completed status check: ${completed}`);
    return completed;
};

module.exports = {
    TEST_TYPES,
    TEST_FRAMEWORKS,
    TEST_LANGUAGES,
    TEST_BUILD_TOOLS,
    TEST_STATUS,
    EXECUTION_STATUS,
    TEST_PRIORITIES,
    TEST_ENVIRONMENTS,
    EXECUTION_MODES,
    ASSERTION_TYPES,
    HTTP_METHODS,
    TEST_DATA_TYPES,
    REPORT_FORMATS,
    isValidTestType,
    isValidFramework,
    isValidLanguage,
    isValidStatus,
    getTestTypeDescription,
    getFrameworkConfig,
    isPassingStatus,
    isFailingStatus,
    isCompletedStatus
};