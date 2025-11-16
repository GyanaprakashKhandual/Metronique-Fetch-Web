const PerformanceMetric = require('../../models/performance.metric.model');
const TestExecution = require('../../models/test.execution.model');
const TestResult = require('../../models/test.result.model');
const ApiEndpoint = require('../../models/api.endpoint.model');

class MetricsService {
    constructor() {
        this.metricsBuffer = [];
        this.flushInterval = 30000;
        this.startFlushTimer();
    }

    async recordPerformanceMetric(endpoint, responseTime, statusCode, executionId, projectId) {
        const operationId = `METRIC_RECORD_${Date.now()}`;
        console.log(`[${operationId}] RECORDING_METRIC | Endpoint: ${endpoint} | ResponseTime: ${responseTime}ms | StatusCode: ${statusCode}`);

        try {
            const metric = new PerformanceMetric({
                project: projectId,
                execution: executionId,
                endpoint: endpoint,
                metricType: 'response-time',
                timestamp: new Date(),
                value: responseTime,
                unit: 'ms',
                details: {
                    statusCode: statusCode
                }
            });

            this.metricsBuffer.push(metric);

            if (this.metricsBuffer.length >= 100) {
                await this.flushMetricsBuffer();
            }

            console.log(`[${operationId}] METRIC_RECORDED | BufferSize: ${this.metricsBuffer.length}`);
            return metric;
        } catch (error) {
            console.error(`[${operationId}] RECORDING_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async recordThroughputMetric(value, projectId, executionId) {
        const operationId = `THROUGHPUT_METRIC_${Date.now()}`;
        console.log(`[${operationId}] RECORDING_THROUGHPUT | Value: ${value} RPS`);

        try {
            const metric = new PerformanceMetric({
                project: projectId,
                execution: executionId,
                metricType: 'throughput',
                timestamp: new Date(),
                value: value,
                unit: 'requests/second'
            });

            this.metricsBuffer.push(metric);
            console.log(`[${operationId}] THROUGHPUT_METRIC_RECORDED`);
            return metric;
        } catch (error) {
            console.error(`[${operationId}] RECORDING_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async recordErrorRateMetric(errorCount, totalCount, projectId, executionId) {
        const operationId = `ERROR_RATE_METRIC_${Date.now()}`;
        const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
        console.log(`[${operationId}] RECORDING_ERROR_RATE | Rate: ${errorRate.toFixed(2)}%`);

        try {
            const metric = new PerformanceMetric({
                project: projectId,
                execution: executionId,
                metricType: 'error-rate',
                timestamp: new Date(),
                value: errorRate,
                unit: 'percentage',
                details: {
                    errorCount: errorCount,
                    totalCount: totalCount
                }
            });

            this.metricsBuffer.push(metric);
            console.log(`[${operationId}] ERROR_RATE_METRIC_RECORDED`);
            return metric;
        } catch (error) {
            console.error(`[${operationId}] RECORDING_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async recordResourceMetric(metricType, value, unit, projectId, executionId) {
        const operationId = `RESOURCE_METRIC_${Date.now()}`;
        console.log(`[${operationId}] RECORDING_RESOURCE_METRIC | Type: ${metricType} | Value: ${value}${unit}`);

        try {
            const metric = new PerformanceMetric({
                project: projectId,
                execution: executionId,
                metricType: metricType,
                timestamp: new Date(),
                value: value,
                unit: unit
            });

            this.metricsBuffer.push(metric);
            console.log(`[${operationId}] RESOURCE_METRIC_RECORDED`);
            return metric;
        } catch (error) {
            console.error(`[${operationId}] RECORDING_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async flushMetricsBuffer() {
        const operationId = `METRICS_FLUSH_${Date.now()}`;
        console.log(`[${operationId}] FLUSHING_METRICS | Count: ${this.metricsBuffer.length}`);

        try {
            if (this.metricsBuffer.length === 0) {
                console.log(`[${operationId}] BUFFER_EMPTY | No metrics to flush`);
                return;
            }

            const batch = this.metricsBuffer.splice(0, this.metricsBuffer.length);
            await PerformanceMetric.insertMany(batch);

            console.log(`[${operationId}] METRICS_FLUSHED | Count: ${batch.length}`);
        } catch (error) {
            console.error(`[${operationId}] FLUSH_FAILED | Error: ${error.message}`);
        }
    }

    startFlushTimer() {
        setInterval(async () => {
            if (this.metricsBuffer.length > 0) {
                await this.flushMetricsBuffer();
            }
        }, this.flushInterval);

        console.log(`[METRICS_TIMER] Flush timer started | Interval: ${this.flushInterval}ms`);
    }

    async getEndpointMetrics(endpointId, projectId, timeRange = {}) {
        const operationId = `ENDPOINT_METRICS_${Date.now()}`;
        console.log(`[${operationId}] FETCHING_ENDPOINT_METRICS | EndpointId: ${endpointId}`);

        try {
            const query = {
                project: projectId,
                endpoint: endpointId,
                metricType: 'response-time'
            };

            if (timeRange.startTime || timeRange.endTime) {
                query.timestamp = {};
                if (timeRange.startTime) query.timestamp.$gte = timeRange.startTime;
                if (timeRange.endTime) query.timestamp.$lte = timeRange.endTime;
            }

            const metrics = await PerformanceMetric.find(query)
                .sort({ timestamp: -1 })
                .limit(1000)
                .lean()
                .exec();

            console.log(`[${operationId}] METRICS_FETCHED | Count: ${metrics.length}`);

            const stats = this.calculateMetricsStats(metrics);
            console.log(`[${operationId}] STATS_CALCULATED | Avg: ${stats.average}ms | P95: ${stats.p95}ms`);

            return {
                endpointId: endpointId,
                metrics: metrics,
                statistics: stats,
                trendData: this.calculateMetricsTrend(metrics)
            };
        } catch (error) {
            console.error(`[${operationId}] FETCH_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async getExecutionMetrics(executionId, projectId) {
        const operationId = `EXECUTION_METRICS_${Date.now()}`;
        console.log(`[${operationId}] FETCHING_EXECUTION_METRICS | ExecutionId: ${executionId}`);

        try {
            const [responseTimeMetrics, throughputMetrics, errorRateMetrics] = await Promise.all([
                PerformanceMetric.find({
                    project: projectId,
                    execution: executionId,
                    metricType: 'response-time'
                }).lean().exec(),
                PerformanceMetric.find({
                    project: projectId,
                    execution: executionId,
                    metricType: 'throughput'
                }).lean().exec(),
                PerformanceMetric.find({
                    project: projectId,
                    execution: executionId,
                    metricType: 'error-rate'
                }).lean().exec()
            ]);

            console.log(`[${operationId}] METRICS_FETCHED | ResponseTime: ${responseTimeMetrics.length} | Throughput: ${throughputMetrics.length} | ErrorRate: ${errorRateMetrics.length}`);

            return {
                executionId: executionId,
                responseTime: {
                    metrics: responseTimeMetrics,
                    statistics: this.calculateMetricsStats(responseTimeMetrics)
                },
                throughput: {
                    metrics: throughputMetrics,
                    average: throughputMetrics.length > 0 
                        ? (throughputMetrics.reduce((sum, m) => sum + m.value, 0) / throughputMetrics.length).toFixed(2)
                        : 0
                },
                errorRate: {
                    metrics: errorRateMetrics,
                    average: errorRateMetrics.length > 0
                        ? (errorRateMetrics.reduce((sum, m) => sum + m.value, 0) / errorRateMetrics.length).toFixed(2)
                        : 0
                }
            };
        } catch (error) {
            console.error(`[${operationId}] FETCH_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async getProjectMetrics(projectId, timeRange = {}) {
        const operationId = `PROJECT_METRICS_${Date.now()}`;
        console.log(`[${operationId}] FETCHING_PROJECT_METRICS | ProjectId: ${projectId}`);

        try {
            const query = { project: projectId };

            if (timeRange.startTime || timeRange.endTime) {
                query.timestamp = {};
                if (timeRange.startTime) query.timestamp.$gte = timeRange.startTime;
                if (timeRange.endTime) query.timestamp.$lte = timeRange.endTime;
            }

            const allMetrics = await PerformanceMetric.find(query).lean().exec();
            console.log(`[${operationId}] METRICS_FETCHED | Count: ${allMetrics.length}`);

            const groupedByType = {};
            allMetrics.forEach(metric => {
                if (!groupedByType[metric.metricType]) {
                    groupedByType[metric.metricType] = [];
                }
                groupedByType[metric.metricType].push(metric);
            });

            const projectMetrics = {};
            Object.entries(groupedByType).forEach(([type, metrics]) => {
                projectMetrics[type] = {
                    count: metrics.length,
                    statistics: this.calculateMetricsStats(metrics)
                };
            });

            console.log(`[${operationId}] PROJECT_METRICS_COMPILED | Types: ${Object.keys(projectMetrics).length}`);

            return {
                projectId: projectId,
                metrics: projectMetrics,
                timeRange: timeRange
            };
        } catch (error) {
            console.error(`[${operationId}] FETCH_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    calculateMetricsStats(metrics) {
        console.log(`[METRICS_STATS] Calculating statistics for ${metrics.length} metrics`);

        if (metrics.length === 0) {
            return {
                count: 0,
                average: 0,
                min: 0,
                max: 0,
                median: 0,
                stdDev: 0
            };
        }

        const values = metrics.map(m => m.value).sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const average = sum / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        return {
            count: metrics.length,
            average: Math.round(average * 100) / 100,
            min: values[0],
            max: values[values.length - 1],
            median: values[Math.floor(values.length / 2)],
            p25: values[Math.floor(values.length * 0.25)],
            p50: values[Math.floor(values.length * 0.5)],
            p75: values[Math.floor(values.length * 0.75)],
            p90: values[Math.floor(values.length * 0.9)],
            p95: values[Math.floor(values.length * 0.95)],
            p99: values[Math.floor(values.length * 0.99)],
            stdDev: Math.round(stdDev * 100) / 100
        };
    }

    calculateMetricsTrend(metrics) {
        console.log(`[METRICS_TREND] Calculating trend from ${metrics.length} metrics`);

        const sortedMetrics = metrics.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return sortedMetrics.map(metric => ({
            timestamp: metric.timestamp,
            value: metric.value
        }));
    }

    async compareMetrics(endpointId, projectId, period1, period2) {
        const operationId = `METRICS_COMPARE_${Date.now()}`;
        console.log(`[${operationId}] COMPARING_METRICS | Endpoint: ${endpointId}`);

        try {
            const query1 = {
                project: projectId,
                endpoint: endpointId,
                metricType: 'response-time',
                timestamp: {
                    $gte: period1.startTime,
                    $lte: period1.endTime
                }
            };

            const query2 = {
                project: projectId,
                endpoint: endpointId,
                metricType: 'response-time',
                timestamp: {
                    $gte: period2.startTime,
                    $lte: period2.endTime
                }
            };

            const [metrics1, metrics2] = await Promise.all([
                PerformanceMetric.find(query1).lean().exec(),
                PerformanceMetric.find(query2).lean().exec()
            ]);

            console.log(`[${operationId}] METRICS_FETCHED | Period1: ${metrics1.length} | Period2: ${metrics2.length}`);

            const stats1 = this.calculateMetricsStats(metrics1);
            const stats2 = this.calculateMetricsStats(metrics2);

            const comparison = {
                period1: {
                    startTime: period1.startTime,
                    endTime: period1.endTime,
                    statistics: stats1
                },
                period2: {
                    startTime: period2.startTime,
                    endTime: period2.endTime,
                    statistics: stats2
                },
                change: {
                    averageDelta: stats2.average - stats1.average,
                    averageDeltaPercent: stats1.average > 0 
                        ? (((stats2.average - stats1.average) / stats1.average) * 100).toFixed(2)
                        : 0,
                    improved: stats2.average < stats1.average,
                    degraded: stats2.average > stats1.average * 1.1
                }
            };

            console.log(`[${operationId}] COMPARISON_COMPLETE | Change: ${comparison.change.averageDeltaPercent}%`);

            return comparison;
        } catch (error) {
            console.error(`[${operationId}] COMPARISON_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async identifyAnomalies(projectId, threshold = 1.5) {
        const operationId = `ANOMALY_DETECTION_${Date.now()}`;
        console.log(`[${operationId}] DETECTING_ANOMALIES | ProjectId: ${projectId} | Threshold: ${threshold}`);

        try {
            const metrics = await PerformanceMetric.find({
                project: projectId,
                metricType: 'response-time'
            })
            .sort({ timestamp: -1 })
            .limit(1000)
            .lean()
            .exec();

            console.log(`[${operationId}] METRICS_FETCHED | Count: ${metrics.length}`);

            const stats = this.calculateMetricsStats(metrics);
            const anomalies = [];

            metrics.forEach(metric => {
                const zScore = (metric.value - stats.average) / stats.stdDev;
                if (Math.abs(zScore) > threshold) {
                    anomalies.push({
                        timestamp: metric.timestamp,
                        value: metric.value,
                        zScore: zScore.toFixed(2),
                        type: metric.value > stats.average ? 'high' : 'low'
                    });
                }
            });

            console.log(`[${operationId}] ANOMALIES_DETECTED | Count: ${anomalies.length}`);

            return {
                projectId: projectId,
                anomalies: anomalies,
                baselineStats: stats
            };
        } catch (error) {
            console.error(`[${operationId}] DETECTION_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async cleanupOldMetrics(projectId, retentionDays = 90) {
        const operationId = `METRICS_CLEANUP_${Date.now()}`;
        console.log(`[${operationId}] CLEANING_UP_OLD_METRICS | ProjectId: ${projectId} | RetentionDays: ${retentionDays}`);

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const result = await PerformanceMetric.deleteMany({
                project: projectId,
                timestamp: { $lt: cutoffDate }
            }).exec();

            console.log(`[${operationId}] CLEANUP_COMPLETED | DeletedMetrics: ${result.deletedCount}`);

            return {
                deletedCount: result.deletedCount,
                cutoffDate: cutoffDate
            };
        } catch (error) {
            console.error(`[${operationId}] CLEANUP_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async exportMetrics(projectId, format = 'json', timeRange = {}) {
        const operationId = `METRICS_EXPORT_${Date.now()}`;
        console.log(`[${operationId}] EXPORTING_METRICS | Format: ${format}`);

        try {
            const query = { project: projectId };

            if (timeRange.startTime || timeRange.endTime) {
                query.timestamp = {};
                if (timeRange.startTime) query.timestamp.$gte = timeRange.startTime;
                if (timeRange.endTime) query.timestamp.$lte = timeRange.endTime;
            }

            const metrics = await PerformanceMetric.find(query).lean().exec();

            console.log(`[${operationId}] METRICS_FETCHED | Count: ${metrics.length}`);

            let exportData = metrics;

            if (format === 'csv') {
                exportData = this.convertToCsv(metrics);
            }

            return {
                format: format,
                data: exportData,
                count: metrics.length,
                exportedAt: new Date()
            };
        } catch (error) {
            console.error(`[${operationId}] EXPORT_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    convertToCsv(metrics) {
        console.log(`[CSV_CONVERSION] Converting ${metrics.length} metrics to CSV`);

        const headers = ['timestamp', 'metricType', 'value', 'unit', 'statusCode'];
        const rows = metrics.map(m => [
            m.timestamp,
            m.metricType,
            m.value,
            m.unit || '',
            m.details?.statusCode || ''
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        console.log(`[CSV_CONVERSION] CSV generated | Rows: ${rows.length}`);
        return csv;
    }
}

module.exports = new MetricsService();