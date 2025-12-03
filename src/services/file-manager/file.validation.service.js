class FileValidationService {
    constructor() {
        this.allowedExtensions = ['java', 'js', 'ts', 'json', 'xml', 'feature', 'properties', 'pom', 'testng', 'md'];
        this.maxFileSize = 10 * 1024 * 1024;
        this.dangerousPatterns = ['<script', 'javascript:', 'eval(', 'exec('];
    }

    validateFileType(fileName) {
        console.log(`[FileValidationService] Validating file type: ${fileName}`);

        const ext = fileName.split('.').pop().toLowerCase();
        const isValid = this.allowedExtensions.includes(ext);

        console.log(`[FileValidationService] File type validation: ${isValid ? 'VALID' : 'INVALID'}`);
        return { isValid, extension: ext };
    }

    validateFileSize(fileSize) {
        console.log(`[FileValidationService] Validating file size: ${fileSize} bytes`);

        const isValid = fileSize > 0 && fileSize <= this.maxFileSize;
        console.log(`[FileValidationService] File size validation: ${isValid ? 'VALID' : 'INVALID'}`);

        return {
            isValid,
            size: fileSize,
            maxAllowed: this.maxFileSize,
            message: isValid ? 'OK' : `File exceeds maximum size of ${this.maxFileSize} bytes`
        };
    }

    validateFileName(fileName) {
        console.log(`[FileValidationService] Validating file name: ${fileName}`);

        const issues = [];

        if (!fileName || fileName.length === 0) {
            issues.push('File name cannot be empty');
        }

        if (fileName.length > 255) {
            issues.push('File name exceeds 255 characters');
        }

        if (/[<>:"|?*]/.test(fileName)) {
            issues.push('File name contains invalid characters');
        }

        if (fileName.startsWith('.')) {
            issues.push('File name cannot start with a dot');
        }

        const isValid = issues.length === 0;
        console.log(`[FileValidationService] File name validation: ${isValid ? 'VALID' : 'INVALID'}`);

        return { isValid, issues };
    }

    validateFileContent(content, fileType) {
        console.log(`[FileValidationService] Validating file content for type: ${fileType}`);

        const issues = [];

        this.dangerousPatterns.forEach(pattern => {
            if (content.toLowerCase().includes(pattern)) {
                issues.push(`Potential security risk: contains '${pattern}'`);
            }
        });

        const isValid = issues.length === 0;
        console.log(`[FileValidationService] Content validation: ${isValid ? 'SAFE' : 'RISKS DETECTED'}`);

        return { isValid, securityRisks: issues };
    }

    sanitizeFileName(fileName) {
        console.log(`[FileValidationService] Sanitizing file name`);

        let sanitized = fileName
            .replace(/[<>:"|?*]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 255);

        if (sanitized.startsWith('.')) {
            sanitized = sanitized.substring(1);
        }

        console.log(`[FileValidationService] File name sanitized`);
        return sanitized;
    }

    async detectDuplicates(projectId, fileName, folderId) {
        console.log(`[FileValidationService] Detecting duplicates for: ${fileName}`);

        try {
            const TestFile = require('../models/test.file.model');
            const duplicates = await TestFile.find({
                project: projectId,
                folder: folderId,
                name: fileName,
                isDeleted: false
            });

            const hasDuplicates = duplicates.length > 0;
            console.log(`[FileValidationService] Duplicate check: ${hasDuplicates ? 'FOUND' : 'NONE'}`);

            return { hasDuplicates, count: duplicates.length };
        } catch (error) {
            console.error(`[FileValidationService] Error detecting duplicates:`, error.message);
            throw error;
        }
    }
}

module.exports = new FileValidationService();