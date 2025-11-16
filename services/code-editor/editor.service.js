const TestFile = require('../../models/test.file.model');
const TestFolder = require('../../models/test.folder.model');
const FileVersion = require('../../models/file.version.model');
const CodeChangeHistory = require('../../models/code.change.history.model');
const Project = require('../../models/project.model');
const User = require('../../models/user.model');

class EditorService {
    async openFile(fileId, userId) {
        try {
            console.log(`[EDITOR_SERVICE] OPEN_FILE | File ID: ${fileId} | User: ${userId}`);

            const file = await TestFile.findById(fileId)
                .populate('folder', 'name path')
                .populate('createdBy', 'firstName lastName email')
                .populate('lastModifiedBy', 'firstName lastName email')
                .populate('lockedBy', 'firstName lastName email');

            if (!file) {
                console.error(`[EDITOR_SERVICE] OPEN_FILE_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            if (file.isDeleted) {
                console.error(`[EDITOR_SERVICE] OPEN_FILE_ERROR | File is deleted: ${fileId}`);
                throw new Error('File has been deleted');
            }

            await file.incrementViewCount();

            console.log(`[EDITOR_SERVICE] OPEN_FILE_SUCCESS | File: ${file.name} | Size: ${file.size} bytes`);

            return {
                success: true,
                file: {
                    id: file._id,
                    name: file.name,
                    fileName: file.fileName,
                    path: file.path,
                    extension: file.extension,
                    type: file.type,
                    language: file.language,
                    content: file.content,
                    size: file.size,
                    lines: file.lines,
                    encoding: file.encoding,
                    isEditable: file.isEditable,
                    isSystemFile: file.isSystemFile,
                    isLocked: file.isLocked(),
                    lockedBy: file.lockedBy,
                    version: file.version.current,
                    status: file.status,
                    syntax: file.syntax,
                    metadata: file.metadata,
                    folder: file.folder,
                    createdBy: file.createdBy,
                    lastModifiedBy: file.lastModifiedBy,
                    lastModifiedAt: file.lastModifiedAt,
                    createdAt: file.createdAt,
                    updatedAt: file.updatedAt
                }
            };
        } catch (error) {
            console.error(`[EDITOR_SERVICE] OPEN_FILE_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async saveFile(fileId, content, userId) {
        try {
            console.log(`[EDITOR_SERVICE] SAVE_FILE | File ID: ${fileId} | User: ${userId} | Content Length: ${content.length}`);

            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[EDITOR_SERVICE] SAVE_FILE_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            if (!file.canEdit(userId)) {
                console.error(`[EDITOR_SERVICE] SAVE_FILE_ERROR | User cannot edit file | File: ${fileId} | User: ${userId}`);
                throw new Error('You do not have permission to edit this file');
            }

            const oldContent = file.content;
            const oldSize = file.size;

            await file.updateContent(content, userId);

            await CodeChangeHistory.create({
                file: fileId,
                project: file.project,
                changeType: 'modified',
                action: 'File content updated',
                description: 'Content modified via editor',
                changes: {
                    before: {
                        content: oldContent,
                        size: oldSize
                    },
                    after: {
                        content: content,
                        size: file.size
                    },
                    linesAdded: 0,
                    linesRemoved: 0,
                    linesModified: 0
                },
                createdBy: userId
            });

            console.log(`[EDITOR_SERVICE] SAVE_FILE_SUCCESS | File: ${file.name} | New Size: ${file.size} bytes | Version: ${file.version.current}`);

            return {
                success: true,
                file: {
                    id: file._id,
                    content: file.content,
                    size: file.size,
                    lines: file.lines,
                    version: file.version.current,
                    lastModifiedBy: userId,
                    lastModifiedAt: file.lastModifiedAt
                }
            };
        } catch (error) {
            console.error(`[EDITOR_SERVICE] SAVE_FILE_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async createFile(projectId, folderId, fileData, userId) {
        try {
            console.log(`[EDITOR_SERVICE] CREATE_FILE | Project: ${projectId} | Folder: ${folderId} | Name: ${fileData.name} | User: ${userId}`);

            const folder = await TestFolder.findById(folderId);
            if (!folder) {
                console.error(`[EDITOR_SERVICE] CREATE_FILE_ERROR | Folder not found: ${folderId}`);
                throw new Error('Folder not found');
            }

            const existingFile = await TestFile.findOne({
                project: projectId,
                path: `${folder.path}/${fileData.name}`
            });

            if (existingFile) {
                console.error(`[EDITOR_SERVICE] CREATE_FILE_ERROR | File already exists: ${fileData.name}`);
                throw new Error('File with this name already exists in the folder');
            }

            const file = await TestFile.create({
                project: projectId,
                folder: folderId,
                name: fileData.name,
                fileName: fileData.name,
                path: `${folder.path}/${fileData.name}`,
                extension: fileData.extension || this.getExtension(fileData.name),
                type: fileData.type || 'other',
                language: fileData.language || this.detectLanguage(fileData.name),
                content: fileData.content || '',
                encoding: fileData.encoding || 'utf-8',
                isGenerated: false,
                generatedBy: 'user',
                createdBy: userId,
                updatedBy: userId
            });

            await folder.addFile(file._id, file.size);

            await CodeChangeHistory.create({
                file: file._id,
                project: projectId,
                changeType: 'created',
                action: 'File created',
                description: `New file created: ${file.name}`,
                changes: {
                    after: {
                        fileName: file.name,
                        path: file.path,
                        size: file.size
                    }
                },
                createdBy: userId
            });

            console.log(`[EDITOR_SERVICE] CREATE_FILE_SUCCESS | File: ${file.name} | ID: ${file._id} | Path: ${file.path}`);

            return {
                success: true,
                file: {
                    id: file._id,
                    name: file.name,
                    path: file.path,
                    type: file.type,
                    language: file.language,
                    content: file.content,
                    size: file.size,
                    createdAt: file.createdAt
                }
            };
        } catch (error) {
            console.error(`[EDITOR_SERVICE] CREATE_FILE_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async deleteFile(fileId, userId) {
        try {
            console.log(`[EDITOR_SERVICE] DELETE_FILE | File ID: ${fileId} | User: ${userId}`);

            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[EDITOR_SERVICE] DELETE_FILE_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            if (file.isSystemFile) {
                console.error(`[EDITOR_SERVICE] DELETE_FILE_ERROR | Cannot delete system file: ${fileId}`);
                throw new Error('System files cannot be deleted');
            }

            const folder = await TestFolder.findById(file.folder);
            if (folder) {
                await folder.removeFile(fileId, file.size);
            }

            await file.softDelete(userId);

            await CodeChangeHistory.create({
                file: fileId,
                project: file.project,
                changeType: 'deleted',
                action: 'File deleted',
                description: `File deleted: ${file.name}`,
                changes: {
                    before: {
                        fileName: file.name,
                        path: file.path,
                        size: file.size
                    }
                },
                createdBy: userId
            });

            console.log(`[EDITOR_SERVICE] DELETE_FILE_SUCCESS | File: ${file.name} | ID: ${fileId}`);

            return {
                success: true,
                message: 'File deleted successfully'
            };
        } catch (error) {
            console.error(`[EDITOR_SERVICE] DELETE_FILE_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async renameFile(fileId, newName, userId) {
        try {
            console.log(`[EDITOR_SERVICE] RENAME_FILE | File ID: ${fileId} | New Name: ${newName} | User: ${userId}`);

            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[EDITOR_SERVICE] RENAME_FILE_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            if (file.isSystemFile) {
                console.error(`[EDITOR_SERVICE] RENAME_FILE_ERROR | Cannot rename system file: ${fileId}`);
                throw new Error('System files cannot be renamed');
            }

            const folder = await TestFolder.findById(file.folder);
            const oldName = file.name;
            const oldPath = file.path;
            const newPath = `${folder.path}/${newName}`;

            const existingFile = await TestFile.findOne({
                project: file.project,
                path: newPath,
                _id: { $ne: fileId }
            });

            if (existingFile) {
                console.error(`[EDITOR_SERVICE] RENAME_FILE_ERROR | File already exists: ${newName}`);
                throw new Error('A file with this name already exists in the folder');
            }

            file.name = newName;
            file.fileName = newName;
            file.path = newPath;
            file.extension = this.getExtension(newName);
            file.language = this.detectLanguage(newName);
            file.updatedBy = userId;

            await file.save();

            await CodeChangeHistory.create({
                file: fileId,
                project: file.project,
                changeType: 'renamed',
                action: 'File renamed',
                description: `File renamed from ${oldName} to ${newName}`,
                changes: {
                    before: {
                        fileName: oldName,
                        path: oldPath
                    },
                    after: {
                        fileName: newName,
                        path: newPath
                    }
                },
                createdBy: userId
            });

            console.log(`[EDITOR_SERVICE] RENAME_FILE_SUCCESS | Old Name: ${oldName} | New Name: ${newName}`);

            return {
                success: true,
                file: {
                    id: file._id,
                    name: file.name,
                    path: file.path,
                    extension: file.extension,
                    language: file.language
                }
            };
        } catch (error) {
            console.error(`[EDITOR_SERVICE] RENAME_FILE_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async lockFile(fileId, userId) {
        try {
            console.log(`[EDITOR_SERVICE] LOCK_FILE | File ID: ${fileId} | User: ${userId}`);

            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[EDITOR_SERVICE] LOCK_FILE_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            if (file.isLocked() && file.lockedBy.toString() !== userId.toString()) {
                console.error(`[EDITOR_SERVICE] LOCK_FILE_ERROR | File already locked by another user: ${fileId}`);
                throw new Error('File is already locked by another user');
            }

            await file.lock(userId);

            console.log(`[EDITOR_SERVICE] LOCK_FILE_SUCCESS | File: ${file.name} | Locked by: ${userId}`);

            return {
                success: true,
                message: 'File locked successfully',
                lockedBy: userId,
                lockedAt: file.lockedAt
            };
        } catch (error) {
            console.error(`[EDITOR_SERVICE] LOCK_FILE_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async unlockFile(fileId, userId) {
        try {
            console.log(`[EDITOR_SERVICE] UNLOCK_FILE | File ID: ${fileId} | User: ${userId}`);

            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[EDITOR_SERVICE] UNLOCK_FILE_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            if (file.isLocked() && file.lockedBy.toString() !== userId.toString()) {
                console.error(`[EDITOR_SERVICE] UNLOCK_FILE_ERROR | User cannot unlock file: ${fileId}`);
                throw new Error('You cannot unlock a file locked by another user');
            }

            await file.unlock();

            console.log(`[EDITOR_SERVICE] UNLOCK_FILE_SUCCESS | File: ${file.name}`);

            return {
                success: true,
                message: 'File unlocked successfully'
            };
        } catch (error) {
            console.error(`[EDITOR_SERVICE] UNLOCK_FILE_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    async getFileHistory(fileId) {
        try {
            console.log(`[EDITOR_SERVICE] GET_FILE_HISTORY | File ID: ${fileId}`);

            const file = await TestFile.findById(fileId)
                .populate('version.history')
                .populate('lastModifiedBy', 'firstName lastName email');

            if (!file) {
                console.error(`[EDITOR_SERVICE] GET_FILE_HISTORY_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            const changeHistory = await CodeChangeHistory.find({ file: fileId })
                .populate('createdBy', 'firstName lastName email')
                .sort({ timestamp: -1 })
                .limit(50);

            console.log(`[EDITOR_SERVICE] GET_FILE_HISTORY_SUCCESS | File: ${file.name} | History Records: ${changeHistory.length}`);

            return {
                success: true,
                file: {
                    id: file._id,
                    name: file.name,
                    currentVersion: file.version.current
                },
                versionHistory: file.version.history,
                changeHistory: changeHistory
            };
        } catch (error) {
            console.error(`[EDITOR_SERVICE] GET_FILE_HISTORY_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    getExtension(filename) {
        const parts = filename.split('.');
        return parts.length > 1 ? parts[parts.length - 1] : '';
    }

    detectLanguage(filename) {
        const extension = this.getExtension(filename).toLowerCase();
        const languageMap = {
            'java': 'java',
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'xml': 'xml',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml',
            'properties': 'properties',
            'feature': 'gherkin',
            'md': 'markdown'
        };
        return languageMap[extension] || 'text';
    }
}

module.exports = new EditorService();