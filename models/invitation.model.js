const mongoose = require('mongoose');
const crypto = require('crypto');

const invitationSchema = new mongoose.Schema({
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    invitedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    role: {
        type: String,
        enum: ['admin', 'member', 'viewer'],
        default: 'member'
    },
    token: {
        type: String
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
        default: 'pending'
    },
    respondedAt: Date,
    declineReason: String,
    message: {
        type: String
    },
    projectsAccess: [{
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project'
        },
        accessLevel: {
            type: String,
            enum: ['view', 'edit', 'admin'],
            default: 'view'
        }
    }],
    reminderSent: {
        type: Boolean,
        default: false
    },
    reminderSentAt: Date,
    metadata: {
        ipAddress: String,
        userAgent: String,
        acceptedFrom: {
            ipAddress: String,
            userAgent: String,
            location: String
        }
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

invitationSchema.index({ team: 1, email: 1 });
invitationSchema.index({ token: 1 });
invitationSchema.index({ status: 1 });
invitationSchema.index({ expiresAt: 1 });
invitationSchema.index({ invitedUser: 1 });

invitationSchema.pre('save', function (next) {
    if (this.isNew) {
        this.token = crypto.randomBytes(32).toString('hex');
    }
    next();
});

invitationSchema.methods.isExpired = function () {
    return this.expiresAt < Date.now();
};

invitationSchema.methods.accept = async function (userId) {
    if (this.isExpired()) {
        this.status = 'expired';
        await this.save();
        throw new Error('Invitation has expired');
    }

    if (this.status !== 'pending') {
        throw new Error('Invitation is not in pending status');
    }

    this.status = 'accepted';
    this.respondedAt = Date.now();
    this.invitedUser = userId;
    await this.save();
};

invitationSchema.methods.decline = async function (reason) {
    if (this.status !== 'pending') {
        throw new Error('Invitation is not in pending status');
    }

    this.status = 'declined';
    this.respondedAt = Date.now();
    this.declineReason = reason;
    await this.save();
};

invitationSchema.methods.cancel = async function () {
    if (this.status !== 'pending') {
        throw new Error('Can only cancel pending invitations');
    }

    this.status = 'cancelled';
    await this.save();
};

invitationSchema.methods.resend = async function () {
    if (this.status !== 'pending') {
        throw new Error('Can only resend pending invitations');
    }

    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    this.reminderSent = true;
    this.reminderSentAt = Date.now();
    await this.save();
};

module.exports = mongoose.model('Invitation', invitationSchema);