const anthropicService = require('./anthropic.service');
const openaiService = require('./openai.service');

class CodeAnalysisService {
    constructor() {
        this.analysisCache = new Map();
        this.cacheDuration = 3600000;
    }

    async analyzeRepository(repositoryContent, language, aiProvider = 'anthropic') {
        console.log(`[CodeAnalysisService] ANALYZE_REPOSITORY | Language: ${language} | Provider: ${aiProvider}`);

        try {
            const cacheKey = `repo-${repositoryContent.length}-${language}`;
            const cached = this.analysisCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
                console.log(`[CodeAnalysisService] ANALYZE_REPOSITORY_CACHE_HIT | Using cached analysis`);
                return cached.data;
            }

            let analysis;
            if (aiProvider === 'openai') {
                analysis = await openaiService.analyzeCode(repositoryContent, language);
            } else {
                analysis = await anthropicService.analyzeCode(repositoryContent, language);
            }

            this.analysisCache.set(cacheKey, {
                data: analysis,
                timestamp: Date.now()
            });

            console.log(`[CodeAnalysisService] ANALYZE_REPOSITORY_SUCCESS | Analysis cached`);
            return analysis;
        } catch (error) {
            console.error(`[CodeAnalysisService] ANALYZE_REPOSITORY_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    async extractApiEndpoints(codeContent, language, framework) {
        console.log(`[CodeAnalysisService] EXTRACT_ENDPOINTS | Language: ${language} | Framework: ${framework}`);

        try {
            const endpoints = [];

            if (framework === 'express' || framework === 'fastify') {
                endpoints.push(...this.extractExpressEndpoints(codeContent));
            } else if (framework === 'spring-boot') {
                endpoints.push(...this.extractSpringEndpoints(codeContent));
            } else if (framework === 'django') {
                endpoints.push(...this.extractDjangoEndpoints(codeContent));
            } else if (framework === 'fastapi') {
                endpoints.push(...this.extractFastAPIEndpoints(codeContent));
            }

            console.log(`[CodeAnalysisService] EXTRACT_ENDPOINTS_SUCCESS | Found ${endpoints.length} endpoints`);
            return { success: true, endpoints };
        } catch (error) {
            console.error(`[CodeAnalysisService] EXTRACT_ENDPOINTS_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    extractExpressEndpoints(content) {
        console.log(`[CodeAnalysisService] EXTRACT_EXPRESS_ENDPOINTS`);

        const endpoints = [];
        const regex = /(app|router)\.(get|post|put|delete|patch|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            endpoints.push({
                method: match[2].toUpperCase(),
                path: match[3],
                handler: 'express',
                framework: 'express'
            });
        }

        return endpoints;
    }

    extractSpringEndpoints(content) {
        console.log(`[CodeAnalysisService] EXTRACT_SPRING_ENDPOINTS`);

        const endpoints = [];
        const regex = /@(?:RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            const path = match[1];
            let method = 'GET';

            if (content.includes('@PostMapping')) method = 'POST';
            else if (content.includes('@PutMapping')) method = 'PUT';
            else if (content.includes('@DeleteMapping')) method = 'DELETE';
            else if (content.includes('@PatchMapping')) method = 'PATCH';

            endpoints.push({
                method,
                path,
                handler: 'spring',
                framework: 'spring-boot'
            });
        }

        return endpoints;
    }

    extractDjangoEndpoints(content) {
        console.log(`[CodeAnalysisService] EXTRACT_DJANGO_ENDPOINTS`);

        const endpoints = [];
        const regex = /path\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,\)]+)/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            endpoints.push({
                method: 'GET',
                path: match[1],
                handler: match[2].trim(),
                framework: 'django'
            });
        }

        return endpoints;
    }

    extractFastAPIEndpoints(content) {
        console.log(`[CodeAnalysisService] EXTRACT_FASTAPI_ENDPOINTS`);

        const endpoints = [];
        const regex = /@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            endpoints.push({
                method: match[1].toUpperCase(),
                path: match[2],
                handler: 'fastapi',
                framework: 'fastapi'
            });
        }

        return endpoints;
    }

    async extractModelsAndSchemas(codeContent, language) {
        console.log(`[CodeAnalysisService] EXTRACT_MODELS | Language: ${language}`);

        try {
            const models = [];

            if (language === 'java') {
                models.push(...this.extractJavaModels(codeContent));
            } else if (language === 'javascript' || language === 'typescript') {
                models.push(...this.extractJSModels(codeContent));
            } else if (language === 'python') {
                models.push(...this.extractPythonModels(codeContent));
            }

            console.log(`[CodeAnalysisService] EXTRACT_MODELS_SUCCESS | Found ${models.length} models`);
            return { success: true, models };
        } catch (error) {
            console.error(`[CodeAnalysisService] EXTRACT_MODELS_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    extractJavaModels(content) {
        console.log(`[CodeAnalysisService] EXTRACT_JAVA_MODELS`);

        const models = [];
        const regex = /(?:@Entity|@Document)?\s*(?:public\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            const className = match[1];
            const properties = this.extractJavaProperties(content, className);

            models.push({
                name: className,
                type: 'class',
                extends: match[2] || null,
                properties,
                language: 'java'
            });
        }

        return models;
    }

    extractJavaProperties(content, className) {
        console.log(`[CodeAnalysisService] EXTRACT_JAVA_PROPERTIES | Class: ${className}`);

        const properties = [];
        const propertyRegex = /(?:private|protected|public)?\s*(?:final)?\s*([\w<>]+)\s+(\w+)(?:\s*=|;)/g;
        let match;

        while ((match = propertyRegex.exec(content)) !== null) {
            properties.push({
                name: match[2],
                type: match[1]
            });
        }

        return properties;
    }

    extractJSModels(content) {
        console.log(`[CodeAnalysisService] EXTRACT_JS_MODELS`);

        const models = [];
        const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            const className = match[1];
            const properties = this.extractJSProperties(content);

            models.push({
                name: className,
                type: 'class',
                extends: match[2] || null,
                properties,
                language: 'javascript'
            });
        }

        return models;
    }

    extractJSProperties(content) {
        const properties = [];
        const constructorRegex = /constructor\s*\([^)]*\)\s*\{([\s\S]*?)(?:^|\n)\s*\}/gm;
        const match = constructorRegex.exec(content);

        if (match) {
            const constructorBody = match[1];
            const propRegex = /this\.(\w+)\s*=/g;
            let propMatch;

            while ((propMatch = propRegex.exec(constructorBody)) !== null) {
                properties.push({
                    name: propMatch[1],
                    type: 'any'
                });
            }
        }

        return properties;
    }

    extractPythonModels(content) {
        console.log(`[CodeAnalysisService] EXTRACT_PYTHON_MODELS`);

        const models = [];
        const classRegex = /class\s+(\w+)(?:\(([^)]*)\))?\s*:/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            const className = match[1];
            const bases = match[2] ? match[2].split(',').map(b => b.trim()) : [];

            models.push({
                name: className,
                type: 'class',
                bases,
                language: 'python'
            });
        }

        return models;
    }

    async analyzeCodeQuality(codeContent, language) {
        console.log(`[CodeAnalysisService] ANALYZE_QUALITY | Language: ${language}`);

        try {
            const issues = [];

            if (language === 'java') {
                issues.push(...this.checkJavaQuality(codeContent));
            } else if (language === 'javascript' || language === 'typescript') {
                issues.push(...this.checkJSQuality(codeContent));
            } else if (language === 'python') {
                issues.push(...this.checkPythonQuality(codeContent));
            }

            console.log(`[CodeAnalysisService] ANALYZE_QUALITY_SUCCESS | Found ${issues.length} quality issues`);
            return { success: true, issues };
        } catch (error) {
            console.error(`[CodeAnalysisService] ANALYZE_QUALITY_ERROR | Error: ${error.message}`);
            throw error;
        }
    }

    checkJavaQuality(content) {
        console.log(`[CodeAnalysisService] CHECK_JAVA_QUALITY`);

        const issues = [];
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
            if (line.includes('System.out.println')) {
                issues.push({
                    line: idx + 1,
                    severity: 'warning',
                    issue: 'System.out.println detected',
                    suggestion: 'Use logging framework instead'
                });
            }

            if (line.includes('catch (Exception e)')) {
                issues.push({
                    line: idx + 1,
                    severity: 'warning',
                    issue: 'Generic exception catch',
                    suggestion: 'Catch specific exceptions'
                });
            }

            if (line.includes('== null')) {
                issues.push({
                    line: idx + 1,
                    severity: 'info',
                    issue: 'Null comparison detected',
                    suggestion: 'Consider using Objects.requireNonNull()'
                });
            }
        });

        return issues;
    }

    checkJSQuality(content) {
        console.log(`[CodeAnalysisService] CHECK_JS_QUALITY`);

        const issues = [];
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
            if (line.includes('var ')) {
                issues.push({
                    line: idx + 1,
                    severity: 'warning',
                    issue: 'var keyword used',
                    suggestion: 'Use const or let instead'
                });
            }

            if (line.includes('==') && !line.includes('===')) {
                issues.push({
                    line: idx + 1,
                    severity: 'error',
                    issue: 'Loose equality operator',
                    suggestion: 'Use === for strict equality'
                });
            }

            if (line.includes('console.log')) {
                issues.push({
                    line: idx + 1,
                    severity: 'info',
                    issue: 'Console log found',
                    suggestion: 'Remove before production'
                });
            }
        });

        return issues;
    }

    checkPythonQuality(content) {
        console.log(`[CodeAnalysisService] CHECK_PYTHON_QUALITY`);

        const issues = [];
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
            if (line.includes('print(')) {
                issues.push({
                    line: idx + 1,
                    severity: 'info',
                    issue: 'print() statement found',
                    suggestion: 'Use logging module instead'
                });
            }

            if (line.length > 79) {
                issues.push({
                    line: idx + 1,
                    severity: 'info',
                    issue: 'Line exceeds 79 characters (PEP 8)',
                    suggestion: 'Break line into multiple lines'
                });
            }

            if (line.includes('except:')) {
                issues.push({
                    line: idx + 1,
                    severity: 'warning',
                    issue: 'Bare except clause',
                    suggestion: 'Catch specific exceptions'
                });
            }
        });

        return issues;
    }

    clearCache() {
        console.log(`[CodeAnalysisService] CLEAR_CACHE | Cleared ${this.analysisCache.size} entries`);
        this.analysisCache.clear();
    }
}

module.exports = new CodeAnalysisService();