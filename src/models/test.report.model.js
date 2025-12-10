const mongoose = require('mongoose');

const testReportSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    execution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestExecution',
        required: true
    },
    testSuite: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestSuite'
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['execution', 'summary', 'detailed', 'performance', 'coverage', 'trend', 'comparison', 'custom'],
        default: 'execution'
    },
    format: {
        type: String,
        enum: ['html', 'pdf', 'json', 'xml', 'csv', 'excel'],
        default: 'html'
    },
    summary: {
        totalTests: {
            type: Number,
            default: 0
        },
        passed: {
            type: Number,
            default: 0
        },
        failed: {
            type: Number,
            default: 0
        },
        skipped: {
            type: Number,
            default: 0
        },
        error: {
            type: Number,
            default: 0
        },
        successRate: {
            type: Number,
            default: 0
        },
        passRate: {
            type: Number,
            default: 0
        },
        duration: {
            type: Number,
            default: 0
        },
        startTime: Date,
        endTime: Date
    },
    testResults: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestResult'
    }],
    performance: {
        averageResponseTime: {
            type: Number,
            default: 0
        },
        minResponseTime: Number,
        maxResponseTime: Number,
        totalRequests: {
            type: Number,
            default: 0
        },
        requestsPerSecond: Number,
        slowestEndpoints: [{
            endpoint: String,
            method: String,
            averageTime: Number,
            maxTime: Number,
            calls: Number
        }],
        fastestEndpoints: [{
            endpoint: String,
            method: String,
            averageTime: Number,
            minTime: Number,
            calls: Number
        }]
    },
    coverage: {
        endpointsCovered: {
            type: Number,
            default: 0
        },
        totalEndpoints: {
            type: Number,
            default: 0
        },
        coveragePercentage: {
            type: Number,
            default: 0
        },
        coveredEndpoints: [{
            endpoint: String,
            method: String,
            testCount: Number,
            passed: Number,
            failed: Number
        }],
        uncoveredEndpoints: [{
            endpoint: String,
            method: String,
            reason: String
        }]
    },
    failures: {
        total: {
            type: Number,
            default: 0
        },
        byType: [{
            type: String,
            count: Number,
            percentage: Number
        }],
        byEndpoint: [{
            endpoint: String,
            method: String,
            count: Number,
            reasons: [String]
        }],
        topFailures: [{
            testCase: String,
            endpoint: String,
            error: String,
            count: Number,
            firstOccurrence: Date,
            lastOccurrence: Date
        }]
    },
    flakiness: {
        flakyTests: {
            type: Number,
            default: 0
        },
        tests: [{
            testCase: String,
            endpoint: String,
            passRate: Number,
            totalRuns: Number,
            passed: Number,
            failed: Number
        }]
    },
    trends: {
        comparedWith: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestReport'
        },
        changes: {
            newFailures: {
                type: Number,
                default: 0
            },
            fixedTests: {
                type: Number,
                default: 0
            },
            performanceImprovement: Number,
            performanceDegradation: Number
        },
        historicalData: [{
            date: Date,
            passed: Number,
            failed: Number,
            duration: Number,
            successRate: Number
        }]
    },
    database: {
        connections: [{
            name: String,
            type: String,
            status: String,
            queriesExecuted: Number,
            averageQueryTime: Number,
            slowestQueries: [{
                query: String,
                time: Number,
                collection: String,
                table: String
            }]
        }],
        totalQueries: {
            type: Number,
            default: 0
        },
        totalQueryTime: {
            type: Number,
            default: 0
        }
    },
    environment: {
        name: String,
        baseUrl: String,
        browser: String,
        os: String,
        parallel: Boolean,
        threadCount: Number
    },
    artifacts: {
        screenshots: {
            type: Number,
            default: 0
        },
        videos: {
            type: Number,
            default: 0
        },
        logs: {
            url: String,
            size: Number
        },
        raw: {
            url: String,
            size: Number
        }
    },
    files: [{
        name: String,
        url: String,
        format: String,
        size: Number,
        generatedAt: Date
    }],
    charts: {
        passFailPie: String,
        performanceLine: String,
        endpointBar: String,
        trendLine: String
    },
    insights: [{
        type: {
            type: String,
            enum: ['performance', 'flakiness', 'coverage', 'error-pattern', 'recommendation']
        },
        severity: {
            type: String,
            enum: ['info', 'warning', 'critical']
        },
        title: String,
        description: String,
        recommendation: String,
        affectedTests: [String]
    }],
    recommendations: [{
        category: String,
        priority: {
            type: String,
            enum: ['low', 'medium', 'high']
        },
        title: String,
        description: String,
        actionItems: [String]
    }],
    metadata: {
        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        generatedAt: {
            type: Date,
            default: Date.now
        },
        version: {
            type: String,
            default: '1.0'
        },
        template: String
    },
    sharing: {
        isPublic: {
            type: Boolean,
            default: false
        },
        shareToken: String,
        shareUrl: String,
        expiresAt: Date,
        viewCount: {
            type: Number,
            default: 0
        }
    },
    exports: [{
        format: String,
        url: String,
        size: Number,
        exportedAt: Date,
        exportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    status: {
        type: String,
        enum: ['generating', 'completed', 'failed', 'archived'],
        default: 'generating'
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    archivedAt: Date,
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

testReportSchema.index({ project: 1 });
testReportSchema.index({ execution: 1 });
testReportSchema.index({ testSuite: 1 });
testReportSchema.index({ status: 1 });
testReportSchema.index({ type: 1 });
testReportSchema.index({ isArchived: 1, isDeleted: 1 });
testReportSchema.index({ 'metadata.generatedAt': -1 });
testReportSchema.index({ 'sharing.shareToken': 1 });

testReportSchema.methods.generateShareToken = function() {
    const crypto = require('crypto');
    this.sharing.shareToken = crypto.randomBytes(32).toString('hex');
    this.sharing.shareUrl = `${process.env.APP_URL}/reports/shared/${this.sharing.shareToken}`;
    return this.save();
};

testReportSchema.methods.incrementViewCount = function() {
    this.sharing.viewCount++;
    return this.save();
};

testReportSchema.methods.archive = async function(userId) {
    this.isArchived = true;
    this.archivedAt = Date.now();
    this.status = 'archived';
    await this.save();
};

testReportSchema.methods.addExport = async function(format, url, size, userId) {
    this.exports.push({
        format,
        url,
        size,
        exportedAt: Date.now(),
        exportedBy: userId
    });
    await this.save();
};

testReportSchema.methods.generateInsights = async function() {
    const insights = [];
    
    if (this.performance.averageResponseTime > 3000) {
        insights.push({
            type: 'performance',
            severity: 'warning',
            title: 'High Average Response Time',
            description: `Average response time is ${this.performance.averageResponseTime}ms, which exceeds recommended threshold.`,
            recommendation: 'Review slow endpoints and optimize database queries.',
            affectedTests: this.performance.slowestEndpoints.map(e => e.endpoint)
        });
    }
    
    if (this.flakiness.flakyTests > 0) {
        insights.push({
            type: 'flakiness',
            severity: 'critical',
            title: 'Flaky Tests Detected',
            description: `${this.flakiness.flakyTests} tests are showing inconsistent results.`,
            recommendation: 'Investigate and stabilize flaky tests to improve reliability.',
            affectedTests: this.flakiness.tests.map(t => t.testCase)
        });
    }
    
    if (this.coverage.coveragePercentage < 70) {
        insights.push({
            type: 'coverage',
            severity: 'info',
            title: 'Low Endpoint Coverage',
            description: `Only ${this.coverage.coveragePercentage}% of endpoints are covered by tests.`,
            recommendation: 'Add more test cases to improve coverage.',
            affectedTests: this.coverage.uncoveredEndpoints.map(e => e.endpoint)
        });
    }
    
    this.insights = insights;
    await this.save();
};

module.exports = mongoose.model('TestReport', testReportSchema);