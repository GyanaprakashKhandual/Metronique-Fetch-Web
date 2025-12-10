const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    uploadedFilename: {
        type: String,
        unique: true,
        sparse: true
    },
    fileUrl: {
        type: String
    },
    mimeType: {
        type: String
    },
    fileType: {
        type: String,
        enum: ['image', 'video', 'document', 'other'],
        default: 'document'
    },
    size: {
        type: Number
    },
    sizeFormatted: {
        type: String
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

fileSchema.index({ userId: 1, uploadedAt: -1 });
fileSchema.index({ fileType: 1 });
fileSchema.index({ uploadedFilename: 1 });
fileSchema.index({ userId: 1, fileType: 1 });

fileSchema.pre('save', function(next) {
    try {
        console.log(`[FILE_MODEL] PRE_SAVE | File: ${this.filename} | User: ${this.userId} | Size: ${this.size}`);
        next();
    } catch (error) {
        console.error(`[FILE_MODEL] PRE_SAVE_ERROR | Error: ${error.message}`);
        next(error);
    }
});

fileSchema.post('save', function(doc) {
    try {
        console.log(`[FILE_MODEL] POST_SAVE_SUCCESS | File ID: ${doc._id} | Filename: ${doc.filename}`);
    } catch (error) {
        console.error(`[FILE_MODEL] POST_SAVE_ERROR | Error: ${error.message}`);
    }
});

fileSchema.pre('deleteOne', { document: true }, function(next) {
    try {
        console.log(`[FILE_MODEL] PRE_DELETE | File ID: ${this._id} | Filename: ${this.filename}`);
        next();
    } catch (error) {
        console.error(`[FILE_MODEL] PRE_DELETE_ERROR | Error: ${error.message}`);
        next(error);
    }
});

fileSchema.post('deleteOne', { document: true }, function(doc) {
    try {
        console.log(`[FILE_MODEL] POST_DELETE_SUCCESS | File ID: ${doc._id} | Filename: ${doc.filename}`);
    } catch (error) {
        console.error(`[FILE_MODEL] POST_DELETE_ERROR | Error: ${error.message}`);
    }
});

console.log('[MODEL] File model loaded');

module.exports = mongoose.model('File', fileSchema);