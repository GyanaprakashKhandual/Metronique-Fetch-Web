const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadConfig = require('./upload.config');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = uploadConfig.uploadFolder;

        if (!fs.existsSync(uploadDir)) {
            try {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log(`[MULTER] UPLOAD_DIR_CREATED | Path: ${uploadDir}`);
            } catch (error) {
                console.error(`[MULTER] DIR_CREATION_FAILED | Path: ${uploadDir} | Error: ${error.message}`);
                return cb(error);
            }
        }

        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        try {
            const timestamp = Date.now();
            const random = Math.round(Math.random() * 1E9);
            const fileExtension = path.extname(file.originalname);
            const uniqueName = `${timestamp}-${random}${fileExtension}`;

            console.log(`[MULTER] FILENAME_GENERATED | Original: ${file.originalname} | Unique: ${uniqueName}`);

            cb(null, uniqueName);
        } catch (error) {
            console.error(`[MULTER] FILENAME_GENERATION_FAILED | File: ${file.originalname} | Error: ${error.message}`);
            cb(error);
        }
    }
});

const fileFilter = (req, file, cb) => {
    try {
        const mimeType = file.mimetype;
        const isAllowed = uploadConfig.allowedMimeTypes.includes(mimeType);

        if (isAllowed) {
            console.log(`[MULTER] FILE_FILTER_PASSED | File: ${file.originalname} | MIME: ${mimeType}`);
            cb(null, true);
        } else {
            const errorMessage = `File type not allowed. Allowed types: ${uploadConfig.allowedExtensions.join(', ')}`;
            console.warn(`[MULTER] FILE_FILTER_REJECTED | File: ${file.originalname} | MIME: ${mimeType}`);
            cb(new Error(errorMessage), false);
        }
    } catch (error) {
        console.error(`[MULTER] FILE_FILTER_ERROR | File: ${file.originalname} | Error: ${error.message}`);
        cb(error);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: uploadConfig.maxFileSize
    }
});

console.log(`[MULTER] INIT_COMPLETE | Max Size: ${uploadConfig.maxFileSize} bytes`);

module.exports = upload;