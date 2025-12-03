const anthropicService = require('./anthropic.service');
const openaiService = require('./openai.service');
const codeAnalysisService = require('./code.analysis.service');

class ApiUnderstandingService {
    constructor() {
        this.endpointCache = new Map();
        this.relationshipCache = new Map();
        this.cacheDuration = 3600000;
    }

    async analyzeApiStructure(repositoryCode, language, framework, aiProvider = 'anthropic') {
        const startTime = Date.now();
        console.log(`[ApiUnderstandingService] Analyzing API structure | Language: ${language} | Framework: ${framework} | Provider: ${aiProvider}`);

        try {
            const cacheKey = `structure-${language}-${framework}`;
            const cached = this.endpointCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
                console.log(`[ApiUnderstandingService] Cache hit | Key: ${cacheKey}`);
                return cached.data;
            }

            let analysis;
            if (aiProvider === 'openai') {
                analysis = await openaiService.analyzeCode(repositoryCode, language);
            } else {
                analysis = await anthropicService.analyzeCode(repositoryCode, language);
            }

            const structure = await this.parseApiStructure(analysis, language, framework);

            this.endpointCache.set(cacheKey, {
                data: structure,
                timestamp: Date.now()
            });

            const duration = Date.now() - startTime;
            console.log(`[ApiUnderstandingService] API structure analyzed | Endpoints: ${structure.endpoints?.length || 0} | Duration: ${duration}ms`);

            return structure;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[ApiUnderstandingService] API structure analysis failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async parseApiStructure(analysis, language, framework) {
        console.log(`[ApiUnderstandingService] Parsing API structure | Framework: ${framework}`);

        try {
            const structure = {
                endpoints: [],
                models: [],
                authentication: {},
                database: {},
                middleware: [],
                dependencies: []
            };

            const endpointsResult = await codeAnalysisService.extractApiEndpoints(analysis.analysis, language, framework);
            structure.endpoints = endpointsResult.endpoints || [];

            const modelsResult = await codeAnalysisService.extractModelsAndSchemas(analysis.analysis, language);
            structure.models = modelsResult.models || [];

            console.log(`[ApiUnderstandingService] API structure parsed | Endpoints: ${structure.endpoints.length} | Models: ${structure.models.length}`);
            return structure;
        } catch (error) {
            console.error(`[ApiUnderstandingService] Structure parsing failed | Error: ${error.message}`);
            throw error;
        }
    }

    async identifyEndpointRelationships(endpoints, models, aiProvider = 'anthropic') {
        const startTime = Date.now();
        console.log(`[ApiUnderstandingService] Identifying endpoint relationships | Endpoints: ${endpoints.length} | Models: ${models.length}`);

        try {
            const relationships = {
                crud: [],
                dependencies: [],
                dataFlow: [],
                workflows: []
            };

            for (const endpoint of endpoints) {
                console.log(`[ApiUnderstandingService] Analyzing endpoint | Path: ${endpoint.path}`);

                const relatedModels = this.findRelatedModels(endpoint, models);
                const relatedEndpoints = this.findRelatedEndpoints(endpoint, endpoints);

                if (relatedModels.length > 0) {
                    relationships.crud.push({
                        endpoint: endpoint.path,
                        method: endpoint.method,
                        models: relatedModels.map(m => m.name),
                        operation: this.determineCrudOperation(endpoint.method)
                    });
                }

                if (relatedEndpoints.length > 0) {
                    relationships.dependencies.push({
                        endpoint: endpoint.path,
                        dependsOn: relatedEndpoints.map(e => e.path),
                        relationship: 'functional'
                    });
                }
            }

            const duration = Date.now() - startTime;
            console.log(`[ApiUnderstandingService] Relationships identified | CRUD: ${relationships.crud.length} | Dependencies: ${relationships.dependencies.length} | Duration: ${duration}ms`);

            return relationships;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[ApiUnderstandingService] Relationship identification failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    findRelatedModels(endpoint, models) {
        console.log(`[ApiUnderstandingService] Finding related models | Endpoint: ${endpoint.path}`);

        const relatedModels = [];
        const pathParts = endpoint.path.split('/').filter(p => p);

        for (const model of models) {
            const modelName = model.name.toLowerCase();
            const endpointPath = endpoint.path.toLowerCase();

            if (endpointPath.includes(modelName) ||
                endpointPath.includes(modelName + 's') ||
                pathParts.some(part => part.toLowerCase() === modelName || part.toLowerCase() === modelName + 's')) {
                relatedModels.push(model);
            }
        }

        console.log(`[ApiUnderstandingService] Related models found | Count: ${relatedModels.length}`);
        return relatedModels;
    }

    findRelatedEndpoints(endpoint, allEndpoints) {
        console.log(`[ApiUnderstandingService] Finding related endpoints | Endpoint: ${endpoint.path}`);

        const relatedEndpoints = [];
        const basePath = this.extractBasePath(endpoint.path);

        for (const otherEndpoint of allEndpoints) {
            if (otherEndpoint.path === endpoint.path) continue;

            const otherBasePath = this.extractBasePath(otherEndpoint.path);

            if (basePath === otherBasePath) {
                relatedEndpoints.push(otherEndpoint);
            }
        }

        console.log(`[ApiUnderstandingService] Related endpoints found | Count: ${relatedEndpoints.length}`);
        return relatedEndpoints;
    }

    extractBasePath(path) {
        const parts = path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
        return parts.length > 0 ? parts[0] : '';
    }

    determineCrudOperation(method) {
        const operations = {
            'GET': 'read',
            'POST': 'create',
            'PUT': 'update',
            'PATCH': 'update',
            'DELETE': 'delete'
        };

        return operations[method] || 'unknown';
    }

    async extractEndpointMetadata(endpoint, codeContent, aiProvider = 'anthropic') {
        console.log(`[ApiUnderstandingService] Extracting endpoint metadata | Path: ${endpoint.path}`);

        try {
            const metadata = {
                authentication: this.detectAuthentication(codeContent, endpoint),
                validation: this.detectValidation(codeContent, endpoint),
                authorization: this.detectAuthorization(codeContent, endpoint),
                caching: this.detectCaching(codeContent, endpoint),
                rateLimit: this.detectRateLimit(codeContent, endpoint),
                documentation: this.extractDocumentation(codeContent, endpoint)
            };

            console.log(`[ApiUnderstandingService] Endpoint metadata extracted | HasAuth: ${!!metadata.authentication} | HasValidation: ${!!metadata.validation}`);
            return metadata;
        } catch (error) {
            console.error(`[ApiUnderstandingService] Metadata extraction failed | Error: ${error.message}`);
            throw error;
        }
    }

    detectAuthentication(codeContent, endpoint) {
        console.log(`[ApiUnderstandingService] Detecting authentication | Endpoint: ${endpoint.path}`);

        const authPatterns = {
            jwt: ['jwt', 'jsonwebtoken', 'bearer'],
            oauth: ['oauth', 'oauth2'],
            basic: ['basic auth', 'basicauth'],
            apiKey: ['api key', 'apikey', 'x-api-key']
        };

        const lowerContent = codeContent.toLowerCase();

        for (const [type, patterns] of Object.entries(authPatterns)) {
            if (patterns.some(pattern => lowerContent.includes(pattern))) {
                console.log(`[ApiUnderstandingService] Authentication detected | Type: ${type}`);
                return {
                    type: type,
                    required: true,
                    location: type === 'apiKey' ? 'header' : 'authorization'
                };
            }
        }

        console.log(`[ApiUnderstandingService] No authentication detected`);
        return null;
    }

    detectValidation(codeContent, endpoint) {
        console.log(`[ApiUnderstandingService] Detecting validation | Endpoint: ${endpoint.path}`);

        const validationPatterns = [
            'joi', 'yup', 'validator', 'express-validator',
            '@Valid', '@NotNull', '@NotEmpty', '@Size',
            'validate', 'validation'
        ];

        const lowerContent = codeContent.toLowerCase();
        const hasValidation = validationPatterns.some(pattern =>
            lowerContent.includes(pattern.toLowerCase())
        );

        if (hasValidation) {
            console.log(`[ApiUnderstandingService] Validation detected`);
            return {
                enabled: true,
                library: this.detectValidationLibrary(codeContent)
            };
        }

        console.log(`[ApiUnderstandingService] No validation detected`);
        return null;
    }

    detectValidationLibrary(codeContent) {
        const libraries = ['joi', 'yup', 'validator', 'express-validator', 'javax.validation'];

        for (const lib of libraries) {
            if (codeContent.toLowerCase().includes(lib.toLowerCase())) {
                return lib;
            }
        }

        return 'unknown';
    }

    detectAuthorization(codeContent, endpoint) {
        console.log(`[ApiUnderstandingService] Detecting authorization | Endpoint: ${endpoint.path}`);

        const authzPatterns = [
            'authorize', 'permission', 'role', 'acl',
            '@PreAuthorize', '@Secured', '@RolesAllowed'
        ];

        const lowerContent = codeContent.toLowerCase();
        const hasAuthorization = authzPatterns.some(pattern =>
            lowerContent.includes(pattern.toLowerCase())
        );

        if (hasAuthorization) {
            console.log(`[ApiUnderstandingService] Authorization detected`);
            return {
                enabled: true,
                type: 'role-based'
            };
        }

        console.log(`[ApiUnderstandingService] No authorization detected`);
        return null;
    }

    detectCaching(codeContent, endpoint) {
        console.log(`[ApiUnderstandingService] Detecting caching | Endpoint: ${endpoint.path}`);

        const cachingPatterns = ['cache', 'redis', 'memcached', '@Cacheable'];

        const lowerContent = codeContent.toLowerCase();
        const hasCaching = cachingPatterns.some(pattern =>
            lowerContent.includes(pattern.toLowerCase())
        );

        if (hasCaching) {
            console.log(`[ApiUnderstandingService] Caching detected`);
            return {
                enabled: true,
                strategy: 'unknown'
            };
        }

        console.log(`[ApiUnderstandingService] No caching detected`);
        return null;
    }

    detectRateLimit(codeContent, endpoint) {
        console.log(`[ApiUnderstandingService] Detecting rate limit | Endpoint: ${endpoint.path}`);

        const rateLimitPatterns = ['rate limit', 'ratelimit', 'throttle', '@RateLimited'];

        const lowerContent = codeContent.toLowerCase();
        const hasRateLimit = rateLimitPatterns.some(pattern =>
            lowerContent.includes(pattern.toLowerCase())
        );

        if (hasRateLimit) {
            console.log(`[ApiUnderstandingService] Rate limit detected`);
            return {
                enabled: true,
                window: 'unknown',
                limit: 'unknown'
            };
        }

        console.log(`[ApiUnderstandingService] No rate limit detected`);
        return null;
    }

    extractDocumentation(codeContent, endpoint) {
        console.log(`[ApiUnderstandingService] Extracting documentation | Endpoint: ${endpoint.path}`);

        const docPatterns = {
            swagger: /@swagger|@api|@apiOperation/i,
            jsdoc: /\/\*\*[\s\S]*?\*\//g,
            javadoc: /\/\*\*[\s\S]*?\*\//g
        };

        for (const [type, pattern] of Object.entries(docPatterns)) {
            const match = codeContent.match(pattern);
            if (match) {
                console.log(`[ApiUnderstandingService] Documentation found | Type: ${type}`);
                return {
                    type: type,
                    content: match[0]
                };
            }
        }

        console.log(`[ApiUnderstandingService] No documentation found`);
        return null;
    }

    async analyzeRequestResponseFlow(endpoint, codeContent, aiProvider = 'anthropic') {
        console.log(`[ApiUnderstandingService] Analyzing request/response flow | Endpoint: ${endpoint.path}`);

        try {
            const flow = {
                request: {
                    headers: this.extractRequestHeaders(codeContent),
                    body: this.extractRequestBody(codeContent, endpoint),
                    queryParams: this.extractQueryParams(codeContent, endpoint),
                    pathParams: this.extractPathParams(endpoint.path)
                },
                processing: {
                    validations: this.extractValidations(codeContent),
                    businessLogic: this.extractBusinessLogic(codeContent),
                    databaseOperations: this.extractDatabaseOperations(codeContent)
                },
                response: {
                    statusCodes: this.extractStatusCodes(codeContent),
                    body: this.extractResponseBody(codeContent),
                    headers: this.extractResponseHeaders(codeContent)
                }
            };

            console.log(`[ApiUnderstandingService] Request/response flow analyzed`);
            return flow;
        } catch (error) {
            console.error(`[ApiUnderstandingService] Flow analysis failed | Error: ${error.message}`);
            throw error;
        }
    }

    extractRequestHeaders(codeContent) {
        console.log(`[ApiUnderstandingService] Extracting request headers`);

        const headers = [];
        const headerPatterns = [
            /req\.header(?:s)?\(['"]([^'"]+)['"]\)/g,
            /req\.get\(['"]([^'"]+)['"]\)/g,
            /@RequestHeader\(['"]([^'"]+)['"]\)/g
        ];

        for (const pattern of headerPatterns) {
            let match;
            while ((match = pattern.exec(codeContent)) !== null) {
                headers.push(match[1]);
            }
        }

        console.log(`[ApiUnderstandingService] Request headers extracted | Count: ${headers.length}`);
        return [...new Set(headers)];
    }

    extractRequestBody(codeContent, endpoint) {
        console.log(`[ApiUnderstandingService] Extracting request body | Endpoint: ${endpoint.path}`);

        if (!['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
            return null;
        }

        const bodyPatterns = [
            /req\.body/g,
            /@RequestBody/g,
            /request\.json\(\)/g
        ];

        const hasBody = bodyPatterns.some(pattern => pattern.test(codeContent));

        if (hasBody) {
            console.log(`[ApiUnderstandingService] Request body detected`);
            return { required: true };
        }

        console.log(`[ApiUnderstandingService] No request body detected`);
        return null;
    }

    extractQueryParams(codeContent, endpoint) {
        console.log(`[ApiUnderstandingService] Extracting query parameters`);

        const params = [];
        const queryPatterns = [
            /req\.query\.(\w+)/g,
            /@RequestParam\(['"]?(\w+)['"]?\)/g,
            /request\.args\.get\(['"](\w+)['"]\)/g
        ];

        for (const pattern of queryPatterns) {
            let match;
            while ((match = pattern.exec(codeContent)) !== null) {
                params.push(match[1]);
            }
        }

        console.log(`[ApiUnderstandingService] Query parameters extracted | Count: ${params.length}`);
        return [...new Set(params)];
    }

    extractPathParams(path) {
        console.log(`[ApiUnderstandingService] Extracting path parameters | Path: ${path}`);

        const params = [];
        const paramPattern = /[:{\}](\w+)/g;
        let match;

        while ((match = paramPattern.exec(path)) !== null) {
            params.push(match[1]);
        }

        console.log(`[ApiUnderstandingService] Path parameters extracted | Count: ${params.length}`);
        return params;
    }

    extractValidations(codeContent) {
        console.log(`[ApiUnderstandingService] Extracting validations`);

        const validations = [];
        const validationPatterns = [
            /@NotNull|@NotEmpty|@NotBlank|@Valid/g,
            /\.required\(\)|\.min\(\)|\.max\(\)/g
        ];

        for (const pattern of validationPatterns) {
            const matches = codeContent.match(pattern);
            if (matches) {
                validations.push(...matches);
            }
        }

        console.log(`[ApiUnderstandingService] Validations extracted | Count: ${validations.length}`);
        return validations;
    }

    extractBusinessLogic(codeContent) {
        console.log(`[ApiUnderstandingService] Extracting business logic`);

        const logic = {
            conditionals: (codeContent.match(/if\s*\(/g) || []).length,
            loops: (codeContent.match(/for\s*\(|while\s*\(/g) || []).length,
            functionCalls: (codeContent.match(/\w+\s*\(/g) || []).length
        };

        console.log(`[ApiUnderstandingService] Business logic extracted | Conditionals: ${logic.conditionals} | Loops: ${logic.loops}`);
        return logic;
    }

    extractDatabaseOperations(codeContent) {
        console.log(`[ApiUnderstandingService] Extracting database operations`);

        const operations = [];
        const dbPatterns = {
            create: /\.save\(|\.create\(|\.insert\(/g,
            read: /\.find\(|\.findOne\(|\.findById\(|\.get\(/g,
            update: /\.update\(|\.findByIdAndUpdate\(|\.set\(/g,
            delete: /\.delete\(|\.remove\(|\.findByIdAndDelete\(/g
        };

        for (const [operation, pattern] of Object.entries(dbPatterns)) {
            const matches = codeContent.match(pattern);
            if (matches) {
                operations.push({ operation, count: matches.length });
            }
        }

        console.log(`[ApiUnderstandingService] Database operations extracted | Operations: ${operations.length}`);
        return operations;
    }

    extractStatusCodes(codeContent) {
        console.log(`[ApiUnderstandingService] Extracting status codes`);

        const statusCodes = [];
        const statusPattern = /\.status\((\d{3})\)|\.sendStatus\((\d{3})\)|HttpStatus\.(\w+)/g;
        let match;

        while ((match = statusPattern.exec(codeContent)) !== null) {
            const code = match[1] || match[2];
            if (code) {
                statusCodes.push(parseInt(code));
            }
        }

        console.log(`[ApiUnderstandingService] Status codes extracted | Count: ${statusCodes.length}`);
        return [...new Set(statusCodes)];
    }

    extractResponseBody(codeContent) {
        console.log(`[ApiUnderstandingService] Extracting response body`);

        const responsePatterns = [
            /\.json\(/g,
            /\.send\(/g,
            /return\s+\w+/g
        ];

        const hasResponse = responsePatterns.some(pattern => pattern.test(codeContent));

        if (hasResponse) {
            console.log(`[ApiUnderstandingService] Response body detected`);
            return { present: true };
        }

        console.log(`[ApiUnderstandingService] No response body detected`);
        return null;
    }

    extractResponseHeaders(codeContent) {
        console.log(`[ApiUnderstandingService] Extracting response headers`);

        const headers = [];
        const headerPattern = /\.set\(['"]([^'"]+)['"],\s*[^)]+\)/g;
        let match;

        while ((match = headerPattern.exec(codeContent)) !== null) {
            headers.push(match[1]);
        }

        console.log(`[ApiUnderstandingService] Response headers extracted | Count: ${headers.length}`);
        return [...new Set(headers)];
    }

    async generateEndpointSummary(endpoint, metadata, flow, aiProvider = 'anthropic') {
        console.log(`[ApiUnderstandingService] Generating endpoint summary | Path: ${endpoint.path}`);

        try {
            const summary = {
                endpoint: endpoint,
                metadata: metadata,
                flow: flow,
                complexity: this.calculateComplexity(flow),
                testability: this.assessTestability(endpoint, metadata, flow),
                recommendations: this.generateRecommendations(endpoint, metadata, flow)
            };

            console.log(`[ApiUnderstandingService] Endpoint summary generated | Complexity: ${summary.complexity.level}`);
            return summary;
        } catch (error) {
            console.error(`[ApiUnderstandingService] Summary generation failed | Error: ${error.message}`);
            throw error;
        }
    }

    calculateComplexity(flow) {
        console.log(`[ApiUnderstandingService] Calculating complexity`);

        let score = 0;

        if (flow.processing.validations.length > 0) score += 10;
        if (flow.processing.businessLogic.conditionals > 5) score += 20;
        if (flow.processing.businessLogic.loops > 0) score += 15;
        if (flow.processing.databaseOperations.length > 2) score += 15;

        const level = score < 25 ? 'low' : score < 50 ? 'medium' : 'high';

        console.log(`[ApiUnderstandingService] Complexity calculated | Score: ${score} | Level: ${level}`);
        return { score, level };
    }

    assessTestability(endpoint, metadata, flow) {
        console.log(`[ApiUnderstandingService] Assessing testability | Endpoint: ${endpoint.path}`);

        let score = 100;

        if (!metadata.authentication) score -= 10;
        if (!metadata.validation) score -= 15;
        if (flow.processing.businessLogic.conditionals > 10) score -= 20;
        if (flow.processing.databaseOperations.length > 5) score -= 15;

        const level = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';

        console.log(`[ApiUnderstandingService] Testability assessed | Score: ${score} | Level: ${level}`);
        return { score, level };
    }

    generateRecommendations(endpoint, metadata, flow) {
        console.log(`[ApiUnderstandingService] Generating recommendations | Endpoint: ${endpoint.path}`);

        const recommendations = [];

        if (!metadata.authentication) {
            recommendations.push({
                type: 'security',
                priority: 'high',
                message: 'Consider adding authentication to this endpoint'
            });
        }

        if (!metadata.validation) {
            recommendations.push({
                type: 'validation',
                priority: 'medium',
                message: 'Add input validation to prevent invalid data'
            });
        }

        if (flow.processing.businessLogic.conditionals > 10) {
            recommendations.push({
                type: 'complexity',
                priority: 'medium',
                message: 'Consider refactoring to reduce complexity'
            });
        }

        console.log(`[ApiUnderstandingService] Recommendations generated | Count: ${recommendations.length}`);
        return recommendations;
    }

    clearCache() {
        const endpointSize = this.endpointCache.size;
        const relationshipSize = this.relationshipCache.size;
        console.log(`[ApiUnderstandingService] Clearing cache | Endpoints: ${endpointSize} | Relationships: ${relationshipSize}`);

        this.endpointCache.clear();
        this.relationshipCache.clear();
    }
}

module.exports = new ApiUnderstandingService();