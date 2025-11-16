const mongoose = require('mongoose');

const testScriptSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
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
    framework: {
        type: String,
        enum: ['rest-assured', 'cucumber', 'testng', 'junit'],
        default: 'rest-assured'
    },
    language: {
        type: String,
        enum: ['java', 'javascript', 'typescript', 'python'],
        default: 'java'
    },
    scriptType: {
        type: String,
        enum: ['functional', 'integration', 'load', 'security', 'smoke', 'regression', 'e2e'],
        default: 'functional'
    },
    content: {
        testClass: {
            name: String,
            packageName: String,
            imports: [String],
            annotations: [String],
            content: String
        },
        featureFile: {
            name: String,
            content: String,
            scenarios: [{
                name: String,
                tags: [String],
                steps: [String]
            }]
        },
        stepDefinitions: {
            name: String,
            packageName: String,
            content: String
        },
        configFiles: [{
            name: String,
            type: String,
            content: String
        }]
    },
    testCases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestCase'
    }],
    testData: {
        static: mongoose.Schema.Types.Mixed,
        dynamic: {
            enabled: {
                type: Boolean,
                default: false
            },
            source: {
                type: String,
                enum: ['database', 'api', 'file', 'faker']
            },
            query: String
        },
        dataProvider: {
            enabled: {
                type: Boolean,
                default: false
            },
            method: String,
            data: [mongoose.Schema.Types.Mixed]
        }
    },
    assertions: [{
        type: {
            type: String,
            enum: ['status-code', 'response-time', 'body-contains', 'body-equals', 'header', 'schema', 'custom']
        },
        field: String,
        operator: String,
        expected: mongoose.Schema.Types.Mixed,
        description: String
    }],
    setup: {
        preconditions: [String],
        databaseSetup: [{
            connection: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'DatabaseConnection'
            },
            operation: {
                type: String,
                enum: ['insert', 'update', 'delete', 'truncate', 'execute']
            },
            query: String,
            data: mongoose.Schema.Types.Mixed
        }],
        apiCalls: [{
            endpoint: String,
            method: String,
            headers: mongoose.Schema.Types.Mixed,
            body: mongoose.Schema.Types.Mixed
        }]
    },
    teardown: {
        cleanup: [String],
        databaseCleanup: [{
            connection: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'DatabaseConnection'
            },
            operation: {
                type: String,
                enum: ['delete', 'truncate', 'restore', 'execute']
            },
            query: String
        }]
    },
    configuration: {
        timeout: {
            type: Number,
            default: 30000
        },
        retryCount: {
            type: Number,
            default: 0
        },
        retryDelay: {
            type: Number,
            default: 1000
        },
        parallel: {
            type: Boolean,
            default: false
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        tags: [String],
        groups: [String]
    },
    dependencies: {
        testScripts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestScript'
        }],
        order: Number,
        mustRunAfter: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestScript'
        }]
    },
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
        lastRun: Date,
        lastStatus: {
            type: String,
            enum: ['passed', 'failed', 'skipped', 'error']
        },
        lastError: String
    },
    generation: {
        generatedBy: {
            type: String,
            enum: ['openai', 'anthropic', 'both'],
            required: true
        },
        generatedAt: {
            type: Date,
            default: Date.now
        },
        prompt: String,
        model: String,
        confidence: {
            type: Number,
            min: 0,
            max: 100
        },
        regenerationCount: {
            type: Number,
            default: 0
        }
    },
    validation: {
        syntaxValid: {
            type: Boolean,
            default: true
        },
        syntaxErrors: [{
            line: Number,
            column: Number,
            message: String,
            severity: String
        }],
        lastValidated: Date,
        compilable: {
            type: Boolean,
            default: false
        },
        lastCompiled: Date
    },
    optimization: {
        optimized: {
            type: Boolean,
            default: false
        },
        optimizedAt: Date,
        suggestions: [String]
    },
    version: {
        current: {
            type: Number,
            default: 1
        },
        history: [{
            version: Number,
            content: String,
            changes: String,
            createdBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            createdAt: Date
        }]
    },
    status: {
        type: String,
        enum: ['draft', 'generated', 'validated', 'active', 'failed', 'deprecated', 'archived'],
        default: 'generated'
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

testScriptSchema.index({ project: 1 });
testScriptSchema.index({ testSuite: 1 });
testScriptSchema.index({ endpoint: 1 });
testScriptSchema.index({ status: 1 });
testScriptSchema.index({ framework: 1 });
testScriptSchema.index({ scriptType: 1 });
testScriptSchema.index({ isActive: 1, isDeleted: 1 });
testScriptSchema.index({ 'execution.lastRun': -1 });

testScriptSchema.methods.updateExecutionStats = async function(result) {
    this.execution.totalRuns++;
    
    if (result.status === 'passed') this.execution.passed++;
    if (result.status === 'failed') this.execution.failed++;
    if (result.status === 'skipped') this.execution.skipped++;
    
    const totalCompleted = this.execution.passed + this.execution.failed;
    if (totalCompleted > 0) {
        this.execution.successRate = ((this.execution.passed / totalCompleted) * 100).toFixed(2);
    }
    
    const totalTime = this.execution.averageDuration * (this.execution.totalRuns - 1) + result.duration;
    this.execution.averageDuration = totalTime / this.execution.totalRuns;
    
    this.execution.lastRun = Date.now();
    this.execution.lastStatus = result.status;
    if (result.error) {
        this.execution.lastError = result.error;
    }
    
    await this.save();
};

testScriptSchema.methods.createVersion = async function(userId) {
    this.version.history.push({
        version: this.version.current,
        content: JSON.stringify(this.content),
        changes: 'Version created',
        createdBy: userId,
        createdAt: Date.now()
    });
    
    this.version.current++;
    
    if (this.version.history.length > 50) {
        this.version.history = this.version.history.slice(-50);
    }
    
    await this.save();
};

testScriptSchema.methods.revertToVersion = async function(versionNumber, userId) {
    const version = this.version.history.find(v => v.version === versionNumber);
    if (!version) {
        throw new Error('Version not found');
    }
    
    this.content = JSON.parse(version.content);
    this.version.current++;
    this.updatedBy = userId;
    
    await this.save();
};

testScriptSchema.methods.regenerate = async function(userId) {
    this.generation.regenerationCount++;
    this.generation.generatedAt = Date.now();
    this.status = 'draft';
    this.updatedBy = userId;
    await this.save();
};

module.exports = mongoose.model('TestScript', testScriptSchema);