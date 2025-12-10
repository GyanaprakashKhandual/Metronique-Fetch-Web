const mongoose = require('mongoose');

const loadTestSchema = new mongoose.Schema({
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
        enum: ['load', 'stress', 'spike', 'soak', 'volume', 'scalability'],
        default: 'load'
    },
    endpoints: [{
        endpoint: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ApiEndpoint'
        },
        weight: {
            type: Number,
            default: 1,
            min: 0,
            max: 100
        },
        enabled: {
            type: Boolean,
            default: true
        }
    }],
    configuration: {
        virtualUsers: {
            type: Number,
            default: 10,
            min: 1
        },
        rampUpTime: {
            type: Number,
            default: 60
        },
        rampUpSteps: {
            type: Number,
            default: 1
        },
        duration: {
            type: Number,
            default: 300
        },
        rampDownTime: {
            type: Number,
            default: 0
        },
        thinkTime: {
            min: {
                type: Number,
                default: 1000
            },
            max: {
                type: Number,
                default: 3000
            }
        },
        iterations: {
            type: Number,
            default: -1
        },
        requestsPerSecond: {
            type: Number,
            default: 10
        },
        maxRequestsPerSecond: Number,
        constantThroughput: {
            type: Boolean,
            default: false
        }
    },
    scenario: {
        steps: [{
            order: Number,
            endpoint: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ApiEndpoint'
            },
            name: String,
            delay: {
                type: Number,
                default: 0
            },
            extractors: [{
                name: String,
                type: {
                    type: String,
                    enum: ['json', 'xml', 'regex', 'header']
                },
                expression: String,
                variable: String
            }],
            assertions: [{
                type: String,
                field: String,
                operator: String,
                expected: mongoose.Schema.Types.Mixed
            }]
        }],
        loops: [{
            name: String,
            iterations: Number,
            steps: [Number]
        }],
        conditions: [{
            name: String,
            condition: String,
            thenSteps: [Number],
            elseSteps: [Number]
        }]
    },
    distribution: {
        pattern: {
            type: String,
            enum: ['uniform', 'gaussian', 'poisson', 'exponential', 'custom'],
            default: 'uniform'
        },
        customScript: String
    },
    database: {
        connections: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DatabaseConnection'
        }],
        poolSize: {
            type: Number,
            default: 10
        },
        setupQueries: [String],
        teardownQueries: [String]
    },
    thresholds: {
        responseTime: {
            p50: Number,
            p90: Number,
            p95: Number,
            p99: Number,
            max: Number
        },
        errorRate: {
            warning: {
                type: Number,
                default: 5
            },
            critical: {
                type: Number,
                default: 10
            }
        },
        throughput: {
            min: Number,
            target: Number
        },
        successRate: {
            min: {
                type: Number,
                default: 95
            }
        }
    },
    monitoring: {
        metrics: [{
            type: String,
            enum: ['cpu', 'memory', 'disk', 'network', 'database', 'custom']
        }],
        interval: {
            type: Number,
            default: 5000
        },
        endpoints: [String]
    },
    execution: {
        totalRuns: {
            type: Number,
            default: 0
        },
        lastRun: Date,
        lastStatus: {
            type: String,
            enum: ['passed', 'failed', 'warning', 'error']
        },
        lastDuration: Number
    },
    results: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoadTestResult'
    }],
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
        nextRun: Date
    },
    notifications: {
        onComplete: {
            type: Boolean,
            default: true
        },
        onThresholdBreach: {
            type: Boolean,
            default: true
        },
        recipients: [String]
    },
    tags: [String],
    status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'archived'],
        default: 'draft'
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

loadTestSchema.index({ project: 1 });
loadTestSchema.index({ status: 1 });
loadTestSchema.index({ type: 1 });
loadTestSchema.index({ isActive: 1, isDeleted: 1 });
loadTestSchema.index({ 'execution.lastRun': -1 });

loadTestSchema.methods.updateExecutionStats = async function(result) {
    this.execution.totalRuns++;
    this.execution.lastRun = Date.now();
    this.execution.lastStatus = result.status;
    this.execution.lastDuration = result.duration;
    await this.save();
};

loadTestSchema.methods.scheduleNextRun = function() {
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

module.exports = mongoose.model('LoadTest', loadTestSchema);