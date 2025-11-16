const TestScript = require('../../models/test.script.model');
const restAssuredService = require('./rest.assured.service');
const cucumberService = require('./cucumber.service');
const testngService = require('./testng.service');

class TestScriptGeneratorService {
    constructor() {
        this.generatorStrategies = new Map([
            ['rest-assured', restAssuredService],
            ['cucumber', cucumberService],
            ['testng', testngService]
        ]);
    }

    async generateScript(endpoint, projectConfig, testCases, userId, aiProvider = 'anthropic') {
        const startTime = Date.now();
        console.log(`[TestScriptGeneratorService] Generate script started | Endpoint: ${endpoint.method} ${endpoint.path} | Framework: ${projectConfig.framework}`);

        try {
            const generator = this.generatorStrategies.get(projectConfig.framework);

            if (!generator) {
                throw new Error(`Unsupported framework: ${projectConfig.framework}`);
            }

            const scriptContent = await generator.generateTestClass(endpoint, projectConfig, testCases);

            const testScript = new TestScript({
                project: projectConfig.projectId,
                endpoint: endpoint._id,
                name: this.generateScriptName(endpoint, projectConfig.framework),
                description: `Automated test for ${endpoint.method} ${endpoint.path}`,
                framework: projectConfig.framework,
                language: projectConfig.language,
                scriptType: 'functional',
                content: scriptContent,
                testCases: testCases.map(tc => tc._id),
                generation: {
                    generatedBy: aiProvider,
                    generatedAt: new Date(),
                    model: 'claude-sonnet-4',
                    confidence: 85
                },
                status: 'generated',
                createdBy: userId
            });

            await testScript.save();

            const duration = Date.now() - startTime;
            console.log(`[TestScriptGeneratorService] Script generated successfully | ScriptId: ${testScript._id} | Duration: ${duration}ms`);

            return testScript;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[TestScriptGeneratorService] Script generation failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    generateScriptName(endpoint, framework) {
        const method = endpoint.method.charAt(0).toUpperCase() + endpoint.method.slice(1).toLowerCase();
        const pathParts = endpoint.path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
        const pathName = pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

        const name = `${method}${pathName}${this.getFrameworkSuffix(framework)}`;
        console.log(`[TestScriptGeneratorService] Script name generated | Name: ${name}`);
        return name;
    }

    getFrameworkSuffix(framework) {
        const suffixes = {
            'rest-assured': 'Test',
            'cucumber': 'Feature',
            'testng': 'Test',
            'junit': 'Test'
        };
        return suffixes[framework] || 'Test';
    }

    async generateMultipleScripts(endpoints, projectConfig, userId, aiProvider = 'anthropic') {
        const startTime = Date.now();
        console.log(`[TestScriptGeneratorService] Generating multiple scripts | Endpoints: ${endpoints.length} | Framework: ${projectConfig.framework}`);

        try {
            const results = {
                generated: [],
                failed: [],
                totalEndpoints: endpoints.length,
                successCount: 0,
                failureCount: 0
            };

            for (let i = 0; i < endpoints.length; i++) {
                const endpoint = endpoints[i];
                console.log(`[TestScriptGeneratorService] Processing endpoint ${i + 1}/${endpoints.length} | Path: ${endpoint.path}`);

                try {
                    const testCases = await this.generateDefaultTestCases(endpoint);
                    const script = await this.generateScript(endpoint, projectConfig, testCases, userId, aiProvider);

                    results.generated.push({ endpoint, script });
                    results.successCount++;
                } catch (error) {
                    console.error(`[TestScriptGeneratorService] Failed to generate script | Endpoint: ${endpoint.path} | Error: ${error.message}`);
                    results.failed.push({ endpoint, error: error.message });
                    results.failureCount++;
                }

                if (i < endpoints.length - 1) {
                    await this.delay(500);
                }
            }

            const duration = Date.now() - startTime;
            console.log(`[TestScriptGeneratorService] Multiple scripts generation completed | Success: ${results.successCount} | Failed: ${results.failureCount} | Duration: ${duration}ms`);

            return results;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[TestScriptGeneratorService] Multiple scripts generation failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async generateDefaultTestCases(endpoint) {
        console.log(`[TestScriptGeneratorService] Generating default test cases | Endpoint: ${endpoint.path}`);

        const testCases = [
            {
                name: `${endpoint.method}_${endpoint.name}_Success`,
                scenario: 'Successful request with valid data',
                type: 'positive'
            },
            {
                name: `${endpoint.method}_${endpoint.name}_InvalidData`,
                scenario: 'Request with invalid data',
                type: 'negative'
            }
        ];

        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
            testCases.push({
                name: `${endpoint.method}_${endpoint.name}_MissingFields`,
                scenario: 'Request with missing required fields',
                type: 'negative'
            });
        }

        console.log(`[TestScriptGeneratorService] Default test cases generated | Count: ${testCases.length}`);
        return testCases;
    }

    async regenerateScript(scriptId, userId, aiProvider = 'anthropic') {
        const startTime = Date.now();
        console.log(`[TestScriptGeneratorService] Regenerating script | ScriptId: ${scriptId}`);

        try {
            const existingScript = await TestScript.findById(scriptId).populate('endpoint');

            if (!existingScript) {
                throw new Error('Script not found');
            }

            const projectConfig = {
                projectId: existingScript.project,
                framework: existingScript.framework,
                language: existingScript.language
            };

            const testCases = existingScript.testCases;
            const newScript = await this.generateScript(existingScript.endpoint, projectConfig, testCases, userId, aiProvider);

            existingScript.generation.regenerationCount++;
            existingScript.generation.generatedAt = new Date();
            await existingScript.save();

            const duration = Date.now() - startTime;
            console.log(`[TestScriptGeneratorService] Script regenerated | NewScriptId: ${newScript._id} | Duration: ${duration}ms`);

            return newScript;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[TestScriptGeneratorService] Script regeneration failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async generateTestSuiteScript(testSuite, projectConfig, userId) {
        const startTime = Date.now();
        console.log(`[TestScriptGeneratorService] Generating test suite script | Suite: ${testSuite.name}`);

        try {
            const generator = this.generatorStrategies.get(projectConfig.framework);

            if (!generator) {
                throw new Error(`Unsupported framework: ${projectConfig.framework}`);
            }

            const suiteContent = await generator.generateTestSuite(testSuite, projectConfig);

            const duration = Date.now() - startTime;
            console.log(`[TestScriptGeneratorService] Test suite script generated | Duration: ${duration}ms`);

            return suiteContent;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[TestScriptGeneratorService] Test suite generation failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async generateConfigurationFiles(projectConfig) {
        console.log(`[TestScriptGeneratorService] Generating configuration files | Framework: ${projectConfig.framework}`);

        try {
            const configFiles = [];

            if (projectConfig.framework === 'rest-assured') {
                configFiles.push(this.generatePomXml(projectConfig));
                configFiles.push(this.generateTestNgXml(projectConfig));
            }

            if (projectConfig.framework === 'cucumber') {
                configFiles.push(this.generateCucumberProperties(projectConfig));
                configFiles.push(this.generatePomXml(projectConfig));
            }

            console.log(`[TestScriptGeneratorService] Configuration files generated | Count: ${configFiles.length}`);
            return configFiles;
        } catch (error) {
            console.error(`[TestScriptGeneratorService] Configuration generation failed | Error: ${error.message}`);
            throw error;
        }
    }

    generatePomXml(projectConfig) {
        console.log(`[TestScriptGeneratorService] Generating pom.xml`);

        const content = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.imagefetch</groupId>
    <artifactId>${projectConfig.projectName || 'api-tests'}</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <rest-assured.version>5.3.0</rest-assured.version>
        <testng.version>7.7.1</testng.version>
        <cucumber.version>7.11.1</cucumber.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>io.rest-assured</groupId>
            <artifactId>rest-assured</artifactId>
            <version>\${rest-assured.version}</version>
        </dependency>
        <dependency>
            <groupId>org.testng</groupId>
            <artifactId>testng</artifactId>
            <version>\${testng.version}</version>
        </dependency>
    </dependencies>
</project>`;

        return {
            name: 'pom.xml',
            type: 'config',
            content: content
        };
    }

    generateTestNgXml(projectConfig) {
        console.log(`[TestScriptGeneratorService] Generating testng.xml`);

        const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE suite SYSTEM "http://testng.org/testng-1.0.dtd">
<suite name="${projectConfig.projectName || 'API Test Suite'}" parallel="${projectConfig.parallel ? 'methods' : 'none'}" thread-count="${projectConfig.threadCount || 1}">
    <test name="API Tests">
        <packages>
            <package name="com.imagefetch.tests.*"/>
        </packages>
    </test>
</suite>`;

        return {
            name: 'testng.xml',
            type: 'config',
            content: content
        };
    }

    generateCucumberProperties(projectConfig) {
        console.log(`[TestScriptGeneratorService] Generating cucumber.properties`);

        const content = `cucumber.publish.enabled=false
cucumber.plugin=pretty,html:target/cucumber-reports/cucumber.html,json:target/cucumber-reports/cucumber.json
cucumber.glue=com.imagefetch.steps
cucumber.features=src/test/resources/features`;

        return {
            name: 'cucumber.properties',
            type: 'config',
            content: content
        };
    }

    async validateGeneratedScript(script) {
        console.log(`[TestScriptGeneratorService] Validating generated script | ScriptId: ${script._id}`);

        try {
            const validations = {
                syntaxValid: true,
                compilable: false,
                errors: []
            };

            const content = script.content?.testClass?.content || '';

            if (!content || content.length === 0) {
                validations.syntaxValid = false;
                validations.errors.push({ message: 'Script content is empty' });
            }

            if (script.language === 'java') {
                validations.syntaxValid = this.validateJavaSyntax(content);
            }

            script.validation = {
                ...validations,
                lastValidated: new Date()
            };

            await script.save();

            console.log(`[TestScriptGeneratorService] Script validated | SyntaxValid: ${validations.syntaxValid} | Errors: ${validations.errors.length}`);
            return validations;
        } catch (error) {
            console.error(`[TestScriptGeneratorService] Script validation failed | Error: ${error.message}`);
            throw error;
        }
    }

    validateJavaSyntax(content) {
        console.log(`[TestScriptGeneratorService] Validating Java syntax`);

        let braceCount = 0;
        let parenCount = 0;

        for (const char of content) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (char === '(') parenCount++;
            if (char === ')') parenCount--;
        }

        const isValid = braceCount === 0 && parenCount === 0;
        console.log(`[TestScriptGeneratorService] Java syntax validation | Valid: ${isValid}`);
        return isValid;
    }

    async generateScriptMetadata(endpoint, projectConfig) {
        console.log(`[TestScriptGeneratorService] Generating script metadata | Endpoint: ${endpoint.path}`);

        const metadata = {
            endpoint: {
                method: endpoint.method,
                path: endpoint.path,
                name: endpoint.name
            },
            framework: projectConfig.framework,
            language: projectConfig.language,
            testCount: 0,
            complexity: 'medium',
            estimatedDuration: 30,
            tags: this.generateTags(endpoint),
            priority: endpoint.priority || 'medium'
        };

        console.log(`[TestScriptGeneratorService] Script metadata generated | Tags: ${metadata.tags.length}`);
        return metadata;
    }

    generateTags(endpoint) {
        const tags = [endpoint.method.toLowerCase()];

        if (endpoint.path.includes('auth')) tags.push('authentication');
        if (endpoint.path.includes('user')) tags.push('user');
        if (endpoint.method === 'POST') tags.push('create');
        if (endpoint.method === 'GET') tags.push('read');
        if (endpoint.method === 'PUT' || endpoint.method === 'PATCH') tags.push('update');
        if (endpoint.method === 'DELETE') tags.push('delete');

        return tags;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new TestScriptGeneratorService();