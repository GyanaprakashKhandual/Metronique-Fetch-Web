const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    testScript: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestScript',
        required: true
    },
    testSuite: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestSuite'
    },
    endpoint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApiEndpoint',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    scenario: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['positive', 'negative', 'boundary', 'security', 'performance'],
        default: 'positive'
    },
    request: {
        method: {
            type: String,
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
            required: true
        },
        url: String,
        path: String,
        headers: mongoose.Schema.Types.Mixed,
        queryParams: mongoose.Schema.Types.Mixed,
        pathParams: mongoose.Schema.Types.Mixed,
        body: mongoose.Schema.Types.Mixed,
        contentType: String,
        authentication: {
            type: String,
            token: String,
            credentials: mongoose.Schema.Types.Mixed
        }
    },
    expectedResponse: {
        statusCode: {
            type: Number,
            required: true
        },
        statusCodes: [Number],
        headers: mongoose.Schema.Types.Mixed,
        body: mongoose.Schema.Types.Mixed,
        schema: mongoose.Schema.Types.Mixed,
        responseTime: {
            max: Number,
            min: Number
        },
        size: {
            max: Number,
            min: Number
        }
    },
    assertions: [{
        type: {
            type: String,
            enum: ['status-code', 'response-time', 'body-contains', 'body-not-contains', 'body-equals', 'header-exists', 'header-value', 'schema-valid', 'json-path', 'custom']
        },
        field: String,
        path: String,
        operator: {
            type: String,
            enum: ['equals', 'not-equals', 'contains', 'not-contains', 'greater-than', 'less-than', 'matches', 'exists', 'not-exists']
        },
        expected: mongoose.Schema.Types.Mixed,
        actual: mongoose.Schema.Types.Mixed,
        passed: Boolean,
        message: String
    }],
    databaseValidation: [{
        connection: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DatabaseConnection'
        },
        type: {
            type: String,
            enum: ['count', 'exists', 'not-exists', 'value', 'query']
        },
        collection: String,
        table: String,
        query: String,
        expected: mongoose.Schema.Types.Mixed,
        actual: mongoose.Schema.Types.Mixed,
        passed: Boolean
    }],
    preconditions: [{
        type: {
            type: String,
            enum: ['database', 'api', 'state']
        },
        description: String,
        action: mongoose.Schema.Types.Mixed,
        required: {
            type: Boolean,
            default: true
        }
    }],
    postconditions: [{
        type: {
            type: String,
            enum: ['database', 'api', 'state']
        },
        description: String,
        action: mongoose.Schema.Types.Mixed
    }],
    testData: {
        input: mongoose.Schema.Types.Mixed,
        expected: mongoose.Schema.Types.Mixed,
        source: {
            type: String,
            enum: ['static', 'dynamic', 'faker', 'database']
        },
        dataSet: String
    },
    dependencies: [{
        testCase: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestCase'
        },
        type: {
            type: String,
            enum: ['depends-on', 'blocks', 'related']
        }
    }],
    execution: {
        totalRuns: {
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
        successRate: {
            type: Number,
            default: 0
        },
        averageDuration: {
            type: Number,
            default: 0
        },
        averageResponseTime: {
            type: Number,
            default: 0
        },
        lastRun: Date,
        lastStatus: {
            type: String,
            enum: ['passed', 'failed', 'skipped', 'error']
        },
        lastError: String,
        lastResponseTime: Number
    },
    flakiness: {
        isFlaky: {
            type: Boolean,
            default: false
        },
        flakyCount: {
            type: Number,
            default: 0
        },
        consecutiveFailures: {
            type: Number,
            default: 0
        },
        consecutivePasses: {
            type: Number,
            default: 0
        }
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    severity: {
        type: String,
        enum: ['blocker', 'critical', 'major', 'minor', 'trivial'],
        default: 'major'
    },
    tags: [String],
    category: String,
    status: {
        type: String,
        enum: ['active', 'inactive', 'deprecated', 'blocked', 'draft'],
        default: 'active'
    },
    isAutomated: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
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
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

testCaseSchema.index({ project: 1 });
testCaseSchema.index({ testScript: 1 });
testCaseSchema.index({ testSuite: 1 });
testCaseSchema.index({ endpoint: 1 });
testCaseSchema.index({ status: 1 });
testCaseSchema.index({ priority: 1 });
testCaseSchema.index({ isActive: 1, isDeleted: 1 });
testCaseSchema.index({ 'execution.lastRun': -1 });

testCaseSchema.methods.updateExecutionResult = async function(result) {
    this.execution.totalRuns++;
    
    if (result.status === 'passed') {
        this.execution.passed++;
        this.flakiness.consecutivePasses++;
        this.flakiness.consecutiveFailures = 0;
    } else if (result.status === 'failed') {
        this.execution.failed++;
        this.flakiness.consecutiveFailures++;
        this.flakiness.consecutivePasses = 0;
    } else if (result.status === 'skipped') {
        this.execution.skipped++;
    }
    
    const totalCompleted = this.execution.passed + this.execution.failed;
    if (totalCompleted > 0) {
        this.execution.successRate = ((this.execution.passed / totalCompleted) * 100).toFixed(2);
    }
    
    if (result.duration) {
        const totalTime = this.execution.averageDuration * (this.execution.totalRuns - 1) + result.duration;
        this.execution.averageDuration = totalTime / this.execution.totalRuns;
    }
    
    if (result.responseTime) {
        const totalResponseTime = this.execution.averageResponseTime * (this.execution.totalRuns - 1) + result.responseTime;
        this.execution.averageResponseTime = totalResponseTime / this.execution.totalRuns;
        this.execution.lastResponseTime = result.responseTime;
    }
    
    this.execution.lastRun = Date.now();
    this.execution.lastStatus = result.status;
    
    if (result.error) {
        this.execution.lastError = result.error;
    }
    
    if (result.assertions) {
        this.assertions = result.assertions;
    }
    
    if (result.databaseValidation) {
        this.databaseValidation = result.databaseValidation;
    }
    
    this.checkFlakiness();
    
    await this.save();
};

testCaseSchema.methods.checkFlakiness = function() {
    const recentRuns = Math.min(this.execution.totalRuns, 10);
    
    if (recentRuns < 5) {
        return;
    }
    
    const failureRate = this.execution.failed / this.execution.totalRuns;
    const isIntermittent = failureRate > 0.1 && failureRate < 0.9;
    
    if (isIntermittent && this.flakiness.consecutiveFailures < 3 && this.flakiness.consecutivePasses < 10) {
        this.flakiness.isFlaky = true;
        this.flakiness.flakyCount++;
    } else if (this.flakiness.consecutivePasses >= 10) {
        this.flakiness.isFlaky = false;
        this.flakiness.flakyCount = 0;
    }
};

testCaseSchema.methods.markAsDeprecated = async function(reason, userId) {
    this.status = 'deprecated';
    this.isActive = false;
    this.updatedBy = userId;
    await this.save();
};

module.exports = mongoose.model('TestCase', testCaseSchema);