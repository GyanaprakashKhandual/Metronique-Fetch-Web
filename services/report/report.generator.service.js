const TestReport = require('../../models/test.report.model');
const TestExecution = require('../../models/test.execution.model');
const PerformanceMetric = require('../../models/performance.metric.model');

class ReportGeneratorService {
    constructor() {
        this.reportCache = new Map();
        this.cacheDuration = 3600000;
        this.maxRetries = 3;
    }

    async generateExecutionReport(executionId, projectId, userId) {
        const operationId = `REPORT_GEN_${Date.now()}`;
        const startTime = Date.now();
        console.log(`[${operationId}] INITIATED | ExecutionId: ${executionId} | ProjectId: ${projectId}`);

        try {
            const execution = await TestExecution.findById(executionId)
                .populate('testResults')
                .populate('databaseConnections')
                .exec();

            if (!execution) {
                console.error(`[${operationId}] EXECUTION_NOT_FOUND | ExecutionId: ${executionId}`);
                throw new Error('Execution not found');
            }

            console.log(`[${operationId}] EXECUTION_FETCHED | TotalTests: ${execution.results.totalTests} | Passed: ${execution.results.passed} | Failed: ${execution.results.failed}`);

            const report = new TestReport({
                project: projectId,
                execution: executionId,
                name: `Execution Report - ${new Date().toLocaleString()}`,
                type: 'execution',
                format: 'html',
                summary: {
                    totalTests: execution.results.totalTests,
                    passed: execution.results.passed,
                    failed: execution.results.failed,
                    skipped: execution.results.skipped,
                    successRate: execution.results.successRate,
                    passRate: execution.results.passRate,
                    duration: execution.timing.duration,
                    startTime: execution.timing.startedAt,
                    endTime: execution.timing.completedAt
                },
                testResults: execution.testResults.map(r => r._id),
                performance: await this.aggregatePerformanceMetrics(execution),
                coverage: this.calculateCoverage(execution),
                failures: this.analyzeFailures(execution),
                flakiness: this.detectFlakiness(execution),
                trends: await this.generateTrends(projectId),
                database: this.compileDatabaseInfo(execution),
                environment: {
                    name: execution.configuration.environment,
                    baseUrl: execution.configuration.baseUrl,
                    browser: execution.metadata.browser,
                    os: execution.metadata.os,
                    parallel: execution.configuration.parallel,
                    threadCount: execution.configuration.threadCount
                },
                metadata: {
                    generatedBy: userId,
                    generatedAt: new Date(),
                    version: '1.0'
                },
                createdBy: userId
            });

            await report.save();

            const reportDuration = Date.now() - startTime;
            console.log(`[${operationId}] REPORT_GENERATED_SUCCESSFULLY | ReportId: ${report._id} | Duration: ${reportDuration}ms`);

            return report;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[${operationId}] GENERATION_FAILED | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async generateSummaryReport(projectId, userId, dateRange = {}) {
        const operationId = `SUMMARY_REPORT_${Date.now()}`;
        const startTime = Date.now();
        console.log(`[${operationId}] INITIATED | ProjectId: ${projectId}`);

        try {
            const query = { project: projectId };
            
            if (dateRange.startDate || dateRange.endDate) {
                query.createdAt = {};
                if (dateRange.startDate) query.createdAt.$gte = dateRange.startDate;
                if (dateRange.endDate) query.createdAt.$lte = dateRange.endDate;
            }

            const executions = await TestExecution.find(query).lean().exec();
            console.log(`[${operationId}] EXECUTIONS_FOUND | Count: ${executions.length}`);

            const totalTests = executions.reduce((sum, e) => sum + (e.results.totalTests || 0), 0);
            const totalPassed = executions.reduce((sum, e) => sum + (e.results.passed || 0), 0);
            const totalFailed = executions.reduce((sum, e) => sum + (e.results.failed || 0), 0);
            const totalSkipped = executions.reduce((sum, e) => sum + (e.results.skipped || 0), 0);
            const totalDuration = executions.reduce((sum, e) => sum + (e.timing.duration || 0), 0);

            const summaryData = {
                totalTests: totalTests,
                passed: totalPassed,
                failed: totalFailed,
                skipped: totalSkipped,
                successRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0,
                passRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0,
                averageExecutionTime: executions.length > 0 ? Math.round(totalDuration / executions.length) : 0,
                totalExecutions: executions.length
            };

            console.log(`[${operationId}] SUMMARY_DATA_COMPILED | Tests: ${totalTests} | Passed: ${totalPassed} | Failed: ${totalFailed}`);

            const report = new TestReport({
                project: projectId,
                name: `Summary Report - ${new Date().toLocaleDateString()}`,
                type: 'summary',
                format: 'html',
                summary: summaryData,
                trends: await this.generateHistoricalTrends(projectId, dateRange),
                metadata: {
                    generatedBy: userId,
                    generatedAt: new Date(),
                    dateRange: dateRange,
                    version: '1.0'
                },
                createdBy: userId
            });

            await report.save();

            const reportDuration = Date.now() - startTime;
            console.log(`[${operationId}] REPORT_COMPLETED | ReportId: ${report._id} | Duration: ${reportDuration}ms`);

            return report;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[${operationId}] GENERATION_FAILED | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async generateDetailedReport(executionId, projectId, userId) {
        const operationId = `DETAILED_REPORT_${Date.now()}`;
        console.log(`[${operationId}] INITIATED | ExecutionId: ${executionId}`);

        try {
            const execution = await TestExecution.findById(executionId)
                .populate({
                    path: 'testResults',
                    model: 'TestResult'
                })
                .exec();

            console.log(`[${operationId}] EXECUTION_LOADED | TestResults: ${execution.testResults.length}`);

            const detailedTestResults = execution.testResults.map(result => ({
                testCase: result.testCase,
                endpoint: result.endpoint,
                status: result.status,
                duration: result.timing.duration,
                assertions: {
                    total: result.assertions.length,
                    passed: result.assertions.filter(a => a.passed).length,
                    failed: result.assertions.filter(a => !a.passed).length
                },
                response: {
                    statusCode: result.response.statusCode,
                    responseTime: result.response.responseTime
                },
                error: result.error ? { message: result.error.message, type: result.error.type } : null
            }));

            console.log(`[${operationId}] TEST_RESULTS_PROCESSED | Count: ${detailedTestResults.length}`);

            const report = new TestReport({
                project: projectId,
                execution: executionId,
                name: `Detailed Report - ${new Date().toLocaleString()}`,
                type: 'detailed',
                format: 'html',
                summary: {
                    totalTests: execution.results.totalTests,
                    passed: execution.results.passed,
                    failed: execution.results.failed,
                    skipped: execution.results.skipped,
                    successRate: execution.results.successRate,
                    duration: execution.timing.duration
                },
                testResults: detailedTestResults.map(r => r._id),
                performance: await this.aggregatePerformanceMetrics(execution),
                coverage: this.calculateCoverage(execution),
                failures: this.analyzeFailures(execution),
                metadata: {
                    generatedBy: userId,
                    generatedAt: new Date(),
                    version: '1.0'
                },
                createdBy: userId
            });

            await report.save();

            console.log(`[${operationId}] REPORT_GENERATED | ReportId: ${report._id}`);
            return report;
        } catch (error) {
            console.error(`[${operationId}] GENERATION_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async generatePerformanceReport(projectId, userId) {
        const operationId = `PERF_REPORT_${Date.now()}`;
        console.log(`[${operationId}] INITIATED | ProjectId: ${projectId}`);

        try {
            const metrics = await PerformanceMetric.find({ project: projectId })
                .sort({ timestamp: -1 })
                .limit(1000)
                .lean()
                .exec();

            console.log(`[${operationId}] METRICS_FETCHED | Count: ${metrics.length}`);

            const aggregatedMetrics = this.aggregateMetricsData(metrics);

            const report = new TestReport({
                project: projectId,
                name: `Performance Report - ${new Date().toLocaleString()}`,
                type: 'performance',
                format: 'html',
                performance: aggregatedMetrics,
                insights: this.generatePerformanceInsights(aggregatedMetrics),
                recommendations: this.generatePerformanceRecommendations(aggregatedMetrics),
                metadata: {
                    generatedBy: userId,
                    generatedAt: new Date(),
                    metricsCount: metrics.length,
                    version: '1.0'
                },
                createdBy: userId
            });

            await report.save();

            console.log(`[${operationId}] REPORT_GENERATED | ReportId: ${report._id}`);
            return report;
        } catch (error) {
            console.error(`[${operationId}] GENERATION_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async generateCoverageReport(projectId, userId) {
        const operationId = `COVERAGE_REPORT_${Date.now()}`;
        console.log(`[${operationId}] INITIATED | ProjectId: ${projectId}`);

        try {
            const executions = await TestExecution.find({ project: projectId })
                .populate('testResults')
                .lean()
                .exec();

            console.log(`[${operationId}] EXECUTIONS_FETCHED | Count: ${executions.length}`);

            const coverageData = {
                totalEndpoints: 0,
                testedEndpoints: 0,
                untested: [],
                partiallyTested: [],
                fullyCovered: []
            };

            console.log(`[${operationId}] COVERAGE_DATA_COMPILED | TotalEndpoints: ${coverageData.totalEndpoints}`);

            const report = new TestReport({
                project: projectId,
                name: `Coverage Report - ${new Date().toLocaleString()}`,
                type: 'coverage',
                format: 'html',
                coverage: {
                    ...coverageData,
                    coveragePercentage: coverageData.totalEndpoints > 0 
                        ? ((coverageData.testedEndpoints / coverageData.totalEndpoints) * 100).toFixed(2) 
                        : 0
                },
                metadata: {
                    generatedBy: userId,
                    generatedAt: new Date(),
                    version: '1.0'
                },
                createdBy: userId
            });

            await report.save();

            console.log(`[${operationId}] REPORT_GENERATED | ReportId: ${report._id}`);
            return report;
        } catch (error) {
            console.error(`[${operationId}] GENERATION_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async generateComparisonReport(executionId1, executionId2, projectId, userId) {
        const operationId = `COMPARISON_REPORT_${Date.now()}`;
        console.log(`[${operationId}] INITIATED | Execution1: ${executionId1} | Execution2: ${executionId2}`);

        try {
            const [exec1, exec2] = await Promise.all([
                TestExecution.findById(executionId1).populate('testResults').exec(),
                TestExecution.findById(executionId2).populate('testResults').exec()
            ]);

            console.log(`[${operationId}] EXECUTIONS_LOADED | Exec1: ${exec1.results.totalTests} tests | Exec2: ${exec2.results.totalTests} tests`);

            const comparison = {
                execution1: {
                    id: exec1._id,
                    timestamp: exec1.timing.completedAt,
                    totalTests: exec1.results.totalTests,
                    passed: exec1.results.passed,
                    failed: exec1.results.failed,
                    successRate: exec1.results.successRate
                },
                execution2: {
                    id: exec2._id,
                    timestamp: exec2.timing.completedAt,
                    totalTests: exec2.results.totalTests,
                    passed: exec2.results.passed,
                    failed: exec2.results.failed,
                    successRate: exec2.results.successRate
                },
                changes: {
                    newFailures: exec2.results.failed - exec1.results.failed,
                    fixedTests: exec1.results.failed - exec2.results.failed,
                    performanceChange: exec2.timing.duration - exec1.timing.duration
                }
            };

            console.log(`[${operationId}] COMPARISON_DATA_COMPILED | NewFailures: ${comparison.changes.newFailures} | FixedTests: ${comparison.changes.fixedTests}`);

            const report = new TestReport({
                project: projectId,
                name: `Comparison Report - ${new Date().toLocaleString()}`,
                type: 'comparison',
                format: 'html',
                trends: {
                    comparedWith: executionId1,
                    changes: comparison.changes
                },
                metadata: {
                    generatedBy: userId,
                    generatedAt: new Date(),
                    version: '1.0'
                },
                createdBy: userId
            });

            await report.save();

            console.log(`[${operationId}] REPORT_GENERATED | ReportId: ${report._id}`);
            return report;
        } catch (error) {
            console.error(`[${operationId}] GENERATION_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    aggregatePerformanceMetrics(execution) {
        console.log(`[PERF_AGGREGATION] Aggregating performance metrics`);

        const responseTimes = execution.testResults
            .filter(r => r.response && r.response.responseTime)
            .map(r => r.response.responseTime)
            .sort((a, b) => a - b);

        if (responseTimes.length === 0) {
            return {
                averageResponseTime: 0,
                minResponseTime: 0,
                maxResponseTime: 0
            };
        }

        return {
            averageResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
            minResponseTime: responseTimes[0],
            maxResponseTime: responseTimes[responseTimes.length - 1],
            p50ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.5)],
            p90ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.9)],
            p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
            p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
            totalRequests: execution.testResults.length,
            requestsPerSecond: execution.timing.duration > 0 
                ? Math.round((execution.testResults.length / (execution.timing.duration / 1000)) * 100) / 100
                : 0
        };
    }

    calculateCoverage(execution) {
        console.log(`[COVERAGE_CALCULATION] Calculating test coverage`);

        const endpoints = new Set(execution.testResults.map(r => r.endpoint));

        return {
            endpointsCovered: endpoints.size,
            totalEndpoints: endpoints.size,
            coveragePercentage: 100
        };
    }

    analyzeFailures(execution) {
        console.log(`[FAILURE_ANALYSIS] Analyzing test failures`);

        const failures = execution.testResults.filter(r => r.status === 'failed');

        const failuresByType = {};
        const failuresByEndpoint = {};

        failures.forEach(failure => {
            const errorType = failure.error?.type || 'unknown';
            failuresByType[errorType] = (failuresByType[errorType] || 0) + 1;

            const endpoint = failure.endpoint || 'unknown';
            failuresByEndpoint[endpoint] = (failuresByEndpoint[endpoint] || 0) + 1;
        });

        console.log(`[FAILURE_ANALYSIS] Total Failures: ${failures.length} | Types: ${Object.keys(failuresByType).length}`);

        return {
            total: failures.length,
            byType: Object.entries(failuresByType).map(([type, count]) => ({
                type: type,
                count: count,
                percentage: ((count / failures.length) * 100).toFixed(2)
            })),
            byEndpoint: Object.entries(failuresByEndpoint).map(([endpoint, count]) => ({
                endpoint: endpoint,
                count: count
            }))
        };
    }

    detectFlakiness(execution) {
        console.log(`[FLAKINESS_DETECTION] Detecting flaky tests`);

        const flakyTests = execution.testResults.filter(r => r.isFlaky);

        console.log(`[FLAKINESS_DETECTION] Flaky Tests Found: ${flakyTests.length}`);

        return {
            flakyTests: flakyTests.length,
            tests: flakyTests.map(t => ({
                testCase: t.testCase,
                endpoint: t.endpoint,
                passRate: 0
            }))
        };
    }

    async generateTrends(projectId) {
        console.log(`[TRENDS_GENERATION] Generating execution trends`);

        const executions = await TestExecution.find({ project: projectId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()
            .exec();

        return {
            historicalData: executions.map(e => ({
                date: e.createdAt,
                passed: e.results.passed,
                failed: e.results.failed,
                duration: e.timing.duration,
                successRate: e.results.successRate
            }))
        };
    }

    async generateHistoricalTrends(projectId, dateRange) {
        console.log(`[HISTORICAL_TRENDS] Generating historical trends`);

        const query = { project: projectId };
        
        if (dateRange.startDate || dateRange.endDate) {
            query.createdAt = {};
            if (dateRange.startDate) query.createdAt.$gte = dateRange.startDate;
            if (dateRange.endDate) query.createdAt.$lte = dateRange.endDate;
        }

        const executions = await TestExecution.find(query)
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        return {
            historicalData: executions.map(e => ({
                date: e.createdAt,
                passed: e.results.passed,
                failed: e.results.failed,
                duration: e.timing.duration,
                successRate: e.results.successRate
            }))
        };
    }

    compileDatabaseInfo(execution) {
        console.log(`[DATABASE_COMPILATION] Compiling database information`);

        return {
            connections: execution.databaseConnections.map(conn => ({
                name: conn.connection?.host || 'unknown',
                type: conn.connection?.type || 'unknown',
                status: conn.status || 'unknown'
            })),
            totalQueries: 0,
            totalQueryTime: 0
        };
    }

    aggregateMetricsData(metrics) {
        console.log(`[METRICS_AGGREGATION] Aggregating ${metrics.length} metrics`);

        const byMetricType = {};

        metrics.forEach(metric => {
            if (!byMetricType[metric.metricType]) {
                byMetricType[metric.metricType] = [];
            }
            byMetricType[metric.metricType].push(metric.value);
        });

        const aggregated = {};
        Object.entries(byMetricType).forEach(([type, values]) => {
            values.sort((a, b) => a - b);
            aggregated[type] = {
                min: values[0],
                max: values[values.length - 1],
                average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
                median: values[Math.floor(values.length / 2)],
                p95: values[Math.floor(values.length * 0.95)]
            };
        });

        return aggregated;
    }

    generatePerformanceInsights(metrics) {
        console.log(`[INSIGHTS_GENERATION] Generating performance insights`);

        const insights = [];

        Object.entries(metrics).forEach(([type, stats]) => {
            if (stats.average > 5000) {
                insights.push({
                    type: 'high_latency',
                    severity: 'warning',
                    message: `${type} exceeds 5000ms threshold (avg: ${stats.average}ms)`
                });
            }
        });

        return insights;
    }

    generatePerformanceRecommendations(metrics) {
        console.log(`[RECOMMENDATIONS_GENERATION] Generating performance recommendations`);

        const recommendations = [];

        Object.entries(metrics).forEach(([type, stats]) => {
            if (stats.average > 3000) {
                recommendations.push({
                    priority: 'high',
                    category: 'performance',
                    message: `Optimize ${type} endpoint performance`,
                    actionItems: [
                        'Review database queries',
                        'Implement caching',
                        'Optimize API response size'
                    ]
                });
            }
        });

        return recommendations;
    }

    async getReportById(reportId) {
        console.log(`[GET_REPORT] Fetching report | ReportId: ${reportId}`);

        try {
            const report = await TestReport.findById(reportId).exec();
            console.log(`[GET_REPORT] Report found | Name: ${report?.name || 'N/A'}`);
            return report;
        } catch (error) {
            console.error(`[GET_REPORT] Error fetching report | Error: ${error.message}`);
            throw error;
        }
    }

    async deleteReport(reportId, userId) {
        const operationId = `DELETE_REPORT_${Date.now()}`;
        console.log(`[${operationId}] DELETING_REPORT | ReportId: ${reportId}`);

        try {
            const result = await TestReport.findByIdAndDelete(reportId).exec();
            console.log(`[${operationId}] REPORT_DELETED | ReportId: ${reportId}`);
            return result;
        } catch (error) {
            console.error(`[${operationId}] DELETION_FAILED | Error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new ReportGeneratorService();