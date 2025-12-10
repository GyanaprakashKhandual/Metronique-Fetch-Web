const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
    execution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestExecution',
        required: true
    },
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
        ref: 'TestScript',
        required: true
    },
    testCase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestCase',
        required: true
    },
    endpoint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApiEndpoint',
        required: true
    },
    status: {
        type: String,
        enum: ['passed', 'failed', 'skipped', 'error', 'blocked'],
        required: true
    },
    timing: {
        startedAt: {
            type: Date,
            required: true
        },
        completedAt: {
            type: Date,
            required: true
        },
        duration: {
            type: Number,
            required: true
        },
        setupTime: Number,
        executionTime: Number,
        teardownTime: Number
    },
    request: {
        method: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        },
        path: String,
        headers: mongoose.Schema.Types.Mixed,
        queryParams: mongoose.Schema.Types.Mixed,
        pathParams: mongoose.Schema.Types.Mixed,
        body: mongoose.Schema.Types.Mixed,
        contentType: String,
        size: Number
    },
    response: {
        statusCode: {
            type: Number,
            required: true
        },
        statusText: String,
        headers: mongoose.Schema.Types.Mixed,
        body: mongoose.Schema.Types.Mixed,
        contentType: String,
        size: Number,
        responseTime: {
            type: Number,
            required: true
        },
        downloadTime: Number
    },
    assertions: [{
        type: {
            type: String,
            enum: ['status-code', 'response-time', 'body-contains', 'body-not-contains', 'body-equals', 'header-exists', 'header-value', 'schema-valid', 'json-path', 'xpath', 'regex', 'custom']
        },
        name: String,
        description: String,
        field: String,
        path: String,
        operator: String,
        expected: mongoose.Schema.Types.Mixed,
        actual: mongoose.Schema.Types.Mixed,
        passed: {
            type: Boolean,
            required: true
        },
        message: String,
        severity: {
            type: String,
            enum: ['blocker', 'critical', 'major', 'minor']
        }
    }],
    databaseValidations: [{
        connection: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DatabaseConnection'
        },
        connectionName: String,
        type: {
            type: String,
            enum: ['count', 'exists', 'not-exists', 'value', 'query', 'aggregate']
        },
        operation: String,
        collection: String,
        table: String,
        query: String,
        expected: mongoose.Schema.Types.Mixed,
        actual: mongoose.Schema.Types.Mixed,
        passed: {
            type: Boolean,
            required: true
        },
        executionTime: Number,
        rowsAffected: Number,
        error: String
    }],
    preconditionsResult: {
        executed: {
            type: Boolean,
            default: false
        },
        passed: {
            type: Boolean,
            default: true
        },
        details: [{
            type: String,
            status: String,
            message: String
        }]
    },
    postconditionsResult: {
        executed: {
            type: Boolean,
            default: false
        },
        passed: {
            type: Boolean,
            default: true
        },
        details: [{
            type: String,
            status: String,
            message: String
        }]
    },
    error: {
        type: {
            type: String,
            enum: ['assertion', 'network', 'timeout', 'database', 'authentication', 'authorization', 'validation', 'compilation', 'runtime', 'unknown']
        },
        message: String,
        stack: String,
        details: String,
        code: String,
        line: Number
    },
    logs: [{
        timestamp: Date,
        level: {
            type: String,
            enum: ['trace', 'debug', 'info', 'warn', 'error']
        },
        message: String,
        source: String
    }],
    screenshots: [{
        name: String,
        url: String,
        timestamp: Date,
        step: String
    }],
    artifacts: [{
        type: {
            type: String,
            enum: ['screenshot', 'video', 'log', 'har', 'report']
        },
        name: String,
        url: String,
        size: Number,
        contentType: String
    }],
    environment: {
        name: String,
        baseUrl: String,
        browser: String,
        os: String,
        version: String
    },
    retries: {
        count: {
            type: Number,
            default: 0
        },
        maxRetries: {
            type: Number,
            default: 0
        },
        attempts: [{
            attemptNumber: Number,
            status: String,
            duration: Number,
            error: String,
            timestamp: Date
        }]
    },
    tags: [String],
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
    },
    severity: {
        type: String,
        enum: ['blocker', 'critical', 'major', 'minor', 'trivial']
    },
    comparison: {
        previousResult: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestResult'
        },
        statusChanged: {
            type: Boolean,
            default: false
        },
        previousStatus: String,
        performanceDelta: Number,
        isRegression: {
            type: Boolean,
            default: false
        }
    },
    metrics: {
        assertionsPassed: {
            type: Number,
            default: 0
        },
        assertionsFailed: {
            type: Number,
            default: 0
        },
        assertionsTotal: {
            type: Number,
            default: 0
        },
        databaseQueriesExecuted: {
            type: Number,
            default: 0
        },
        totalDatabaseTime: {
            type: Number,
            default: 0
        }
    },
    isFlaky: {
        type: Boolean,
        default: false
    },
    flakyReason: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false
});

testResultSchema.index({ execution: 1 });
testResultSchema.index({ project: 1, status: 1 });
testResultSchema.index({ testScript: 1 });
testResultSchema.index({ testCase: 1 });
testResultSchema.index({ endpoint: 1 });
testResultSchema.index({ status: 1 });
testResultSchema.index({ 'timing.startedAt': -1 });
testResultSchema.index({ createdAt: -1 });

testResultSchema.pre('save', function(next) {
    this.metrics.assertionsTotal = this.assertions.length;
    this.metrics.assertionsPassed = this.assertions.filter(a => a.passed).length;
    this.metrics.assertionsFailed = this.assertions.filter(a => !a.passed).length;
    
    this.metrics.databaseQueriesExecuted = this.databaseValidations.length;
    this.metrics.totalDatabaseTime = this.databaseValidations.reduce((sum, v) => sum + (v.executionTime || 0), 0);
    
    next();
});

testResultSchema.methods.compareWithPrevious = async function(previousResult) {
    if (!previousResult) return;
    
    this.comparison.previousResult = previousResult._id;
    this.comparison.previousStatus = previousResult.status;
    this.comparison.statusChanged = this.status !== previousResult.status;
    
    if (this.response.responseTime && previousResult.response.responseTime) {
        this.comparison.performanceDelta = this.response.responseTime - previousResult.response.responseTime;
        
        const performanceThreshold = 500;
        if (this.comparison.performanceDelta > performanceThreshold) {
            this.comparison.isRegression = true;
        }
    }
    
    await this.save();
};

testResultSchema.methods.isSuccess = function() {
    return this.status === 'passed';
};

testResultSchema.methods.isFailed = function() {
    return this.status === 'failed' || this.status === 'error';
};

testResultSchema.methods.getFailureReason = function() {
    if (this.status === 'passed') return null;
    
    if (this.error && this.error.message) {
        return this.error.message;
    }
    
    const failedAssertions = this.assertions.filter(a => !a.passed);
    if (failedAssertions.length > 0) {
        return failedAssertions.map(a => a.message).join('; ');
    }
    
    const failedValidations = this.databaseValidations.filter(v => !v.passed);
    if (failedValidations.length > 0) {
        return failedValidations.map(v => v.error).join('; ');
    }
    
    return 'Unknown failure reason';
};

module.exports = mongoose.model('TestResult', testResultSchema);