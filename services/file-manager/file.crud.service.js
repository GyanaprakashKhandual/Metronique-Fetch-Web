const TestFile = require('../models/test.file.model');
const CodeChangeHistory = require('../models/code.change.history.model');
const AuditLog = require('../models/audit.log.model');
const crypto = require('crypto');

class FileCRUDService {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024;
        this.lockedFiles = new Map();
    }

    async createFile(projectId, folderId, fileName, filePath, language, content, userId, metadata = {}) {
        console.log(`[FileCRUDService] Creating file: ${fileName} in folder: ${folderId}`);

        try {
            if (Buffer.byteLength(content, 'utf8') > this.maxFileSize) {
                throw new Error(`File size exceeds maximum allowed size (${this.maxFileSize} bytes)`);
            }

            const testFile = new TestFile({
                project: projectId,
                folder: folderId,
                name: fileName,
                fileName: fileName,
                path: filePath,
                extension: fileName.split('.').pop(),
                type: this.determineFileType(fileName),
                language: language,
                content: content,
                originalContent: content,
                size: Buffer.byteLength(content, 'utf8'),
                lines: content.split('\n').length,
                createdBy: userId,
                lastModifiedBy: userId,
                lastModifiedAt: new Date()
            });

            await testFile.save();

            await AuditLog.create({
                user: userId,
                action: 'file_created',
                actionCategory: 'file',
                entityType: 'file',
                entityId: testFile._id,
                entityName: fileName,
                status: 'success',
                severity: 'info',
                details: {
                    description: `File created: ${fileName}`,
                    path: filePath,
                    size: testFile.size
                },
                ...metadata
            });

            console.log(`[FileCRUDService] File created successfully: ${testFile._id}`);
            return testFile;
        } catch (error) {
            console.error(`[FileCRUDService] Error creating file:`, error.message);
            throw error;
        }
    }

    async readFile(fileId, userId) {
        console.log(`[FileCRUDService] Reading file: ${fileId}`);

        try {
            const file = await TestFile.findById(fileId);

            if (!file) {
                throw new Error('File not found');
            }

            if (file.isDeleted) {
                throw new Error('File has been deleted');
            }

            await AuditLog.create({
                user: userId,
                action: 'file_read',
                actionCategory: 'file',
                entityType: 'file',
                entityId: fileId,
                entityName: file.name,
                status: 'success',
                severity: 'info'
            });

            console.log(`[FileCRUDService] File read successfully: ${fileId}`);
            return file;
        } catch (error) {
            console.error(`[FileCRUDService] Error reading file:`, error.message);
            throw error;
        }
    }

    async updateFileContent(fileId, newContent, userId, changeDescription) {
        console.log(`[FileCRUDService] Updating file content: ${fileId}`);

        try {
            const file = await TestFile.findById(fileId);

            if (!file) {
                throw new Error('File not found');
            }

            if (file.isDeleted) {
                throw new Error('Cannot update deleted file');
            }

            if (file.isLocked()) {
                throw new Error(`File is locked by ${file.lockedBy}`);
            }

            if (Buffer.byteLength(newContent, 'utf8') > this.maxFileSize) {
                throw new Error(`File size exceeds maximum allowed size`);
            }

            const beforeContent = file.content;

            file.content = newContent;
            file.size = Buffer.byteLength(newContent, 'utf8');
            file.lines = newContent.split('\n').length;
            file.lastModifiedBy = userId;
            file.lastModifiedAt = new Date();
            file.version.current++;
            file.status = 'modified';

            await file.save();

            await CodeChangeHistory.create({
                file: fileId,
                project: file.project,
                changeType: 'modified',
                action: 'content_updated',
                description: changeDescription,
                changes: {
                    before: { content: beforeContent },
                    after: { content: newContent },
                    linesAdded: newContent.split('\n').length - beforeContent.split('\n').length
                },
                createdBy: userId
            });

            await AuditLog.create({
                user: userId,
                action: 'file_updated',
                actionCategory: 'file',
                entityType: 'file',
                entityId: fileId,
                entityName: file.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: changeDescription,
                    linesChanged: newContent.split('\n').length - beforeContent.split('\n').length
                }
            });

            console.log(`[FileCRUDService] File updated successfully: ${fileId}`);
            return file;
        } catch (error) {
            console.error(`[FileCRUDService] Error updating file:`, error.message);
            throw error;
        }
    }

    async deleteFile(fileId, userId, hardDelete = false, metadata = {}) {
        console.log(`[FileCRUDService] Deleting file: ${fileId} (hardDelete: ${hardDelete})`);

        try {
            const file = await TestFile.findById(fileId);

            if (!file) {
                throw new Error('File not found');
            }

            if (hardDelete) {
                await TestFile.findByIdAndDelete(fileId);
                console.log(`[FileCRUDService] File permanently deleted: ${fileId}`);
            } else {
                await file.softDelete(userId);
                console.log(`[FileCRUDService] File soft deleted: ${fileId}`);
            }

            await AuditLog.create({
                user: userId,
                action: hardDelete ? 'file_deleted_permanent' : 'file_deleted',
                actionCategory: 'file',
                entityType: 'file',
                entityId: fileId,
                entityName: file.name,
                status: 'success',
                severity: hardDelete ? 'warning' : 'info',
                details: {
                    description: `File ${hardDelete ? 'permanently ' : ''}deleted: ${file.name}`
                },
                ...metadata
            });

            return { success: true, message: `File ${hardDelete ? 'permanently ' : ''}deleted` };
        } catch (error) {
            console.error(`[FileCRUDService] Error deleting file:`, error.message);
            throw error;
        }
    }

    async copyFile(fileId, targetFolderId, newFileName, userId, metadata = {}) {
        console.log(`[FileCRUDService] Copying file: ${fileId} to folder: ${targetFolderId}`);

        try {
            const sourceFile = await TestFile.findById(fileId);

            if (!sourceFile) {
                throw new Error('Source file not found');
            }

            const copiedFile = new TestFile({
                project: sourceFile.project,
                folder: targetFolderId,
                name: newFileName || `${sourceFile.name} (copy)`,
                fileName: newFileName || `${sourceFile.name} (copy)`,
                path: `${sourceFile.path.substring(0, sourceFile.path.lastIndexOf('/'))}/${newFileName || sourceFile.name}`,
                extension: sourceFile.extension,
                type: sourceFile.type,
                language: sourceFile.language,
                content: sourceFile.content,
                originalContent: sourceFile.originalContent,
                size: sourceFile.size,
                lines: sourceFile.lines,
                createdBy: userId,
                lastModifiedBy: userId
            });

            await copiedFile.save();

            await AuditLog.create({
                user: userId,
                action: 'file_copied',
                actionCategory: 'file',
                entityType: 'file',
                entityId: copiedFile._id,
                entityName: copiedFile.name,
                status: 'success',
                severity: 'info',
                details: {
                    sourceFileId: fileId,
                    targetFolderId: targetFolderId
                },
                ...metadata
            });

            console.log(`[FileCRUDService] File copied successfully: ${copiedFile._id}`);
            return copiedFile;
        } catch (error) {
            console.error(`[FileCRUDService] Error copying file:`, error.message);
            throw error;
        }
    }

    async moveFile(fileId, targetFolderId, userId, metadata = {}) {
        console.log(`[FileCRUDService] Moving file: ${fileId} to folder: ${targetFolderId}`);

        try {
            const file = await TestFile.findById(fileId);

            if (!file) {
                throw new Error('File not found');
            }

            const previousPath = file.path;
            file.folder = targetFolderId;
            file.lastModifiedBy = userId;
            file.lastModifiedAt = new Date();

            await file.save();

            await AuditLog.create({
                user: userId,
                action: 'file_moved',
                actionCategory: 'file',
                entityType: 'file',
                entityId: fileId,
                entityName: file.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `File moved to folder: ${targetFolderId}`,
                    previousPath: previousPath,
                    newPath: file.path
                },
                ...metadata
            });

            console.log(`[FileCRUDService] File moved successfully: ${fileId}`);
            return file;
        } catch (error) {
            console.error(`[FileCRUDService] Error moving file:`, error.message);
            throw error;
        }
    }

    async renameFile(fileId, newFileName, userId, metadata = {}) {
        console.log(`[FileCRUDService] Renaming file: ${fileId} to ${newFileName}`);

        try {
            const file = await TestFile.findById(fileId);

            if (!file) {
                throw new Error('File not found');
            }

            const previousName = file.name;
            file.name = newFileName;
            file.fileName = newFileName;
            file.extension = newFileName.split('.').pop();
            file.lastModifiedBy = userId;
            file.lastModifiedAt = new Date();

            await file.save();

            await AuditLog.create({
                user: userId,
                action: 'file_renamed',
                actionCategory: 'file',
                entityType: 'file',
                entityId: fileId,
                entityName: newFileName,
                status: 'success',
                severity: 'info',
                details: {
                    previousName: previousName,
                    newName: newFileName
                },
                ...metadata
            });

            console.log(`[FileCRUDService] File renamed successfully: ${fileId}`);
            return file;
        } catch (error) {
            console.error(`[FileCRUDService] Error renaming file:`, error.message);
            throw error;
        }
    }

    async lockFile(fileId, userId) {
        console.log(`[FileCRUDService] Locking file: ${fileId}`);

        try {
            const file = await TestFile.findById(fileId);

            if (!file) {
                throw new Error('File not found');
            }

            await file.lock(userId);
            this.lockedFiles.set(fileId, { userId, lockedAt: Date.now() });

            console.log(`[FileCRUDService] File locked successfully: ${fileId}`);
            return { success: true, message: 'File locked' };
        } catch (error) {
            console.error(`[FileCRUDService] Error locking file:`, error.message);
            throw error;
        }
    }

    async unlockFile(fileId, userId) {
        console.log(`[FileCRUDService] Unlocking file: ${fileId}`);

        try {
            const file = await TestFile.findById(fileId);

            if (!file) {
                throw new Error('File not found');
            }

            if (file.lockedBy && file.lockedBy.toString() !== userId.toString()) {
                throw new Error('Only the user who locked the file can unlock it');
            }

            await file.unlock();
            this.lockedFiles.delete(fileId);

            console.log(`[FileCRUDService] File unlocked successfully: ${fileId}`);
            return { success: true, message: 'File unlocked' };
        } catch (error) {
            console.error(`[FileCRUDService] Error unlocking file:`, error.message);
            throw error;
        }
    }

    async restoreDeletedFile(fileId, userId) {
        console.log(`[FileCRUDService] Restoring deleted file: ${fileId}`);

        try {
            const file = await TestFile.findById(fileId);

            if (!file) {
                throw new Error('File not found');
            }

            if (!file.isDeleted) {
                throw new Error('File is not deleted');
            }

            await file.restore();

            await AuditLog.create({
                user: userId,
                action: 'file_restored',
                actionCategory: 'file',
                entityType: 'file',
                entityId: fileId,
                entityName: file.name,
                status: 'success',
                severity: 'info',
                details: { description: `File restored: ${file.name}` }
            });

            console.log(`[FileCRUDService] File restored successfully: ${fileId}`);
            return file;
        } catch (error) {
            console.error(`[FileCRUDService] Error restoring file:`, error.message);
            throw error;
        }
    }

    async duplicateFile(fileId, userId, newFileName = null) {
        console.log(`[FileCRUDService] Duplicating file: ${fileId}`);

        try {
            const sourceFile = await TestFile.findById(fileId);

            if (!sourceFile) {
                throw new Error('File not found');
            }

            return await this.copyFile(fileId, sourceFile.folder, newFileName, userId);
        } catch (error) {
            console.error(`[FileCRUDService] Error duplicating file:`, error.message);
            throw error;
        }
    }

    determineFileType(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const typeMap = {
            'java': 'java',
            'js': 'java',
            'ts': 'java',
            'xml': 'xml',
            'json': 'json',
            'feature': 'feature',
            'properties': 'properties',
            'pom': 'pom',
            'testng': 'testng',
            'md': 'markdown',
            'txt': 'text'
        };
        return typeMap[ext] || 'other';
    }

    async getFileMetadata(fileId) {
        console.log(`[FileCRUDService] Retrieving file metadata: ${fileId}`);

        try {
            const file = await TestFile.findById(fileId);

            if (!file) {
                throw new Error('File not found');
            }

            return {
                id: file._id,
                name: file.name,
                path: file.path,
                size: file.size,
                lines: file.lines,
                type: file.type,
                language: file.language,
                createdAt: file.createdAt,
                updatedAt: file.updatedAt,
                createdBy: file.createdBy,
                lastModifiedBy: file.lastModifiedBy,
                version: file.version.current,
                status: file.status,
                isLocked: file.isLocked(),
                lockedBy: file.lockedBy
            };
        } catch (error) {
            console.error(`[FileCRUDService] Error retrieving file metadata:`, error.message);
            throw error;
        }
    }
}

module.exports = new FileCRUDService();