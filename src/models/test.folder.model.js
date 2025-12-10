const mongoose = require('mongoose');

const testFolderSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
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
    parentFolder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestFolder'
    },
    type: {
        type: String,
        enum: [
            'root',
            'test',
            'step',
            'hook',
            'runner',
            'utility',
            'config',
            'base',
            'listener',
            'helper',
            'provider',
            'model',
            'feature',
            'resource',
            'custom'
        ],
        default: 'custom'
    },
    level: {
        type: Number,
        default: 0
    },
    description: String,
    subFolders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestFolder'
    }],
    files: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestFile'
    }],
    structure: {
        packageName: String,
        namespace: String,
        isPackageFolder: {
            type: Boolean,
            default: false
        }
    },
    metadata: {
        totalFiles: {
            type: Number,
            default: 0
        },
        totalSubFolders: {
            type: Number,
            default: 0
        },
        totalSize: {
            type: Number,
            default: 0
        }
    },
    permissions: {
        canEdit: {
            type: Boolean,
            default: true
        },
        canDelete: {
            type: Boolean,
            default: true
        },
        canRename: {
            type: Boolean,
            default: true
        }
    },
    isSystemFolder: {
        type: Boolean,
        default: false
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

testFolderSchema.index({ project: 1, path: 1 }, { unique: true });
testFolderSchema.index({ project: 1, parentFolder: 1 });
testFolderSchema.index({ project: 1, type: 1 });
testFolderSchema.index({ parentFolder: 1 });
testFolderSchema.index({ isDeleted: 1 });
testFolderSchema.index({ createdBy: 1 });

testFolderSchema.methods.getFullPath = function() {
    return this.path;
};

testFolderSchema.methods.addSubFolder = async function(folderId) {
    if (!this.subFolders.includes(folderId)) {
        this.subFolders.push(folderId);
        this.metadata.totalSubFolders++;
        await this.save();
    }
};

testFolderSchema.methods.removeSubFolder = async function(folderId) {
    this.subFolders = this.subFolders.filter(id => id.toString() !== folderId.toString());
    this.metadata.totalSubFolders--;
    await this.save();
};

testFolderSchema.methods.addFile = async function(fileId, fileSize) {
    if (!this.files.includes(fileId)) {
        this.files.push(fileId);
        this.metadata.totalFiles++;
        this.metadata.totalSize += fileSize || 0;
        await this.save();
    }
};

testFolderSchema.methods.removeFile = async function(fileId, fileSize) {
    this.files = this.files.filter(id => id.toString() !== fileId.toString());
    this.metadata.totalFiles--;
    this.metadata.totalSize -= fileSize || 0;
    await this.save();
};

testFolderSchema.methods.softDelete = async function(userId) {
    this.isDeleted = true;
    this.deletedAt = Date.now();
    this.deletedBy = userId;
    await this.save();
};

module.exports = mongoose.model('TestFolder', testFolderSchema);