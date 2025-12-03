const Repository = require('../models/repository.model');
const { anthropic, anthropicConfig } = require('../config/anthropic.config');
const { openai, openaiConfig } = require('../config/openai.config');

class RouteAnalyzerService {
    async analyzeRoutes(repositoryId, routeFiles, aiProvider = 'anthropic') {
        console.log(`[RouteAnalyzerService] Analyzing ${routeFiles.length} route files using ${aiProvider}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            const routes = [];

            for (const file of routeFiles) {
                const fileRoutes = await this.parseRouteFile(file.content, file.path, repository.technology.framework);
                routes.push(...fileRoutes);
            }

            console.log(`[RouteAnalyzerService] Extracted ${routes.length} routes from files`);

            const enrichedRoutes = await this.enrichRoutesWithAI(routes, aiProvider);

            repository.analysis.findings.routes = routes.length;
            await repository.save();

            console.log(`[RouteAnalyzerService] Route analysis completed: ${enrichedRoutes.length} routes`);
            return enrichedRoutes;
        } catch (error) {
            console.error(`[RouteAnalyzerService] Error analyzing routes:`, error.message);
            throw error;
        }
    }

    parseRouteFile(content, filePath, framework) {
        console.log(`[RouteAnalyzerService] Parsing route file: ${filePath}`);

        const routes = [];

        if (framework === 'express' || framework === 'fastify') {
            routes.push(...this.parseExpressRoutes(content));
        } else if (framework === 'spring-boot') {
            routes.push(...this.parseSpringRoutes(content));
        } else if (framework === 'django') {
            routes.push(...this.parseDjangoRoutes(content));
        } else if (framework === 'fastapi') {
            routes.push(...this.parseFastAPIRoutes(content));
        }

        return routes;
    }

    parseExpressRoutes(content) {
        const routes = [];
        const regex = /(app|router)\.(get|post|put|delete|patch|options|head|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;

        let match;
        while ((match = regex.exec(content)) !== null) {
            routes.push({
                method: match[2].toUpperCase(),
                path: match[3],
                handler: '',
                middleware: [],
                params: this.extractPathParams(match[3]),
                queryParams: [],
                requestBody: null,
                responseType: null
            });
        }

        return routes;
    }

    parseSpringRoutes(content) {
        const routes = [];

        const requestMappingRegex = /@(?:RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["'](?:\s*,\s*method\s*=\s*RequestMethod\.(GET|POST|PUT|DELETE|PATCH))?\s*\)/g;
        let match;

        while ((match = requestMappingRegex.exec(content)) !== null) {
            const path = match[1];
            let method = match[2] || 'GET';

            const mappingMatch = content.match(/@(\w+Mapping)/);
            if (mappingMatch) {
                method = mappingMatch[1].replace('Mapping', '').toUpperCase();
            }

            routes.push({
                method: method,
                path: path,
                handler: '',
                middleware: [],
                params: this.extractPathParams(path),
                queryParams: [],
                requestBody: null,
                responseType: null
            });
        }

        return routes;
    }

    parseDjangoRoutes(content) {
        const routes = [];

        const urlPatternRegex = /path\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,\)]+)/g;
        let match;

        while ((match = urlPatternRegex.exec(content)) !== null) {
            routes.push({
                method: 'GET',
                path: match[1],
                handler: match[2].trim(),
                middleware: [],
                params: this.extractPathParams(match[1]),
                queryParams: [],
                requestBody: null,
                responseType: null
            });
        }

        return routes;
    }

    parseFastAPIRoutes(content) {
        const routes = [];

        const decoratorRegex = /@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
        let match;

        while ((match = decoratorRegex.exec(content)) !== null) {
            routes.push({
                method: match[1].toUpperCase(),
                path: match[2],
                handler: '',
                middleware: [],
                params: this.extractPathParams(match[2]),
                queryParams: [],
                requestBody: null,
                responseType: null
            });
        }

        return routes;
    }

    extractPathParams(path) {
        const params = [];

        const expressMatch = path.match(/:(\w+)/g);
        if (expressMatch) {
            return expressMatch.map(p => p.replace(':', ''));
        }

        const springMatch = path.match(/{(\w+)}/g);
        if (springMatch) {
            return springMatch.map(p => p.slice(1, -1));
        }

        return params;
    }

    async enrichRoutesWithAI(routes, aiProvider) {
        console.log(`[RouteAnalyzerService] Enriching routes with AI analysis using ${aiProvider}`);

        try {
            const routeSummary = routes.map(r => `${r.method} ${r.path}`).join('\n');

            const enrichmentPrompt = `Analyze these API routes and provide brief descriptions for each:
${routeSummary}

For each route, provide: description, purpose, typical response status codes, and any security considerations.
Return as JSON array.`;

            let enrichedData;

            if (aiProvider === 'openai') {
                enrichedData = await this.enrichWithOpenAI(enrichmentPrompt);
            } else {
                enrichedData = await this.enrichWithAnthropic(enrichmentPrompt);
            }

            const enriched = routes.map((route, index) => ({
                ...route,
                description: enrichedData[index]?.description || '',
                purpose: enrichedData[index]?.purpose || '',
                statusCodes: enrichedData[index]?.statusCodes || [],
                securityConsiderations: enrichedData[index]?.securityConsiderations || []
            }));

            console.log(`[RouteAnalyzerService] Routes enriched successfully`);
            return enriched;
        } catch (error) {
            console.error(`[RouteAnalyzerService] Error enriching routes with AI:`, error.message);
            return routes;
        }
    }

    async enrichWithAnthropic(prompt) {
        console.log(`[RouteAnalyzerService] Enriching with Anthropic Claude`);

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
            console.error(`[RouteAnalyzerService] Anthropic enrichment error:`, error.message);
            return [];
        }
    }

    async enrichWithOpenAI(prompt) {
        console.log(`[RouteAnalyzerService] Enriching with OpenAI GPT`);

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
            console.error(`[RouteAnalyzerService] OpenAI enrichment error:`, error.message);
            return [];
        }
    }

    async categorizeRoutes(routes) {
        console.log(`[RouteAnalyzerService] Categorizing ${routes.length} routes`);

        try {
            const categories = {
                authentication: [],
                users: [],
                data: [],
                files: [],
                system: [],
                other: []
            };

            routes.forEach(route => {
                const path = route.path.toLowerCase();

                if (path.includes('auth') || path.includes('login') || path.includes('register')) {
                    categories.authentication.push(route);
                } else if (path.includes('user') || path.includes('profile') || path.includes('account')) {
                    categories.users.push(route);
                } else if (path.includes('data') || path.includes('records') || path.includes('items')) {
                    categories.data.push(route);
                } else if (path.includes('file') || path.includes('upload') || path.includes('download')) {
                    categories.files.push(route);
                } else if (path.includes('health') || path.includes('status') || path.includes('info')) {
                    categories.system.push(route);
                } else {
                    categories.other.push(route);
                }
            });

            console.log(`[RouteAnalyzerService] Routes categorized: ${Object.values(categories).filter(c => c.length > 0).length} categories populated`);
            return categories;
        } catch (error) {
            console.error(`[RouteAnalyzerService] Error categorizing routes:`, error.message);
            throw error;
        }
    }

    async detectSecurityIssues(routes) {
        console.log(`[RouteAnalyzerService] Detecting security issues in ${routes.length} routes`);

        try {
            const issues = [];

            routes.forEach(route => {
                const path = route.path.toLowerCase();

                if (route.method === 'DELETE' && !path.includes('delete')) {
                    issues.push({
                        route: `${route.method} ${route.path}`,
                        severity: 'medium',
                        issue: 'DELETE method on non-delete endpoint',
                        recommendation: 'Ensure DELETE endpoints are clearly identified'
                    });
                }

                if (path.includes('admin') && route.method !== 'GET') {
                    issues.push({
                        route: `${route.method} ${route.path}`,
                        severity: 'high',
                        issue: 'Admin endpoint without GET restriction',
                        recommendation: 'Add authentication and authorization checks'
                    });
                }

                if (path.includes('password') && route.method === 'GET') {
                    issues.push({
                        route: `${route.method} ${route.path}`,
                        severity: 'critical',
                        issue: 'Password exposed via GET method',
                        recommendation: 'Use POST/PUT for password operations'
                    });
                }
            });

            console.log(`[RouteAnalyzerService] Found ${issues.length} potential security issues`);
            return issues;
        } catch (error) {
            console.error(`[RouteAnalyzerService] Error detecting security issues:`, error.message);
            throw error;
        }
    }
}

module.exports = new RouteAnalyzerService();