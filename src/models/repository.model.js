const mongoose = require("mongoose");
const crypto = require("crypto");

const repositorySchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        provider: {
            type: String,
            enum: ["github", "gitlab", "bitbucket", "azure-devops"],
            default: "github",
        },
        name: {
            type: String,
            required: true,
        },
        fullName: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
        cloneUrl: String,
        sshUrl: String,
        repositoryOwner: String,
        repositoryId: String,
        defaultBranch: {
            type: String,
            default: "main",
        },
        selectedBranch: {
            type: String,
            default: "main",
        },
        branches: [
            {
                name: String,
                sha: String,
                protected: Boolean,
                lastCommit: {
                    sha: String,
                    message: String,
                    author: String,
                    date: Date,
                },
            },
        ],
        isPrivate: {
            type: Boolean,
            default: true,
        },
        description: String,
        language: String,
        size: Number,
        starCount: Number,
        forkCount: Number,
        openIssuesCount: Number,
        authentication: {
            type: {
                type: String,
                enum: ["oauth", "token", "ssh"],
                default: "oauth",
            },
            accessToken: String,
            refreshToken: String,
            tokenExpiry: Date,
            sshKey: String,
            username: String,
        },
        connection: {
            status: {
                type: String,
                enum: ["connected", "disconnected", "error", "syncing"],
                default: "connected",
            },
            connectedAt: Date,
            lastSync: Date,
            lastSyncStatus: {
                type: String,
                enum: ["success", "failed", "partial"],
            },
            lastSyncError: String,
            syncFrequency: {
                type: String,
                enum: ["manual", "hourly", "daily", "weekly", "on-commit"],
                default: "manual",
            },
            autoSync: {
                type: Boolean,
                default: false,
            },
            nextSyncAt: Date,
        },
        structure: {
            totalFiles: {
                type: Number,
                default: 0,
            },
            totalDirectories: {
                type: Number,
                default: 0,
            },
            analysedFiles: {
                type: Number,
                default: 0,
            },
            codeFiles: [
                {
                    path: String,
                    type: String,
                    size: Number,
                    language: String,
                },
            ],
        },
        analysis: {
            status: {
                type: String,
                enum: ["pending", "in-progress", "completed", "failed"],
                default: "pending",
            },
            startedAt: Date,
            completedAt: Date,
            progress: {
                type: Number,
                default: 0,
            },
            findings: {
                routes: {
                    type: Number,
                    default: 0,
                },
                controllers: {
                    type: Number,
                    default: 0,
                },
                models: {
                    type: Number,
                    default: 0,
                },
                services: {
                    type: Number,
                    default: 0,
                },
                middlewares: {
                    type: Number,
                    default: 0,
                },
                endpoints: {
                    type: Number,
                    default: 0,
                },
            },
            technology: {
                detected: {
                    type: Boolean,
                    default: false,
                },
                language: String,
                framework: String,
                database: [String],
                orm: String,
                buildTool: String,
                packageManager: String,
            },
            errors: [
                {
                    file: String,
                    line: Number,
                    message: String,
                    timestamp: Date,
                },
            ],
        },
        webhook: {
            configured: {
                type: Boolean,
                default: false,
            },
            webhookId: String,
            secret: String,
            url: String,
            events: [
                {
                    type: String,
                    enum: ["push", "pull_request", "release", "commit"],
                },
            ],
            active: {
                type: Boolean,
                default: false,
            },
            lastTriggered: Date,
            totalTriggers: {
                type: Number,
                default: 0,
            },
        },
        files: {
            routes: [
                {
                    path: String,
                    name: String,
                    content: String,
                    analyzed: Boolean,
                    lastModified: Date,
                },
            ],
            controllers: [
                {
                    path: String,
                    name: String,
                    content: String,
                    analyzed: Boolean,
                    lastModified: Date,
                },
            ],
            models: [
                {
                    path: String,
                    name: String,
                    content: String,
                    analyzed: Boolean,
                    lastModified: Date,
                },
            ],
            services: [
                {
                    path: String,
                    name: String,
                    content: String,
                    analyzed: Boolean,
                    lastModified: Date,
                },
            ],
            configs: [
                {
                    path: String,
                    name: String,
                    content: String,
                    analyzed: Boolean,
                    lastModified: Date,
                },
            ],
        },
        commits: [
            {
                sha: String,
                message: String,
                author: {
                    name: String,
                    email: String,
                    username: String,
                },
                timestamp: Date,
                url: String,
                filesChanged: Number,
                additions: Number,
                deletions: Number,
            },
        ],
        permissions: {
            canRead: {
                type: Boolean,
                default: true,
            },
            canWrite: {
                type: Boolean,
                default: false,
            },
            canAdmin: {
                type: Boolean,
                default: false,
            },
        },
        metadata: {
            createdAt: Date,
            updatedAt: Date,
            pushedAt: Date,
            topics: [String],
            hasIssues: Boolean,
            hasProjects: Boolean,
            hasWiki: Boolean,
            hasPages: Boolean,
            archived: Boolean,
            disabled: Boolean,
        },
        syncHistory: [
            {
                syncedAt: Date,
                status: String,
                filesAnalyzed: Number,
                duration: Number,
                errors: [String],
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: Date,
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

repositorySchema.index({ project: 1 });
repositorySchema.index({ owner: 1 });
repositorySchema.index({ fullName: 1 });
repositorySchema.index({ repositoryId: 1 });
repositorySchema.index({ "connection.status": 1 });
repositorySchema.index({ "analysis.status": 1 });
repositorySchema.index({ isActive: 1, isDeleted: 1 });

repositorySchema.pre("save", function (next) {
    if (
        this.isModified("authentication.accessToken") &&
        this.authentication.accessToken
    ) {
        this.authentication.accessToken = crypto
            .createHash("sha256")
            .update(this.authentication.accessToken)
            .digest("hex");
    }
    next();
});

repositorySchema.methods.updateSyncStatus = async function (
    status,
    error = null
) {
    this.connection.lastSync = Date.now();
    this.connection.lastSyncStatus = status;
    if (error) {
        this.connection.lastSyncError = error;
    }
    await this.save();
};

repositorySchema.methods.addSyncHistory = async function (syncData) {
    this.syncHistory.push({
        syncedAt: Date.now(),
        status: syncData.status,
        filesAnalyzed: syncData.filesAnalyzed || 0,
        duration: syncData.duration || 0,
        errors: syncData.errors || [],
    });

    if (this.syncHistory.length > 50) {
        this.syncHistory = this.syncHistory.slice(-50);
    }

    await this.save();
};

repositorySchema.methods.updateAnalysis = async function (analysisData) {
    this.analysis.status = analysisData.status;
    this.analysis.progress = analysisData.progress || 0;

    if (analysisData.status === "completed") {
        this.analysis.completedAt = Date.now();
        if (analysisData.findings) {
            this.analysis.findings = {
                ...this.analysis.findings,
                ...analysisData.findings,
            };
        }
        if (analysisData.technology) {
            this.analysis.technology = {
                ...this.analysis.technology,
                ...analysisData.technology,
            };
            this.analysis.technology.detected = true;
        }
    }

    if (analysisData.errors) {
        this.analysis.errors.push(...analysisData.errors);
    }

    await this.save();
};

repositorySchema.methods.disconnect = async function (userId) {
    this.connection.status = "disconnected";
    this.isActive = false;
    this.deletedAt = Date.now();
    this.deletedBy = userId;
    await this.save();
};

repositorySchema.methods.scheduleNextSync = function () {
    const intervals = {
        hourly: 60 * 60 * 1000,
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
    };

    if (this.connection.autoSync && this.connection.syncFrequency !== "manual") {
        const interval = intervals[this.connection.syncFrequency];
        if (interval) {
            this.connection.nextSyncAt = new Date(Date.now() + interval);
        }
    }

    return this.save();
};

module.exports = mongoose.model("Repository", repositorySchema);
