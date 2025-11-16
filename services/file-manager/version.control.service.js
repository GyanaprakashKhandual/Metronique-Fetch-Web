class VersionControlService {
    async createVersion(fileId, content, userId, description) {
        console.log(`[VersionControlService] Creating version for file: ${fileId}`);

        try {
            const FileVersion = require('../models/file.version.model');

            const version = new FileVersion({
                file: fileId,
                content: content,
                description: description,
                createdBy: userId,
                createdAt: new Date()
            });

            await version.save();

            const TestFile = require('../models/test.file.model');
            await TestFile.findByIdAndUpdate(
                fileId,
                { $push: { 'version.history': version._id } }
            );

            console.log(`[VersionControlService] Version created successfully`);
            return version;
        } catch (error) {
            console.error(`[VersionControlService] Error creating version:`, error.message);
            throw error;
        }
    }

    async getVersionHistory(fileId, limit = 10) {
        console.log(`[VersionControlService] Fetching version history for file: ${fileId}`);

        try {
            const TestFile = require('../models/test.file.model');
            const file = await TestFile.findById(fileId).populate({
                path: 'version.history',
                options: { sort: { createdAt: -1 }, limit }
            });

            console.log(`[VersionControlService] Retrieved ${file.version.history.length} versions`);
            return file.version.history;
        } catch (error) {
            console.error(`[VersionControlService] Error fetching history:`, error.message);
            throw error;
        }
    }

    async revertToVersion(fileId, versionId, userId) {
        console.log(`[VersionControlService] Reverting to version: ${versionId}`);

        try {
            const FileVersion = require('../models/file.version.model');
            const version = await FileVersion.findById(versionId);

            if (!version) {
                throw new Error('Version not found');
            }

            const fileCRUDService = require('./file.crud.service');
            await fileCRUDService.updateFileContent(fileId, version.content, userId, `Reverted to version from ${version.createdAt}`);

            console.log(`[VersionControlService] Reverted successfully to version: ${versionId}`);
            return { success: true, message: 'File reverted to previous version' };
        } catch (error) {
            console.error(`[VersionControlService] Error reverting version:`, error.message);
            throw error;
        }
    }

    async compareVersions(versionId1, versionId2) {
        console.log(`[VersionControlService] Comparing versions: ${versionId1} vs ${versionId2}`);

        try {
            const FileVersion = require('../models/file.version.model');
            const version1 = await FileVersion.findById(versionId1);
            const version2 = await FileVersion.findById(versionId2);

            if (!version1 || !version2) {
                throw new Error('One or both versions not found');
            }

            const diff = {
                version1Id: versionId1,
                version2Id: versionId2,
                linesAdded: version2.content.split('\n').length - version1.content.split('\n').length,
                linesRemoved: version1.content.split('\n').length - version2.content.split('\n').length
            };

            console.log(`[VersionControlService] Comparison completed`);
            return diff;
        } catch (error) {
            console.error(`[VersionControlService] Error comparing versions:`, error.message);
            throw error;
        }
    }

    async deleteOldVersions(fileId, keepCount = 5) {
        console.log(`[VersionControlService] Cleaning old versions for file: ${fileId}`);

        try {
            const TestFile = require('../models/test.file.model');
            const file = await TestFile.findById(fileId).populate('version.history');

            if (file.version.history.length > keepCount) {
                const toDelete = file.version.history.slice(0, -keepCount);
                const FileVersion = require('../models/file.version.model');

                for (const version of toDelete) {
                    await FileVersion.findByIdAndDelete(version._id);
                }

                file.version.history = file.version.history.slice(-keepCount);
                await file.save();

                console.log(`[VersionControlService] Deleted ${toDelete.length} old versions`);
            }

            return { deletedCount: file.version.history.length > keepCount ? file.version.history.length - keepCount : 0 };
        } catch (error) {
            console.error(`[VersionControlService] Error deleting old versions:`, error.message);
            throw error;
        }
    }
}

module.exports = new VersionControlService();