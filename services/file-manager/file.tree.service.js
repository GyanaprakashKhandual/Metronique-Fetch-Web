class FileTreeService {
    async buildFileTree(projectId, folderId = null, maxDepth = 10, currentDepth = 0) {
        console.log(`[FileTreeService] Building file tree for project: ${projectId}`);

        try {
            const TestFolder = require('../models/test.folder.model');
            const TestFile = require('../models/test.file.model');

            const folderQuery = folderId
                ? { _id: folderId, project: projectId }
                : { project: projectId, parentFolder: null };

            const folders = await TestFolder.find(folderQuery)
                .populate('files', 'name type language size')
                .populate('subFolders');

            const tree = await Promise.all(folders.map(async folder => {
                const files = folder.files?.map(f => ({
                    id: f._id,
                    name: f.name,
                    type: 'file',
                    size: f.size,
                    language: f.language,
                    mimeType: f.type
                })) || [];

                const subFolders = currentDepth < maxDepth
                    ? await Promise.all((folder.subFolders || []).map(sf =>
                        this.buildFileTree(projectId, sf._id, maxDepth, currentDepth + 1)))
                    : [];

                return {
                    id: folder._id,
                    name: folder.name,
                    type: 'folder',
                    children: [...files, ...subFolders],
                    itemCount: files.length + subFolders.length
                };
            }));

            console.log(`[FileTreeService] File tree built successfully`);
            return tree;
        } catch (error) {
            console.error(`[FileTreeService] Error building file tree:`, error.message);
            throw error;
        }
    }

    async getFileTreeStats(projectId) {
        console.log(`[FileTreeService] Calculating file tree statistics`);

        try {
            const TestFile = require('../models/test.file.model');
            const TestFolder = require('../models/test.folder.model');

            const files = await TestFile.find({ project: projectId, isDeleted: false });
            const folders = await TestFolder.find({ project: projectId, isDeleted: false });

            const stats = {
                totalFiles: files.length,
                totalFolders: folders.length,
                totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
                filesByLanguage: {},
                filesByType: {}
            };

            files.forEach(f => {
                stats.filesByLanguage[f.language] = (stats.filesByLanguage[f.language] || 0) + 1;
                stats.filesByType[f.type] = (stats.filesByType[f.type] || 0) + 1;
            });

            console.log(`[FileTreeService] Statistics calculated`);
            return stats;
        } catch (error) {
            console.error(`[FileTreeService] Error calculating statistics:`, error.message);
            throw error;
        }
    }

    async getBreadcrumb(folderId) {
        console.log(`[FileTreeService] Building breadcrumb for folder: ${folderId}`);

        try {
            const TestFolder = require('../models/test.folder.model');
            const breadcrumb = [];
            let currentFolder = await TestFolder.findById(folderId);

            while (currentFolder) {
                breadcrumb.unshift({
                    id: currentFolder._id,
                    name: currentFolder.name
                });
                currentFolder = currentFolder.parentFolder
                    ? await TestFolder.findById(currentFolder.parentFolder)
                    : null;
            }

            console.log(`[FileTreeService] Breadcrumb built`);
            return breadcrumb;
        } catch (error) {
            console.error(`[FileTreeService] Error building breadcrumb:`, error.message);
            throw error;
        }
    }
}

module.exports = new FileTreeService();