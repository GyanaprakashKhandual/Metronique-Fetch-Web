const { openai, openaiConfig } = require('../config/open.ai.config');

class OpenAIService {
    async analyzeCode(codeContent, language) {
        console.log(`[OpenAIService] ANALYZE_CODE | Language: ${language} | Content Length: ${codeContent.length}`);

        try {
            const prompt = `Analyze this ${language} code and provide:
1. Overall structure and purpose
2. Key classes, methods, and functions
3. API endpoints and their functionality
4. Database operations and models
5. Authentication and authorization patterns
6. Error handling approach
7. Performance considerations

Code:
${codeContent}`;

            const response = await openai.chat.completions.create({
                model: openaiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: openaiConfig.maxTokens,
                temperature: openaiConfig.temperature
            });

            const analysis = response.choices[0].message.content;
            console.log(`[OpenAIService] ANALYZE_CODE_SUCCESS | Analysis generated`);

            return { success: true, analysis };
        } catch (error) {
            console.error(`[OpenAIService] ANALYZE_CODE_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async generateTestCode(apiEndpoint, language = 'java', framework = 'rest-assured') {
        console.log(`[OpenAIService] GENERATE_TEST | Endpoint: ${apiEndpoint.method} ${apiEndpoint.path}`);

        try {
            const prompt = `Generate a ${language} test case using ${framework} for this API endpoint:
Method: ${apiEndpoint.method}
Path: ${apiEndpoint.path}
Name: ${apiEndpoint.name}
Request Body: ${JSON.stringify(apiEndpoint.requestBody || {})}
Response Schema: ${JSON.stringify(apiEndpoint.responseSchema || {})}

Generate professional test code with assertions, error handling, and best practices.`;

            const response = await openai.chat.completions.create({
                model: openaiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: openaiConfig.maxTokens,
                temperature: 0.5
            });

            const testCode = response.choices[0].message.content;
            console.log(`[OpenAIService] GENERATE_TEST_SUCCESS | Test code generated`);

            return { success: true, testCode };
        } catch (error) {
            console.error(`[OpenAIService] GENERATE_TEST_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async optimizeTestScript(testCode, language) {
        console.log(`[OpenAIService] OPTIMIZE_SCRIPT | Language: ${language} | Code Length: ${testCode.length}`);

        try {
            const prompt = `Optimize this ${language} test script for:
1. Performance
2. Readability
3. Maintainability
4. Best practices
5. Reduce code duplication

Current script:
${testCode}

Provide the optimized version only.`;

            const response = await openai.chat.completions.create({
                model: openaiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: openaiConfig.maxTokens,
                temperature: 0.3
            });

            const optimizedCode = response.choices[0].message.content;
            console.log(`[OpenAIService] OPTIMIZE_SCRIPT_SUCCESS | Optimization completed`);

            return { success: true, optimizedCode };
        } catch (error) {
            console.error(`[OpenAIService] OPTIMIZE_SCRIPT_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async detectApiPatterns(codeContent) {
        console.log(`[OpenAIService] DETECT_PATTERNS | Code Length: ${codeContent.length}`);

        try {
            const prompt = `Identify and extract all API patterns from this code:
1. Authentication mechanisms
2. Request/response patterns
3. Error handling patterns
4. Validation patterns
5. Middleware usage
6. Rate limiting
7. Caching strategies

Code:
${codeContent}

Return as JSON with pattern details.`;

            const response = await openai.chat.completions.create({
                model: openaiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: openaiConfig.maxTokens,
                temperature: 0.4
            });

            const content = response.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const patterns = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

            console.log(`[OpenAIService] DETECT_PATTERNS_SUCCESS | Patterns identified`);

            return { success: true, patterns };
        } catch (error) {
            console.error(`[OpenAIService] DETECT_PATTERNS_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async generateLoadTestScript(endpoint, virtualUsers, duration) {
        console.log(`[OpenAIService] GENERATE_LOAD_TEST | Endpoint: ${endpoint.path} | VUsers: ${virtualUsers}`);

        try {
            const prompt = `Generate a load test script for:
Endpoint: ${endpoint.method} ${endpoint.path}
Virtual Users: ${virtualUsers}
Duration: ${duration}s
Framework: JMeter or Gatling

Include:
1. Thread configuration
2. Request sampling
3. Assertions
4. Listeners for metrics
5. Performance thresholds`;

            const response = await openai.chat.completions.create({
                model: openaiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: openaiConfig.maxTokens,
                temperature: 0.5
            });

            const loadTestScript = response.choices[0].message.content;
            console.log(`[OpenAIService] GENERATE_LOAD_TEST_SUCCESS | Load test script generated`);

            return { success: true, loadTestScript };
        } catch (error) {
            console.error(`[OpenAIService] GENERATE_LOAD_TEST_ERROR | Error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new OpenAIService();