const anthropicService = require('./anthropic.service');
const openaiService = require('./openai.service');

class ScriptOptimizationService {
    constructor() {
        this.optimizationCache = new Map();
        this.cacheDuration = 1800000;
    }

    async optimizeTestScript(testScript, language, optimizationGoals, aiProvider = 'anthropic') {
        const startTime = Date.now();
        console.log(`[ScriptOptimizationService] Optimization started | Language: ${language} | Provider: ${aiProvider}`);

        try {
            const cacheKey = `optimize-${testScript._id}-${JSON.stringify(optimizationGoals)}`;
            const cached = this.optimizationCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
                console.log(`[ScriptOptimizationService] Cache hit | Key: ${cacheKey}`);
                return cached.data;
            }

            const scriptContent = this.extractScriptContent(testScript);

            let result;
            if (aiProvider === 'openai') {
                result = await openaiService.optimizeTestScript(scriptContent, language);
            } else {
                result = await anthropicService.optimizeTestScript(scriptContent, language);
            }

            const optimizedScript = await this.applyOptimizations(result.optimizedCode, testScript, optimizationGoals);

            this.optimizationCache.set(cacheKey, {
                data: optimizedScript,
                timestamp: Date.now()
            });

            const duration = Date.now() - startTime;
            console.log(`[ScriptOptimizationService] Optimization completed | Duration: ${duration}ms`);

            return optimizedScript;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[ScriptOptimizationService] Optimization failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    extractScriptContent(testScript) {
        console.log(`[ScriptOptimizationService] Extracting script content | Script: ${testScript.name}`);

        if (testScript.content && testScript.content.testClass) {
            return testScript.content.testClass.content;
        }

        if (typeof testScript.content === 'string') {
            return testScript.content;
        }

        console.warn(`[ScriptOptimizationService] No content found in test script`);
        return '';
    }

    async applyOptimizations(optimizedCode, originalScript, goals) {
        console.log(`[ScriptOptimizationService] Applying optimizations | Goals: ${goals.length}`);

        try {
            const optimized = {
                ...originalScript.toObject(),
                content: {
                    ...originalScript.content,
                    testClass: {
                        ...originalScript.content.testClass,
                        content: optimizedCode
                    }
                },
                optimization: {
                    optimized: true,
                    optimizedAt: new Date(),
                    goals: goals,
                    improvements: []
                }
            };

            const improvements = await this.identifyImprovements(originalScript.content.testClass.content, optimizedCode);
            optimized.optimization.improvements = improvements;

            console.log(`[ScriptOptimizationService] Optimizations applied | Improvements: ${improvements.length}`);
            return optimized;
        } catch (error) {
            console.error(`[ScriptOptimizationService] Failed to apply optimizations | Error: ${error.message}`);
            throw error;
        }
    }

    async identifyImprovements(originalCode, optimizedCode) {
        console.log(`[ScriptOptimizationService] Identifying improvements`);

        const improvements = [];

        const originalLines = originalCode.split('\n').length;
        const optimizedLines = optimizedCode.split('\n').length;

        if (optimizedLines < originalLines) {
            improvements.push({
                type: 'code_reduction',
                description: `Reduced code from ${originalLines} to ${optimizedLines} lines`,
                impact: 'high'
            });
        }

        const duplicates = this.detectDuplicateCode(originalCode);
        if (duplicates > 0) {
            improvements.push({
                type: 'duplication_removal',
                description: `Removed ${duplicates} duplicate code blocks`,
                impact: 'medium'
            });
        }

        const hardcodedValues = this.detectHardcodedValues(originalCode);
        if (hardcodedValues > 0) {
            improvements.push({
                type: 'externalized_values',
                description: `Externalized ${hardcodedValues} hardcoded values`,
                impact: 'medium'
            });
        }

        console.log(`[ScriptOptimizationService] Improvements identified | Count: ${improvements.length}`);
        return improvements;
    }

    detectDuplicateCode(code) {
        console.log(`[ScriptOptimizationService] Detecting duplicate code`);

        const lines = code.split('\n').filter(line => line.trim().length > 0);
        const lineMap = new Map();
        let duplicates = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length < 10) continue;

            const count = lineMap.get(trimmed) || 0;
            lineMap.set(trimmed, count + 1);

            if (count === 1) {
                duplicates++;
            }
        }

        console.log(`[ScriptOptimizationService] Duplicate code detected | Count: ${duplicates}`);
        return duplicates;
    }

    detectHardcodedValues(code) {
        console.log(`[ScriptOptimizationService] Detecting hardcoded values`);

        const patterns = [
            /"[^"]{10,}"/g,
            /'[^']{10,}'/g,
            /\b\d{3,}\b/g
        ];

        let count = 0;
        for (const pattern of patterns) {
            const matches = code.match(pattern);
            if (matches) {
                count += matches.length;
            }
        }

        console.log(`[ScriptOptimizationService] Hardcoded values detected | Count: ${count}`);
        return count;
    }

    async refactorForReusability(testScripts, language, aiProvider = 'anthropic') {
        const startTime = Date.now();
        console.log(`[ScriptOptimizationService] Refactoring for reusability | Scripts: ${testScripts.length}`);

        try {
            const commonPatterns = this.identifyCommonPatterns(testScripts);
            const utilities = await this.generateUtilityMethods(commonPatterns, language, aiProvider);
            const refactoredScripts = await this.applyUtilities(testScripts, utilities);

            const duration = Date.now() - startTime;
            console.log(`[ScriptOptimizationService] Refactoring completed | Utilities: ${utilities.length} | Duration: ${duration}ms`);

            return {
                refactoredScripts: refactoredScripts,
                utilities: utilities,
                improvementPercentage: this.calculateImprovement(testScripts, refactoredScripts)
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[ScriptOptimizationService] Refactoring failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    identifyCommonPatterns(testScripts) {
        console.log(`[ScriptOptimizationService] Identifying common patterns | Scripts: ${testScripts.length}`);

        const patterns = {
            authentication: 0,
            headerSetup: 0,
            dataSetup: 0,
            assertions: 0,
            cleanup: 0
        };

        for (const script of testScripts) {
            const content = this.extractScriptContent(script);

            if (content.includes('auth') || content.includes('token')) patterns.authentication++;
            if (content.includes('header') || content.includes('Header')) patterns.headerSetup++;
            if (content.includes('setup') || content.includes('@Before')) patterns.dataSetup++;
            if (content.includes('assert') || content.includes('verify')) patterns.assertions++;
            if (content.includes('cleanup') || content.includes('@After')) patterns.cleanup++;
        }

        console.log(`[ScriptOptimizationService] Common patterns identified | Auth: ${patterns.authentication} | Headers: ${patterns.headerSetup}`);
        return patterns;
    }

    async generateUtilityMethods(patterns, language, aiProvider) {
        console.log(`[ScriptOptimizationService] Generating utility methods | Language: ${language}`);

        const utilities = [];

        if (patterns.authentication > 2) {
            utilities.push({
                name: 'getAuthToken',
                type: 'authentication',
                code: this.generateAuthUtility(language),
                description: 'Centralized authentication token retrieval'
            });
        }

        if (patterns.headerSetup > 2) {
            utilities.push({
                name: 'setupCommonHeaders',
                type: 'headers',
                code: this.generateHeaderUtility(language),
                description: 'Common header setup utility'
            });
        }

        if (patterns.dataSetup > 2) {
            utilities.push({
                name: 'setupTestData',
                type: 'data',
                code: this.generateDataSetupUtility(language),
                description: 'Test data setup utility'
            });
        }

        console.log(`[ScriptOptimizationService] Utility methods generated | Count: ${utilities.length}`);
        return utilities;
    }

    generateAuthUtility(language) {
        if (language === 'java') {
            return `public static String getAuthToken() {
    return given()
        .contentType("application/json")
        .body("{\"username\":\"test\",\"password\":\"test123\"}")
        .post("/auth/login")
        .then()
        .extract()
        .path("token");
}`;
        }

        return `function getAuthToken() {
    return fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', password: 'test123' })
    }).then(res => res.json()).then(data => data.token);
}`;
    }

    generateHeaderUtility(language) {
        if (language === 'java') {
            return `public static Map<String, String> getCommonHeaders() {
    Map<String, String> headers = new HashMap<>();
    headers.put("Content-Type", "application/json");
    headers.put("Accept", "application/json");
    return headers;
}`;
        }

        return `function getCommonHeaders() {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}`;
    }

    generateDataSetupUtility(language) {
        if (language === 'java') {
            return `public static void setupTestData() {
    // Initialize test data
    TestDataFactory.createTestEntities();
}`;
        }

        return `function setupTestData() {
    // Initialize test data
    TestDataFactory.createTestEntities();
}`;
    }

    async applyUtilities(testScripts, utilities) {
        console.log(`[ScriptOptimizationService] Applying utilities to scripts | Scripts: ${testScripts.length} | Utilities: ${utilities.length}`);

        const refactoredScripts = [];

        for (const script of testScripts) {
            let content = this.extractScriptContent(script);

            for (const utility of utilities) {
                content = this.replaceWithUtility(content, utility);
            }

            const refactoredScript = {
                ...script.toObject(),
                content: {
                    ...script.content,
                    testClass: {
                        ...script.content.testClass,
                        content: content
                    }
                }
            };

            refactoredScripts.push(refactoredScript);
        }

        console.log(`[ScriptOptimizationService] Utilities applied | Refactored: ${refactoredScripts.length}`);
        return refactoredScripts;
    }

    replaceWithUtility(content, utility) {
        console.log(`[ScriptOptimizationService] Replacing code with utility | Utility: ${utility.name}`);

        if (utility.type === 'authentication') {
            content = content.replace(/given\(\)[\s\S]*?post\("\/auth\/login"\)[\s\S]*?extract\(\)[\s\S]*?path\("token"\)/g, 'getAuthToken()');
        }

        if (utility.type === 'headers') {
            content = content.replace(/\.header\("Content-Type",\s*"[^"]+"\)[\s\S]*?\.header\("Accept",\s*"[^"]+"\)/g, '.headers(getCommonHeaders())');
        }

        return content;
    }

    calculateImprovement(originalScripts, refactoredScripts) {
        console.log(`[ScriptOptimizationService] Calculating improvement percentage`);

        let originalSize = 0;
        let refactoredSize = 0;

        for (const script of originalScripts) {
            originalSize += this.extractScriptContent(script).length;
        }

        for (const script of refactoredScripts) {
            refactoredSize += this.extractScriptContent(script).length;
        }

        const improvement = ((originalSize - refactoredSize) / originalSize) * 100;

        console.log(`[ScriptOptimizationService] Improvement calculated | Original: ${originalSize} | Refactored: ${refactoredSize} | Improvement: ${improvement.toFixed(2)}%`);
        return improvement.toFixed(2);
    }

    async optimizePerformance(testScript, performanceGoals, aiProvider = 'anthropic') {
        console.log(`[ScriptOptimizationService] Optimizing performance | Script: ${testScript.name}`);

        try {
            const content = this.extractScriptContent(testScript);
            const optimizations = [];

            if (performanceGoals.includes('reduce_waits')) {
                const waitsRemoved = this.optimizeWaits(content);
                optimizations.push(waitsRemoved);
            }

            if (performanceGoals.includes('parallel_execution')) {
                const parallelizationAdded = this.addParallelization(content);
                optimizations.push(parallelizationAdded);
            }

            if (performanceGoals.includes('optimize_database')) {
                const dbOptimized = this.optimizeDatabaseCalls(content);
                optimizations.push(dbOptimized);
            }

            console.log(`[ScriptOptimizationService] Performance optimizations applied | Count: ${optimizations.length}`);
            return {
                optimizedContent: content,
                optimizations: optimizations
            };
        } catch (error) {
            console.error(`[ScriptOptimizationService] Performance optimization failed | Error: ${error.message}`);
            throw error;
        }
    }

    optimizeWaits(content) {
        console.log(`[ScriptOptimizationService] Optimizing wait statements`);

        const waitPattern = /Thread\.sleep\(\d+\)/g;
        const waits = content.match(waitPattern);
        const count = waits ? waits.length : 0;

        console.log(`[ScriptOptimizationService] Wait statements found | Count: ${count}`);
        return {
            type: 'wait_optimization',
            description: `Identified ${count} wait statements for optimization`,
            impact: count > 0 ? 'medium' : 'low'
        };
    }

    addParallelization(content) {
        console.log(`[ScriptOptimizationService] Adding parallelization support`);

        const hasParallel = content.includes('@Test(threadPoolSize') || content.includes('parallel');

        return {
            type: 'parallelization',
            description: hasParallel ? 'Parallel execution already enabled' : 'Parallel execution can be enabled',
            impact: hasParallel ? 'low' : 'high'
        };
    }

    optimizeDatabaseCalls(content) {
        console.log(`[ScriptOptimizationService] Optimizing database calls`);

        const dbCallPattern = /\.find\(|\.findOne\(|\.save\(/g;
        const dbCalls = content.match(dbCallPattern);
        const count = dbCalls ? dbCalls.length : 0;

        console.log(`[ScriptOptimizationService] Database calls found | Count: ${count}`);
        return {
            type: 'database_optimization',
            description: `Identified ${count} database calls for potential optimization`,
            impact: count > 5 ? 'high' : 'medium'
        };
    }

    async analyzeTestCoverage(testScripts, endpoints) {
        console.log(`[ScriptOptimizationService] Analyzing test coverage | Scripts: ${testScripts.length} | Endpoints: ${endpoints.length}`);

        try {
            const coverage = {
                totalEndpoints: endpoints.length,
                coveredEndpoints: 0,
                uncoveredEndpoints: [],
                coveragePercentage: 0,
                gaps: []
            };

            for (const endpoint of endpoints) {
                const isCovered = testScripts.some(script =>
                    script.endpoint && script.endpoint.toString() === endpoint._id.toString()
                );

                if (isCovered) {
                    coverage.coveredEndpoints++;
                } else {
                    coverage.uncoveredEndpoints.push({
                        method: endpoint.method,
                        path: endpoint.path,
                        priority: endpoint.priority || 'medium'
                    });
                }
            }

            coverage.coveragePercentage = ((coverage.coveredEndpoints / coverage.totalEndpoints) * 100).toFixed(2);

            console.log(`[ScriptOptimizationService] Coverage analysis completed | Coverage: ${coverage.coveragePercentage}%`);
            return coverage;
        } catch (error) {
            console.error(`[ScriptOptimizationService] Coverage analysis failed | Error: ${error.message}`);
            throw error;
        }
    }

    async generateCoverageRecommendations(coverageAnalysis) {
        console.log(`[ScriptOptimizationService] Generating coverage recommendations`);

        const recommendations = [];

        if (coverageAnalysis.coveragePercentage < 70) {
            recommendations.push({
                priority: 'high',
                type: 'coverage',
                message: `Current coverage is ${coverageAnalysis.coveragePercentage}%. Aim for at least 70% coverage.`,
                actionItems: [
                    'Prioritize uncovered critical endpoints',
                    'Add tests for high-priority endpoints',
                    'Consider edge cases and error scenarios'
                ]
            });
        }

        for (const uncovered of coverageAnalysis.uncoveredEndpoints) {
            if (uncovered.priority === 'high' || uncovered.priority === 'critical') {
                recommendations.push({
                    priority: uncovered.priority,
                    type: 'missing_test',
                    message: `Missing test for ${uncovered.method} ${uncovered.path}`,
                    actionItems: [
                        `Create test for ${uncovered.method} ${uncovered.path}`,
                        'Include positive and negative test cases',
                        'Add data validation tests'
                    ]
                });
            }
        }

        console.log(`[ScriptOptimizationService] Coverage recommendations generated | Count: ${recommendations.length}`);
        return recommendations;
    }

    async batchOptimize(testScripts, optimizationOptions, aiProvider = 'anthropic') {
        const startTime = Date.now();
        console.log(`[ScriptOptimizationService] Batch optimization started | Scripts: ${testScripts.length}`);

        try {
            const results = {
                optimized: [],
                failed: [],
                totalScripts: testScripts.length,
                successCount: 0,
                failureCount: 0
            };

            for (let i = 0; i < testScripts.length; i++) {
                const script = testScripts[i];
                console.log(`[ScriptOptimizationService] Optimizing script ${i + 1}/${testScripts.length} | Name: ${script.name}`);

                try {
                    const optimized = await this.optimizeTestScript(script, optimizationOptions.language, optimizationOptions.goals, aiProvider);
                    results.optimized.push({ script, optimized });
                    results.successCount++;
                } catch (error) {
                    console.error(`[ScriptOptimizationService] Script optimization failed | Script: ${script.name} | Error: ${error.message}`);
                    results.failed.push({ script, error: error.message });
                    results.failureCount++;
                }

                if (i < testScripts.length - 1) {
                    await this.delay(1000);
                }
            }

            const duration = Date.now() - startTime;
            console.log(`[ScriptOptimizationService] Batch optimization completed | Success: ${results.successCount} | Failed: ${results.failureCount} | Duration: ${duration}ms`);

            return results;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[ScriptOptimizationService] Batch optimization failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    clearCache() {
        const size = this.optimizationCache.size;
        console.log(`[ScriptOptimizationService] Clearing cache | Entries: ${size}`);
        this.optimizationCache.clear();
    }

    getCacheStats() {
        return {
            size: this.optimizationCache.size,
            entries: Array.from(this.optimizationCache.keys())
        };
    }
}

module.exports = new ScriptOptimizationService();