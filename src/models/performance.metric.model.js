const mongoose = require('mongoose');

const performanceMetricSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    loadTest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoadTest'
    },
    execution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestExecution'
    },
    endpoint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApiEndpoint'
    },
    metricType: {
        type: String,
        enum: ['response-time', 'throughput', 'error-rate', 'cpu', 'memory', 'network', 'database', 'custom'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true
    },
    tags: mongoose.Schema.Types.Mixed,
    details: {
        method: String,
        path: String,
        statusCode: Number,
        virtualUsers: Number,
        iteration: Number,
        thread: Number
    },
    aggregated: {
        min: Number,
        max: Number,
        average: Number,
        median: Number,
        p50: Number,
        p75: Number,
        p90: Number,
        p95: Number,
        p99: Number,
        stdDev: Number,
        count: Number
    },
    threshold: {
        warning: Number,
        critical: Number,
        breached: {
            type: Boolean,
            default: false
        },
        breachedAt: Date
    },
    comparison: {
        baseline: Number,
        delta: Number,
        deltaPercentage: Number,
        trend: {
            type: String,
            enum: ['improving', 'degrading', 'stable']
        }
    },
    context: {
        loadTestName: String,
        executionId: String,
        environment: String,
        virtualUsers: Number,
        duration: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false
});

performanceMetricSchema.index({ project: 1, timestamp: -1 });
performanceMetricSchema.index({ loadTest: 1, timestamp: -1 });
performanceMetricSchema.index({ execution: 1 });
performanceMetricSchema.index({ endpoint: 1, metricType: 1, timestamp: -1 });
performanceMetricSchema.index({ metricType: 1, timestamp: -1 });
performanceMetricSchema.index({ 'threshold.breached': 1 });
performanceMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

performanceMetricSchema.methods.checkThreshold = function () {
    if (this.threshold.warning && this.value >= this.threshold.warning) {
        this.threshold.breached = true;
        this.threshold.breachedAt = Date.now();
    }

    if (this.threshold.critical && this.value >= this.threshold.critical) {
        this.threshold.breached = true;
        this.threshold.breachedAt = Date.now();
    }
};

performanceMetricSchema.methods.compareWithBaseline = function (baseline) {
    if (!baseline) return;

    this.comparison.baseline = baseline;
    this.comparison.delta = this.value - baseline;
    this.comparison.deltaPercentage = ((this.value - baseline) / baseline * 100).toFixed(2);

    if (this.comparison.deltaPercentage < -5) {
        this.comparison.trend = 'improving';
    } else if (this.comparison.deltaPercentage > 5) {
        this.comparison.trend = 'degrading';
    } else {
        this.comparison.trend = 'stable';
    }
};

performanceMetricSchema.statics.aggregateMetrics = async function (filter, interval = '1h') {
    const intervalMap = {
        '1m': 60000,
        '5m': 300000,
        '15m': 900000,
        '30m': 1800000,
        '1h': 3600000,
        '6h': 21600000,
        '1d': 86400000
    };

    const intervalMs = intervalMap[interval] || 3600000;

    return await this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: {
                    timestamp: {
                        $toDate: {
                            $subtract: [
                                { $toLong: '$timestamp' },
                                { $mod: [{ $toLong: '$timestamp' }, intervalMs] }
                            ]
                        }
                    },
                    metricType: '$metricType',
                    endpoint: '$endpoint'
                },
                min: { $min: '$value' },
                max: { $max: '$value' },
                avg: { $avg: '$value' },
                count: { $sum: 1 },
                values: { $push: '$value' }
            }
        },
        {
            $addFields: {
                p50: { $arrayElemAt: [{ $slice: [{ $sortArray: { input: '$values', sortBy: 1 } }, { $floor: { $multiply: [{ $size: '$values' }, 0.5] } }, 1] }, 0] },
                p90: { $arrayElemAt: [{ $slice: [{ $sortArray: { input: '$values', sortBy: 1 } }, { $floor: { $multiply: [{ $size: '$values' }, 0.9] } }, 1] }, 0] },
                p95: { $arrayElemAt: [{ $slice: [{ $sortArray: { input: '$values', sortBy: 1 } }, { $floor: { $multiply: [{ $size: '$values' }, 0.95] } }, 1] }, 0] },
                p99: { $arrayElemAt: [{ $slice: [{ $sortArray: { input: '$values', sortBy: 1 } }, { $floor: { $multiply: [{ $size: '$values' }, 0.99] } }, 1] }, 0] }
            }
        },
        { $project: { values: 0 } },
        { $sort: { '_id.timestamp': -1 } }
    ]);
};

module.exports = mongoose.model('PerformanceMetric', performanceMetricSchema);