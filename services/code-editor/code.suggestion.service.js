const TestFile = require('../../models/test.file.model');
const ApiEndpoint = require('../../models/api.endpoint.model');
const TestScript = require('../../models/test.script.model');
const DatabaseConnection = require('../../models/database.connection.model');
const anthropic = require('../ai/anthropic.service');
const openai = require('../ai/openai.service');

class CodeSuggestionService {
    async getSuggestions(fileId, cursorPosition, context) {
        try {
            console.log(`[CODE_SUGGESTION_SERVICE] GET_SUGGESTIONS | File: ${fileId} | Position: Line ${cursorPosition.line}, Col ${cursorPosition.column}`);
            
            const file = await TestFile.findById(fileId).populate('project');

            if (!file) {
                console.error(`[CODE_SUGGESTION_SERVICE] GET_SUGGESTIONS_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            const suggestions = [];

            suggestions.push(...this.getContextualSuggestions(file, cursorPosition, context));

            if (file.type === 'test') {
                suggestions.push(...await this.getTestSpecificSuggestions(file, context));
            }

            suggestions.push(...await this.getPatternBasedSuggestions(file, context));

            console.log(`[CODE_SUGGESTION_SERVICE] GET_SUGGESTIONS_SUCCESS | File: ${file.name} | Suggestions: ${suggestions.length}`);

            return {
                success: true,
                suggestions: suggestions.slice(0, 10)
            };
        } catch (error) {
            console.error(`[CODE_SUGGESTION_SERVICE] GET_SUGGESTIONS_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    getContextualSuggestions(file, cursorPosition, context) {
        console.log(`[CODE_SUGGESTION_SERVICE] GET_CONTEXTUAL_SUGGESTIONS | File: ${file.name} | Context: ${context.substring(0, 50)}...`);
        
        const suggestions = [];
        const lines = file.content.split('\n');
        const currentLine = lines[cursorPosition.line - 1] || '';
        const trimmedLine = currentLine.trim();

        if (file.language === 'java') {
            if (trimmedLine.startsWith('@Test')) {
                suggestions.push({
                    type: 'method',
                    label: 'Complete Test Method',
                    detail: 'Generate REST Assured test method structure',
                    insertText: `\npublic void testApiEndpoint() {\n    given()\n        .header("Content-Type", "application/json")\n        .body(requestBody)\n    .when()\n        .post("/api/endpoint")\n    .then()\n        .statusCode(200)\n        .body("field", equalTo(expectedValue));\n}`,
                    priority: 10
                });
            }

            if (trimmedLine.includes('given()')) {
                suggestions.push(
                    {
                        type: 'method',
                        label: '.header()',
                        detail: 'Add request header',
                        insertText: '.header("Content-Type", "application/json")',
                        priority: 9
                    },
                    {
                        type: 'method',
                        label: '.queryParam()',
                        detail: 'Add query parameter',
                        insertText: '.queryParam("key", "value")',
                        priority: 9
                    },
                    {
                        type: 'method',
                        label: '.pathParam()',
                        detail: 'Add path parameter',
                        insertText: '.pathParam("key", "value")',
                        priority: 9
                    },
                    {
                        type: 'method',
                        label: '.body()',
                        detail: 'Add request body',
                        insertText: '.body(requestBody)',
                        priority: 9
                    }
                );
            }

            if (trimmedLine.includes('when()')) {
                suggestions.push(
                    {
                        type: 'method',
                        label: '.get()',
                        detail: 'GET request',
                        insertText: '.get("/api/endpoint")',
                        priority: 9
                    },
                    {
                        type: 'method',
                        label: '.post()',
                        detail: 'POST request',
                        insertText: '.post("/api/endpoint")',
                        priority: 9
                    },
                    {
                        type: 'method',
                        label: '.put()',
                        detail: 'PUT request',
                        insertText: '.put("/api/endpoint")',
                        priority: 9
                    },
                    {
                        type: 'method',
                        label: '.delete()',
                        detail: 'DELETE request',
                        insertText: '.delete("/api/endpoint")',
                        priority: 9
                    }
                );
            }

            if (trimmedLine.includes('then()')) {
                suggestions.push(
                    {
                        type: 'method',
                        label: '.statusCode()',
                        detail: 'Assert status code',
                        insertText: '.statusCode(200)',
                        priority: 9
                    },
                    {
                        type: 'method',
                        label: '.body()',
                        detail: 'Assert response body',
                        insertText: '.body("field", equalTo(expectedValue))',
                        priority: 9
                    },
                    {
                        type: 'method',
                        label: '.time()',
                        detail: 'Assert response time',
                        insertText: '.time(lessThan(2000L))',
                        priority: 8
                    }
                );
            }

            if (trimmedLine.includes('Assert.')) {
                suggestions.push(
                    {
                        type: 'method',
                        label: 'Assert.assertEquals()',
                        detail: 'Assert equality',
                        insertText: 'Assert.assertEquals(expected, actual);',
                        priority: 8
                    },
                    {
                        type: 'method',
                        label: 'Assert.assertTrue()',
                        detail: 'Assert true condition',
                        insertText: 'Assert.assertTrue(condition);',
                        priority: 8
                    },
                    {
                        type: 'method',
                        label: 'Assert.assertNotNull()',
                        detail: 'Assert not null',
                        insertText: 'Assert.assertNotNull(object);',
                        priority: 8
                    }
                );
            }
        }

        if (file.language === 'gherkin') {
            if (!trimmedLine) {
                suggestions.push(
                    {
                        type: 'keyword',
                        label: 'Given',
                        detail: 'Precondition step',
                        insertText: 'Given ',
                        priority: 10
                    },
                    {
                        type: 'keyword',
                        label: 'When',
                        detail: 'Action step',
                        insertText: 'When ',
                        priority: 10
                    },
                    {
                        type: 'keyword',
                        label: 'Then',
                        detail: 'Assertion step',
                        insertText: 'Then ',
                        priority: 10
                    },
                    {
                        type: 'keyword',
                        label: 'And',
                        detail: 'Additional step',
                        insertText: 'And ',
                        priority: 9
                    }
                );
            }
        }

        console.log(`[CODE_SUGGESTION_SERVICE] GET_CONTEXTUAL_SUGGESTIONS_SUCCESS | Suggestions: ${suggestions.length}`);
        return suggestions;
    }

    async getTestSpecificSuggestions(file, context) {
        console.log(`[CODE_SUGGESTION_SERVICE] GET_TEST_SUGGESTIONS | File: ${file.name} | Project: ${file.project._id}`);
        
        const suggestions = [];

        try {
            const endpoints = await ApiEndpoint.find({ 
                project: file.project._id, 
                isActive: true 
            }).limit(5);

            endpoints.forEach(endpoint => {
                suggestions.push({
                    type: 'endpoint',
                    label: `Test ${endpoint.method} ${endpoint.path}`,
                    detail: endpoint.name || 'API Endpoint Test',
                    insertText: this.generateEndpointTestCode(endpoint, file.language),
                    priority: 8,
                    metadata: {
                        endpointId: endpoint._id,
                        method: endpoint.method,
                        path: endpoint.path
                    }
                });
            });

            const databases = await DatabaseConnection.find({ 
                project: file.project._id, 
                isActive: true 
            }).limit(3);

            databases.forEach(db => {
                suggestions.push({
                    type: 'database',
                    label: `Database Validation for ${db.name}`,
                    detail: `Validate data in ${db.type} database`,
                    insertText: this.generateDatabaseValidationCode(db, file.language),
                    priority: 7,
                    metadata: {
                        databaseId: db._id,
                        databaseType: db.type,
                        databaseName: db.name
                    }
                });
            });

            console.log(`[CODE_SUGGESTION_SERVICE] GET_TEST_SUGGESTIONS_SUCCESS | Suggestions: ${suggestions.length}`);
        } catch (error) {
            console.error(`[CODE_SUGGESTION_SERVICE] GET_TEST_SUGGESTIONS_ERROR | Error: ${error.message}`);
        }

        return suggestions;
    }

    async getPatternBasedSuggestions(file, context) {
        console.log(`[CODE_SUGGESTION_SERVICE] GET_PATTERN_SUGGESTIONS | File: ${file.name}`);
        
        const suggestions = [];

        try {
            const similarFiles = await TestFile.find({
                project: file.project,
                language: file.language,
                type: file.type,
                _id: { $ne: file._id }
            }).limit(5);

            const commonPatterns = this.extractCommonPatterns(similarFiles);

            commonPatterns.forEach(pattern => {
                suggestions.push({
                    type: 'pattern',
                    label: pattern.name,
                    detail: 'Common pattern from similar files',
                    insertText: pattern.code,
                    priority: 6,
                    metadata: {
                        frequency: pattern.frequency,
                        source: 'pattern-analysis'
                    }
                });
            });

            console.log(`[CODE_SUGGESTION_SERVICE] GET_PATTERN_SUGGESTIONS_SUCCESS | Suggestions: ${suggestions.length}`);
        } catch (error) {
            console.error(`[CODE_SUGGESTION_SERVICE] GET_PATTERN_SUGGESTIONS_ERROR | Error: ${error.message}`);
        }

        return suggestions;
    }

    extractCommonPatterns(files) {
        console.log(`[CODE_SUGGESTION_SERVICE] EXTRACT_PATTERNS | Files: ${files.length}`);
        
        const patterns = [];
        const patternMap = new Map();

        files.forEach(file => {
            const lines = file.content.split('\n');
            
            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed.length > 20 && trimmed.length < 100) {
                    const count = patternMap.get(trimmed) || 0;
                    patternMap.set(trimmed, count + 1);
                }
            });
        });

        patternMap.forEach((frequency, code) => {
            if (frequency >= 2) {
                patterns.push({
                    name: code.substring(0, 50) + (code.length > 50 ? '...' : ''),
                    code,
                    frequency
                });
            }
        });

        patterns.sort((a, b) => b.frequency - a.frequency);

        console.log(`[CODE_SUGGESTION_SERVICE] EXTRACT_PATTERNS_SUCCESS | Patterns: ${patterns.length}`);
        return patterns.slice(0, 5);
    }

    generateEndpointTestCode(endpoint, language) {
        console.log(`[CODE_SUGGESTION_SERVICE] GENERATE_ENDPOINT_CODE | Endpoint: ${endpoint.method} ${endpoint.path} | Language: ${language}`);
        
        if (language === 'java') {
            return `@Test\npublic void test${this.toCamelCase(endpoint.name || 'Endpoint')}() {\n    given()\n        .header("Content-Type", "application/json")\n    .when()\n        .${endpoint.method.toLowerCase()}("${endpoint.path}")\n    .then()\n        .statusCode(200);\n}`;
        }

        return `// Test for ${endpoint.method} ${endpoint.path}`;
    }

    generateDatabaseValidationCode(database, language) {
        console.log(`[CODE_SUGGESTION_SERVICE] GENERATE_DATABASE_CODE | Database: ${database.name} | Type: ${database.type} | Language: ${language}`);
        
        if (language === 'java') {
            if (database.type === 'mongodb') {
                return `// Validate MongoDB data\nMongoCollection<Document> collection = mongoClient.getDatabase("${database.connection.database}").getCollection("collectionName");\nDocument result = collection.find(Filters.eq("field", "value")).first();\nAssert.assertNotNull(result);`;
            } else {
                return `// Validate SQL data\nConnection connection = DriverManager.getConnection("${database.connectionString}");\nStatement stmt = connection.createStatement();\nResultSet rs = stmt.executeQuery("SELECT * FROM table_name WHERE condition");\nAssert.assertTrue(rs.next());`;
            }
        }

        return `// Database validation for ${database.name}`;
    }

    async getAISuggestions(fileId, context, provider = 'anthropic') {
        try {
            console.log(`[CODE_SUGGESTION_SERVICE] GET_AI_SUGGESTIONS | File: ${fileId} | Provider: ${provider}`);
            
            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[CODE_SUGGESTION_SERVICE] GET_AI_SUGGESTIONS_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            const prompt = `Given this ${file.language} code context:\n\n${context}\n\nSuggest the next 3-5 lines of code that would logically follow. Focus on REST Assured API testing patterns, TestNG annotations, and database validation code. Return only the code suggestions without explanations.`;

            let suggestions = [];

            if (provider === 'anthropic') {
                suggestions = await anthropic.generateCodeSuggestions(prompt, file.language);
            } else if (provider === 'openai') {
                suggestions = await openai.generateCodeSuggestions(prompt, file.language);
            }

            console.log(`[CODE_SUGGESTION_SERVICE] GET_AI_SUGGESTIONS_SUCCESS | Provider: ${provider} | Suggestions: ${suggestions.length}`);

            return {
                success: true,
                provider,
                suggestions: suggestions.map((suggestion, index) => ({
                    type: 'ai-generated',
                    label: `AI Suggestion ${index + 1}`,
                    detail: `Generated by ${provider}`,
                    insertText: suggestion,
                    priority: 7
                }))
            };
        } catch (error) {
            console.error(`[CODE_SUGGESTION_SERVICE] GET_AI_SUGGESTIONS_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async getSmartRefactoringSuggestions(fileId) {
        try {
            console.log(`[CODE_SUGGESTION_SERVICE] GET_REFACTORING_SUGGESTIONS | File: ${fileId}`);
            
            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[CODE_SUGGESTION_SERVICE] GET_REFACTORING_SUGGESTIONS_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            const suggestions = [];

            const duplicateCode = this.findDuplicateCode(file.content);
            if (duplicateCode.length > 0) {
                suggestions.push({
                    type: 'refactoring',
                    label: 'Extract Duplicate Code',
                    detail: `Found ${duplicateCode.length} duplicate code blocks`,
                    action: 'extract-method',
                    priority: 8
                });
            }

            const longMethods = this.findLongMethods(file.content);
            if (longMethods.length > 0) {
                suggestions.push({
                    type: 'refactoring',
                    label: 'Split Long Methods',
                    detail: `${longMethods.length} methods exceed 50 lines`,
                    action: 'split-method',
                    priority: 7
                });
            }

            console.log(`[CODE_SUGGESTION_SERVICE] GET_REFACTORING_SUGGESTIONS_SUCCESS | Suggestions: ${suggestions.length}`);

            return {
                success: true,
                suggestions
            };
        } catch (error) {
            console.error(`[CODE_SUGGESTION_SERVICE] GET_REFACTORING_SUGGESTIONS_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    findDuplicateCode(content) {
        const lines = content.split('\n');
        const blocks = [];
        const minBlockSize = 5;

        for (let i = 0; i < lines.length - minBlockSize; i++) {
            const block = lines.slice(i, i + minBlockSize).join('\n');
            if (block.trim().length > 50) {
                blocks.push({ start: i, code: block });
            }
        }

        const duplicates = [];
        for (let i = 0; i < blocks.length; i++) {
            for (let j = i + 1; j < blocks.length; j++) {
                if (blocks[i].code === blocks[j].code) {
                    duplicates.push(blocks[i]);
                    break;
                }
            }
        }

        return duplicates;
    }

    findLongMethods(content) {
        const lines = content.split('\n');
        const methods = [];
        let currentMethod = null;
        let braceCount = 0;

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            if (trimmed.match(/public\s+\w+\s+\w+\s*\(/)) {
                if (currentMethod) {
                    methods.push(currentMethod);
                }
                currentMethod = { start: index, lines: 1 };
            }

            if (currentMethod) {
                currentMethod.lines++;
                braceCount += (line.match(/\{/g) || []).length;
                braceCount -= (line.match(/\}/g) || []).length;

                if (braceCount === 0 && trimmed === '}') {
                    methods.push(currentMethod);
                    currentMethod = null;
                }
            }
        });

        return methods.filter(method => method.lines > 50);
    }

    toCamelCase(str) {
        return str
            .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
            .replace(/^./, (chr) => chr.toUpperCase());
    }
}

module.exports = new CodeSuggestionService();