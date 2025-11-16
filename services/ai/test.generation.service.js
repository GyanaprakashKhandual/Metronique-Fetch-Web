const anthropicService = require('./anthropic.service');
const openaiService = require('./openai.service');
const TestScript = require('../../models/test.script.model');
const TestCase = require('../../models/test.case.model');

class TestGenerationService {
    constructor() {
        this.generationCache = new Map();
        this.cacheDuration = 1800000;
    }

    async generateTestScript(endpoint, projectConfig, aiProvider = 'anthropic') {
        const startTime = Date.now();
        console.log(`[TestGenerationService] Generate test script started | Endpoint: ${endpoint.method} ${endpoint.path} | Provider: ${aiProvider}`);

        try {
            const cacheKey = `script-${endpoint._id}-${projectConfig.framework}`;
            const cached = this.generationCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
                console.log(`[TestGenerationService] Cache hit | Key: ${cacheKey}`);
                return cached.data;
            }

            let result;
            if (aiProvider === 'openai') {
                result = await openaiService.generateTestCode(endpoint, projectConfig.language, projectConfig.framework);
            } else {
                result = await anthropicService.generateTestCode(endpoint, projectConfig.language, projectConfig.framework);
            }

            const testScript = await this.parseAndStructureTestCode(result.testCode, endpoint, projectConfig, aiProvider);

            this.generationCache.set(cacheKey, {
                data: testScript,
                timestamp: Date.now()
            });

            const duration = Date.now() - startTime;
            console.log(`[TestGenerationService] Test script generated successfully | Duration: ${duration}ms | Provider: ${aiProvider}`);

            return testScript;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[TestGenerationService] Generation failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async parseAndStructureTestCode(testCode, endpoint, projectConfig, aiProvider) {
        console.log(`[TestGenerationService] Parsing test code | Framework: ${projectConfig.framework}`);

        try {
            const structure = {
                testClass: {
                    name: this.generateClassName(endpoint),
                    packageName: this.generatePackageName(projectConfig),
                    imports: this.extractImports(testCode),
                    annotations: this.extractClassAnnotations(testCode),
                    content: testCode
                },
                featureFile: null,
                stepDefinitions: null,
                configFiles: []
            };

            if (projectConfig.framework === 'cucumber') {
                structure.featureFile = this.generateFeatureFile(endpoint, testCode);
                structure.stepDefinitions = this.generateStepDefinitions(endpoint, testCode);
            }

            console.log(`[TestGenerationService] Test code parsed successfully | ClassName: ${structure.testClass.name}`);
            return structure;
        } catch (error) {
            console.error(`[TestGenerationService] Parsing failed | Error: ${error.message}`);
            throw error;
        }
    }

    async generateTestSuite(endpoints, projectConfig, aiProvider = 'anthropic') {
        const startTime = Date.now();
        console.log(`[TestGenerationService] Generate test suite started | Endpoints: ${endpoints.length} | Provider: ${aiProvider}`);

        try {
            const testScripts = [];

            for (let i = 0; i < endpoints.length; i++) {
                const endpoint = endpoints[i];
                console.log(`[TestGenerationService] Generating test ${i + 1}/${endpoints.length} | Endpoint: ${endpoint.path}`);

                const testScript = await this.generateTestScript(endpoint, projectConfig, aiProvider);
                testScripts.push(testScript);

                if (i < endpoints.length - 1) {
                    await this.delay(1000);
                }
            }

            const duration = Date.now() - startTime;
            console.log(`[TestGenerationService] Test suite generated | Total: ${testScripts.length} | Duration: ${duration}ms`);

            return {
                success: true,
                testScripts: testScripts,
                totalGenerated: testScripts.length,
                duration: duration
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[TestGenerationService] Suite generation failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async generateTestCases(endpoint, scenarios, aiProvider = 'anthropic') {
        console.log(`[TestGenerationService] Generate test cases | Endpoint: ${endpoint.path} | Scenarios: ${scenarios.length}`);

        try {
            const testCases = [];

            for (const scenario of scenarios) {
                console.log(`[TestGenerationService] Generating test case | Scenario: ${scenario.type}`);

                const testCase = {
                    name: `${scenario.type}_${endpoint.name}`,
                    description: scenario.description,
                    scenario: scenario.scenario,
                    type: scenario.type,
                    request: this.buildTestRequest(endpoint, scenario),
                    expectedResponse: this.buildExpectedResponse(endpoint, scenario),
                    assertions: this.buildAssertions(endpoint, scenario)
                };

                testCases.push(testCase);
            }

            console.log(`[TestGenerationService] Test cases generated | Total: ${testCases.length}`);
            return testCases;
        } catch (error) {
            console.error(`[TestGenerationService] Test case generation failed | Error: ${error.message}`);
            throw error;
        }
    }

    buildTestRequest(endpoint, scenario) {
        console.log(`[TestGenerationService] Building test request | Method: ${endpoint.method}`);

        const request = {
            method: endpoint.method,
            url: endpoint.path,
            path: endpoint.path,
            headers: endpoint.headers || {},
            queryParams: endpoint.queryParams || {},
            pathParams: endpoint.pathParams || {},
            body: null
        };

        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
            if (scenario.type === 'positive') {
                request.body = endpoint.requestBody?.example || this.generateSampleRequestBody(endpoint);
            } else if (scenario.type === 'negative') {
                request.body = this.generateInvalidRequestBody(endpoint);
            } else if (scenario.type === 'boundary') {
                request.body = this.generateBoundaryRequestBody(endpoint);
            }
        }

        console.log(`[TestGenerationService] Test request built | HasBody: ${!!request.body}`);
        return request;
    }

    buildExpectedResponse(endpoint, scenario) {
        console.log(`[TestGenerationService] Building expected response | Type: ${scenario.type}`);

        const expectedResponse = {
            statusCode: this.determineExpectedStatusCode(endpoint, scenario),
            statusCodes: [],
            headers: {},
            body: null,
            schema: endpoint.responseSchema || null,
            responseTime: {
                max: 3000,
                min: 0
            }
        };

        if (scenario.type === 'positive') {
            expectedResponse.statusCode = endpoint.successStatusCode || 200;
            expectedResponse.body = endpoint.responseBody?.example || null;
        } else if (scenario.type === 'negative') {
            expectedResponse.statusCode = 400;
        } else if (scenario.type === 'security') {
            expectedResponse.statusCode = 401;
        }

        console.log(`[TestGenerationService] Expected response built | StatusCode: ${expectedResponse.statusCode}`);
        return expectedResponse;
    }

    buildAssertions(endpoint, scenario) {
        console.log(`[TestGenerationService] Building assertions | Scenario: ${scenario.type}`);

        const assertions = [
            {
                type: 'status-code',
                field: 'statusCode',
                operator: 'equals',
                expected: this.determineExpectedStatusCode(endpoint, scenario),
                description: 'Verify response status code'
            },
            {
                type: 'response-time',
                field: 'responseTime',
                operator: 'less-than',
                expected: 3000,
                description: 'Verify response time is acceptable'
            }
        ];

        if (scenario.type === 'positive') {
            if (endpoint.responseSchema) {
                assertions.push({
                    type: 'schema-valid',
                    field: 'body',
                    operator: 'matches',
                    expected: endpoint.responseSchema,
                    description: 'Verify response matches schema'
                });
            }

            if (endpoint.responseBody?.requiredFields) {
                endpoint.responseBody.requiredFields.forEach(field => {
                    assertions.push({
                        type: 'body-contains',
                        field: field,
                        operator: 'exists',
                        expected: true,
                        description: `Verify ${field} exists in response`
                    });
                });
            }
        }

        console.log(`[TestGenerationService] Assertions built | Total: ${assertions.length}`);
        return assertions;
    }

    generateClassName(endpoint) {
        const methodName = endpoint.method.charAt(0).toUpperCase() + endpoint.method.slice(1).toLowerCase();
        const pathName = endpoint.path
            .split('/')
            .filter(part => part && !part.startsWith(':') && !part.startsWith('{'))
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');

        const className = `${methodName}${pathName}Test`;
        console.log(`[TestGenerationService] Generated class name | ClassName: ${className}`);
        return className;
    }

    generatePackageName(projectConfig) {
        const packageName = projectConfig.packageName || 'com.imagefetch.tests';
        console.log(`[TestGenerationService] Generated package name | Package: ${packageName}`);
        return packageName;
    }

    extractImports(testCode) {
        console.log(`[TestGenerationService] Extracting imports from test code`);

        const imports = [];
        const importRegex = /import\s+(?:static\s+)?([^;]+);/g;
        let match;

        while ((match = importRegex.exec(testCode)) !== null) {
            imports.push(match[1].trim());
        }

        console.log(`[TestGenerationService] Imports extracted | Count: ${imports.length}`);
        return imports;
    }

    extractClassAnnotations(testCode) {
        console.log(`[TestGenerationService] Extracting class annotations`);

        const annotations = [];
        const annotationRegex = /@(\w+)(?:\([^)]*\))?/g;
        const classMatch = testCode.match(/public\s+class/);

        if (classMatch) {
            const beforeClass = testCode.substring(0, classMatch.index);
            let match;

            while ((match = annotationRegex.exec(beforeClass)) !== null) {
                annotations.push(`@${match[1]}`);
            }
        }

        console.log(`[TestGenerationService] Class annotations extracted | Count: ${annotations.length}`);
        return annotations;
    }

    generateFeatureFile(endpoint, testCode) {
        console.log(`[TestGenerationService] Generating feature file | Endpoint: ${endpoint.path}`);

        const featureName = this.generateFeatureName(endpoint);

        const feature = {
            name: `${featureName}.feature`,
            content: `Feature: ${featureName}
  
  Scenario: Successful ${endpoint.method} request to ${endpoint.path}
    Given the API is available
    When I send a ${endpoint.method} request to "${endpoint.path}"
    Then the response status code should be 200
    And the response time should be less than 3000ms`,
            scenarios: [
                {
                    name: `Successful ${endpoint.method} request`,
                    tags: ['@smoke', '@positive'],
                    steps: [
                        'Given the API is available',
                        `When I send a ${endpoint.method} request to "${endpoint.path}"`,
                        'Then the response status code should be 200',
                        'And the response time should be less than 3000ms'
                    ]
                }
            ]
        };

        console.log(`[TestGenerationService] Feature file generated | Name: ${feature.name}`);
        return feature;
    }

    generateStepDefinitions(endpoint, testCode) {
        console.log(`[TestGenerationService] Generating step definitions | Endpoint: ${endpoint.path}`);

        const className = `${this.generateClassName(endpoint)}Steps`;

        const stepDefinitions = {
            name: `${className}.java`,
            packageName: this.generatePackageName({ packageName: 'com.imagefetch.steps' }),
            content: `package com.imagefetch.steps;

import io.cucumber.java.en.*;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

public class ${className} {
    
    @Given("the API is available")
    public void theApiIsAvailable() {
        given().get("/health").then().statusCode(200);
    }
    
    @When("I send a {string} request to {string}")
    public void iSendRequest(String method, String path) {
        request(method, path);
    }
    
    @Then("the response status code should be {int}")
    public void verifyStatusCode(int expectedStatusCode) {
        then().statusCode(expectedStatusCode);
    }
}`
        };

        console.log(`[TestGenerationService] Step definitions generated | ClassName: ${className}`);
        return stepDefinitions;
    }

    generateFeatureName(endpoint) {
        const pathName = endpoint.path
            .split('/')
            .filter(part => part && !part.startsWith(':') && !part.startsWith('{'))
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

        return `${endpoint.method} ${pathName}`;
    }

    determineExpectedStatusCode(endpoint, scenario) {
        if (scenario.type === 'positive') {
            return endpoint.successStatusCode || 200;
        } else if (scenario.type === 'negative') {
            return 400;
        } else if (scenario.type === 'security') {
            return 401;
        } else if (scenario.type === 'boundary') {
            return endpoint.successStatusCode || 200;
        }
        return 200;
    }

    generateSampleRequestBody(endpoint) {
        console.log(`[TestGenerationService] Generating sample request body | Endpoint: ${endpoint.path}`);

        if (!endpoint.requestSchema) {
            return {};
        }

        const sampleBody = {};

        if (endpoint.requestSchema.properties) {
            Object.keys(endpoint.requestSchema.properties).forEach(key => {
                const property = endpoint.requestSchema.properties[key];
                sampleBody[key] = this.generateSampleValue(property);
            });
        }

        console.log(`[TestGenerationService] Sample request body generated | Fields: ${Object.keys(sampleBody).length}`);
        return sampleBody;
    }

    generateInvalidRequestBody(endpoint) {
        console.log(`[TestGenerationService] Generating invalid request body | Endpoint: ${endpoint.path}`);

        if (!endpoint.requestSchema) {
            return { invalid: 'data' };
        }

        const invalidBody = {};

        if (endpoint.requestSchema.properties) {
            Object.keys(endpoint.requestSchema.properties).forEach(key => {
                const property = endpoint.requestSchema.properties[key];
                invalidBody[key] = this.generateInvalidValue(property);
            });
        }

        console.log(`[TestGenerationService] Invalid request body generated`);
        return invalidBody;
    }

    generateBoundaryRequestBody(endpoint) {
        console.log(`[TestGenerationService] Generating boundary request body | Endpoint: ${endpoint.path}`);

        if (!endpoint.requestSchema) {
            return {};
        }

        const boundaryBody = {};

        if (endpoint.requestSchema.properties) {
            Object.keys(endpoint.requestSchema.properties).forEach(key => {
                const property = endpoint.requestSchema.properties[key];
                boundaryBody[key] = this.generateBoundaryValue(property);
            });
        }

        console.log(`[TestGenerationService] Boundary request body generated`);
        return boundaryBody;
    }

    generateSampleValue(property) {
        const type = property.type;

        switch (type) {
            case 'string':
                return property.example || 'test_string';
            case 'number':
            case 'integer':
                return property.example || 123;
            case 'boolean':
                return property.example !== undefined ? property.example : true;
            case 'array':
                return property.example || [];
            case 'object':
                return property.example || {};
            default:
                return null;
        }
    }

    generateInvalidValue(property) {
        const type = property.type;

        switch (type) {
            case 'string':
                return 12345;
            case 'number':
            case 'integer':
                return 'invalid_number';
            case 'boolean':
                return 'not_boolean';
            case 'array':
                return 'not_array';
            case 'object':
                return 'not_object';
            default:
                return null;
        }
    }

    generateBoundaryValue(property) {
        const type = property.type;

        switch (type) {
            case 'string':
                return property.maxLength ? 'a'.repeat(property.maxLength) : 'boundary_string';
            case 'number':
            case 'integer':
                return property.maximum || 999999;
            case 'boolean':
                return true;
            case 'array':
                return property.maxItems ? new Array(property.maxItems).fill('item') : [];
            case 'object':
                return {};
            default:
                return null;
        }
    }

    async generateDataDrivenTests(endpoint, testDataSets, projectConfig, aiProvider = 'anthropic') {
        console.log(`[TestGenerationService] Generate data-driven tests | Endpoint: ${endpoint.path} | DataSets: ${testDataSets.length}`);

        try {
            const dataDrivenTests = [];

            for (let i = 0; i < testDataSets.length; i++) {
                const dataSet = testDataSets[i];
                console.log(`[TestGenerationService] Processing data set ${i + 1}/${testDataSets.length}`);

                const testCase = {
                    name: `${endpoint.name}_data_${i + 1}`,
                    description: `Data-driven test with dataset ${i + 1}`,
                    scenario: 'Data-driven test scenario',
                    type: 'positive',
                    request: {
                        ...this.buildTestRequest(endpoint, { type: 'positive' }),
                        body: dataSet.input
                    },
                    expectedResponse: {
                        statusCode: 200,
                        body: dataSet.expected
                    },
                    testData: {
                        input: dataSet.input,
                        expected: dataSet.expected,
                        source: 'static',
                        dataSet: `dataset_${i + 1}`
                    }
                };

                dataDrivenTests.push(testCase);
            }

            console.log(`[TestGenerationService] Data-driven tests generated | Total: ${dataDrivenTests.length}`);
            return dataDrivenTests;
        } catch (error) {
            console.error(`[TestGenerationService] Data-driven test generation failed | Error: ${error.message}`);
            throw error;
        }
    }

    async generateNegativeTests(endpoint, projectConfig, aiProvider = 'anthropic') {
        console.log(`[TestGenerationService] Generate negative tests | Endpoint: ${endpoint.path}`);

        try {
            const negativeScenarios = [
                { type: 'negative', description: 'Invalid request body', scenario: 'Send invalid data' },
                { type: 'negative', description: 'Missing required fields', scenario: 'Omit required fields' },
                { type: 'negative', description: 'Invalid data types', scenario: 'Send wrong data types' },
                { type: 'security', description: 'Unauthorized access', scenario: 'Access without authentication' },
                { type: 'security', description: 'Invalid authentication', scenario: 'Use invalid credentials' }
            ];

            const negativeTests = await this.generateTestCases(endpoint, negativeScenarios, aiProvider);

            console.log(`[TestGenerationService] Negative tests generated | Total: ${negativeTests.length}`);
            return negativeTests;
        } catch (error) {
            console.error(`[TestGenerationService] Negative test generation failed | Error: ${error.message}`);
            throw error;
        }
    }

    async batchGenerateTests(endpoints, projectConfig, options = {}) {
        const startTime = Date.now();
        console.log(`[TestGenerationService] Batch generation started | Endpoints: ${endpoints.length}`);

        try {
            const results = {
                generated: [],
                failed: [],
                totalEndpoints: endpoints.length,
                successCount: 0,
                failureCount: 0
            };

            const batchSize = options.batchSize || 5;
            const aiProvider = options.aiProvider || 'anthropic';

            for (let i = 0; i < endpoints.length; i += batchSize) {
                const batch = endpoints.slice(i, i + batchSize);
                console.log(`[TestGenerationService] Processing batch ${Math.floor(i / batchSize) + 1} | Endpoints: ${batch.length}`);

                const batchPromises = batch.map(endpoint =>
                    this.generateTestScript(endpoint, projectConfig, aiProvider)
                        .then(testScript => ({ success: true, endpoint, testScript }))
                        .catch(error => ({ success: false, endpoint, error: error.message }))
                );

                const batchResults = await Promise.all(batchPromises);

                batchResults.forEach(result => {
                    if (result.success) {
                        results.generated.push(result);
                        results.successCount++;
                    } else {
                        results.failed.push(result);
                        results.failureCount++;
                    }
                });

                if (i + batchSize < endpoints.length) {
                    await this.delay(2000);
                }
            }

            const duration = Date.now() - startTime;
            console.log(`[TestGenerationService] Batch generation completed | Success: ${results.successCount} | Failed: ${results.failureCount} | Duration: ${duration}ms`);

            return results;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[TestGenerationService] Batch generation failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    clearCache() {
        const size = this.generationCache.size;
        console.log(`[TestGenerationService] Clearing cache | Entries: ${size}`);
        this.generationCache.clear();
    }

    getCacheStats() {
        return {
            size: this.generationCache.size,
            entries: Array.from(this.generationCache.keys())
        };
    }
}

module.exports = new TestGenerationService();