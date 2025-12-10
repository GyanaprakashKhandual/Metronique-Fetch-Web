const mongoose = require('mongoose');

const testFileSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    folder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestFolder',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    extension: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['test', 'feature', 'step_definition', 'config', 'util', 'helper', 'data', 'pom', 'testng', 'properties', 'java', 'xml', 'json', 'yaml', 'markdown', 'other'],
        default: 'other'
    },
    language: {
        type: String,
        enum: ['java', 'javascript', 'typescript', 'python', 'xml', 'json', 'yaml', 'properties', 'gherkin', 'markdown', 'text'],
        default: 'text'
    },
    content: {
        type: String,
        required: true
    },
    originalContent: String,
    size: {
        type: Number,
        default: 0
    },
    lines: {
        type: Number,
        default: 0
    },
    encoding: {
        type: String,
        default: 'utf-8'
    },
    syntax: {
        valid: {
            type: Boolean,
            default: true
        },
        errors: [{
            line: Number,
            column: Number,
            message: String,
            severity: {
                type: String,
                enum: ['error', 'warning', 'info']
            }
        }]
    },
    metadata: {
        className: String,
        packageName: String,
        imports: [String],
        methods: [{
            name: String,
            annotations: [String],
            parameters: [String]
        }],
        annotations: [String],
        dependencies: [String]
    },
    version: {
        current: {
            type: Number,
            default: 1
        },
        history: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FileVersion'
        }]
    },
    status: {
        type: String,
        enum: ['draft', 'modified', 'validated', 'compiled', 'error'],
        default: 'draft'
    },
    isGenerated: {
        type: Boolean,
        default: false
    },
    generatedBy: {
        type: String,
        enum: ['ai', 'user', 'system'],
        default: 'user'
    },
    aiProvider: {
        type: String,
        enum: ['openai', 'anthropic']
    },
    isEditable: {
        type: Boolean,
        default: true
    },
    isSystemFile: {
        type: Boolean,
        default: false
    },
    lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lockedAt: Date,
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastModifiedAt: Date,
    lastValidatedAt: Date,
    lastCompiledAt: Date,
    checksum: String,
    tags: [String],
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

testFileSchema.index({ project: 1, path: 1 }, { unique: true });
testFileSchema.index({ project: 1, folder: 1 });
testFileSchema.index({ project: 1, type: 1 });
testFileSchema.index({ folder: 1 });
testFileSchema.index({ name: 1 });
testFileSchema.index({ extension: 1 });
testFileSchema.index({ status: 1 });
testFileSchema.index({ isDeleted: 1 });
testFileSchema.index({ createdBy: 1 });
testFileSchema.index({ lockedBy: 1 });

testFileSchema.pre('save', function (next) {
    if (this.isModified('content')) {
        this.size = Buffer.byteLength(this.content, 'utf-8');
        this.lines = this.content.split('\n').length;
        this.lastModifiedAt = Date.now();
    }
    next();
});

testFileSchema.methods.lock = async function (userId) {
    this.lockedBy = userId;
    this.lockedAt = Date.now();
    await this.save();
};

testFileSchema.methods.unlock = async function () {
    this.lockedBy = undefined;
    this.lockedAt = undefined;
    await this.save();
};

testFileSchema.methods.isLocked = function () {
    return !!this.lockedBy;
};

testFileSchema.methods.canEdit = function (userId) {
    if (!this.isEditable) return false;
    if (this.isSystemFile) return false;
    if (!this.lockedBy) return true;
    return this.lockedBy.toString() === userId.toString();
};

testFileSchema.methods.updateContent = async function (newContent, userId) {
    this.content = newContent;
    this.lastModifiedBy = userId;
    this.lastModifiedAt = Date.now();
    this.version.current++;
    await this.save();
};

testFileSchema.methods.softDelete = async function (userId) {
    this.isDeleted = true;
    this.deletedAt = Date.now();
    this.deletedBy = userId;
    await this.save();
};

testFileSchema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    await this.save();
};

module.exports = mongoose.model('TestFile', testFileSchema);