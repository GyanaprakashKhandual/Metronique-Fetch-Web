const path = require('path');
const fs = require('fs').promises;
const uploadConfig = require('../configs/upload.config');

class FileUploadUtils {
    static getFileCategory(extension) {
        try {
            const ext = extension.toLowerCase().trim();

            console.log(`[FILE_UTIL] GET_CATEGORY | Extension: ${ext}`);

            for (const [category, extensions] of Object.entries(uploadConfig.fileCategories)) {
                if (extensions.includes(ext)) {
                    console.log(`[FILE_UTIL] CATEGORY_FOUND | Extension: ${ext} | Category: ${category}`);
                    return category;
                }
            }

            console.log(`[FILE_UTIL] CATEGORY_DEFAULT | Extension: ${ext} | Using: document`);
            return 'document';
        } catch (error) {
            console.error(`[FILE_UTIL] GET_CATEGORY_ERROR | Extension: ${extension} | Error: ${error.message}`);
            return 'document';
        }
    }

    static formatFileSize(bytes) {
        try {
            if (bytes === 0) {
                console.log(`[FILE_UTIL] FORMAT_SIZE | Bytes: 0 | Result: 0 Bytes`);
                return '0 Bytes';
            }

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            const result = Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];

            console.log(`[FILE_UTIL] FORMAT_SIZE | Bytes: ${bytes} | Result: ${result}`);

            return result;
        } catch (error) {
            console.error(`[FILE_UTIL] FORMAT_SIZE_ERROR | Bytes: ${bytes} | Error: ${error.message}`);
            return `${bytes} Bytes`;
        }
    }

    static getFileExtension(filename) {
        try {
            const ext = path.extname(filename).slice(1).toLowerCase();

            console.log(`[FILE_UTIL] GET_EXTENSION | Filename: ${filename} | Extension: ${ext}`);

            return ext;
        } catch (error) {
            console.error(`[FILE_UTIL] GET_EXTENSION_ERROR | Filename: ${filename} | Error: ${error.message}`);
            return '';
        }
    }

    static validateFileSize(size) {
        try {
            const isValid = size <= uploadConfig.maxFileSize;

            console.log(`[FILE_UTIL] VALIDATE_SIZE | Size: ${size} | Max: ${uploadConfig.maxFileSize} | Valid: ${isValid}`);

            return isValid;
        } catch (error) {
            console.error(`[FILE_UTIL] VALIDATE_SIZE_ERROR | Size: ${size} | Error: ${error.message}`);
            return false;
        }
    }

    static validateFileType(mimeType) {
        try {
            const isValid = uploadConfig.allowedMimeTypes.includes(mimeType);

            console.log(`[FILE_UTIL] VALIDATE_TYPE | MIME: ${mimeType} | Valid: ${isValid}`);

            return isValid;
        } catch (error) {
            console.error(`[FILE_UTIL] VALIDATE_TYPE_ERROR | MIME: ${mimeType} | Error: ${error.message}`);
            return false;
        }
    }

    static async deleteFile(filePath) {
        try {
            console.log(`[FILE_UTIL] DELETE_FILE_START | FilePath: ${filePath}`);

            const fullPath = path.join(uploadConfig.uploadFolder, path.basename(filePath));

            console.log(`[FILE_UTIL] DELETE_FILE_FULL_PATH | FullPath: ${fullPath}`);

            const fileExists = await FileUploadUtils.fileExists(fullPath);

            if (!fileExists) {
                console.warn(`[FILE_UTIL] DELETE_FILE_NOT_EXISTS | Path: ${fullPath}`);
                return false;
            }

            await fs.unlink(fullPath);

            console.log(`[FILE_UTIL] DELETE_FILE_SUCCESS | Path: ${fullPath}`);

            return true;
        } catch (error) {
            console.error(`[FILE_UTIL] DELETE_FILE_ERROR | FilePath: ${filePath} | Error: ${error.message}`);
            return false;
        }
    }

    static async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    static buildFileUrl(filename) {
        try {
            const url = `${uploadConfig.baseUrl}${uploadConfig.uploadPath}/${filename}`;

            console.log(`[FILE_UTIL] BUILD_FILE_URL | Filename: ${filename} | URL: ${url}`);

            return url;
        } catch (error) {
            console.error(`[FILE_UTIL] BUILD_FILE_URL_ERROR | Filename: ${filename} | Error: ${error.message}`);
            return '';
        }
    }

    static parseFilePath(fileUrl) {
        try {
            const filename = path.basename(fileUrl);

            console.log(`[FILE_UTIL] PARSE_FILE_PATH | URL: ${fileUrl} | Filename: ${filename}`);

            return filename;
        } catch (error) {
            console.error(`[FILE_UTIL] PARSE_FILE_PATH_ERROR | URL: ${fileUrl} | Error: ${error.message}`);
            return '';
        }
    }

    static async getFileStats(filePath) {
        try {
            console.log(`[FILE_UTIL] GET_FILE_STATS_START | Path: ${filePath}`);

            const stats = await fs.stat(filePath);

            console.log(`[FILE_UTIL] GET_FILE_STATS_SUCCESS | Path: ${filePath} | Size: ${stats.size} bytes`);

            return stats;
        } catch (error) {
            console.error(`[FILE_UTIL] GET_FILE_STATS_ERROR | Path: ${filePath} | Error: ${error.message}`);
            return null;
        }
    }

    static sanitizeFilename(filename) {
        try {
            const sanitized = filename
                .replace(/[^a-zA-Z0-9._-]/g, '_')
                .replace(/_{2,}/g, '_')
                .toLowerCase();

            console.log(`[FILE_UTIL] SANITIZE_FILENAME | Original: ${filename} | Sanitized: ${sanitized}`);

            return sanitized;
        } catch (error) {
            console.error(`[FILE_UTIL] SANITIZE_FILENAME_ERROR | Filename: ${filename} | Error: ${error.message}`);
            return filename;
        }
    }
}

module.exports = FileUploadUtils;