const uploadConfig = require('../configs/upload.config');
const FileUploadUtils = require('../utils/file.upload.util');

const validateUploadMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const userId = req.user?._id || 'anonymous';

    try {
        console.log(`[VALIDATE_UPLOAD] START | User ID: ${userId} | Method: ${req.method} | Path: ${req.path} | IP: ${req.ip}`);

        if (!req.file && !req.files) {
            console.warn(`[VALIDATE_UPLOAD] NO_FILES | User ID: ${userId} | IP: ${req.ip}`);
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
                code: 'NO_FILES_PROVIDED'
            });
        }

        const files = req.files || [req.file];

        console.log(`[VALIDATE_UPLOAD] FILE_COUNT | Total: ${files.length} | User ID: ${userId}`);

        for (let index = 0; index < files.length; index++) {
            const file = files[index];

            console.log(`[VALIDATE_UPLOAD] VALIDATING | Index: ${index + 1}/${files.length} | File: ${file.originalname} | Size: ${FileUploadUtils.formatFileSize(file.size)} | MIME: ${file.mimetype}`);

            if (!FileUploadUtils.validateFileSize(file.size)) {
                console.warn(`[VALIDATE_UPLOAD] SIZE_EXCEEDED | User ID: ${userId} | File: ${file.originalname} | Size: ${FileUploadUtils.formatFileSize(file.size)} | Max: ${uploadConfig.maxFileSizeMB}MB`);
                return res.status(413).json({
                    success: false,
                    message: `File size exceeds maximum limit of ${uploadConfig.maxFileSizeMB}MB`,
                    code: 'FILE_SIZE_EXCEEDED',
                    filename: file.originalname,
                    fileSize: FileUploadUtils.formatFileSize(file.size),
                    maxSize: `${uploadConfig.maxFileSizeMB}MB`
                });
            }

            if (!FileUploadUtils.validateFileType(file.mimetype)) {
                console.warn(`[VALIDATE_UPLOAD] TYPE_NOT_ALLOWED | User ID: ${userId} | File: ${file.originalname} | MIME: ${file.mimetype} | Allowed: ${uploadConfig.allowedExtensions.join(', ')}`);
                return res.status(415).json({
                    success: false,
                    message: `File type not allowed. Allowed types: ${uploadConfig.allowedExtensions.join(', ')}`,
                    code: 'FILE_TYPE_NOT_ALLOWED',
                    filename: file.originalname,
                    receivedType: file.mimetype,
                    allowedTypes: uploadConfig.allowedExtensions
                });
            }

            const fileExtension = FileUploadUtils.getFileExtension(file.originalname);
            const fileCategory = FileUploadUtils.getFileCategory(fileExtension);

            console.log(`[VALIDATE_UPLOAD] FILE_VALID | File: ${file.originalname} | Category: ${fileCategory} | Progress: ${index + 1}/${files.length}`);
        }

        console.log(`[VALIDATE_UPLOAD] SUCCESS | User ID: ${userId} | Total Files: ${files.length} | Duration: ${Date.now() - startTime}ms`);

        next();
    } catch (error) {
        console.error(`[VALIDATE_UPLOAD] ERROR | User ID: ${userId} | Error: ${error.message} | Stack: ${error.stack} | Duration: ${Date.now() - startTime}ms`);

        return res.status(500).json({
            success: false,
            message: 'File validation failed',
            error: error.message,
            code: 'VALIDATION_ERROR'
        });
    }
};

const validateSingleUploadMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const userId = req.user?._id || 'anonymous';

    try {
        console.log(`[VALIDATE_SINGLE_UPLOAD] START | User ID: ${userId} | IP: ${req.ip}`);

        if (!req.file) {
            console.warn(`[VALIDATE_SINGLE_UPLOAD] NO_FILE | User ID: ${userId}`);
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
                code: 'NO_FILE_PROVIDED'
            });
        }

        const file = req.file;

        console.log(`[VALIDATE_SINGLE_UPLOAD] VALIDATING | File: ${file.originalname} | Size: ${FileUploadUtils.formatFileSize(file.size)} | MIME: ${file.mimetype}`);

        if (!FileUploadUtils.validateFileSize(file.size)) {
            console.warn(`[VALIDATE_SINGLE_UPLOAD] SIZE_EXCEEDED | User ID: ${userId} | File: ${file.originalname} | Size: ${FileUploadUtils.formatFileSize(file.size)} | Max: ${uploadConfig.maxFileSizeMB}MB`);
            return res.status(413).json({
                success: false,
                message: `File size exceeds maximum limit of ${uploadConfig.maxFileSizeMB}MB`,
                code: 'FILE_SIZE_EXCEEDED',
                filename: file.originalname,
                fileSize: FileUploadUtils.formatFileSize(file.size),
                maxSize: `${uploadConfig.maxFileSizeMB}MB`
            });
        }

        if (!FileUploadUtils.validateFileType(file.mimetype)) {
            console.warn(`[VALIDATE_SINGLE_UPLOAD] TYPE_NOT_ALLOWED | User ID: ${userId} | File: ${file.originalname} | MIME: ${file.mimetype}`);
            return res.status(415).json({
                success: false,
                message: `File type not allowed. Allowed types: ${uploadConfig.allowedExtensions.join(', ')}`,
                code: 'FILE_TYPE_NOT_ALLOWED',
                filename: file.originalname,
                receivedType: file.mimetype,
                allowedTypes: uploadConfig.allowedExtensions
            });
        }

        const fileExtension = FileUploadUtils.getFileExtension(file.originalname);
        const fileCategory = FileUploadUtils.getFileCategory(fileExtension);

        console.log(`[VALIDATE_SINGLE_UPLOAD] SUCCESS | User ID: ${userId} | File: ${file.originalname} | Category: ${fileCategory} | Duration: ${Date.now() - startTime}ms`);

        next();
    } catch (error) {
        console.error(`[VALIDATE_SINGLE_UPLOAD] ERROR | User ID: ${userId} | Error: ${error.message} | Duration: ${Date.now() - startTime}ms`);

        return res.status(500).json({
            success: false,
            message: 'File validation failed',
            error: error.message,
            code: 'VALIDATION_ERROR'
        });
    }
};

module.exports = {
    validateUploadMiddleware,
    validateSingleUploadMiddleware
};