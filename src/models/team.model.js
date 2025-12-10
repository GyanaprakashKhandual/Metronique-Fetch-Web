const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String
    },
    avatar: {
        url: String,
        publicId: String
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamMember'
    }],
    settings: {
        visibility: {
            type: String,
            enum: ['private', 'public'],
            default: 'private'
        },
        allowMemberInvites: {
            type: Boolean,
            default: false
        },
        requireApprovalForJoin: {
            type: Boolean,
            default: true
        },
        defaultMemberRole: {
            type: String,
            enum: ['viewer', 'member', 'admin'],
            default: 'member'
        }
    },
    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'team', 'business', 'enterprise'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'trial', 'cancelled', 'expired'],
            default: 'trial'
        },
        seats: {
            type: Number,
            default: 5
        },
        usedSeats: {
            type: Number,
            default: 1
        },
        billingEmail: String,
        stripeCustomerId: String,
        stripeSubscriptionId: String
    },
    stats: {
        totalMembers: {
            type: Number,
            default: 1
        },
        totalProjects: {
            type: Number,
            default: 0
        },
        totalTests: {
            type: Number,
            default: 0
        },
        totalTestsPassed: {
            type: Number,
            default: 0
        },
        totalTestsFailed: {
            type: Number,
            default: 0
        }
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

teamSchema.index({ owner: 1 });
teamSchema.index({ slug: 1 });
teamSchema.index({ isActive: 1, isDeleted: 1 });
teamSchema.index({ createdAt: -1 });

teamSchema.pre('save', function (next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    next();
});

teamSchema.methods.hasAvailableSeats = function () {
    return this.subscription.usedSeats < this.subscription.seats;
};

teamSchema.methods.addMember = async function (memberId) {
    if (!this.hasAvailableSeats()) {
        throw new Error('No available seats in team subscription');
    }

    this.members.push(memberId);
    this.subscription.usedSeats++;
    this.stats.totalMembers++;
    await this.save();
};

teamSchema.methods.removeMember = async function (memberId) {
    this.members = this.members.filter(m => m.toString() !== memberId.toString());
    this.subscription.usedSeats--;
    this.stats.totalMembers--;
    await this.save();
};

module.exports = mongoose.model('Team', teamSchema);