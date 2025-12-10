const mongoose = require('mongoose');
const crypto = require('crypto');

const databaseConnectionSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['mongodb', 'mysql', 'postgresql', 'sqlite', 'mssql', 'oracle', 'redis', 'dynamodb', 'cassandra', 'mariadb'],
        required: true
    },
    environment: {
        type: String,
        enum: ['development', 'staging', 'production', 'test'],
        default: 'development'
    },
    connection: {
        host: {
            type: String,
            required: true
        },
        port: {
            type: Number,
            required: true
        },
        database: {
            type: String,
            required: true
        },
        username: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        authSource: String,
        replicaSet: String,
        ssl: {
            enabled: {
                type: Boolean,
                default: false
            },
            rejectUnauthorized: {
                type: Boolean,
                default: true
            },
            ca: String,
            cert: String,
            key: String
        }
    },
    connectionString: String,
    options: {
        maxPoolSize: {
            type: Number,
            default: 10
        },
        minPoolSize: {
            type: Number,
            default: 2
        },
        connectTimeout: {
            type: Number,
            default: 30000
        },
        socketTimeout: {
            type: Number,
            default: 30000
        },
        keepAlive: {
            type: Boolean,
            default: true
        },
        useNewUrlParser: {
            type: Boolean,
            default: true
        },
        useUnifiedTopology: {
            type: Boolean,
            default: true
        },
        additionalOptions: mongoose.Schema.Types.Mixed
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'error', 'testing'],
        default: 'inactive'
    },
    isConnected: {
        type: Boolean,
        default: false
    },
    lastConnectionTest: Date,
    lastConnectionStatus: {
        type: String,
        enum: ['success', 'failed']
    },
    lastConnectionError: String,
    connectionAttempts: {
        type: Number,
        default: 0
    },
    schema: {
        analyzed: {
            type: Boolean,
            default: false
        },
        analyzedAt: Date,
        collections: [{
            name: String,
            count: Number,
            size: Number,
            indexes: [{
                name: String,
                keys: mongoose.Schema.Types.Mixed,
                unique: Boolean
            }],
            schema: mongoose.Schema.Types.Mixed
        }],
        tables: [{
            name: String,
            schema: String,
            rowCount: Number,
            columns: [{
                name: String,
                type: String,
                nullable: Boolean,
                defaultValue: String,
                isPrimaryKey: Boolean,
                isForeignKey: Boolean
            }],
            indexes: [{
                name: String,
                columns: [String],
                unique: Boolean
            }],
            foreignKeys: [{
                column: String,
                referencedTable: String,
                referencedColumn: String
            }]
        }],
        relationships: [{
            from: String,
            to: String,
            type: String,
            foreignKey: String
        }]
    },
    statistics: {
        totalCollections: {
            type: Number,
            default: 0
        },
        totalTables: {
            type: Number,
            default: 0
        },
        totalDocuments: {
            type: Number,
            default: 0
        },
        totalRows: {
            type: Number,
            default: 0
        },
        databaseSize: {
            type: Number,
            default: 0
        },
        lastUpdated: Date
    },
    testHistory: [{
        testedAt: Date,
        status: String,
        responseTime: Number,
        error: String,
        testedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    usage: {
        totalQueries: {
            type: Number,
            default: 0
        },
        totalTests: {
            type: Number,
            default: 0
        },
        lastUsed: Date,
        averageResponseTime: {
            type: Number,
            default: 0
        }
    },
    security: {
        encrypted: {
            type: Boolean,
            default: true
        },
        encryptionKey: String,
        rotateCredentials: {
            enabled: {
                type: Boolean,
                default: false
            },
            frequency: {
                type: String,
                enum: ['monthly', 'quarterly', 'yearly'],
                default: 'quarterly'
            },
            lastRotated: Date,
            nextRotation: Date
        },
        ipWhitelist: [{
            ip: String,
            description: String,
            addedAt: Date
        }]
    },
    permissions: {
        canRead: {
            type: Boolean,
            default: true
        },
        canWrite: {
            type: Boolean,
            default: false
        },
        canDelete: {
            type: Boolean,
            default: false
        },
        canExecute: {
            type: Boolean,
            default: true
        }
    },
    alerts: {
        connectionFailure: {
            enabled: {
                type: Boolean,
                default: true
            },
            recipients: [String]
        },
        slowQueries: {
            enabled: {
                type: Boolean,
                default: false
            },
            threshold: {
                type: Number,
                default: 5000
            }
        }
    },
    metadata: {
        version: String,
        charset: String,
        collation: String,
        timezone: String,
        serverInfo: mongoose.Schema.Types.Mixed
    },
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

databaseConnectionSchema.index({ project: 1 });
databaseConnectionSchema.index({ owner: 1 });
databaseConnectionSchema.index({ type: 1 });
databaseConnectionSchema.index({ environment: 1 });
databaseConnectionSchema.index({ status: 1 });
databaseConnectionSchema.index({ isActive: 1, isDeleted: 1 });
databaseConnectionSchema.index({ project: 1, isDefault: 1 });

databaseConnectionSchema.pre('save', function (next) {
    if (this.isModified('connection.password') && this.connection.password) {
        const cipher = crypto.createCipher('aes-256-cbc', process.env.DB_ENCRYPTION_KEY || 'default-key');
        let encrypted = cipher.update(this.connection.password, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        this.connection.password = encrypted;
        this.security.encrypted = true;
    }
    next();
});

databaseConnectionSchema.methods.decryptPassword = function () {
    if (!this.security.encrypted) return this.connection.password;

    try {
        const decipher = crypto.createDecipher('aes-256-cbc', process.env.DB_ENCRYPTION_KEY || 'default-key');
        let decrypted = decipher.update(this.connection.password, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        throw new Error('Failed to decrypt password');
    }
};

databaseConnectionSchema.methods.testConnection = async function () {
    this.lastConnectionTest = Date.now();
    this.connectionAttempts++;

    try {
        this.lastConnectionStatus = 'success';
        this.isConnected = true;
        this.status = 'active';
        this.lastConnectionError = undefined;

        this.testHistory.push({
            testedAt: Date.now(),
            status: 'success',
            responseTime: 0
        });

        if (this.testHistory.length > 100) {
            this.testHistory = this.testHistory.slice(-100);
        }

        await this.save();
        return true;
    } catch (error) {
        this.lastConnectionStatus = 'failed';
        this.isConnected = false;
        this.status = 'error';
        this.lastConnectionError = error.message;

        this.testHistory.push({
            testedAt: Date.now(),
            status: 'failed',
            error: error.message
        });

        await this.save();
        return false;
    }
};

databaseConnectionSchema.methods.updateSchema = async function (schemaData) {
    this.schema.analyzed = true;
    this.schema.analyzedAt = Date.now();

    if (this.type === 'mongodb') {
        this.schema.collections = schemaData.collections || [];
        this.statistics.totalCollections = this.schema.collections.length;
        this.statistics.totalDocuments = this.schema.collections.reduce((sum, col) => sum + (col.count || 0), 0);
    } else {
        this.schema.tables = schemaData.tables || [];
        this.schema.relationships = schemaData.relationships || [];
        this.statistics.totalTables = this.schema.tables.length;
        this.statistics.totalRows = this.schema.tables.reduce((sum, table) => sum + (table.rowCount || 0), 0);
    }

    this.statistics.lastUpdated = Date.now();
    await this.save();
};

databaseConnectionSchema.methods.incrementUsage = async function (responseTime) {
    this.usage.totalQueries++;
    this.usage.lastUsed = Date.now();

    const totalTime = this.usage.averageResponseTime * (this.usage.totalQueries - 1) + responseTime;
    this.usage.averageResponseTime = totalTime / this.usage.totalQueries;

    await this.save();
};

databaseConnectionSchema.methods.disconnect = async function (userId) {
    this.isConnected = false;
    this.status = 'inactive';
    this.isActive = false;
    this.deletedAt = Date.now();
    this.deletedBy = userId;
    await this.save();
};

databaseConnectionSchema.methods.makeDefault = async function () {
    await this.model('DatabaseConnection').updateMany(
        { project: this.project, isDefault: true },
        { isDefault: false }
    );

    this.isDefault = true;
    await this.save();
};

module.exports = mongoose.model('DatabaseConnection', databaseConnectionSchema);