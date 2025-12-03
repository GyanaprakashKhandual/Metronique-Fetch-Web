const TestExecution = require('../../models/test.execution.model');
const TestResult = require('../../models/test.result.model');
const PerformanceMetric = require('../../models/performance.metric.model');
const ApiEndpoint = require('../../models/api.endpoint.model');

class AnalyticsService {
    constructor() {
        this.analyticsCache = new Map();
        this.cacheDuration = 1800000;
    }

    async getProjectAnalytics(projectId, dateRange = {}) {
        const operationId = `PROJECT_ANALYTICS_${Date.now()}`;
        const startTime = Date.now();
        console.log(`[${operationId}] INITIATED | ProjectId: ${projectId}`);

        const cacheKey = `analytics-${projectId}-${JSON.stringify(dateRange)}`;
        const cached = this.analyticsCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            console.log(`[${operationId}] CACHE_HIT | Age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s`);
            return cached.data;
        }

        try {
            const query = { project: projectId };
            
            if (dateRange.startDate || dateRange.endDate) {
                query.createdAt = {};
                if (dateRange.startDate) query.createdAt.$gte = dateRange.startDate;
                if (dateRange.endDate) query.createdAt.$lte = dateRange.endDate;
            }

            const [executions, testResults, endpoints] = await Promise.all([
                TestExecution.find(query).lean().exec(),
                TestResult.find(query).lean().exec(),
                ApiEndpoint.find({ project: projectId }).lean().exec()
            ]);

            console.log(`[${operationId}] DATA_FETCHED | Executions: ${executions.length} | Results: ${testResults.length} | Endpoints: ${endpoints.length}`);

            const analytics = {
                summary: this.calculateSummaryMetrics(executions, testResults),
                trends: this.calculateTrends(executions),
                topFailingEndpoints: this.findTopFailingEndpoints(testResults),
                testExecutionTrend: this.calculateExecutionTrend(executions),
                successRateTrend: this.calculateSuccessRateTrend(executions),
                performanceTrend: this.calculatePerformanceTrend(executions),
                endpointCoverage: this.calculateEndpointCoverage(endpoints, testResults),
                teamActivity: await this.getTeamActivity(projectId, dateRange)
            };

            this.analyticsCache.set(cacheKey, {
                data: analytics,
                timestamp: Date.now()
            });

            const duration = Date.now() - startTime;
            console.log(`[${operationId}] ANALYTICS_COMPILED | Duration: ${duration}ms`);

            return analytics;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[${operationId}] ANALYTICS_FAILED | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async getExecutionAnalytics(executionId) {
        const operationId = `EXECUTION_ANALYTICS_${Date.now()}`;
        console.log(`[${operationId}] INITIATED | ExecutionId: ${executionId}`);

        try {
            const execution = await TestExecution.findById(executionId)
                .populate('testResults')
                .lean()
                .exec();

            if (!execution) {
                console.error(`[${operationId}] EXECUTION_NOT_FOUND`);
                throw new Error('Execution not found');
            }

            console.log(`[${operationId}] EXECUTION_LOADED | Tests: ${execution.results.totalTests}`);

            const analytics = {
                executionSummary: {
                    totalTests: execution.results.totalTests,
                    passed: execution.results.passed,
                    failed: execution.results.failed,
                    skipped: execution.results.skipped,
                    successRate: execution.results.successRate,
                    duration: execution.timing.duration,
                    startTime: execution.timing.startedAt,
                    endTime: execution.timing.completedAt
                },
                testBreakdown: this.getTestBreakdown(execution.testResults),
                performanceMetrics: this.getPerformanceMetrics(execution.testResults),
                failureAnalysis: this.analyzeFailures(execution.testResults),
                assertionStats: this.getAssertionStats(execution.testResults),
                responseTimeDistribution: this.getResponseTimeDistribution(execution.testResults),
                errorDistribution: this.getErrorDistribution(execution.testResults)
            };

            console.log(`[${operationId}] EXECUTION_ANALYTICS_COMPLETED`);
            return analytics;
        } catch (error) {
            console.error(`[${operationId}] ANALYTICS_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    calculateSummaryMetrics(executions, testResults) {
        console.log(`[SUMMARY_METRICS] Calculating summary metrics`);

        const totalTests = executions.reduce((sum, e) => sum + (e.results.totalTests || 0), 0);
        const totalPassed = executions.reduce((sum, e) => sum + (e.results.passed || 0), 0);
        const totalFailed = executions.reduce((sum, e) => sum + (e.results.failed || 0), 0);
        const totalSkipped = executions.reduce((sum, e) => sum + (e.results.skipped || 0), 0);
        const totalDuration = executions.reduce((sum, e) => sum + (e.timing.duration || 0), 0);

        return {
            totalExecutions: executions.length,
            totalTests: totalTests,
            totalPassed: totalPassed,
            totalFailed: totalFailed,
            totalSkipped: totalSkipped,
            successRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0,
            averageExecutionTime: executions.length > 0 ? Math.round(totalDuration / executions.length) : 0,
            totalExecutionTime: totalDuration
        };
    }

    calculateTrends(executions) {
        console.log(`[TRENDS_CALCULATION] Calculating trends from ${executions.length} executions`);

        const sortedExecutions = executions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        return {
            trend: sortedExecutions.map(e => ({
                timestamp: e.createdAt,
                passed: e.results.passed,
                failed: e.results.failed,
                successRate: e.results.successRate
            })),
            latestFailureRate: sortedExecutions.length > 0 
                ? ((sortedExecutions[sortedExecutions.length - 1].results.failed / sortedExecutions[sortedExecutions.length - 1].results.totalTests) * 100).toFixed(2)
                : 0
        };
    }

    findTopFailingEndpoints(testResults) {
        console.log(`[TOP_FAILING_ENDPOINTS] Analyzing ${testResults.length} results`);

        const failuresByEndpoint = {};

        testResults.forEach(result => {
            if (result.status === 'failed') {
                const endpoint = result.endpoint || 'unknown';
                failuresByEndpoint[endpoint] = (failuresByEndpoint[endpoint] || 0) + 1;
            }
        });

        const topFailing = Object.entries(failuresByEndpoint)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([endpoint, count]) => ({
                endpoint: endpoint,
                failureCount: count,
                failureRate: ((count / testResults.length) * 100).toFixed(2)
            }));

        console.log(`[TOP_FAILING_ENDPOINTS] Found ${topFailing.length} endpoints`);
        return topFailing;
    }

    calculateExecutionTrend(executions) {
        console.log(`[EXECUTION_TREND] Calculating execution trend`);

        const sortedExecutions = executions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(-30);

        return sortedExecutions.map(e => ({
            date: e.createdAt,
            executions: 1,
            totalTests: e.results.totalTests
        }));
    }

    calculateSuccessRateTrend(executions) {
        console.log(`[SUCCESS_RATE_TREND] Calculating success rate trend`);

        const sortedExecutions = executions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(-30);

        return sortedExecutions.map(e => ({
            timestamp: e.createdAt,
            successRate: e.results.successRate,
            passed: e.results.passed,
            failed: e.results.failed
        }));
    }

    calculatePerformanceTrend(executions) {
        console.log(`[PERFORMANCE_TREND] Calculating performance trend`);

        const sortedExecutions = executions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(-30);

        return sortedExecutions.map(e => ({
            timestamp: e.createdAt,
            duration: e.timing.duration,
            averageResponseTime: e.performance?.averageResponseTime || 0
        }));
    }

    calculateEndpointCoverage(endpoints, testResults) {
        console.log(`[ENDPOINT_COVERAGE] Calculating coverage for ${endpoints.length} endpoints`);

        const testedEndpoints = new Set(testResults.map(r => r.endpoint));

        const coverage = {
            totalEndpoints: endpoints.length,
            testedEndpoints: testedEndpoints.size,
            untestedEndpoints: endpoints.length - testedEndpoints.size,
            coveragePercentage: endpoints.length > 0 
                ? ((testedEndpoints.size / endpoints.length) * 100).toFixed(2)
                : 0
        };

        console.log(`[ENDPOINT_COVERAGE] Coverage: ${coverage.coveragePercentage}%`);
        return coverage;
    }

    async getTeamActivity(projectId, dateRange) {
        const operationId = `TEAM_ACTIVITY_${Date.now()}`;
        console.log(`[${operationId}] FETCHING_TEAM_ACTIVITY | ProjectId: ${projectId}`);

        try {
            const query = { project: projectId };
            
            if (dateRange.startDate || dateRange.endDate) {
                query.createdAt = {};
                if (dateRange.startDate) query.createdAt.$gte = dateRange.startDate;
                if (dateRange.endDate) query.createdAt.$lte = dateRange.endDate;
            }

            const executions = await TestExecution.find(query)
                .select('createdBy createdAt results')
                .lean()
                .exec();

            console.log(`[${operationId}] ACTIVITIES_FETCHED | Count: ${executions.length}`);

            const activityByUser = {};

            executions.forEach(exec => {
                const userId = exec.createdBy?.toString() || 'unknown';
                if (!activityByUser[userId]) {
                    activityByUser[userId] = {
                        userId: userId,
                        executionCount: 0,
                        totalTestsRun: 0,
                        lastActivity: exec.createdAt
                    };
                }
                activityByUser[userId].executionCount++;
                activityByUser[userId].totalTestsRun += exec.results.totalTests;
            });

            return Object.values(activityByUser);
        } catch (error) {
            console.error(`[${operationId}] ACTIVITY_FETCH_FAILED | Error: ${error.message}`);
            return [];
        }
    }

    getTestBreakdown(testResults) {
        console.log(`[TEST_BREAKDOWN] Analyzing ${testResults.length} test results`);

        const breakdown = {
            passed: testResults.filter(r => r.status === 'passed').length,
            failed: testResults.filter(r => r.status === 'failed').length,
            skipped: testResults.filter(r => r.status === 'skipped').length,
            error: testResults.filter(r => r.status === 'error').length
        };

        breakdown.total = breakdown.passed + breakdown.failed + breakdown.skipped + breakdown.error;

        console.log(`[TEST_BREAKDOWN] Passed: ${breakdown.passed} | Failed: ${breakdown.failed} | Skipped: ${breakdown.skipped}`);
        return breakdown;
    }

    getPerformanceMetrics(testResults) {
        console.log(`[PERFORMANCE_METRICS] Calculating performance metrics`);

        const responseTimes = testResults
            .filter(r => r.response && r.response.responseTime)
            .map(r => r.response.responseTime)
            .sort((a, b) => a - b);

        if (responseTimes.length === 0) {
            return {
                averageResponseTime: 0,
                minResponseTime: 0,
                maxResponseTime: 0,
                p50: 0,
                p90: 0,
                p95: 0,
                p99: 0
            };
        }

        return {
            averageResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
            minResponseTime: responseTimes[0],
            maxResponseTime: responseTimes[responseTimes.length - 1],
            p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
            p90: responseTimes[Math.floor(responseTimes.length * 0.9)],
            p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
            p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
            slowestTest: testResults.reduce((max, r) => 
                (r.response?.responseTime || 0) > (max.response?.responseTime || 0) ? r : max
            )
        };
    }

    analyzeFailures(testResults) {
        console.log(`[FAILURE_ANALYSIS] Analyzing failures in ${testResults.length} results`);

        const failures = testResults.filter(r => r.status === 'failed');

        const failuresByType = {};
        const failuresByAssertion = {};

        failures.forEach(failure => {
            if (failure.error) {
                const errorType = failure.error.type || 'unknown';
                failuresByType[errorType] = (failuresByType[errorType] || 0) + 1;
            }

            if (failure.assertions) {
                failure.assertions.forEach(assertion => {
                    if (!assertion.passed) {
                        const type = assertion.type || 'unknown';
                        failuresByAssertion[type] = (failuresByAssertion[type] || 0) + 1;
                    }
                });
            }
        });

        console.log(`[FAILURE_ANALYSIS] Total Failures: ${failures.length} | Types: ${Object.keys(failuresByType).length}`);

        return {
            totalFailures: failures.length,
            failureRate: ((failures.length / testResults.length) * 100).toFixed(2),
            failuresByType: failuresByType,
            failuresByAssertion: failuresByAssertion,
            mostCommonFailure: Object.entries(failuresByType).length > 0
                ? Object.entries(failuresByType).sort((a, b) => b[1] - a[1])[0]
                : null
        };
    }

    getAssertionStats(testResults) {
        console.log(`[ASSERTION_STATS] Calculating assertion statistics`);

        let totalAssertions = 0;
        let passedAssertions = 0;
        let failedAssertions = 0;

        testResults.forEach(result => {
            if (result.assertions) {
                result.assertions.forEach(assertion => {
                    totalAssertions++;
                    if (assertion.passed) {
                        passedAssertions++;
                    } else {
                        failedAssertions++;
                    }
                });
            }
        });

        console.log(`[ASSERTION_STATS] Total: ${totalAssertions} | Passed: ${passedAssertions} | Failed: ${failedAssertions}`);

        return {
            totalAssertions: totalAssertions,
            passedAssertions: passedAssertions,
            failedAssertions: failedAssertions,
            assertionPassRate: totalAssertions > 0 
                ? ((passedAssertions / totalAssertions) * 100).toFixed(2)
                : 0
        };
    }

    getResponseTimeDistribution(testResults) {
        console.log(`[RESPONSE_TIME_DISTRIBUTION] Calculating distribution`);

        const responseTimes = testResults
            .filter(r => r.response && r.response.responseTime)
            .map(r => r.response.responseTime);

        if (responseTimes.length === 0) {
            return { buckets: [] };
        }

        const min = Math.min(...responseTimes);
        const max = Math.max(...responseTimes);
        const bucketSize = (max - min) / 10 || 1;

        const buckets = {};
        for (let i = 0; i < 10; i++) {
            const rangeStart = Math.round(min + (i * bucketSize));
            const rangeEnd = Math.round(min + ((i + 1) * bucketSize));
            const key = `${rangeStart}-${rangeEnd}ms`;
            buckets[key] = 0;
        }

        responseTimes.forEach(time => {
            const bucketIndex = Math.min(9, Math.floor((time - min) / bucketSize));
            const rangeStart = Math.round(min + (bucketIndex * bucketSize));
            const rangeEnd = Math.round(min + ((bucketIndex + 1) * bucketSize));
            const key = `${rangeStart}-${rangeEnd}ms`;
            if (buckets[key] !== undefined) {
                buckets[key]++;
            }
        });

        return { buckets: buckets };
    }

    getErrorDistribution(testResults) {
        console.log(`[ERROR_DISTRIBUTION] Calculating error distribution`);

        const errors = {};
        const statusCodes = {};

        testResults.forEach(result => {
            if (result.response && result.response.statusCode) {
                const status = result.response.statusCode;
                statusCodes[status] = (statusCodes[status] || 0) + 1;
            }

            if (result.error) {
                const errorType = result.error.type || 'unknown';
                errors[errorType] = (errors[errorType] || 0) + 1;
            }
        });

        console.log(`[ERROR_DISTRIBUTION] Unique Errors: ${Object.keys(errors).length} | Status Codes: ${Object.keys(statusCodes).length}`);

        return {
            errors: errors,
            statusCodes: statusCodes
        };
    }

    async getCustomMetrics(projectId, metricConfig) {
        const operationId = `CUSTOM_METRICS_${Date.now()}`;
        console.log(`[${operationId}] CALCULATING_CUSTOM_METRICS | ProjectId: ${projectId}`);

        try {
            const metrics = await PerformanceMetric.find({
                project: projectId,
                metricType: { $in: metricConfig.types || [] }
            })
            .sort({ timestamp: -1 })
            .limit(metricConfig.limit || 100)
            .lean()
            .exec();

            console.log(`[${operationId}] METRICS_FETCHED | Count: ${metrics.length}`);

            return {
                customMetrics: metrics,
                count: metrics.length,
                timestamp: new Date()
            };
        } catch (error) {
            console.error(`[${operationId}] ERROR | ${error.message}`);
            throw error;
        }
    }

    clearCache() {
        const size = this.analyticsCache.size;
        console.log(`[CACHE_CLEAR] Clearing ${size} analytics cache entries`);
        this.analyticsCache.clear();
    }

    getCacheStats() {
        const stats = {
            size: this.analyticsCache.size,
            entries: Array.from(this.analyticsCache.keys()).length
        };
        console.log(`[CACHE_STATS] Size: ${stats.size}`);
        return stats;
    }
}

module.exports = new AnalyticsService();