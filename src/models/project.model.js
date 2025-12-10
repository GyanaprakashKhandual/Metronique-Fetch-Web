const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String
    },
    slug: {
        type: String,
        lowercase: true,
        trim: true
    },
    description: {
        type: String
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    visibility: {
        type: String,
        enum: ['private', 'team', 'public'],
        default: 'private'
    },
    accessList: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectAccess'
    }],
    repository: {
        connected: { type: Boolean, default: false },
        url: String,
        fullName: String,
        owner: String,
        name: String,
        branch: {
            type: String,
            default: 'main'
        },
        lastSync: Date,
        accessToken: String,
        webhookId: String,
        webhookSecret: String
    },
    technology: {
        language: {
            type: String,
            enum: ['javascript', 'typescript', 'java', 'python', 'csharp', 'go', 'php', 'ruby']
        },
        framework: {
            type: String,
            enum: ['express', 'nestjs', 'fastify', 'spring-boot', 'django', 'flask', 'dotnet-core', 'laravel', 'rails']
        },
        database: {
            type: [{
                type: String,
                enum: ['mongodb', 'mysql', 'postgresql', 'sqlite', 'mssql', 'oracle', 'redis', 'dynamodb']
            }],
            default: []
        },
        orm: {
            type: String,
            enum: ['mongoose', 'sequelize', 'typeorm', 'prisma', 'hibernate', 'sqlalchemy', 'entity-framework']
        }
    },
    databaseConnections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DatabaseConnection'
    }],
    analysis: {
        status: {
            type: String,
            enum: ['pending', 'analyzing', 'completed', 'failed'],
            default: 'pending'
        },
        startedAt: Date,
        completedAt: Date,
        failedAt: Date,
        errorMessage: String,
        aiProvider: {
            type: String,
            enum: ['openai', 'anthropic', 'both']
        },
        totalFiles: { type: Number, default: 0 },
        totalRoutes: { type: Number, default: 0 },
        totalControllers: { type: Number, default: 0 },
        totalModels: { type: Number, default: 0 },
        totalEndpoints: { type: Number, default: 0 },
        routesAnalyzed: { type: Boolean, default: false },
        controllersAnalyzed: { type: Boolean, default: false },
        modelsAnalyzed: { type: Boolean, default: false },
        schemasAnalyzed: { type: Boolean, default: false }
    },
    endpoints: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApiEndpoint'
    }],
    // Find this section in your project.model.js:

    testConfig: {
        framework: {
            type: String,
            enum: ['rest-assured', 'cucumber', 'testng', 'unified'], // ADD 'unified' HERE
            default: 'rest-assured'
        },
        language: {
            type: String,
            enum: ['java', 'python', 'javascript', 'csharp'],
            default: 'java'
        },
        buildTool: {
            type: String,
            enum: ['maven', 'gradle'],
            default: 'maven'
        },
        timeout: {
            type: Number,
            default: 30000
        },
        retryCount: {
            type: Number,
            default: 2
        },
        parallel: {
            type: Boolean,
            default: false
        },
        threadCount: {
            type: Number,
            default: 1
        }
    },
    testScripts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestScript'
    }],
    testSuites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestSuite'
    }],
    testFolder: {
        generated: { type: Boolean, default: false },
        generatedAt: Date,
        structure: mongoose.Schema.Types.Mixed,
        rootPath: String,
        totalFiles: { type: Number, default: 0 },
        totalFolders: { type: Number, default: 0 }
    },
    executions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestExecution'
    }],
    lastExecutionAt: Date,
    stats: {
        totalTests: { type: Number, default: 0 },
        totalTestsPassed: { type: Number, default: 0 },
        totalTestsFailed: { type: Number, default: 0 },
        totalTestsSkipped: { type: Number, default: 0 },
        successRate: { type: Number, default: 0 },
        averageExecutionTime: { type: Number, default: 0 },
        lastTestRun: Date,
        totalExecutions: { type: Number, default: 0 }
    },
    loadTesting: {
        enabled: { type: Boolean, default: false },
        config: {
            virtualUsers: { type: Number, default: 10 },
            rampUpTime: { type: Number, default: 60 },
            duration: { type: Number, default: 300 },
            requestsPerSecond: { type: Number, default: 10 }
        },
        lastRun: Date,
        results: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LoadTestResult'
        }]
    },
    cicd: {
        enabled: { type: Boolean, default: false },
        provider: {
            type: String,
            enum: ['github-actions', 'gitlab-ci', 'jenkins', 'circleci', 'travis-ci', 'azure-devops']
        },
        webhookUrl: String,
        triggerOnCommit: { type: Boolean, default: true },
        triggerOnPR: { type: Boolean, default: true },
        autoRun: { type: Boolean, default: false },
        branch: String
    },
    notifications: {
        email: {
            enabled: { type: Boolean, default: true },
            recipients: [String],
            onSuccess: { type: Boolean, default: false },
            onFailure: { type: Boolean, default: true }
        },
        slack: {
            enabled: { type: Boolean, default: false },
            webhookUrl: String,
            channel: String,
            onSuccess: { type: Boolean, default: false },
            onFailure: { type: Boolean, default: true }
        },
        webhook: {
            enabled: { type: Boolean, default: false },
            url: String,
            events: [String]
        }
    },
    schedule: {
        enabled: { type: Boolean, default: false },
        cron: String,
        timezone: { type: String, default: 'UTC' },
        nextRun: Date,
        lastRun: Date
    },
    reports: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestReport'
    }],
    tags: [String],
    category: {
        type: String,
        enum: ['web-api', 'mobile-api', 'microservice', 'internal', 'external', 'third-party'],
        default: 'web-api'
    },
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
    storage: {
        used: { type: Number, default: 0 },
        limit: { type: Number, default: 500 },
        files: [{
            name: String,
            path: String,
            size: Number,
            type: String,
            uploadedAt: Date
        }]
    },
    collaborators: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedAt: Date
    }],
    activityLog: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ActivityLog'
    }],
    metadata: {
        color: {
            type: String,
            default: '#3b82f6'
        },
        icon: String,
        starred: { type: Boolean, default: false },
        favorite: { type: Boolean, default: false }
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
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

projectSchema.index({ owner: 1 });
projectSchema.index({ team: 1 });
projectSchema.index({ slug: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ isDeleted: 1 });
projectSchema.index({ 'repository.fullName': 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ team: 1, status: 1 });

projectSchema.virtual('calculatedSuccessRate').get(function () {
    if (this.stats.totalTests === 0) return 0;
    return ((this.stats.totalTestsPassed / this.stats.totalTests) * 100).toFixed(2);
});

projectSchema.pre('save', function (next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') + '-' + Date.now();
    }
    next();
});

projectSchema.methods.hasAccess = async function (userId) {
    if (this.owner.toString() === userId.toString()) {
        return true;
    }

    if (this.visibility === 'public') {
        return true;
    }

    if (this.team && this.visibility === 'team') {
        const TeamMember = mongoose.model('TeamMember');
        const membership = await TeamMember.findOne({
            team: this.team,
            user: userId,
            status: 'active'
        });
        return !!membership;
    }

    const ProjectAccess = mongoose.model('ProjectAccess');
    const access = await ProjectAccess.findOne({
        project: this._id,
        user: userId,
        status: 'active'
    });

    return !!access;
};

projectSchema.methods.updateStats = async function (executionResult) {
    this.stats.totalTests = executionResult.totalTests || this.stats.totalTests;
    this.stats.totalTestsPassed += executionResult.passed || 0;
    this.stats.totalTestsFailed += executionResult.failed || 0;
    this.stats.totalTestsSkipped += executionResult.skipped || 0;
    this.stats.totalExecutions++;
    this.stats.lastTestRun = Date.now();

    const totalTests = this.stats.totalTestsPassed + this.stats.totalTestsFailed;
    if (totalTests > 0) {
        this.stats.successRate = ((this.stats.totalTestsPassed / totalTests) * 100).toFixed(2);
    }

    if (executionResult.duration) {
        const totalTime = (this.stats.averageExecutionTime * (this.stats.totalExecutions - 1)) + executionResult.duration;
        this.stats.averageExecutionTime = totalTime / this.stats.totalExecutions;
    }

    await this.save();
};

projectSchema.methods.hasStorageAvailable = function (sizeInMB) {
    return (this.storage.used + sizeInMB) <= this.storage.limit;
};

projectSchema.methods.addStorageUsage = function (sizeInMB) {
    this.storage.used += sizeInMB;
    return this.save();
};

module.exports = mongoose.model('Project', projectSchema);