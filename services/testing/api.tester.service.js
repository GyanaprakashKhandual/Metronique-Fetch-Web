const TestExecution = require('../../models/test.execution.model');
const TestResult = require('../../models/test.result.model');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class ApiTesterService {
    async executeTest(testScript, projectConfig, execution) {
        const startTime = Date.now();
        console.log(`[ApiTesterService] Executing API test | Script: ${testScript.name || testScript._id}`);

        try {
            const testCases = testScript.testCases || [];
            const results = [];

            for (const testCase of testCases) {
                const testResult = await this.executeTestCase(testCase, projectConfig);
                results.push(testResult);

                await execution.addTestResult(testResult);
            }

            const duration = Date.now() - startTime;
            const status = results.every(r => r.status === 'passed') ? 'passed' : 'failed';

            console.log(`[ApiTesterService] Test execution completed | Status: ${status} | Duration: ${duration}ms`);

            return { status, results, duration };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[ApiTesterService] Test execution failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async executeTestCase(testCase, projectConfig) {
        const startTime = Date.now();
        console.log(`[ApiTesterService] Executing test case | Name: ${testCase.name}`);

        try {
            const request = testCase.request;
            const expectedResponse = testCase.expectedResponse;

            const response = await this.sendRequest(request, projectConfig);
            const assertions = await this.validateResponse(response, expectedResponse, testCase.assertions);

            const duration = Date.now() - startTime;
            const status = assertions.every(a => a.passed) ? 'passed' : 'failed';

            console.log(`[ApiTesterService] Test case executed | Status: ${status} | Duration: ${duration}ms`);

            return {
                testCase: testCase._id,
                name: testCase.name,
                status: status,
                startedAt: new Date(startTime),
                completedAt: new Date(),
                duration: duration,
                request: request,
                response: {
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: response.body,
                    responseTime: response.responseTime
                },
                assertions: assertions
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[ApiTesterService] Test case failed | Duration: ${duration}ms | Error: ${error.message}`);

            return {
                testCase: testCase._id,
                name: testCase.name,
                status: 'error',
                duration: duration,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            };
        }
    }

    async sendRequest(request, projectConfig) {
        const requestStartTime = Date.now();
        console.log(`[ApiTesterService] Sending request | Method: ${request.method} | URL: ${request.url}`);

        try {
            const fetch = require('node-fetch');
            const url = `${projectConfig.baseUrl}${request.path || request.url}`;

            const options = {
                method: request.method,
                headers: {
                    'Content-Type': 'application/json',
                    ...request.headers
                }
            };

            if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
                options.body = JSON.stringify(request.body);
            }

            const response = await fetch(url, options);
            const responseTime = Date.now() - requestStartTime;

            let body;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                body = await response.json();
            } else {
                body = await response.text();
            }

            console.log(`[ApiTesterService] Request completed | StatusCode: ${response.status} | ResponseTime: ${responseTime}ms`);

            return {
                statusCode: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                body: body,
                responseTime: responseTime
            };
        } catch (error) {
            console.error(`[ApiTesterService] Request failed | Error: ${error.message}`);
            throw error;
        }
    }

    async validateResponse(response, expectedResponse, assertions) {
        console.log(`[ApiTesterService] Validating response | Assertions: ${assertions?.length || 0}`);

        const results = [];

        results.push({
            type: 'status-code',
            expected: expectedResponse.statusCode,
            actual: response.statusCode,
            passed: response.statusCode === expectedResponse.statusCode,
            message: `Status code is ${response.statusCode}, expected ${expectedResponse.statusCode}`
        });

        if (expectedResponse.responseTime) {
            results.push({
                type: 'response-time',
                expected: expectedResponse.responseTime.max,
                actual: response.responseTime,
                passed: response.responseTime <= expectedResponse.responseTime.max,
                message: `Response time is ${response.responseTime}ms`
            });
        }

        if (assertions) {
            for (const assertion of assertions) {
                const assertionResult = await this.evaluateAssertion(assertion, response);
                results.push(assertionResult);
            }
        }

        const passedCount = results.filter(r => r.passed).length;
        console.log(`[ApiTesterService] Validation completed | Passed: ${passedCount}/${results.length}`);

        return results;
    }

    async evaluateAssertion(assertion, response) {
        console.log(`[ApiTesterService] Evaluating assertion | Type: ${assertion.type}`);

        try {
            let passed = false;
            let actual = null;

            switch (assertion.type) {
                case 'body-contains':
                    actual = response.body;
                    passed = JSON.stringify(actual).includes(assertion.expected);
                    break;

                case 'body-equals':
                    actual = response.body;
                    passed = JSON.stringify(actual) === JSON.stringify(assertion.expected);
                    break;

                case 'header-exists':
                    passed = !!response.headers[assertion.field];
                    break;

                case 'json-path':
                    actual = this.getJsonPath(response.body, assertion.path);
                    passed = actual === assertion.expected;
                    break;

                default:
                    passed = false;
            }

            return {
                type: assertion.type,
                field: assertion.field,
                expected: assertion.expected,
                actual: actual,
                passed: passed,
                message: assertion.description || ''
            };
        } catch (error) {
            console.error(`[ApiTesterService] Assertion evaluation failed | Error: ${error.message}`);
            return {
                type: assertion.type,
                passed: false,
                message: error.message
            };
        }
    }

    getJsonPath(obj, path) {
        const keys = path.split('.');
        let value = obj;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }
}

module.exports = new ApiTesterService();
