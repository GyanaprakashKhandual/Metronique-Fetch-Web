const fs = require('fs').promises;
const path = require('path');
const File = require('../models/file.model');
const FileUploadUtils = require('../utils/file.upload.util');
const uploadConfig = require('../configs/upload.config');

class FileUploadController {
    static async uploadSingleFile(req, res) {
        const startTime = Date.now();
        const userId = req.user.id;
        const fileName = req.file?.originalname;

        try {
            console.log(`[UPLOAD_SINGLE] START | User: ${userId} | File: ${fileName}`);

            if (!req.file) {
                console.warn(`[UPLOAD_SINGLE] NO_FILE_PROVIDED | User: ${userId}`);
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                    code: 'NO_FILE_PROVIDED'
                });
            }

            const fileExtension = FileUploadUtils.getFileExtension(req.file.originalname);
            const fileCategory = FileUploadUtils.getFileCategory(fileExtension);
            const fileUrl = FileUploadUtils.buildFileUrl(req.file.filename);

            console.log(`[UPLOAD_SINGLE] FILE_ANALYSIS | Extension: ${fileExtension} | Category: ${fileCategory} | Size: ${req.file.size} bytes`);

            const fileData = {
                filename: req.file.originalname,
                uploadedFilename: req.file.filename,
                fileUrl: fileUrl,
                mimeType: req.file.mimetype,
                fileType: fileCategory,
                size: req.file.size,
                sizeFormatted: FileUploadUtils.formatFileSize(req.file.size),
                uploadedAt: new Date(),
                userId: userId
            };

            const savedFile = await File.create(fileData);

            console.log(`[UPLOAD_SINGLE] SUCCESS | File ID: ${savedFile._id} | Size: ${fileData.sizeFormatted} | Duration: ${Date.now() - startTime}ms`);

            return res.status(201).json({
                success: true,
                message: 'File uploaded successfully',
                data: {
                    id: savedFile._id,
                    filename: savedFile.filename,
                    uploadedFilename: savedFile.uploadedFilename,
                    fileUrl: savedFile.fileUrl,
                    mimeType: savedFile.mimeType,
                    fileType: savedFile.fileType,
                    size: savedFile.size,
                    sizeFormatted: savedFile.sizeFormatted,
                    uploadedAt: savedFile.uploadedAt
                }
            });
        } catch (error) {
            console.error(`[UPLOAD_SINGLE] ERROR | User: ${userId} | File: ${fileName} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

            if (req.file) {
                try {
                    await fs.unlink(req.file.path);
                    console.log(`[UPLOAD_SINGLE] CLEANUP | Temporary file deleted`);
                } catch (err) {
                    console.error(`[UPLOAD_SINGLE] CLEANUP_FAILED | Error: ${err.message}`);
                }
            }

            return res.status(500).json({
                success: false,
                message: 'File upload failed',
                error: error.message,
                code: 'UPLOAD_FAILED'
            });
        }
    }

    static async uploadMultipleFiles(req, res) {
        const startTime = Date.now();
        const userId = req.user.id;
        const fileCount = req.files?.length || 0;

        try {
            console.log(`[UPLOAD_MULTIPLE] START | User: ${userId} | Files: ${fileCount}`);

            if (!req.files || req.files.length === 0) {
                console.warn(`[UPLOAD_MULTIPLE] NO_FILES_PROVIDED | User: ${userId}`);
                return res.status(400).json({
                    success: false,
                    message: 'No files uploaded',
                    code: 'NO_FILES_PROVIDED'
                });
            }

            const uploadedFiles = [];
            const failedFiles = [];

            for (const file of req.files) {
                try {
                    console.log(`[UPLOAD_MULTIPLE] PROCESSING | File: ${file.originalname} | Size: ${file.size} bytes`);

                    const fileExtension = FileUploadUtils.getFileExtension(file.originalname);
                    const fileCategory = FileUploadUtils.getFileCategory(fileExtension);
                    const fileUrl = FileUploadUtils.buildFileUrl(file.filename);

                    const fileData = {
                        filename: file.originalname,
                        uploadedFilename: file.filename,
                        fileUrl: fileUrl,
                        mimeType: file.mimetype,
                        fileType: fileCategory,
                        size: file.size,
                        sizeFormatted: FileUploadUtils.formatFileSize(file.size),
                        uploadedAt: new Date(),
                        userId: userId
                    };

                    const savedFile = await File.create(fileData);

                    uploadedFiles.push({
                        id: savedFile._id,
                        filename: savedFile.filename,
                        uploadedFilename: savedFile.uploadedFilename,
                        fileUrl: savedFile.fileUrl,
                        mimeType: savedFile.mimeType,
                        fileType: savedFile.fileType,
                        size: savedFile.size,
                        sizeFormatted: savedFile.sizeFormatted,
                        uploadedAt: savedFile.uploadedAt
                    });

                    console.log(`[UPLOAD_MULTIPLE] FILE_SAVED | File ID: ${savedFile._id} | File: ${file.originalname}`);
                } catch (err) {
                    console.error(`[UPLOAD_MULTIPLE] FILE_FAILED | File: ${file.originalname} | Error: ${err.message}`);
                    failedFiles.push({
                        filename: file.originalname,
                        error: err.message
                    });
                }
            }

            if (uploadedFiles.length === 0) {
                console.warn(`[UPLOAD_MULTIPLE] ALL_FAILED | User: ${userId} | Total: ${fileCount}`);
                return res.status(400).json({
                    success: false,
                    message: 'No files could be uploaded',
                    failedFiles: failedFiles,
                    code: 'ALL_FILES_FAILED'
                });
            }

            console.log(`[UPLOAD_MULTIPLE] SUCCESS | User: ${userId} | Uploaded: ${uploadedFiles.length}/${fileCount} | Duration: ${Date.now() - startTime}ms`);

            return res.status(201).json({
                success: true,
                message: `${uploadedFiles.length} file(s) uploaded successfully`,
                data: uploadedFiles,
                failedCount: failedFiles.length,
                failedFiles: failedFiles.length > 0 ? failedFiles : undefined
            });
        } catch (error) {
            console.error(`[UPLOAD_MULTIPLE] CRITICAL_ERROR | User: ${userId} | Files: ${fileCount} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

            if (req.files) {
                for (const file of req.files) {
                    try {
                        await fs.unlink(file.path);
                    } catch (err) {
                        console.error(`[UPLOAD_MULTIPLE] CLEANUP_FAILED | File: ${file.originalname} | Error: ${err.message}`);
                    }
                }
                console.log(`[UPLOAD_MULTIPLE] CLEANUP | All temporary files deleted`);
            }

            return res.status(500).json({
                success: false,
                message: 'Files upload failed',
                error: error.message,
                code: 'UPLOAD_FAILED'
            });
        }
    }

    static async getFiles(req, res) {
        const startTime = Date.now();
        const userId = req.user.id;

        try {
            console.log(`[GET_FILES] START | User: ${userId}`);

            const files = await File.find({ userId: userId }).sort({ uploadedAt: -1 });

            console.log(`[GET_FILES] SUCCESS | User: ${userId} | Total Files: ${files.length} | Duration: ${Date.now() - startTime}ms`);

            return res.status(200).json({
                success: true,
                data: files,
                count: files.length
            });
        } catch (error) {
            console.error(`[GET_FILES] ERROR | User: ${userId} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch files',
                error: error.message,
                code: 'FETCH_FAILED'
            });
        }
    }

    static async getFilesByType(req, res) {
        const startTime = Date.now();
        const userId = req.user.id;
        const { fileType } = req.params;

        try {
            console.log(`[GET_FILES_BY_TYPE] START | User: ${userId} | Type: ${fileType}`);

            const validTypes = Object.keys(uploadConfig.fileCategories);

            if (!validTypes.includes(fileType)) {
                console.warn(`[GET_FILES_BY_TYPE] INVALID_TYPE | User: ${userId} | Type: ${fileType}`);
                return res.status(400).json({
                    success: false,
                    message: `Invalid file type. Allowed types: ${validTypes.join(', ')}`,
                    code: 'INVALID_FILE_TYPE'
                });
            }

            const files = await File.find({
                userId: userId,
                fileType: fileType
            }).sort({ uploadedAt: -1 });

            console.log(`[GET_FILES_BY_TYPE] SUCCESS | User: ${userId} | Type: ${fileType} | Total: ${files.length} | Duration: ${Date.now() - startTime}ms`);

            return res.status(200).json({
                success: true,
                data: files,
                count: files.length,
                fileType: fileType
            });
        } catch (error) {
            console.error(`[GET_FILES_BY_TYPE] ERROR | User: ${userId} | Type: ${fileType} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch files',
                error: error.message,
                code: 'FETCH_FAILED'
            });
        }
    }

    static async deleteFile(req, res) {
        const startTime = Date.now();
        const userId = req.user.id;
        const { fileId } = req.params;

        try {
            console.log(`[DELETE_FILE] START | User: ${userId} | File ID: ${fileId}`);

            const file = await File.findOne({
                _id: fileId,
                userId: userId
            });

            if (!file) {
                console.warn(`[DELETE_FILE] NOT_FOUND | User: ${userId} | File ID: ${fileId}`);
                return res.status(404).json({
                    success: false,
                    message: 'File not found',
                    code: 'FILE_NOT_FOUND'
                });
            }

            const deleted = await FileUploadUtils.deleteFile(file.fileUrl);

            if (deleted) {
                await File.deleteOne({ _id: fileId });
                console.log(`[DELETE_FILE] FILE_DELETED | User: ${userId} | File ID: ${fileId}`);
            } else {
                console.warn(`[DELETE_FILE] STORAGE_DELETE_FAILED | User: ${userId} | File ID: ${fileId}`);
            }

            console.log(`[DELETE_FILE] SUCCESS | User: ${userId} | File ID: ${fileId} | Duration: ${Date.now() - startTime}ms`);

            return res.status(200).json({
                success: true,
                message: 'File deleted successfully'
            });
        } catch (error) {
            console.error(`[DELETE_FILE] ERROR | User: ${userId} | File ID: ${fileId} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

            return res.status(500).json({
                success: false,
                message: 'Failed to delete file',
                error: error.message,
                code: 'DELETE_FAILED'
            });
        }
    }

    static async deleteMultipleFiles(req, res) {
        const startTime = Date.now();
        const userId = req.user.id;
        const { fileIds } = req.body;

        try {
            console.log(`[DELETE_MULTIPLE] START | User: ${userId} | File IDs: ${fileIds?.length || 0}`);

            if (!Array.isArray(fileIds) || fileIds.length === 0) {
                console.warn(`[DELETE_MULTIPLE] INVALID_INPUT | User: ${userId}`);
                return res.status(400).json({
                    success: false,
                    message: 'Please provide file IDs',
                    code: 'INVALID_INPUT'
                });
            }

            const files = await File.find({
                _id: { $in: fileIds },
                userId: userId
            });

            if (files.length === 0) {
                console.warn(`[DELETE_MULTIPLE] NO_FILES_FOUND | User: ${userId} | Requested: ${fileIds.length}`);
                return res.status(404).json({
                    success: false,
                    message: 'No files found',
                    code: 'FILES_NOT_FOUND'
                });
            }

            let deletedCount = 0;
            let failedCount = 0;

            for (const file of files) {
                try {
                    const deleted = await FileUploadUtils.deleteFile(file.fileUrl);
                    if (deleted) {
                        deletedCount++;
                    } else {
                        failedCount++;
                        console.warn(`[DELETE_MULTIPLE] STORAGE_DELETE_FAILED | File ID: ${file._id}`);
                    }
                } catch (err) {
                    failedCount++;
                    console.error(`[DELETE_MULTIPLE] FILE_DELETE_ERROR | File ID: ${file._id} | Error: ${err.message}`);
                }
            }

            await File.deleteMany({
                _id: { $in: fileIds },
                userId: userId
            });

            console.log(`[DELETE_MULTIPLE] SUCCESS | User: ${userId} | Deleted: ${deletedCount} | Failed: ${failedCount} | Duration: ${Date.now() - startTime}ms`);

            return res.status(200).json({
                success: true,
                message: `${deletedCount} file(s) deleted successfully`,
                deleted: deletedCount,
                failed: failedCount
            });
        } catch (error) {
            console.error(`[DELETE_MULTIPLE] ERROR | User: ${userId} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

            return res.status(500).json({
                success: false,
                message: 'Failed to delete files',
                error: error.message,
                code: 'DELETE_FAILED'
            });
        }
    }

    static async getFileStats(req, res) {
        const startTime = Date.now();
        const userId = req.user.id;

        try {
            console.log(`[GET_FILE_STATS] START | User: ${userId}`);

            const files = await File.find({ userId: userId });

            const totalSize = files.reduce((sum, file) => sum + file.size, 0);

            const stats = {
                totalFiles: files.length,
                totalSize: totalSize,
                totalSizeFormatted: FileUploadUtils.formatFileSize(totalSize),
                byType: {}
            };

            for (const category of Object.keys(uploadConfig.fileCategories)) {
                const categoryFiles = files.filter(f => f.fileType === category);
                const categorySize = categoryFiles.reduce((sum, file) => sum + file.size, 0);

                stats.byType[category] = {
                    count: categoryFiles.length,
                    size: categorySize,
                    sizeFormatted: FileUploadUtils.formatFileSize(categorySize)
                };
            }

            console.log(`[GET_FILE_STATS] SUCCESS | User: ${userId} | Total Files: ${stats.totalFiles} | Total Size: ${stats.totalSizeFormatted} | Duration: ${Date.now() - startTime}ms`);

            return res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error(`[GET_FILE_STATS] ERROR | User: ${userId} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

            return res.status(500).json({
                success: false,
                message: 'Failed to get file statistics',
                error: error.message,
                code: 'STATS_FAILED'
            });
        }
    }
}

module.exports = FileUploadController;