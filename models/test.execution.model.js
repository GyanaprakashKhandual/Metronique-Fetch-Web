const mongoose = require('mongoose');

const testExecutionSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    testSuite: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestSuite'
    },
    testScript: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestScript'
    },
    executionType: {
        type: String,
        enum: ['manual', 'scheduled', 'triggered', 'ci-cd', 'webhook', 'on-demand'],
        default: 'on-demand'
    },
    trigger: {
        source: {
            type: String,
            enum: ['user', 'schedule', 'webhook', 'ci-cd', 'api', 'system']
        },
        triggeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        triggeredAt: {
            type: Date,
            default: Date.now
        },
        metadata: mongoose.Schema.Types.Mixed
    },
    configuration: {
        environment: String,
        baseUrl: String,
        parallel: {
            type: Boolean,
            default: false
        },
        threadCount: {
            type: Number,
            default: 1
        },
        timeout: Number,
        retryFailedTests: {
            type: Boolean,
            default: false
        },
        retryCount: {
            type: Number,
            default: 0
        },
        stopOnFailure: {
            type: Boolean,
            default: false
        }
    },
    databaseConnections: [{
        connection: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DatabaseConnection'
        },
        status: {
            type: String,
            enum: ['connected', 'failed', 'disconnected']
        },
        connectedAt: Date,
        connectionTime: Number,
        error: String
    }],
    status: {
        type: String,
        enum: ['pending', 'initializing', 'running', 'completed', 'failed', 'cancelled', 'timeout', 'error'],
        default: 'pending'
    },
    progress: {
        current: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        },
        percentage: {
            type: Number,
            default: 0
        }
    },
    timing: {
        queuedAt: {
            type: Date,
            default: Date.now
        },
        startedAt: Date,
        completedAt: Date,
        duration: Number,
        setupTime: Number,
        executionTime: Number,
        teardownTime: Number
    },
    results: {
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
        }
    },
    testResults: [{
        testCase: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestCase'
        },
        testScript: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestScript'
        },
        name: String,
        status: {
            type: String,
            enum: ['passed', 'failed', 'skipped', 'error']
        },
        startedAt: Date,
        completedAt: Date,
        duration: Number,
        request: {
            method: String,
            url: String,
            headers: mongoose.Schema.Types.Mixed,
            body: mongoose.Schema.Types.Mixed
        },
        response: {
            statusCode: Number,
            headers: mongoose.Schema.Types.Mixed,
            body: mongoose.Schema.Types.Mixed,
            responseTime: Number,
            size: Number
        },
        assertions: [{
            type: String,
            description: String,
            expected: mongoose.Schema.Types.Mixed,
            actual: mongoose.Schema.Types.Mixed,
            passed: Boolean,
            message: String
        }],
        databaseValidation: [{
            connection: String,
            query: String,
            expected: mongoose.Schema.Types.Mixed,
            actual: mongoose.Schema.Types.Mixed,
            passed: Boolean,
            executionTime: Number
        }],
        error: {
            message: String,
            stack: String,
            type: String
        },
        logs: [String],
        screenshots: [String]
    }],
    logs: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        level: {
            type: String,
            enum: ['info', 'warn', 'error', 'debug']
        },
        message: String,
        source: String,
        metadata: mongoose.Schema.Types.Mixed
    }],
    errors: [{
        timestamp: Date,
        testCase: String,
        type: String,
        message: String,
        stack: String,
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        }
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
        requestsPerSecond: {
            type: Number,
            default: 0
        },
        memoryUsage: {
            start: Number,
            end: Number,
            peak: Number
        },
        cpuUsage: {
            average: Number,
            peak: Number
        }
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
        uncoveredEndpoints: [String]
    },
    artifacts: {
        screenshots: [{
            testCase: String,
            url: String,
            timestamp: Date
        }],
        videos: [{
            url: String,
            duration: Number
        }],
        logs: {
            url: String,
            size: Number
        },
        reports: [{
            type: String,
            url: String,
            format: String
        }]
    },
    report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestReport'
    },
    comparison: {
        previousExecution: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestExecution'
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
            performanceChange: Number
        }
    },
    notifications: {
        sent: {
            type: Boolean,
            default: false
        },
        sentAt: Date,
        channels: [{
            type: String,
            status: String
        }]
    },
    cicd: {
        provider: String,
        pipelineId: String,
        jobId: String,
        buildNumber: String,
        branch: String,
        commit: {
            sha: String,
            message: String,
            author: String
        },
        pullRequest: String
    },
    metadata: {
        browser: String,
        os: String,
        environment: String,
        version: String,
        tags: [String]
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledAt: Date,
    cancelReason: String,
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

testExecutionSchema.index({ project: 1, status: 1 });
testExecutionSchema.index({ testSuite: 1 });
testExecutionSchema.index({ testScript: 1 });
testExecutionSchema.index({ status: 1 });
testExecutionSchema.index({ 'timing.startedAt': -1 });
testExecutionSchema.index({ 'timing.completedAt': -1 });
testExecutionSchema.index({ 'trigger.triggeredBy': 1 });
testExecutionSchema.index({ createdAt: -1 });

testExecutionSchema.methods.start = async function() {
    this.status = 'running';
    this.timing.startedAt = Date.now();
    await this.save();
};

testExecutionSchema.methods.complete = async function(results) {
    this.status = 'completed';
    this.timing.completedAt = Date.now();
    this.timing.duration = this.timing.completedAt - this.timing.startedAt;
    
    this.results = {
        ...this.results,
        ...results
    };
    
    const totalCompleted = this.results.passed + this.results.failed;
    if (totalCompleted > 0) {
        this.results.successRate = ((this.results.passed / totalCompleted) * 100).toFixed(2);
        this.results.passRate = ((this.results.passed / this.results.totalTests) * 100).toFixed(2);
    }
    
    await this.save();
};

testExecutionSchema.methods.fail = async function(error) {
    this.status = 'failed';
    this.timing.completedAt = Date.now();
    this.timing.duration = this.timing.completedAt - this.timing.startedAt;
    
    this.errors.push({
        timestamp: Date.now(),
        type: 'execution_failure',
        message: error.message || error,
        stack: error.stack,
        severity: 'critical'
    });
    
    await this.save();
};

testExecutionSchema.methods.cancel = async function(userId, reason) {
    this.status = 'cancelled';
    this.cancelledBy = userId;
    this.cancelledAt = Date.now();
    this.cancelReason = reason;
    this.timing.completedAt = Date.now();
    this.timing.duration = this.timing.completedAt - this.timing.startedAt;
    
    await this.save();
};

testExecutionSchema.methods.updateProgress = async function(current, total) {
    this.progress.current = current;
    this.progress.total = total;
    this.progress.percentage = total > 0 ? ((current / total) * 100).toFixed(2) : 0;
    
    await this.save();
};

testExecutionSchema.methods.addTestResult = async function(testResult) {
    this.testResults.push(testResult);
    
    if (testResult.response && testResult.response.responseTime) {
        const totalResponseTime = this.performance.averageResponseTime * this.performance.totalRequests + testResult.response.responseTime;
        this.performance.totalRequests++;
        this.performance.averageResponseTime = totalResponseTime / this.performance.totalRequests;
        
        if (!this.performance.minResponseTime || testResult.response.responseTime < this.performance.minResponseTime) {
            this.performance.minResponseTime = testResult.response.responseTime;
        }
        
        if (!this.performance.maxResponseTime || testResult.response.responseTime > this.performance.maxResponseTime) {
            this.performance.maxResponseTime = testResult.response.responseTime;
        }
    }
    
    await this.save();
};

testExecutionSchema.methods.addLog = async function(level, message, source, metadata) {
    this.logs.push({
        timestamp: Date.now(),
        level,
        message,
        source,
        metadata
    });
    
    if (this.logs.length > 1000) {
        this.logs = this.logs.slice(-1000);
    }
    
    await this.save();
};

module.exports = mongoose.model('TestExecution', testExecutionSchema);