const mongoose = require('mongoose');

const testConfigSchema = new mongoose.Schema({
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
    environment: {
        type: String,
        enum: ['development', 'staging', 'production', 'test', 'custom'],
        default: 'test'
    },
    framework: {
        primary: {
            type: String,
            enum: ['rest-assured', 'cucumber', 'testng', 'junit'],
            default: 'rest-assured'
        },
        version: String,
        additionalFrameworks: [{
            name: String,
            version: String
        }]
    },
    language: {
        type: String,
        enum: ['java', 'javascript', 'typescript', 'python'],
        default: 'java'
    },
    buildTool: {
        type: String,
        enum: ['maven', 'gradle', 'npm', 'pip', 'ant'],
        default: 'maven'
    },
    baseConfiguration: {
        baseUrl: {
            type: String,
            required: true
        },
        apiVersion: String,
        protocol: {
            type: String,
            enum: ['http', 'https'],
            default: 'https'
        },
        port: Number,
        basePath: String
    },
    timeouts: {
        connection: {
            type: Number,
            default: 30000
        },
        read: {
            type: Number,
            default: 30000
        },
        write: {
            type: Number,
            default: 30000
        },
        global: {
            type: Number,
            default: 60000
        }
    },
    retryConfiguration: {
        enabled: {
            type: Boolean,
            default: false
        },
        maxRetries: {
            type: Number,
            default: 2
        },
        retryDelay: {
            type: Number,
            default: 1000
        },
        retryOn: [{
            type: String,
            enum: ['timeout', 'network-error', 'server-error', 'assertion-failure']
        }]
    },
    parallelExecution: {
        enabled: {
            type: Boolean,
            default: false
        },
        mode: {
            type: String,
            enum: ['methods', 'classes', 'tests', 'none'],
            default: 'none'
        },
        threadCount: {
            type: Number,
            default: 1
        },
        dataParallel: {
            type: Boolean,
            default: false
        }
    },
    authentication: {
        type: {
            type: String,
            enum: ['none', 'basic', 'bearer', 'oauth2', 'api-key', 'jwt', 'custom']
        },
        location: {
            type: String,
            enum: ['header', 'query', 'body', 'cookie']
        },
        headerName: String,
        queryParamName: String,
        tokenPrefix: String,
        credentials: {
            username: String,
            password: String,
            token: String,
            apiKey: String
        },
        oauth2: {
            authUrl: String,
            tokenUrl: String,
            clientId: String,
            clientSecret: String,
            scope: String,
            grantType: String
        },
        refreshToken: {
            enabled: {
                type: Boolean,
                default: false
            },
            endpoint: String,
            expiryBuffer: Number
        }
    },
    headers: {
        global: [{
            key: String,
            value: String,
            enabled: {
                type: Boolean,
                default: true
            }
        }],
        contentType: {
            type: String,
            default: 'application/json'
        },
        accept: {
            type: String,
            default: 'application/json'
        },
        custom: mongoose.Schema.Types.Mixed
    },
    environmentVariables: [{
        key: {
            type: String,
            required: true
        },
        value: {
            type: String,
            required: true
        },
        isSecret: {
            type: Boolean,
            default: false
        },
        description: String
    }],
    database: {
        connections: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DatabaseConnection'
        }],
        defaultConnection: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DatabaseConnection'
        },
        autoSetup: {
            type: Boolean,
            default: false
        },
        autoCleanup: {
            type: Boolean,
            default: true
        }
    },
    reporting: {
        enabled: {
            type: Boolean,
            default: true
        },
        formats: [{
            type: String,
            enum: ['html', 'json', 'xml', 'pdf', 'allure', 'extent']
        }],
        outputDirectory: String,
        screenshots: {
            onFailure: {
                type: Boolean,
                default: true
            },
            onSuccess: {
                type: Boolean,
                default: false
            },
            onError: {
                type: Boolean,
                default: true
            }
        },
        logging: {
            level: {
                type: String,
                enum: ['trace', 'debug', 'info', 'warn', 'error'],
                default: 'info'
            },
            requestBody: {
                type: Boolean,
                default: true
            },
            responseBody: {
                type: Boolean,
                default: true
            },
            headers: {
                type: Boolean,
                default: true
            }
        }
    },
    assertions: {
        stopOnFailure: {
            type: Boolean,
            default: false
        },
        softAssertions: {
            type: Boolean,
            default: false
        },
        customAssertions: [{
            name: String,
            type: String,
            condition: String
        }]
    },
    dataManagement: {
        testDataSource: {
            type: String,
            enum: ['inline', 'file', 'database', 'api', 'faker'],
            default: 'inline'
        },
        dataProviders: [{
            name: String,
            type: String,
            source: String,
            format: String
        }],
        faker: {
            enabled: {
                type: Boolean,
                default: false
            },
            locale: {
                type: String,
                default: 'en'
            }
        }
    },
    performance: {
        monitoring: {
            type: Boolean,
            default: true
        },
        thresholds: {
            responseTime: {
                warning: Number,
                critical: Number
            },
            errorRate: {
                warning: Number,
                critical: Number
            }
        },
        collectMetrics: {
            type: Boolean,
            default: true
        }
    },
    security: {
        sslVerification: {
            type: Boolean,
            default: true
        },
        certificatePath: String,
        allowInsecure: {
            type: Boolean,
            default: false
        },
        sensitiveDataMasking: {
            enabled: {
                type: Boolean,
                default: true
            },
            fields: [String]
        }
    },
    hooks: {
        beforeSuite: [String],
        afterSuite: [String],
        beforeTest: [String],
        afterTest: [String],
        beforeClass: [String],
        afterClass: [String],
        beforeMethod: [String],
        afterMethod: [String]
    },
    dependencies: [{
        groupId: String,
        artifactId: String,
        version: String,
        scope: String
    }],
    plugins: [{
        name: String,
        version: String,
        configuration: mongoose.Schema.Types.Mixed
    }],
    customProperties: mongoose.Schema.Types.Mixed,
    isDefault: {
        type: Boolean,
        default: false
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

testConfigSchema.index({ project: 1 });
testConfigSchema.index({ environment: 1 });
testConfigSchema.index({ isDefault: 1 });
testConfigSchema.index({ isActive: 1, isDeleted: 1 });

testConfigSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.model('TestConfig').updateMany(
            { project: this.project, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

testConfigSchema.methods.makeDefault = async function() {
    await this.model('TestConfig').updateMany(
        { project: this.project, _id: { $ne: this._id } },
        { isDefault: false }
    );
    this.isDefault = true;
    await this.save();
};

testConfigSchema.methods.clone = async function(userId, newName) {
    const configData = this.toObject();
    delete configData._id;
    delete configData.createdAt;
    delete configData.updatedAt;
    
    configData.name = newName || `${this.name} (Copy)`;
    configData.isDefault = false;
    configData.createdBy = userId;
    
    const newConfig = new this.constructor(configData);
    return await newConfig.save();
};

module.exports = mongoose.model('TestConfig', testConfigSchema);