const { anthropic, anthropicConfig } = require('../config/anthropic.config');

class AnthropicService {
    async analyzeCode(codeContent, language) {
        console.log(`[AnthropicService] ANALYZE_CODE | Language: ${language} | Content Length: ${codeContent.length}`);

        try {
            const response = await anthropic.messages.create({
                model: anthropicConfig.model,
                max_tokens: anthropicConfig.maxTokens,
                messages: [{
                    role: 'user',
                    content: `Analyze this ${language} code and provide:
1. Architecture and design patterns
2. API endpoints and their functionality
3. Database schema and relationships
4. Authentication and security patterns
5. Error handling mechanisms
6. Potential issues or improvements
7. Test coverage recommendations

Code:
${codeContent}`
                }]
            });

            const analysis = response.content[0].text;
            console.log(`[AnthropicService] ANALYZE_CODE_SUCCESS | Analysis generated`);

            return { success: true, analysis };
        } catch (error) {
            console.error(`[AnthropicService] ANALYZE_CODE_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async generateTestCode(apiEndpoint, language = 'java', framework = 'rest-assured') {
        console.log(`[AnthropicService] GENERATE_TEST | Endpoint: ${apiEndpoint.method} ${apiEndpoint.path}`);

        try {
            const response = await anthropic.messages.create({
                model: anthropicConfig.model,
                max_tokens: anthropicConfig.maxTokens,
                messages: [{
                    role: 'user',
                    content: `Generate professional ${language} test code using ${framework} for:
Endpoint: ${apiEndpoint.method} ${apiEndpoint.path}
Name: ${apiEndpoint.name}
Description: ${apiEndpoint.documentation?.description || ''}
Request Body: ${JSON.stringify(apiEndpoint.requestBody || {})}
Response Schema: ${JSON.stringify(apiEndpoint.responseSchema || {})}

Include:
1. Test method with @Test annotation
2. Request building
3. Response assertions
4. Error handling
5. Data validation
6. Best practices and patterns`
                }]
            });

            const testCode = response.content[0].text;
            console.log(`[AnthropicService] GENERATE_TEST_SUCCESS | Test code generated`);

            return { success: true, testCode };
        } catch (error) {
            console.error(`[AnthropicService] GENERATE_TEST_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async optimizeTestScript(testCode, language) {
        console.log(`[AnthropicService] OPTIMIZE_SCRIPT | Language: ${language} | Code Length: ${testCode.length}`);

        try {
            const response = await anthropic.messages.create({
                model: anthropicConfig.model,
                max_tokens: anthropicConfig.maxTokens,
                messages: [{
                    role: 'user',
                    content: `Optimize this ${language} test script for production use:
${testCode}

Focus on:
1. Code reusability
2. Performance optimization
3. Error handling
4. Maintainability
5. Following ${language} best practices
6. Remove duplication
7. Add proper logging

Return optimized code only.`
                }]
            });

            const optimizedCode = response.content[0].text;
            console.log(`[AnthropicService] OPTIMIZE_SCRIPT_SUCCESS | Optimization completed`);

            return { success: true, optimizedCode };
        } catch (error) {
            console.error(`[AnthropicService] OPTIMIZE_SCRIPT_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async detectApiPatterns(codeContent) {
        console.log(`[AnthropicService] DETECT_PATTERNS | Code Length: ${codeContent.length}`);

        try {
            const response = await anthropic.messages.create({
                model: anthropicConfig.model,
                max_tokens: anthropicConfig.maxTokens,
                messages: [{
                    role: 'user',
                    content: `Identify all API patterns from this code:
${codeContent}

Extract:
1. Authentication patterns (JWT, OAuth, Basic, etc.)
2. Request/Response patterns
3. Error handling patterns
4. Validation approaches
5. Middleware patterns
6. Rate limiting mechanisms
7. Caching strategies
8. Database access patterns

Return as JSON object with detailed pattern information.`
                }]
            });

            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const patterns = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

            console.log(`[AnthropicService] DETECT_PATTERNS_SUCCESS | Patterns identified`);

            return { success: true, patterns };
        } catch (error) {
            console.error(`[AnthropicService] DETECT_PATTERNS_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async generateLoadTestScript(endpoint, virtualUsers, duration, rampUp) {
        console.log(`[AnthropicService] GENERATE_LOAD_TEST | Endpoint: ${endpoint.path} | VUsers: ${virtualUsers}`);

        try {
            const response = await anthropic.messages.create({
                model: anthropicConfig.model,
                max_tokens: anthropicConfig.maxTokens,
                messages: [{
                    role: 'user',
                    content: `Generate a comprehensive load test script for:
Endpoint: ${endpoint.method} ${endpoint.path}
Virtual Users: ${virtualUsers}
Duration: ${duration} seconds
Ramp-up Time: ${rampUp} seconds
Request Body: ${JSON.stringify(endpoint.requestBody || {})}

Generate professional JMeter or Gatling script with:
1. Thread group configuration
2. Request samplers
3. Response assertions
4. Performance thresholds
5. Listener configurations
6. Success/Failure criteria
7. CSV data handling
8. Correlation mechanisms`
                }]
            });

            const loadTestScript = response.content[0].text;
            console.log(`[AnthropicService] GENERATE_LOAD_TEST_SUCCESS | Load test script generated`);

            return { success: true, loadTestScript };
        } catch (error) {
            console.error(`[AnthropicService] GENERATE_LOAD_TEST_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async generateIntegrationTests(controllers, models, database) {
        console.log(`[AnthropicService] GENERATE_INTEGRATION_TESTS | Controllers: ${controllers.length}`);

        try {
            const response = await anthropic.messages.create({
                model: anthropicConfig.model,
                max_tokens: anthropicConfig.maxTokens,
                messages: [{
                    role: 'user',
                    content: `Generate integration tests for:
Controllers:
${JSON.stringify(controllers, null, 2)}

Models:
${JSON.stringify(models, null, 2)}

Database: ${database.type}

Create comprehensive integration tests that:
1. Test end-to-end workflows
2. Verify database transactions
3. Check error scenarios
4. Validate data integrity
5. Test concurrent operations
6. Include setup and teardown
7. Use proper fixtures and mocking
8. Follow TestNG best practices`
                }]
            });

            const integrationTests = response.content[0].text;
            console.log(`[AnthropicService] GENERATE_INTEGRATION_TESTS_SUCCESS | Integration tests generated`);

            return { success: true, integrationTests };
        } catch (error) {
            console.error(`[AnthropicService] GENERATE_INTEGRATION_TESTS_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async analyzeTestCoverage(endpoints, testScripts) {
        console.log(`[AnthropicService] ANALYZE_COVERAGE | Endpoints: ${endpoints.length} | Tests: ${testScripts.length}`);

        try {
            const response = await anthropic.messages.create({
                model: anthropicConfig.model,
                max_tokens: anthropicConfig.maxTokens,
                messages: [{
                    role: 'user',
                    content: `Analyze test coverage for these endpoints:
${JSON.stringify(endpoints, null, 2)}

Against these test scripts:
${JSON.stringify(testScripts, null, 2)}

Provide:
1. Coverage percentage
2. Gaps in coverage
3. Uncovered scenarios
4. Risk areas
5. Recommendations for improvement
6. Priority areas for additional tests

Return as JSON with detailed analysis.`
                }]
            });

            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const coverage = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

            console.log(`[AnthropicService] ANALYZE_COVERAGE_SUCCESS | Coverage analysis completed`);

            return { success: true, coverage };
        } catch (error) {
            console.error(`[AnthropicService] ANALYZE_COVERAGE_ERROR | Error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new AnthropicService();