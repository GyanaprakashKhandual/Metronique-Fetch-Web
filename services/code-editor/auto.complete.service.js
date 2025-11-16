const TestFile = require('../../models/test.file.model');
const Project = require('../../models/project.model');
const ApiEndpoint = require('../../models/api.endpoint.model');
const DatabaseConnection = require('../../models/database.connection.model');

class AutocompleteService {
    constructor() {
        this.javaKeywords = ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'void', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'new', 'import', 'package'];
        this.restAssuredMethods = ['given', 'when', 'then', 'get', 'post', 'put', 'delete', 'patch', 'header', 'headers', 'queryParam', 'pathParam', 'body', 'contentType', 'accept', 'statusCode', 'assertThat', 'extract', 'response'];
        this.testNGAnnotations = ['@Test', '@BeforeTest', '@AfterTest', '@BeforeClass', '@AfterClass', '@BeforeMethod', '@AfterMethod', '@DataProvider', '@Parameters'];
        this.cucumberKeywords = ['Given', 'When', 'Then', 'And', 'But', 'Feature', 'Scenario', 'Background', 'Examples'];
    }

    async getCompletions(fileId, position, context) {
        try {
            console.log(`[AUTOCOMPLETE_SERVICE] GET_COMPLETIONS | File: ${fileId} | Position: Line ${position.line}, Col ${position.column}`);

            const file = await TestFile.findById(fileId).populate('project');

            if (!file) {
                console.error(`[AUTOCOMPLETE_SERVICE] GET_COMPLETIONS_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            const completions = [];

            switch (file.language) {
                case 'java':
                    completions.push(...await this.getJavaCompletions(file, context));
                    break;
                case 'gherkin':
                    completions.push(...this.getGherkinCompletions(context));
                    break;
                case 'javascript':
                case 'typescript':
                    completions.push(...this.getJavaScriptCompletions(context));
                    break;
                case 'python':
                    completions.push(...this.getPythonCompletions(context));
                    break;
                default:
                    completions.push(...this.getGenericCompletions(context));
            }

            if (file.type === 'test' && file.project) {
                completions.push(...await this.getProjectSpecificCompletions(file.project._id, context));
            }

            console.log(`[AUTOCOMPLETE_SERVICE] GET_COMPLETIONS_SUCCESS | File: ${file.name} | Completions: ${completions.length}`);

            return {
                success: true,
                completions: completions.slice(0, 50)
            };
        } catch (error) {
            console.error(`[AUTOCOMPLETE_SERVICE] GET_COMPLETIONS_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async getJavaCompletions(file, context) {
        console.log(`[AUTOCOMPLETE_SERVICE] GET_JAVA_COMPLETIONS | File: ${file.name}`);

        const completions = [];

        completions.push(...this.javaKeywords.map(keyword => ({
            label: keyword,
            kind: 'keyword',
            detail: 'Java Keyword',
            insertText: keyword
        })));

        if (file.type === 'test') {
            completions.push(...this.restAssuredMethods.map(method => ({
                label: method + '()',
                kind: 'method',
                detail: 'REST Assured Method',
                insertText: method + '()',
                documentation: `REST Assured method for API testing`
            })));

            completions.push(...this.testNGAnnotations.map(annotation => ({
                label: annotation,
                kind: 'annotation',
                detail: 'TestNG Annotation',
                insertText: annotation
            })));
        }

        if (file.metadata && file.metadata.imports) {
            file.metadata.imports.forEach(importPath => {
                const className = importPath.split('.').pop();
                completions.push({
                    label: className,
                    kind: 'class',
                    detail: 'Imported Class',
                    insertText: className,
                    documentation: importPath
                });
            });
        }

        if (context.includes('Response')) {
            completions.push(
                { label: 'statusCode()', kind: 'method', detail: 'Response Method', insertText: 'statusCode()' },
                { label: 'body()', kind: 'method', detail: 'Response Method', insertText: 'body()' },
                { label: 'headers()', kind: 'method', detail: 'Response Method', insertText: 'headers()' },
                { label: 'extract()', kind: 'method', detail: 'Response Method', insertText: 'extract()' }
            );
        }

        console.log(`[AUTOCOMPLETE_SERVICE] GET_JAVA_COMPLETIONS_SUCCESS | Completions: ${completions.length}`);
        return completions;
    }

    getGherkinCompletions(context) {
        console.log(`[AUTOCOMPLETE_SERVICE] GET_GHERKIN_COMPLETIONS`);

        const completions = this.cucumberKeywords.map(keyword => ({
            label: keyword,
            kind: 'keyword',
            detail: 'Gherkin Keyword',
            insertText: keyword + ' ',
            documentation: `Cucumber/Gherkin keyword for BDD testing`
        }));

        completions.push(
            {
                label: 'Scenario:',
                kind: 'snippet',
                detail: 'Scenario Template',
                insertText: 'Scenario: ${1:scenario_name}\n  Given ${2:precondition}\n  When ${3:action}\n  Then ${4:expected_result}'
            },
            {
                label: 'Scenario Outline:',
                kind: 'snippet',
                detail: 'Scenario Outline Template',
                insertText: 'Scenario Outline: ${1:scenario_name}\n  Given ${2:precondition}\n  When ${3:action}\n  Then ${4:expected_result}\n  Examples:\n    | ${5:column1} | ${6:column2} |\n    | ${7:value1}  | ${8:value2}  |'
            }
        );

        console.log(`[AUTOCOMPLETE_SERVICE] GET_GHERKIN_COMPLETIONS_SUCCESS | Completions: ${completions.length}`);
        return completions;
    }

    getJavaScriptCompletions(context) {
        console.log(`[AUTOCOMPLETE_SERVICE] GET_JAVASCRIPT_COMPLETIONS`);

        const keywords = ['const', 'let', 'var', 'function', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'import', 'export', 'class'];

        const completions = keywords.map(keyword => ({
            label: keyword,
            kind: 'keyword',
            detail: 'JavaScript Keyword',
            insertText: keyword
        }));

        completions.push(
            { label: 'console.log()', kind: 'method', detail: 'Console Method', insertText: 'console.log()' },
            { label: 'JSON.stringify()', kind: 'method', detail: 'JSON Method', insertText: 'JSON.stringify()' },
            { label: 'JSON.parse()', kind: 'method', detail: 'JSON Method', insertText: 'JSON.parse()' }
        );

        console.log(`[AUTOCOMPLETE_SERVICE] GET_JAVASCRIPT_COMPLETIONS_SUCCESS | Completions: ${completions.length}`);
        return completions;
    }

    getPythonCompletions(context) {
        console.log(`[AUTOCOMPLETE_SERVICE] GET_PYTHON_COMPLETIONS`);

        const keywords = ['def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'raise', 'with', 'as', 'lambda', 'pass'];

        const completions = keywords.map(keyword => ({
            label: keyword,
            kind: 'keyword',
            detail: 'Python Keyword',
            insertText: keyword
        }));

        completions.push(
            { label: 'print()', kind: 'function', detail: 'Built-in Function', insertText: 'print()' },
            { label: 'len()', kind: 'function', detail: 'Built-in Function', insertText: 'len()' },
            { label: 'range()', kind: 'function', detail: 'Built-in Function', insertText: 'range()' }
        );

        console.log(`[AUTOCOMPLETE_SERVICE] GET_PYTHON_COMPLETIONS_SUCCESS | Completions: ${completions.length}`);
        return completions;
    }

    getGenericCompletions(context) {
        console.log(`[AUTOCOMPLETE_SERVICE] GET_GENERIC_COMPLETIONS`);

        return [
            { label: 'TODO', kind: 'keyword', detail: 'Comment', insertText: 'TODO: ' },
            { label: 'FIXME', kind: 'keyword', detail: 'Comment', insertText: 'FIXME: ' },
            { label: 'NOTE', kind: 'keyword', detail: 'Comment', insertText: 'NOTE: ' }
        ];
    }

    async getProjectSpecificCompletions(projectId, context) {
        console.log(`[AUTOCOMPLETE_SERVICE] GET_PROJECT_COMPLETIONS | Project: ${projectId}`);

        const completions = [];

        try {
            const endpoints = await ApiEndpoint.find({ project: projectId, isActive: true })
                .select('name path method')
                .limit(20);

            endpoints.forEach(endpoint => {
                completions.push({
                    label: `${endpoint.method} ${endpoint.path}`,
                    kind: 'value',
                    detail: 'API Endpoint',
                    insertText: `"${endpoint.path}"`,
                    documentation: `${endpoint.method} request to ${endpoint.name}`
                });
            });

            const databases = await DatabaseConnection.find({ project: projectId, isActive: true })
                .select('name type')
                .limit(10);

            databases.forEach(db => {
                completions.push({
                    label: db.name,
                    kind: 'value',
                    detail: `Database Connection (${db.type})`,
                    insertText: `"${db.name}"`,
                    documentation: `${db.type} database connection`
                });
            });

            console.log(`[AUTOCOMPLETE_SERVICE] GET_PROJECT_COMPLETIONS_SUCCESS | Completions: ${completions.length}`);
        } catch (error) {
            console.error(`[AUTOCOMPLETE_SERVICE] GET_PROJECT_COMPLETIONS_ERROR | Error: ${error.message}`);
        }

        return completions;
    }

    async getSnippets(language) {
        console.log(`[AUTOCOMPLETE_SERVICE] GET_SNIPPETS | Language: ${language}`);

        const snippets = {
            java: [
                {
                    label: 'REST Assured Test Method',
                    insertText: '@Test\npublic void ${1:testMethodName}() {\n    given()\n        .header("Content-Type", "application/json")\n        .body(${2:requestBody})\n    .when()\n        .${3:post}("${4:/api/endpoint}")\n    .then()\n        .statusCode(${5:200})\n        .body("${6:field}", equalTo(${7:expectedValue}));\n}'
                },
                {
                    label: 'TestNG Test Class',
                    insertText: 'public class ${1:TestClassName} {\n    \n    @BeforeClass\n    public void setup() {\n        ${2:// Setup code}\n    }\n    \n    @Test\n    public void ${3:testMethod}() {\n        ${4:// Test code}\n    }\n    \n    @AfterClass\n    public void teardown() {\n        ${5:// Cleanup code}\n    }\n}'
                }
            ],
            gherkin: [
                {
                    label: 'Feature Template',
                    insertText: 'Feature: ${1:Feature Name}\n  \n  Background:\n    Given ${2:common precondition}\n  \n  Scenario: ${3:Scenario Name}\n    Given ${4:precondition}\n    When ${5:action}\n    Then ${6:expected result}'
                }
            ]
        };

        const result = snippets[language] || [];
        console.log(`[AUTOCOMPLETE_SERVICE] GET_SNIPPETS_SUCCESS | Language: ${language} | Snippets: ${result.length}`);

        return {
            success: true,
            snippets: result
        };
    }
}

module.exports = new AutocompleteService();