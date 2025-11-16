const { createOctokitInstance, getRepositoryContent, getFileContent } = require('../config/github.config');
const Repository = require('../models/repository.model');

class RepositoryReaderService {
    constructor() {
        this.supportedLanguages = ['javascript', 'typescript', 'java', 'python', 'csharp', 'go', 'php', 'ruby'];
        this.routePatterns = {
            javascript: ['routes', 'router', 'express', 'fastify'],
            typescript: ['routes', 'router', 'express', 'fastify'],
            java: ['controller', 'endpoint', 'rest', 'mapping'],
            python: ['route', 'blueprint', 'flask', 'django', 'fastapi']
        };
        this.controllerPatterns = {
            javascript: ['controller', 'handler'],
            typescript: ['controller', 'handler'],
            java: ['controller', 'service'],
            python: ['view', 'handler', 'endpoint']
        };
        this.modelPatterns = {
            javascript: ['model', 'schema'],
            typescript: ['model', 'interface', 'type'],
            java: ['entity', 'model', 'pojo'],
            python: ['model', 'dataclass']
        };
    }

    async readRepository(repositoryId, accessToken, options = {}) {
        console.log(`[RepositoryReaderService] Reading repository structure: ${repositoryId}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            const branch = options.branch || repository.selectedBranch;
            console.log(`[RepositoryReaderService] Reading from branch: ${branch}`);

            const structure = await this.getDirectoryStructure(
                accessToken,
                repository.repositoryOwner,
                repository.name,
                '',
                branch,
                options.maxDepth || 5
            );

            repository.structure.totalFiles = structure.totalFiles;
            repository.structure.totalDirectories = structure.totalDirectories;
            repository.structure.codeFiles = structure.codeFiles;

            await repository.save();

            console.log(`[RepositoryReaderService] Repository read completed: ${structure.totalFiles} files, ${structure.totalDirectories} directories`);
            return structure;
        } catch (error) {
            console.error(`[RepositoryReaderService] Error reading repository:`, error.message);
            throw error;
        }
    }

    async getDirectoryStructure(accessToken, owner, repo, path, branch, maxDepth, currentDepth = 0, filesList = { files: [], directories: [], totalFiles: 0, totalDirectories: 0, codeFiles: [] }) {
        if (currentDepth > maxDepth) {
            return filesList;
        }

        try {
            const octokit = createOctokitInstance(accessToken);
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: path || '',
                ref: branch
            });

            const items = Array.isArray(data) ? data : [data];
            console.log(`[RepositoryReaderService] Processing ${items.length} items at path: ${path || '/'}`);

            for (const item of items) {
                if (item.type === 'file') {
                    filesList.totalFiles++;
                    const ext = item.name.split('.').pop();

                    if (this.isCodeFile(ext)) {
                        filesList.codeFiles.push({
                            path: item.path,
                            type: item.type,
                            size: item.size,
                            language: this.getLanguageFromExtension(ext)
                        });
                    }

                    filesList.files.push({
                        name: item.name,
                        path: item.path,
                        size: item.size,
                        type: item.type
                    });
                } else if (item.type === 'dir') {
                    filesList.totalDirectories++;
                    filesList.directories.push({
                        name: item.name,
                        path: item.path,
                        type: item.type
                    });

                    if (currentDepth < maxDepth && !this.shouldSkipDirectory(item.name)) {
                        await this.getDirectoryStructure(accessToken, owner, repo, item.path, branch, maxDepth, currentDepth + 1, filesList);
                    }
                }
            }

            return filesList;
        } catch (error) {
            console.error(`[RepositoryReaderService] Error reading directory at ${path}:`, error.message);
            throw error;
        }
    }

    async readFile(accessToken, owner, repo, filePath, branch = 'main') {
        console.log(`[RepositoryReaderService] Reading file: ${filePath}`);

        try {
            const content = await getFileContent(accessToken, owner, repo, filePath);
            console.log(`[RepositoryReaderService] File read successfully: ${filePath} (${content.size} bytes)`);

            return {
                path: content.path,
                name: content.name,
                content: content.decodedContent,
                size: content.size,
                type: content.type,
                sha: content.sha
            };
        } catch (error) {
            console.error(`[RepositoryReaderService] Error reading file ${filePath}:`, error.message);
            throw error;
        }
    }

    async readMultipleFiles(accessToken, owner, repo, filePaths) {
        console.log(`[RepositoryReaderService] Reading ${filePaths.length} files from ${owner}/${repo}`);

        try {
            const files = [];

            for (const filePath of filePaths) {
                try {
                    const file = await this.readFile(accessToken, owner, repo, filePath);
                    files.push(file);
                } catch (error) {
                    console.warn(`[RepositoryReaderService] Failed to read file ${filePath}: ${error.message}`);
                }
            }

            console.log(`[RepositoryReaderService] Successfully read ${files.length} out of ${filePaths.length} files`);
            return files;
        } catch (error) {
            console.error(`[RepositoryReaderService] Error reading multiple files:`, error.message);
            throw error;
        }
    }

    async findFilesByPattern(accessToken, owner, repo, pattern, branch = 'main', maxResults = 100) {
        console.log(`[RepositoryReaderService] Finding files matching pattern: ${pattern}`);

        try {
            const octokit = createOctokitInstance(accessToken);
            const query = `repo:${owner}/${repo} filename:${pattern}`;

            const { data } = await octokit.rest.search.code({
                q: query,
                per_page: Math.min(maxResults, 100),
                page: 1
            });

            console.log(`[RepositoryReaderService] Found ${data.items.length} files matching pattern`);
            return data.items;
        } catch (error) {
            console.error(`[RepositoryReaderService] Error finding files by pattern:`, error.message);
            throw error;
        }
    }

    async findFilesByExtension(accessToken, owner, repo, extension, branch = 'main') {
        console.log(`[RepositoryReaderService] Finding files with extension: .${extension}`);

        try {
            const structure = await this.getDirectoryStructure(accessToken, owner, repo, '', branch, 10);

            const filtered = structure.codeFiles.filter(file => {
                const fileExt = file.path.split('.').pop();
                return fileExt === extension;
            });

            console.log(`[RepositoryReaderService] Found ${filtered.length} files with extension .${extension}`);
            return filtered;
        } catch (error) {
            console.error(`[RepositoryReaderService] Error finding files by extension:`, error.message);
            throw error;
        }
    }

    async searchCodeContent(accessToken, owner, repo, searchTerm, branch = 'main') {
        console.log(`[RepositoryReaderService] Searching for code content: ${searchTerm}`);

        try {
            const octokit = createOctokitInstance(accessToken);
            const query = `repo:${owner}/${repo} ${searchTerm}`;

            const { data } = await octokit.rest.search.code({
                q: query,
                per_page: 30,
                page: 1
            });

            console.log(`[RepositoryReaderService] Search completed: ${data.total_count} results`);
            return {
                totalResults: data.total_count,
                items: data.items
            };
        } catch (error) {
            console.error(`[RepositoryReaderService] Error searching code content:`, error.message);
            throw error;
        }
    }

    isCodeFile(extension) {
        const codeExtensions = [
            'js', 'ts', 'jsx', 'tsx', 'java', 'py', 'cs', 'go', 'php', 'rb', 'json', 'xml', 'yaml', 'yml', 'properties'
        ];
        return codeExtensions.includes(extension.toLowerCase());
    }

    getLanguageFromExtension(extension) {
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'java': 'java',
            'py': 'python',
            'cs': 'csharp',
            'go': 'go',
            'php': 'php',
            'rb': 'ruby',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'properties': 'properties'
        };
        return languageMap[extension.toLowerCase()] || 'unknown';
    }

    shouldSkipDirectory(dirName) {
        const skipDirs = [
            'node_modules',
            '.git',
            '.github',
            'dist',
            'build',
            'target',
            '__pycache__',
            '.env',
            '.venv',
            'venv',
            '.idea',
            '.vscode',
            'bin',
            'obj',
            'packages',
            'vendor',
            '.gradle'
        ];
        return skipDirs.includes(dirName.toLowerCase());
    }

    async getFilesByType(repositoryId, accessToken, fileType) {
        console.log(`[RepositoryReaderService] Getting files by type: ${fileType}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            const extension = this.getExtensionFromFileType(fileType);
            const files = await this.findFilesByExtension(accessToken, repository.repositoryOwner, repository.name, extension);

            console.log(`[RepositoryReaderService] Retrieved ${files.length} files of type ${fileType}`);
            return files;
        } catch (error) {
            console.error(`[RepositoryReaderService] Error getting files by type:`, error.message);
            throw error;
        }
    }

    getExtensionFromFileType(fileType) {
        const typeMap = {
            'javascript': 'js',
            'typescript': 'ts',
            'java': 'java',
            'python': 'py',
            'csharp': 'cs',
            'go': 'go',
            'php': 'php',
            'ruby': 'rb'
        };
        return typeMap[fileType] || fileType;
    }

    async getRepositoryMetadata(repositoryId, accessToken) {
        console.log(`[RepositoryReaderService] Getting repository metadata: ${repositoryId}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            const octokit = createOctokitInstance(accessToken);
            const { data } = await octokit.rest.repos.get({
                owner: repository.repositoryOwner,
                repo: repository.name
            });

            const metadata = {
                name: data.name,
                fullName: data.full_name,
                description: data.description,
                url: data.html_url,
                stars: data.stargazers_count,
                forks: data.forks_count,
                watchers: data.watchers_count,
                openIssues: data.open_issues_count,
                language: data.language,
                size: data.size,
                topics: data.topics,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                pushedAt: data.pushed_at,
                isPrivate: data.private,
                isArchived: data.archived,
                isDisabled: data.disabled
            };

            console.log(`[RepositoryReaderService] Repository metadata retrieved for ${repository.fullName}`);
            return metadata;
        } catch (error) {
            console.error(`[RepositoryReaderService] Error getting repository metadata:`, error.message);
            throw error;
        }
    }
}

module.exports = new RepositoryReaderService();