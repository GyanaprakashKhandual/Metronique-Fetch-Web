class FileSearchService {
    async searchByName(projectId, searchTerm, options = {}) {
        console.log(`[FileSearchService] Searching files by name: ${searchTerm}`);

        try {
            const TestFile = require('../models/test.file.model');
            const query = {
                project: projectId,
                isDeleted: false,
                name: { $regex: searchTerm, $options: 'i' }
            };

            const files = await TestFile.find(query)
                .sort({ name: 1 })
                .skip(options.skip || 0)
                .limit(options.limit || 50);

            const total = await TestFile.countDocuments(query);

            console.log(`[FileSearchService] Found ${files.length} files matching: ${searchTerm}`);
            return { files, total };
        } catch (error) {
            console.error(`[FileSearchService] Error searching by name:`, error.message);
            throw error;
        }
    }

    async searchByContent(projectId, searchTerm, options = {}) {
        console.log(`[FileSearchService] Searching files by content: ${searchTerm}`);

        try {
            const TestFile = require('../models/test.file.model');
            const query = {
                project: projectId,
                isDeleted: false,
                content: { $regex: searchTerm, $options: 'i' }
            };

            const files = await TestFile.find(query)
                .skip(options.skip || 0)
                .limit(options.limit || 50);

            const total = await TestFile.countDocuments(query);

            console.log(`[FileSearchService] Found ${files.length} files with matching content`);
            return { files, total };
        } catch (error) {
            console.error(`[FileSearchService] Error searching by content:`, error.message);
            throw error;
        }
    }

    async searchByExtension(projectId, extension, options = {}) {
        console.log(`[FileSearchService] Searching files by extension: ${extension}`);

        try {
            const TestFile = require('../models/test.file.model');
            const query = {
                project: projectId,
                isDeleted: false,
                extension: extension.toLowerCase()
            };

            const files = await TestFile.find(query)
                .skip(options.skip || 0)
                .limit(options.limit || 50);

            const total = await TestFile.countDocuments(query);

            console.log(`[FileSearchService] Found ${files.length} files with extension: ${extension}`);
            return { files, total };
        } catch (error) {
            console.error(`[FileSearchService] Error searching by extension:`, error.message);
            throw error;
        }
    }

    async getRecentFiles(projectId, limit = 10) {
        console.log(`[FileSearchService] Fetching recent files`);

        try {
            const TestFile = require('../models/test.file.model');
            const files = await TestFile.find({ project: projectId, isDeleted: false })
                .sort({ updatedAt: -1 })
                .limit(limit);

            console.log(`[FileSearchService] Retrieved ${files.length} recent files`);
            return files;
        } catch (error) {
            console.error(`[FileSearchService] Error fetching recent files:`, error.message);
            throw error;
        }
    }

    async advancedSearch(projectId, filters = {}) {
        console.log(`[FileSearchService] Performing advanced search`);

        try {
            const TestFile = require('../models/test.file.model');
            const query = { project: projectId, isDeleted: false };

            if (filters.language) query.language = filters.language;
            if (filters.type) query.type = filters.type;
            if (filters.minSize) query.size = { $gte: filters.minSize };
            if (filters.maxSize) query.size = { ...query.size, $lte: filters.maxSize };
            if (filters.createdAfter) query.createdAt = { $gte: new Date(filters.createdAfter) };

            const files = await TestFile.find(query)
                .skip(filters.skip || 0)
                .limit(filters.limit || 50);

            const total = await TestFile.countDocuments(query);

            console.log(`[FileSearchService] Advanced search returned ${files.length} files`);
            return { files, total };
        } catch (error) {
            console.error(`[FileSearchService] Error in advanced search:`, error.message);
            throw error;
        }
    }
}

module.exports = new FileSearchService();