const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const LocalStorageService = require('./local.storage.service');
const S3StorageService = require('./s3.service');

class FileStorageService {
    constructor() {
        this.storageType = process.env.STORAGE_TYPE || 'local';
        this.storageProvider = null;
        this.initializeStorage();
    }

    initializeStorage() {
        console.log(`[FileStorageService] Initializing storage | Type: ${this.storageType}`);

        if (this.storageType === 's3') {
            this.storageProvider = S3StorageService;
            console.log(`[FileStorageService] S3 storage initialized`);
        } else {
            this.storageProvider = LocalStorageService;
            console.log(`[FileStorageService] Local storage initialized`);
        }
    }

    async uploadFile(fileBuffer, fileName, projectId, folderId, metadata = {}) {
        const startTime = Date.now();
        console.log(`[FileStorageService] Upload started | File: ${fileName} | Project: ${projectId} | Folder: ${folderId}`);

        try {
            const fileHash = this.generateFileHash(fileBuffer);
            const uniqueFileName = this.generateUniqueFileName(fileName, fileHash);
            const filePath = this.buildFilePath(projectId, folderId, uniqueFileName);

            console.log(`[FileStorageService] File metadata | Hash: ${fileHash} | UniqueName: ${uniqueFileName} | Path: ${filePath}`);

            const uploadResult = await this.storageProvider.upload(fileBuffer, filePath, {
                ...metadata,
                originalName: fileName,
                fileHash: fileHash,
                projectId: projectId,
                folderId: folderId,
                uploadedAt: new Date().toISOString()
            });

            const duration = Date.now() - startTime;
            console.log(`[FileStorageService] Upload completed | File: ${fileName} | Duration: ${duration}ms | Size: ${fileBuffer.length} bytes`);

            return {
                success: true,
                filePath: filePath,
                uniqueFileName: uniqueFileName,
                fileHash: fileHash,
                url: uploadResult.url,
                size: fileBuffer.length,
                uploadedAt: new Date(),
                storage: this.storageType
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[FileStorageService] Upload failed | File: ${fileName} | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async downloadFile(filePath) {
        const startTime = Date.now();
        console.log(`[FileStorageService] Download started | Path: ${filePath}`);

        try {
            const fileBuffer = await this.storageProvider.download(filePath);

            const duration = Date.now() - startTime;
            console.log(`[FileStorageService] Download completed | Path: ${filePath} | Duration: ${duration}ms | Size: ${fileBuffer.length} bytes`);

            return fileBuffer;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[FileStorageService] Download failed | Path: ${filePath} | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async deleteFile(filePath) {
        const startTime = Date.now();
        console.log(`[FileStorageService] Delete started | Path: ${filePath}`);

        try {
            await this.storageProvider.delete(filePath);

            const duration = Date.now() - startTime;
            console.log(`[FileStorageService] Delete completed | Path: ${filePath} | Duration: ${duration}ms`);

            return { success: true, message: 'File deleted successfully' };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[FileStorageService] Delete failed | Path: ${filePath} | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async moveFile(sourcePath, destinationPath) {
        const startTime = Date.now();
        console.log(`[FileStorageService] Move started | Source: ${sourcePath} | Destination: ${destinationPath}`);

        try {
            await this.storageProvider.move(sourcePath, destinationPath);

            const duration = Date.now() - startTime;
            console.log(`[FileStorageService] Move completed | Duration: ${duration}ms`);

            return { success: true, newPath: destinationPath };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[FileStorageService] Move failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async copyFile(sourcePath, destinationPath) {
        const startTime = Date.now();
        console.log(`[FileStorageService] Copy started | Source: ${sourcePath} | Destination: ${destinationPath}`);

        try {
            await this.storageProvider.copy(sourcePath, destinationPath);

            const duration = Date.now() - startTime;
            console.log(`[FileStorageService] Copy completed | Duration: ${duration}ms`);

            return { success: true, newPath: destinationPath };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[FileStorageService] Copy failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async fileExists(filePath) {
        console.log(`[FileStorageService] Checking file existence | Path: ${filePath}`);

        try {
            const exists = await this.storageProvider.exists(filePath);
            console.log(`[FileStorageService] File existence check | Path: ${filePath} | Exists: ${exists}`);
            return exists;
        } catch (error) {
            console.error(`[FileStorageService] Existence check failed | Path: ${filePath} | Error: ${error.message}`);
            throw error;
        }
    }

    async getFileMetadata(filePath) {
        console.log(`[FileStorageService] Retrieving metadata | Path: ${filePath}`);

        try {
            const metadata = await this.storageProvider.getMetadata(filePath);
            console.log(`[FileStorageService] Metadata retrieved | Path: ${filePath} | Size: ${metadata.size} bytes`);
            return metadata;
        } catch (error) {
            console.error(`[FileStorageService] Metadata retrieval failed | Path: ${filePath} | Error: ${error.message}`);
            throw error;
        }
    }

    async listFiles(directoryPath, options = {}) {
        console.log(`[FileStorageService] Listing files | Directory: ${directoryPath}`);

        try {
            const files = await this.storageProvider.list(directoryPath, options);
            console.log(`[FileStorageService] Files listed | Directory: ${directoryPath} | Count: ${files.length}`);
            return files;
        } catch (error) {
            console.error(`[FileStorageService] List failed | Directory: ${directoryPath} | Error: ${error.message}`);
            throw error;
        }
    }

    async createDirectory(directoryPath) {
        console.log(`[FileStorageService] Creating directory | Path: ${directoryPath}`);

        try {
            await this.storageProvider.createDirectory(directoryPath);
            console.log(`[FileStorageService] Directory created | Path: ${directoryPath}`);
            return { success: true, path: directoryPath };
        } catch (error) {
            console.error(`[FileStorageService] Directory creation failed | Path: ${directoryPath} | Error: ${error.message}`);
            throw error;
        }
    }

    async deleteDirectory(directoryPath, recursive = false) {
        console.log(`[FileStorageService] Deleting directory | Path: ${directoryPath} | Recursive: ${recursive}`);

        try {
            await this.storageProvider.deleteDirectory(directoryPath, recursive);
            console.log(`[FileStorageService] Directory deleted | Path: ${directoryPath}`);
            return { success: true, message: 'Directory deleted successfully' };
        } catch (error) {
            console.error(`[FileStorageService] Directory deletion failed | Path: ${directoryPath} | Error: ${error.message}`);
            throw error;
        }
    }

    async getFileUrl(filePath, expiresIn = 3600) {
        console.log(`[FileStorageService] Generating file URL | Path: ${filePath} | ExpiresIn: ${expiresIn}s`);

        try {
            const url = await this.storageProvider.getUrl(filePath, expiresIn);
            console.log(`[FileStorageService] URL generated | Path: ${filePath}`);
            return url;
        } catch (error) {
            console.error(`[FileStorageService] URL generation failed | Path: ${filePath} | Error: ${error.message}`);
            throw error;
        }
    }

    async bulkUpload(files, projectId, folderId, metadata = {}) {
        const startTime = Date.now();
        console.log(`[FileStorageService] Bulk upload started | Count: ${files.length} | Project: ${projectId}`);

        try {
            const uploadPromises = files.map(file =>
                this.uploadFile(file.buffer, file.name, projectId, folderId, {
                    ...metadata,
                    bulkUpload: true
                })
            );

            const results = await Promise.allSettled(uploadPromises);

            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            const duration = Date.now() - startTime;
            console.log(`[FileStorageService] Bulk upload completed | Total: ${files.length} | Success: ${successful} | Failed: ${failed} | Duration: ${duration}ms`);

            return {
                total: files.length,
                successful: successful,
                failed: failed,
                results: results
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[FileStorageService] Bulk upload failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async bulkDelete(filePaths) {
        const startTime = Date.now();
        console.log(`[FileStorageService] Bulk delete started | Count: ${filePaths.length}`);

        try {
            const deletePromises = filePaths.map(path => this.deleteFile(path));
            const results = await Promise.allSettled(deletePromises);

            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            const duration = Date.now() - startTime;
            console.log(`[FileStorageService] Bulk delete completed | Total: ${filePaths.length} | Success: ${successful} | Failed: ${failed} | Duration: ${duration}ms`);

            return {
                total: filePaths.length,
                successful: successful,
                failed: failed,
                results: results
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[FileStorageService] Bulk delete failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    generateFileHash(buffer) {
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        console.log(`[FileStorageService] File hash generated | Hash: ${hash.substring(0, 16)}...`);
        return hash;
    }

    generateUniqueFileName(originalName, hash) {
        const timestamp = Date.now();
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        const shortHash = hash.substring(0, 8);
        const uniqueName = `${baseName}_${timestamp}_${shortHash}${extension}`;

        console.log(`[FileStorageService] Unique filename generated | Original: ${originalName} | Unique: ${uniqueName}`);
        return uniqueName;
    }

    buildFilePath(projectId, folderId, fileName) {
        const filePath = path.join('projects', projectId, 'folders', folderId, fileName);
        console.log(`[FileStorageService] File path built | Path: ${filePath}`);
        return filePath;
    }

    async getStorageStats(projectId) {
        console.log(`[FileStorageService] Retrieving storage stats | Project: ${projectId}`);

        try {
            const projectPath = path.join('projects', projectId);
            const files = await this.listFiles(projectPath, { recursive: true });

            const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
            const totalFiles = files.length;

            console.log(`[FileStorageService] Storage stats | Project: ${projectId} | Files: ${totalFiles} | Size: ${totalSize} bytes`);

            return {
                projectId: projectId,
                totalFiles: totalFiles,
                totalSize: totalSize,
                totalSizeFormatted: this.formatBytes(totalSize),
                storageType: this.storageType
            };
        } catch (error) {
            console.error(`[FileStorageService] Storage stats failed | Project: ${projectId} | Error: ${error.message}`);
            throw error;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    async cleanupOldFiles(projectId, daysOld = 30) {
        const startTime = Date.now();
        console.log(`[FileStorageService] Cleanup started | Project: ${projectId} | DaysOld: ${daysOld}`);

        try {
            const projectPath = path.join('projects', projectId);
            const files = await this.listFiles(projectPath, { recursive: true });

            const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
            const filesToDelete = files.filter(file =>
                file.lastModified && new Date(file.lastModified).getTime() < cutoffDate
            );

            console.log(`[FileStorageService] Files marked for cleanup | Count: ${filesToDelete.length}`);

            if (filesToDelete.length > 0) {
                const deletePaths = filesToDelete.map(file => file.path);
                const result = await this.bulkDelete(deletePaths);

                const duration = Date.now() - startTime;
                console.log(`[FileStorageService] Cleanup completed | Deleted: ${result.successful} | Duration: ${duration}ms`);

                return result;
            }

            const duration = Date.now() - startTime;
            console.log(`[FileStorageService] Cleanup completed | No files to delete | Duration: ${duration}ms`);

            return { total: 0, successful: 0, failed: 0 };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[FileStorageService] Cleanup failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    switchStorageProvider(newType) {
        console.log(`[FileStorageService] Switching storage provider | From: ${this.storageType} | To: ${newType}`);

        this.storageType = newType;
        this.initializeStorage();

        console.log(`[FileStorageService] Storage provider switched | Current: ${this.storageType}`);
    }
}

module.exports = new FileStorageService();