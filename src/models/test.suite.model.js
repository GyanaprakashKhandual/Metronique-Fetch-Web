const mongoose = require('mongoose');

const testSuiteSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    type: {
        type: String,
        enum: ['smoke', 'regression', 'sanity', 'integration', 'e2e', 'functional', 'performance', 'security', 'custom'],
        default: 'functional'
    },
    testScripts: [{
        script: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestScript'
        },
        order: {
            type: Number,
            default: 0
        },
        enabled: {
            type: Boolean,
            default: true
        }
    }],
    configuration: {
        parallel: {
            type: Boolean,
            default: false
        },
        threadCount: {
            type: Number,
            default: 1
        },
        timeout: {
            type: Number,
            default: 300000
        },
        stopOnFailure: {
            type: Boolean,
            default: false
        },
        retryFailedTests: {
            type: Boolean,
            default: false
        },
        retryCount: {
            type: Number,
            default: 1
        },
        dataParallel: {
            type: Boolean,
            default: false
        }
    },
    environment: {
        name: String,
        baseUrl: String,
        variables: [{
            key: String,
            value: String,
            isSecret: {
                type: Boolean,
                default: false
            }
        }],
        headers: [{
            key: String,
            value: String
        }]
    },
    databaseConfig: {
        connections: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DatabaseConnection'
        }],
        setupScripts: [String],
        teardownScripts: [String]
    },
    schedule: {
        enabled: {
            type: Boolean,
            default: false
        },
        cron: String,
        timezone: {
            type: String,
            default: 'UTC'
        },
        nextRun: Date,
        lastRun: Date
    },
    notifications: {
        onStart: {
            type: Boolean,
            default: false
        },
        onComplete: {
            type: Boolean,
            default: true
        },
        onFailure: {
            type: Boolean,
            default: true
        },
        recipients: [String],
        channels: [{
            type: String,
            enum: ['email', 'slack', 'webhook']
        }]
    },
    execution: {
        totalRuns: {
            type: Number,
            default: 0
        },
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
        successRate: {
            type: Number,
            default: 0
        },
        averageDuration: {
            type: Number,
            default: 0
        },
        lastRun: Date,
        lastStatus: {
            type: String,
            enum: ['passed', 'failed', 'partial', 'error', 'cancelled']
        },
        lastExecutionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestExecution'
        }
    },
    executions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestExecution'
    }],
    reports: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestReport'
    }],
    tags: [String],
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'archived', 'maintenance'],
        default: 'draft'
    },
    metadata: {
        author: String,
        category: String,
        version: {
            type: String,
            default: '1.0.0'
        },
        lastModifiedReason: String
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

testSuiteSchema.index({ project: 1 });
testSuiteSchema.index({ status: 1 });
testSuiteSchema.index({ type: 1 });
testSuiteSchema.index({ priority: 1 });
testSuiteSchema.index({ isActive: 1, isDeleted: 1 });
testSuiteSchema.index({ 'execution.lastRun': -1 });

testSuiteSchema.methods.updateExecutionStats = async function(executionResult) {
    this.execution.totalRuns++;
    this.execution.totalTests = executionResult.totalTests || 0;
    this.execution.passed += executionResult.passed || 0;
    this.execution.failed += executionResult.failed || 0;
    this.execution.skipped += executionResult.skipped || 0;
    
    const totalCompleted = this.execution.passed + this.execution.failed;
    if (totalCompleted > 0) {
        this.execution.successRate = ((this.execution.passed / totalCompleted) * 100).toFixed(2);
    }
    
    const totalTime = this.execution.averageDuration * (this.execution.totalRuns - 1) + (executionResult.duration || 0);
    this.execution.averageDuration = totalTime / this.execution.totalRuns;
    
    this.execution.lastRun = Date.now();
    this.execution.lastStatus = executionResult.status;
    this.execution.lastExecutionId = executionResult.executionId;
    
    await this.save();
};

testSuiteSchema.methods.addTestScript = async function(scriptId, order) {
    this.testScripts.push({
        script: scriptId,
        order: order || this.testScripts.length,
        enabled: true
    });
    await this.save();
};

testSuiteSchema.methods.removeTestScript = async function(scriptId) {
    this.testScripts = this.testScripts.filter(ts => ts.script.toString() !== scriptId.toString());
    await this.save();
};

testSuiteSchema.methods.reorderTestScripts = async function(newOrder) {
    newOrder.forEach((item, index) => {
        const testScript = this.testScripts.find(ts => ts.script.toString() === item.scriptId.toString());
        if (testScript) {
            testScript.order = index;
        }
    });
    await this.save();
};

testSuiteSchema.methods.scheduleNextRun = function() {
    if (!this.schedule.enabled || !this.schedule.cron) {
        return;
    }
    
    const parser = require('cron-parser');
    try {
        const interval = parser.parseExpression(this.schedule.cron, {
            tz: this.schedule.timezone
        });
        this.schedule.nextRun = interval.next().toDate();
    } catch (error) {
        console.error('Failed to schedule next run:', error);
    }
    
    return this.save();
};

module.exports = mongoose.model('TestSuite', testSuiteSchema);