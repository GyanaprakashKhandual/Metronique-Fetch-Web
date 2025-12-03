const Repository = require('../models/repository.model');
const { anthropic, anthropicConfig } = require('../config/anthropic.config');
const { openai, openaiConfig } = require('../config/openai.config');

class ControllerAnalyzerService {
    async analyzeControllers(repositoryId, controllerFiles, aiProvider = 'anthropic') {
        console.log(`[ControllerAnalyzerService] Analyzing ${controllerFiles.length} controller files using ${aiProvider}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            const controllers = [];

            for (const file of controllerFiles) {
                const fileControllers = await this.parseControllerFile(file.content, file.path, repository.technology.language);
                controllers.push(...fileControllers);
            }

            console.log(`[ControllerAnalyzerService] Extracted ${controllers.length} controllers from files`);

            const enrichedControllers = await this.enrichControllersWithAI(controllers, aiProvider);

            repository.analysis.findings.controllers = controllers.length;
            await repository.save();

            console.log(`[ControllerAnalyzerService] Controller analysis completed: ${enrichedControllers.length} controllers`);
            return enrichedControllers;
        } catch (error) {
            console.error(`[ControllerAnalyzerService] Error analyzing controllers:`, error.message);
            throw error;
        }
    }

    parseControllerFile(content, filePath, language) {
        console.log(`[ControllerAnalyzerService] Parsing controller file: ${filePath}`);

        const controllers = [];

        if (language === 'java') {
            controllers.push(...this.parseJavaControllers(content));
        } else if (language === 'javascript' || language === 'typescript') {
            controllers.push(...this.parseJSControllers(content));
        } else if (language === 'python') {
            controllers.push(...this.parsePythonControllers(content));
        }

        return controllers;
    }

    parseJavaControllers(content) {
        const controllers = [];

        const classRegex = /@RestController(?:\s*\(\s*['"](.*?)['"]\s*\))?[\s\n]*(?:public|private)?\s*class\s+(\w+)/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            const basePath = match[1] || '';
            const className = match[2];
            const methods = this.extractJavaMethods(content, className);

            controllers.push({
                name: className,
                type: 'RestController',
                basePath: basePath,
                methods: methods,
                annotations: [],
                dependencies: [],
                endpoints: methods.length
            });
        }

        return controllers;
    }

    extractJavaMethods(content, className) {
        const methods = [];

        const methodRegex = /(?:@[A-Za-z]+Mapping(?:\([^)]*\))?)[\s\n]*(?:public|private|protected)\s+(?:[\w<>]+\s+)?(\w+)\s*\([^)]*\)/g;
        let match;

        while ((match = methodRegex.exec(content)) !== null) {
            methods.push({
                name: match[1],
                parameters: [],
                returnType: 'ResponseEntity',
                annotations: [],
                errorHandling: false
            });
        }

        return methods;
    }

    parseJSControllers(content) {
        const controllers = [];

        const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            const className = match[1];

            if (className.includes('Controller') || className.includes('Handler') || className.includes('Service')) {
                const methods = this.extractJSMethods(content);

                controllers.push({
                    name: className,
                    type: 'Controller',
                    basePath: '',
                    methods: methods,
                    annotations: [],
                    dependencies: [],
                    endpoints: methods.length
                });
            }
        }

        return controllers;
    }

    extractJSMethods(content) {
        const methods = [];

        const methodRegex = /(?:async\s+)?(?:static\s+)?(\w+)\s*\([^)]*\)\s*{/g;
        let match;

        while ((match = methodRegex.exec(content)) !== null) {
            const methodName = match[1];

            if (!methodName.startsWith('_') && methodName !== 'constructor') {
                methods.push({
                    name: methodName,
                    parameters: [],
                    returnType: 'Promise | void',
                    annotations: [],
                    errorHandling: content.includes('try') && content.includes('catch')
                });
            }
        }

        return methods;
    }

    parsePythonControllers(content) {
        const controllers = [];

        const classRegex = /class\s+(\w+)(?:\(([^)]*)\))?\s*:/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            const className = match[1];
            const bases = match[2] ? match[2].split(',').map(b => b.trim()) : [];

            if (className.includes('View') || className.includes('Handler') || bases.some(b => b.includes('View'))) {
                const methods = this.extractPythonMethods(content);

                controllers.push({
                    name: className,
                    type: 'View' in bases ? 'View' : 'Handler',
                    basePath: '',
                    methods: methods,
                    annotations: [],
                    dependencies: [],
                    endpoints: methods.length
                });
            }
        }

        return controllers;
    }

    extractPythonMethods(content) {
        const methods = [];

        const methodRegex = /def\s+(\w+)\s*\(self[^)]*\):/g;
        let match;

        while ((match = methodRegex.exec(content)) !== null) {
            const methodName = match[1];

            if (!methodName.startsWith('_')) {
                methods.push({
                    name: methodName,
                    parameters: [],
                    returnType: 'any',
                    annotations: [],
                    errorHandling: content.includes('try') && content.includes('except')
                });
            }
        }

        return methods;
    }

    async enrichControllersWithAI(controllers, aiProvider) {
        console.log(`[ControllerAnalyzerService] Enriching controllers with AI using ${aiProvider}`);

        try {
            const controllerSummary = controllers.map(c => `${c.name}: ${c.methods.map(m => m.name).join(', ')}`).join('\n');

            const enrichmentPrompt = `Analyze these API controllers and their methods:
${controllerSummary}

For each controller, provide: responsibility, purpose, key operations, and potential improvements.
Return as JSON array.`;

            let enrichedData;

            if (aiProvider === 'openai') {
                enrichedData = await this.enrichWithOpenAI(enrichmentPrompt);
            } else {
                enrichedData = await this.enrichWithAnthropic(enrichmentPrompt);
            }

            const enriched = controllers.map((controller, index) => ({
                ...controller,
                description: enrichedData[index]?.description || '',
                responsibility: enrichedData[index]?.responsibility || '',
                improvements: enrichedData[index]?.improvements || []
            }));

            console.log(`[ControllerAnalyzerService] Controllers enriched successfully`);
            return enriched;
        } catch (error) {
            console.error(`[ControllerAnalyzerService] Error enriching controllers with AI:`, error.message);
            return controllers;
        }
    }

    async enrichWithAnthropic(prompt) {
        console.log(`[ControllerAnalyzerService] Enriching with Anthropic Claude`);

        try {
            const response = await anthropic.messages.create({
                model: anthropicConfig.model,
                max_tokens: anthropicConfig.maxTokens,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const content = response.content[0].text;
            const jsonMatch = content.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return [];
        } catch (error) {
            console.error(`[ControllerAnalyzerService] Anthropic enrichment error:`, error.message);
            return [];
        }
    }

    async enrichWithOpenAI(prompt) {
        console.log(`[ControllerAnalyzerService] Enriching with OpenAI GPT`);

        try {
            const response = await openai.chat.completions.create({
                model: openaiConfig.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: openaiConfig.maxTokens,
                temperature: openaiConfig.temperature
            });

            const content = response.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return [];
        } catch (error) {
            console.error(`[ControllerAnalyzerService] OpenAI enrichment error:`, error.message);
            return [];
        }
    }

    async detectCodeSmells(controllers) {
        console.log(`[ControllerAnalyzerService] Detecting code smells in ${controllers.length} controllers`);

        try {
            const issues = [];

            controllers.forEach(controller => {
                if (controller.methods.length > 20) {
                    issues.push({
                        controller: controller.name,
                        severity: 'medium',
                        issue: 'God Controller - Too many methods',
                        recommendation: 'Consider splitting into multiple controllers'
                    });
                }

                const methodsWithoutErrorHandling = controller.methods.filter(m => !m.errorHandling);
                if (methodsWithoutErrorHandling.length > 0) {
                    issues.push({
                        controller: controller.name,
                        severity: 'medium',
                        issue: `${methodsWithoutErrorHandling.length} methods without error handling`,
                        recommendation: 'Add try-catch blocks or error handling middleware'
                    });
                }

                controller.methods.forEach(method => {
                    if (method.name.length > 30) {
                        issues.push({
                            controller: controller.name,
                            method: method.name,
                            severity: 'low',
                            issue: 'Method name too long',
                            recommendation: 'Use shorter, more descriptive method names'
                        });
                    }
                });
            });

            console.log(`[ControllerAnalyzerService] Found ${issues.length} code smells`);
            return issues;
        } catch (error) {
            console.error(`[ControllerAnalyzerService] Error detecting code smells:`, error.message);
            throw error;
        }
    }

    async analyzeMethodComplexity(controllers) {
        console.log(`[ControllerAnalyzerService] Analyzing method complexity in ${controllers.length} controllers`);

        try {
            const complexityAnalysis = [];

            controllers.forEach(controller => {
                controller.methods.forEach(method => {
                    const complexity = this.calculateComplexityScore(method);

                    complexityAnalysis.push({
                        controller: controller.name,
                        method: method.name,
                        complexity: complexity,
                        severity: complexity > 10 ? 'high' : complexity > 5 ? 'medium' : 'low'
                    });
                });
            });

            const highComplexityMethods = complexityAnalysis.filter(c => c.complexity > 10);
            console.log(`[ControllerAnalyzerService] Found ${highComplexityMethods.length} high-complexity methods`);

            return complexityAnalysis;
        } catch (error) {
            console.error(`[ControllerAnalyzerService] Error analyzing method complexity:`, error.message);
            throw error;
        }
    }

    calculateComplexityScore(method) {
        let score = 1;

        if (method.parameters && method.parameters.length > 5) {
            score += method.parameters.length - 5;
        }

        if (method.errorHandling) {
            score += 2;
        }

        if (method.annotations && method.annotations.length > 3) {
            score += 1;
        }

        return Math.min(score, 20);
    }

    async generateControllerDocumentation(controllers) {
        console.log(`[ControllerAnalyzerService] Generating documentation for ${controllers.length} controllers`);

        try {
            const documentation = controllers.map(controller => ({
                name: controller.name,
                description: controller.description || '',
                basePath: controller.basePath,
                type: controller.type,
                endpoints: controller.endpoints,
                methods: controller.methods.map(m => ({
                    name: m.name,
                    parameters: m.parameters,
                    returnType: m.returnType
                }))
            }));

            console.log(`[ControllerAnalyzerService] Documentation generated for ${documentation.length} controllers`);
            return documentation;
        } catch (error) {
            console.error(`[ControllerAnalyzerService] Error generating documentation:`, error.message);
            throw error;
        }
    }

    async identifyDependencies(controllers) {
        console.log(`[ControllerAnalyzerService] Identifying dependencies across ${controllers.length} controllers`);

        try {
            const dependencyGraph = {};

            controllers.forEach(controller => {
                dependencyGraph[controller.name] = {
                    dependencies: controller.dependencies || [],
                    dependents: []
                };
            });

            controllers.forEach(controller => {
                controller.dependencies.forEach(dep => {
                    if (dependencyGraph[dep]) {
                        dependencyGraph[dep].dependents.push(controller.name);
                    }
                });
            });

            console.log(`[ControllerAnalyzerService] Dependency graph created`);
            return dependencyGraph;
        } catch (error) {
            console.error(`[ControllerAnalyzerService] Error identifying dependencies:`, error.message);
            throw error;
        }
    }
}

module.exports = new ControllerAnalyzerService();