const TestFolder = require('../models/test.folder.model');
const TestFile = require('../models/test.file.model');
const AuditLog = require('../models/audit.log.model');

class FolderCRUDService {
    async createFolder(projectId, name, parentFolderId, userId, metadata = {}) {
        console.log(`[FolderCRUDService] Creating folder: ${name} in project: ${projectId}`);

        try {
            const folderPath = parentFolderId ? `parent/${parentFolderId}` : `project/${projectId}`;

            const testFolder = new TestFolder({
                project: projectId,
                name: name,
                parentFolder: parentFolderId || null,
                path: folderPath,
                createdBy: userId,
                updatedBy: userId
            });

            await testFolder.save();

            if (parentFolderId) {
                await TestFolder.findByIdAndUpdate(
                    parentFolderId,
                    { $push: { subFolders: testFolder._id } },
                    { new: true }
                );
            }

            await AuditLog.create({
                user: userId,
                action: 'folder_created',
                actionCategory: 'file',
                entityType: 'folder',
                entityId: testFolder._id,
                entityName: name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Folder created: ${name}`,
                    path: folderPath
                },
                ...metadata
            });

            console.log(`[FolderCRUDService] Folder created successfully: ${testFolder._id}`);
            return testFolder;
        } catch (error) {
            console.error(`[FolderCRUDService] Error creating folder:`, error.message);
            throw error;
        }
    }

    async readFolder(folderId, userId) {
        console.log(`[FolderCRUDService] Reading folder: ${folderId}`);

        try {
            const folder = await TestFolder.findById(folderId)
                .populate('files')
                .populate('subFolders');

            if (!folder) {
                throw new Error('Folder not found');
            }

            if (folder.isDeleted) {
                throw new Error('Folder has been deleted');
            }

            console.log(`[FolderCRUDService] Folder read successfully: ${folderId}`);
            return folder;
        } catch (error) {
            console.error(`[FolderCRUDService] Error reading folder:`, error.message);
            throw error;
        }
    }

    async updateFolder(folderId, updates, userId, metadata = {}) {
        console.log(`[FolderCRUDService] Updating folder: ${folderId}`);

        try {
            const folder = await TestFolder.findById(folderId);

            if (!folder) {
                throw new Error('Folder not found');
            }

            const allowedFields = ['name', 'description'];
            const filteredUpdates = {};

            allowedFields.forEach(field => {
                if (field in updates) {
                    filteredUpdates[field] = updates[field];
                }
            });

            const updatedFolder = await TestFolder.findByIdAndUpdate(
                folderId,
                { $set: filteredUpdates, updatedBy: userId, updatedAt: new Date() },
                { new: true }
            );

            await AuditLog.create({
                user: userId,
                action: 'folder_updated',
                actionCategory: 'file',
                entityType: 'folder',
                entityId: folderId,
                entityName: updatedFolder.name,
                status: 'success',
                severity: 'info',
                details: { description: `Folder updated: ${updatedFolder.name}` },
                ...metadata
            });

            console.log(`[FolderCRUDService] Folder updated successfully: ${folderId}`);
            return updatedFolder;
        } catch (error) {
            console.error(`[FolderCRUDService] Error updating folder:`, error.message);
            throw error;
        }
    }

    async deleteFolder(folderId, userId, hardDelete = false, metadata = {}) {
        console.log(`[FolderCRUDService] Deleting folder: ${folderId} (hardDelete: ${hardDelete})`);

        try {
            const folder = await TestFolder.findById(folderId).populate('files').populate('subFolders');

            if (!folder) {
                throw new Error('Folder not found');
            }

            if (hardDelete) {
                await TestFile.deleteMany({ folder: folderId });

                for (const subFolder of folder.subFolders) {
                    await this.deleteFolder(subFolder._id, userId, true);
                }

                await TestFolder.findByIdAndDelete(folderId);
                console.log(`[FolderCRUDService] Folder permanently deleted: ${folderId}`);
            } else {
                folder.isDeleted = true;
                folder.deletedAt = new Date();
                folder.deletedBy = userId;
                await folder.save();
                console.log(`[FolderCRUDService] Folder soft deleted: ${folderId}`);
            }

            await AuditLog.create({
                user: userId,
                action: hardDelete ? 'folder_deleted_permanent' : 'folder_deleted',
                actionCategory: 'file',
                entityType: 'folder',
                entityId: folderId,
                entityName: folder.name,
                status: 'success',
                severity: hardDelete ? 'warning' : 'info',
                details: {
                    description: `Folder ${hardDelete ? 'permanently ' : ''}deleted: ${folder.name}`,
                    filesDeleted: folder.files.length
                },
                ...metadata
            });

            return { success: true, message: `Folder ${hardDelete ? 'permanently ' : ''}deleted` };
        } catch (error) {
            console.error(`[FolderCRUDService] Error deleting folder:`, error.message);
            throw error;
        }
    }

    async copyFolder(folderId, targetParentId, newFolderName, userId) {
        console.log(`[FolderCRUDService] Copying folder: ${folderId}`);

        try {
            const sourceFolder = await TestFolder.findById(folderId)
                .populate('files')
                .populate('subFolders');

            if (!sourceFolder) {
                throw new Error('Source folder not found');
            }

            const newFolder = await this.createFolder(
                sourceFolder.project,
                newFolderName || `${sourceFolder.name} (copy)`,
                targetParentId,
                userId
            );

            for (const file of sourceFolder.files) {
                const fileCRUDService = require('./file.crud.service');
                await fileCRUDService.copyFile(file._id, newFolder._id, null, userId);
            }

            for (const subFolder of sourceFolder.subFolders) {
                await this.copyFolder(subFolder._id, newFolder._id, null, userId);
            }

            console.log(`[FolderCRUDService] Folder copied successfully: ${newFolder._id}`);
            return newFolder;
        } catch (error) {
            console.error(`[FolderCRUDService] Error copying folder:`, error.message);
            throw error;
        }
    }

    async moveFolder(folderId, targetParentId, userId, metadata = {}) {
        console.log(`[FolderCRUDService] Moving folder: ${folderId}`);

        try {
            const folder = await TestFolder.findById(folderId);

            if (!folder) {
                throw new Error('Folder not found');
            }

            const previousParentId = folder.parentFolder;

            if (previousParentId) {
                await TestFolder.findByIdAndUpdate(
                    previousParentId,
                    { $pull: { subFolders: folderId } }
                );
            }

            folder.parentFolder = targetParentId || null;
            folder.updatedBy = userId;
            folder.updatedAt = new Date();

            await folder.save();

            if (targetParentId) {
                await TestFolder.findByIdAndUpdate(
                    targetParentId,
                    { $push: { subFolders: folderId } }
                );
            }

            await AuditLog.create({
                user: userId,
                action: 'folder_moved',
                actionCategory: 'file',
                entityType: 'folder',
                entityId: folderId,
                entityName: folder.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Folder moved`,
                    previousParent: previousParentId,
                    newParent: targetParentId
                },
                ...metadata
            });

            console.log(`[FolderCRUDService] Folder moved successfully: ${folderId}`);
            return folder;
        } catch (error) {
            console.error(`[FolderCRUDService] Error moving folder:`, error.message);
            throw error;
        }
    }

    async renameFolder(folderId, newName, userId, metadata = {}) {
        console.log(`[FolderCRUDService] Renaming folder: ${folderId} to ${newName}`);

        try {
            const folder = await TestFolder.findById(folderId);

            if (!folder) {
                throw new Error('Folder not found');
            }

            const previousName = folder.name;
            folder.name = newName;
            folder.updatedBy = userId;
            folder.updatedAt = new Date();

            await folder.save();

            await AuditLog.create({
                user: userId,
                action: 'folder_renamed',
                actionCategory: 'file',
                entityType: 'folder',
                entityId: folderId,
                entityName: newName,
                status: 'success',
                severity: 'info',
                details: {
                    previousName: previousName,
                    newName: newName
                },
                ...metadata
            });

            console.log(`[FolderCRUDService] Folder renamed successfully: ${folderId}`);
            return folder;
        } catch (error) {
            console.error(`[FolderCRUDService] Error renaming folder:`, error.message);
            throw error;
        }
    }

    async restoreDeletedFolder(folderId, userId) {
        console.log(`[FolderCRUDService] Restoring deleted folder: ${folderId}`);

        try {
            const folder = await TestFolder.findById(folderId);

            if (!folder) {
                throw new Error('Folder not found');
            }

            if (!folder.isDeleted) {
                throw new Error('Folder is not deleted');
            }

            folder.isDeleted = false;
            folder.deletedAt = undefined;
            folder.deletedBy = undefined;
            await folder.save();

            await TestFile.updateMany(
                { folder: folderId, isDeleted: true },
                { $set: { isDeleted: false, deletedAt: undefined, deletedBy: undefined } }
            );

            await AuditLog.create({
                user: userId,
                action: 'folder_restored',
                actionCategory: 'file',
                entityType: 'folder',
                entityId: folderId,
                entityName: folder.name,
                status: 'success',
                severity: 'info',
                details: { description: `Folder restored: ${folder.name}` }
            });

            console.log(`[FolderCRUDService] Folder restored successfully: ${folderId}`);
            return folder;
        } catch (error) {
            console.error(`[FolderCRUDService] Error restoring folder:`, error.message);
            throw error;
        }
    }

    async getFolderContents(folderId) {
        console.log(`[FolderCRUDService] Retrieving folder contents: ${folderId}`);

        try {
            const folder = await TestFolder.findById(folderId)
                .populate('files', 'name type language size createdAt')
                .populate('subFolders', 'name createdAt');

            if (!folder) {
                throw new Error('Folder not found');
            }

            return {
                folderId: folder._id,
                folderName: folder.name,
                files: folder.files,
                subFolders: folder.subFolders,
                totalItems: (folder.files?.length || 0) + (folder.subFolders?.length || 0)
            };
        } catch (error) {
            console.error(`[FolderCRUDService] Error retrieving folder contents:`, error.message);
            throw error;
        }
    }

    async calculateFolderSize(folderId) {
        console.log(`[FolderCRUDService] Calculating folder size: ${folderId}`);

        try {
            const folder = await TestFolder.findById(folderId).populate('files').populate('subFolders');

            if (!folder) {
                throw new Error('Folder not found');
            }

            let totalSize = 0;

            for (const file of folder.files) {
                totalSize += file.size || 0;
            }

            for (const subFolder of folder.subFolders) {
                const subSize = await this.calculateFolderSize(subFolder._id);
                totalSize += subSize;
            }

            console.log(`[FolderCRUDService] Folder size calculated: ${totalSize} bytes`);
            return totalSize;
        } catch (error) {
            console.error(`[FolderCRUDService] Error calculating folder size:`, error.message);
            throw error;
        }
    }

    async getFolderStats(folderId) {
        console.log(`[FolderCRUDService] Retrieving folder statistics: ${folderId}`);

        try {
            const folder = await TestFolder.findById(folderId).populate('files').populate('subFolders');

            if (!folder) {
                throw new Error('Folder not found');
            }

            const stats = {
                folderId: folder._id,
                totalFiles: folder.files?.length || 0,
                totalSubFolders: folder.subFolders?.length || 0,
                totalSize: await this.calculateFolderSize(folderId),
                createdAt: folder.createdAt,
                updatedAt: folder.updatedAt
            };

            console.log(`[FolderCRUDService] Folder statistics retrieved`);
            return stats;
        } catch (error) {
            console.error(`[FolderCRUDService] Error retrieving folder statistics:`, error.message);
            throw error;
        }
    }
}

module.exports = new FolderCRUDService();