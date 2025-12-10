const mongoose = require('mongoose');

const apiEndpointSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    repository: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        required: true
    },
    fullPath: {
        type: String,
        required: true
    },
    route: {
        type: String,
        required: true
    },
    controller: {
        name: String,
        path: String,
        method: String
    },
    middleware: [{
        name: String,
        type: String,
        order: Number
    }],
    authentication: {
        required: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            enum: ['bearer', 'basic', 'api-key', 'oauth', 'jwt', 'session', 'custom']
        },
        location: {
            type: String,
            enum: ['header', 'query', 'body', 'cookie']
        },
        key: String
    },
    authorization: {
        required: {
            type: Boolean,
            default: false
        },
        roles: [String],
        permissions: [String]
    },
    requestBody: {
        required: {
            type: Boolean,
            default: false
        },
        contentType: {
            type: String,
            default: 'application/json'
        },
        schema: mongoose.Schema.Types.Mixed,
        example: mongoose.Schema.Types.Mixed,
        validation: {
            rules: mongoose.Schema.Types.Mixed,
            required: [String],
            optional: [String]
        }
    },
    requestParams: [{
        name: String,
        type: {
            type: String,
            enum: ['string', 'number', 'boolean', 'array', 'object']
        },
        required: Boolean,
        in: {
            type: String,
            enum: ['path', 'query', 'header', 'cookie']
        },
        description: String,
        default: mongoose.Schema.Types.Mixed,
        example: mongoose.Schema.Types.Mixed,
        validation: mongoose.Schema.Types.Mixed
    }],
    requestHeaders: [{
        name: String,
        required: Boolean,
        type: String,
        default: String,
        example: String
    }],
    responseSchema: {
        successCodes: [{
            type: Number,
            default: 200
        }],
        errorCodes: [Number],
        schema: mongoose.Schema.Types.Mixed,
        examples: [{
            statusCode: Number,
            description: String,
            body: mongoose.Schema.Types.Mixed
        }]
    },
    database: {
        operations: [{
            type: {
                type: String,
                enum: ['read', 'create', 'update', 'delete', 'aggregate']
            },
            collection: String,
            table: String,
            model: String
        }],
        models: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DatabaseModel'
        }]
    },
    validation: {
        input: mongoose.Schema.Types.Mixed,
        output: mongoose.Schema.Types.Mixed,
        custom: [String]
    },
    rateLimit: {
        enabled: {
            type: Boolean,
            default: false
        },
        limit: Number,
        window: Number
    },
    caching: {
        enabled: {
            type: Boolean,
            default: false
        },
        ttl: Number,
        key: String
    },
    dependencies: [{
        service: String,
        endpoint: String,
        method: String
    }],
    testScripts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestScript'
    }],
    testCases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestCase'
    }],
    testCoverage: {
        total: {
            type: Number,
            default: 0
        },
        covered: {
            type: Number,
            default: 0
        },
        percentage: {
            type: Number,
            default: 0
        }
    },
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
        successRate: {
            type: Number,
            default: 0
        }
    },
    documentation: {
        description: String,
        summary: String,
        tags: [String],
        notes: String,
        examples: [mongoose.Schema.Types.Mixed]
    },
    analysis: {
        analyzed: {
            type: Boolean,
            default: false
        },
        analyzedAt: Date,
        analyzedBy: {
            type: String,
            enum: ['openai', 'anthropic', 'both']
        },
        complexity: {
            type: String,
            enum: ['simple', 'moderate', 'complex', 'very-complex']
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100
        }
    },
    status: {
        type: String,
        enum: ['discovered', 'analyzed', 'tested', 'failed', 'deprecated'],
        default: 'discovered'
    },
    isDeprecated: {
        type: Boolean,
        default: false
    },
    deprecationInfo: {
        reason: String,
        deprecatedAt: Date,
        replacedBy: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    metadata: {
        sourceFile: String,
        lineNumber: Number,
        lastModified: Date
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

apiEndpointSchema.index({ project: 1, method: 1, path: 1 }, { unique: true });
apiEndpointSchema.index({ project: 1 });
apiEndpointSchema.index({ repository: 1 });
apiEndpointSchema.index({ method: 1 });
apiEndpointSchema.index({ status: 1 });
apiEndpointSchema.index({ isActive: 1 });
apiEndpointSchema.index({ 'analysis.analyzed': 1 });

apiEndpointSchema.methods.updateTestCoverage = async function () {
    const TestCase = mongoose.model('TestCase');
    const testCases = await TestCase.find({ endpoint: this._id });

    this.testCoverage.total = testCases.length;
    this.testCoverage.covered = testCases.filter(tc => tc.status === 'passed').length;

    if (this.testCoverage.total > 0) {
        this.testCoverage.percentage = ((this.testCoverage.covered / this.testCoverage.total) * 100).toFixed(2);
    }

    await this.save();
};

apiEndpointSchema.methods.updatePerformance = async function (responseTime, success) {
    this.performance.totalRequests++;

    const totalTime = this.performance.averageResponseTime * (this.performance.totalRequests - 1) + responseTime;
    this.performance.averageResponseTime = totalTime / this.performance.totalRequests;

    if (!this.performance.minResponseTime || responseTime < this.performance.minResponseTime) {
        this.performance.minResponseTime = responseTime;
    }

    if (!this.performance.maxResponseTime || responseTime > this.performance.maxResponseTime) {
        this.performance.maxResponseTime = responseTime;
    }

    const successCount = Math.round((this.performance.successRate / 100) * (this.performance.totalRequests - 1));
    const newSuccessCount = success ? successCount + 1 : successCount;
    this.performance.successRate = ((newSuccessCount / this.performance.totalRequests) * 100).toFixed(2);

    await this.save();
};

apiEndpointSchema.methods.markAsDeprecated = async function (reason, replacedBy) {
    this.isDeprecated = true;
    this.status = 'deprecated';
    this.deprecationInfo = {
        reason,
        deprecatedAt: Date.now(),
        replacedBy
    };
    await this.save();
};

module.exports = mongoose.model('ApiEndpoint', apiEndpointSchema);