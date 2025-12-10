const Repository = require('../models/repository.model');
const Project = require('../models/project.model');
const { catchAsync } = require('../utils/error.util');
const crypto = require('crypto');
const axios = require('axios');

const ENCRYPTION_KEY = process.env.REPO_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_IV_LENGTH = 16;

const encrypt = (text) => {
    const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

const fetchGitHubBranches = async (fullName, accessToken) => {
    try {
        const response = await axios.get(`https://api.github.com/repos/${fullName}/branches`, {
            headers: {
                Authorization: `token ${decrypt(accessToken)}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        return response.data;
    } catch (error) {
        console.log(`[GITHUB_BRANCHES_ERROR] ${error.message}`);
        throw new Error('Failed to fetch branches from GitHub');
    }
};

const fetchGitHubRepoDetails = async (fullName, accessToken) => {
    try {
        const response = await axios.get(`https://api.github.com/repos/${fullName}`, {
            headers: {
                Authorization: `token ${decrypt(accessToken)}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        return response.data;
    } catch (error) {
        console.log(`[GITHUB_REPO_ERROR] ${error.message}`);
        throw new Error('Failed to fetch repository details from GitHub');
    }
};

const fetchGitHubFileTree = async (fullName, branch, accessToken) => {
    try {
        const response = await axios.get(`https://api.github.com/repos/${fullName}/git/trees/${branch}?recursive=1`, {
            headers: {
                Authorization: `token ${decrypt(accessToken)}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        return response.data.tree;
    } catch (error) {
        console.log(`[GITHUB_TREE_ERROR] ${error.message}`);
        throw new Error('Failed to fetch repository file tree');
    }
};

const fetchGitHubFileContent = async (fullName, path, branch, accessToken) => {
    try {
        const response = await axios.get(`https://api.github.com/repos/${fullName}/contents/${path}?ref=${branch}`, {
            headers: {
                Authorization: `token ${decrypt(accessToken)}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return content;
    } catch (error) {
        console.log(`[GITHUB_FILE_ERROR] ${path} - ${error.message}`);
        return null;
    }
};

const connectRepository = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const {
        provider = 'github',
        fullName,
        url,
        accessToken,
        branch = 'main',
        autoSync = false,
        syncFrequency = 'manual'
    } = req.body;

    console.log(`[REPO_CONNECT] Project: ${projectId}, Repository: ${fullName}, Provider: ${provider}`);

    if (!fullName || !accessToken) {
        return res.status(400).json({
            success: false,
            message: 'Repository full name and access token are required',
            code: 'MISSING_REQUIRED_FIELDS'
        });
    }

    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied to this project',
            code: 'PROJECT_ACCESS_DENIED'
        });
    }

    const existingRepo = await Repository.findOne({
        project: projectId,
        fullName: encrypt(fullName),
        isDeleted: false
    });

    if (existingRepo) {
        return res.status(409).json({
            success: false,
            message: 'Repository already connected to this project',
            code: 'REPOSITORY_ALREADY_CONNECTED'
        });
    }

    let repoDetails;
    try {
        repoDetails = await fetchGitHubRepoDetails(fullName, encrypt(accessToken));
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Failed to verify repository access. Check your access token and repository name',
            code: 'REPOSITORY_ACCESS_FAILED'
        });
    }

    let branches = [];
    try {
        branches = await fetchGitHubBranches(fullName, encrypt(accessToken));
    } catch (error) {
        console.log(`[REPO_BRANCHES_WARNING] Could not fetch branches: ${error.message}`);
    }

    const selectedBranch = branches.find(b => b.name === branch) ? branch : repoDetails.default_branch;

    const repository = new Repository({
        project: projectId,
        owner: req.user._id,
        provider: provider,
        name: encrypt(repoDetails.name),
        fullName: encrypt(fullName),
        url: encrypt(url || repoDetails.html_url),
        cloneUrl: encrypt(repoDetails.clone_url),
        sshUrl: encrypt(repoDetails.ssh_url),
        repositoryOwner: encrypt(repoDetails.owner.login),
        repositoryId: encrypt(repoDetails.id.toString()),
        defaultBranch: encrypt(repoDetails.default_branch),
        selectedBranch: encrypt(selectedBranch),
        branches: branches.map(b => ({
            name: encrypt(b.name),
            sha: encrypt(b.commit.sha),
            protected: b.protected
        })),
        isPrivate: repoDetails.private,
        description: repoDetails.description ? encrypt(repoDetails.description) : null,
        language: repoDetails.language,
        size: repoDetails.size,
        starCount: repoDetails.stargazers_count,
        forkCount: repoDetails.forks_count,
        openIssuesCount: repoDetails.open_issues_count,
        authentication: {
            type: 'token',
            accessToken: encrypt(accessToken)
        },
        connection: {
            status: 'connected',
            connectedAt: Date.now(),
            syncFrequency: syncFrequency,
            autoSync: autoSync
        },
        analysis: {
            status: 'pending'
        }
    });

    await repository.save();

    project.repository = {
        connected: true,
        url: url || repoDetails.html_url,
        fullName: fullName,
        owner: repoDetails.owner.login,
        name: repoDetails.name,
        branch: selectedBranch,
        lastSync: Date.now()
    };
    await project.save();

    console.log(`[REPO_CONNECT_SUCCESS] Repository connected: ${fullName}`);

    return res.status(201).json({
        success: true,
        message: 'Repository connected successfully',
        data: {
            repository: {
                id: repository._id,
                name: repoDetails.name,
                fullName: fullName,
                provider: provider,
                branch: selectedBranch,
                isPrivate: repoDetails.private,
                language: repoDetails.language,
                connectedAt: repository.connection.connectedAt
            }
        }
    });
});

const getRepository = catchAsync(async (req, res) => {
    const { projectId, repositoryId } = req.params;

    console.log(`[REPO_GET] Project: ${projectId}, Repository: ${repositoryId}`);

    const repository = await Repository.findOne({
        _id: repositoryId,
        project: projectId,
        isDeleted: false
    });

    if (!repository) {
        return res.status(404).json({
            success: false,
            message: 'Repository not found',
            code: 'REPOSITORY_NOT_FOUND'
        });
    }

    return res.json({
        success: true,
        data: {
            repository: {
                id: repository._id,
                name: decrypt(repository.name),
                fullName: decrypt(repository.fullName),
                url: decrypt(repository.url),
                provider: repository.provider,
                branch: decrypt(repository.selectedBranch),
                defaultBranch: decrypt(repository.defaultBranch),
                isPrivate: repository.isPrivate,
                language: repository.language,
                description: repository.description ? decrypt(repository.description) : null,
                size: repository.size,
                starCount: repository.starCount,
                forkCount: repository.forkCount,
                connection: repository.connection,
                analysis: repository.analysis,
                structure: repository.structure,
                createdAt: repository.createdAt
            }
        }
    });
});

const getRepositoriesByProject = catchAsync(async (req, res) => {
    const { projectId } = req.params;

    console.log(`[REPO_GET_PROJECT] Project: ${projectId}`);

    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const repositories = await Repository.find({
        project: projectId,
        isDeleted: false
    }).select('name fullName provider selectedBranch isPrivate language connection analysis createdAt');

    const decryptedRepos = repositories.map(repo => ({
        id: repo._id,
        name: decrypt(repo.name),
        fullName: decrypt(repo.fullName),
        provider: repo.provider,
        branch: decrypt(repo.selectedBranch),
        isPrivate: repo.isPrivate,
        language: repo.language,
        connectionStatus: repo.connection.status,
        analysisStatus: repo.analysis.status,
        lastSync: repo.connection.lastSync,
        createdAt: repo.createdAt
    }));

    return res.json({
        success: true,
        data: {
            repositories: decryptedRepos,
            count: decryptedRepos.length
        }
    });
});

const updateRepositoryBranch = catchAsync(async (req, res) => {
    const { projectId, repositoryId } = req.params;
    const { branch } = req.body;

    console.log(`[REPO_UPDATE_BRANCH] Project: ${projectId}, Repository: ${repositoryId}, Branch: ${branch}`);

    if (!branch) {
        return res.status(400).json({
            success: false,
            message: 'Branch name is required',
            code: 'BRANCH_REQUIRED'
        });
    }

    const repository = await Repository.findOne({
        _id: repositoryId,
        project: projectId,
        isDeleted: false
    });

    if (!repository) {
        return res.status(404).json({
            success: false,
            message: 'Repository not found',
            code: 'REPOSITORY_NOT_FOUND'
        });
    }

    const accessToken = repository.authentication.accessToken;
    const fullName = decrypt(repository.fullName);

    let branches;
    try {
        branches = await fetchGitHubBranches(fullName, accessToken);
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Failed to fetch branches from repository',
            code: 'BRANCH_FETCH_FAILED'
        });
    }

    const branchExists = branches.find(b => b.name === branch);
    if (!branchExists) {
        return res.status(404).json({
            success: false,
            message: 'Branch not found in repository',
            code: 'BRANCH_NOT_FOUND'
        });
    }

    repository.selectedBranch = encrypt(branch);
    repository.branches = branches.map(b => ({
        name: encrypt(b.name),
        sha: encrypt(b.commit.sha),
        protected: b.protected
    }));

    await repository.save();

    const project = await Project.findById(projectId);
    if (project && project.repository) {
        project.repository.branch = branch;
        await project.save();
    }

    console.log(`[REPO_UPDATE_BRANCH_SUCCESS] Branch updated to: ${branch}`);

    return res.json({
        success: true,
        message: 'Repository branch updated successfully',
        data: {
            repository: {
                id: repository._id,
                branch: branch,
                updatedAt: repository.updatedAt
            }
        }
    });
});

const syncRepository = catchAsync(async (req, res) => {
    const { projectId, repositoryId } = req.params;

    console.log(`[REPO_SYNC] Project: ${projectId}, Repository: ${repositoryId}`);

    const repository = await Repository.findOne({
        _id: repositoryId,
        project: projectId,
        isDeleted: false
    });

    if (!repository) {
        return res.status(404).json({
            success: false,
            message: 'Repository not found',
            code: 'REPOSITORY_NOT_FOUND'
        });
    }

    repository.connection.status = 'syncing';
    await repository.save();

    const accessToken = repository.authentication.accessToken;
    const fullName = decrypt(repository.fullName);
    const branch = decrypt(repository.selectedBranch);

    const syncStartTime = Date.now();

    try {
        const fileTree = await fetchGitHubFileTree(fullName, branch, accessToken);

        const codeExtensions = ['.js', '.ts', '.java', '.py', '.cs', '.go', '.php', '.rb', '.xml', '.json', '.yaml', '.yml', '.properties'];
        const codeFiles = fileTree.filter(file =>
            file.type === 'blob' &&
            codeExtensions.some(ext => file.path.endsWith(ext))
        );

        const routePatterns = ['/routes/', '/route/', '/router/', '/api/'];
        const controllerPatterns = ['/controllers/', '/controller/', '/ctrl/'];
        const modelPatterns = ['/models/', '/model/', '/schema/', '/entity/'];
        const servicePatterns = ['/services/', '/service/', '/business/'];
        const configPatterns = ['/config/', '/configuration/', 'application.properties', 'application.yml'];

        const categorizeFile = (path) => {
            const lowerPath = path.toLowerCase();
            if (routePatterns.some(p => lowerPath.includes(p))) return 'routes';
            if (controllerPatterns.some(p => lowerPath.includes(p))) return 'controllers';
            if (modelPatterns.some(p => lowerPath.includes(p))) return 'models';
            if (servicePatterns.some(p => lowerPath.includes(p))) return 'services';
            if (configPatterns.some(p => lowerPath.includes(p))) return 'configs';
            return null;
        };

        const categorizedFiles = {
            routes: [],
            controllers: [],
            models: [],
            services: [],
            configs: []
        };

        for (const file of codeFiles.slice(0, 50)) {
            const category = categorizeFile(file.path);
            if (category) {
                const content = await fetchGitHubFileContent(fullName, file.path, branch, accessToken);
                if (content) {
                    categorizedFiles[category].push({
                        path: encrypt(file.path),
                        name: encrypt(file.path.split('/').pop()),
                        content: encrypt(content),
                        analyzed: false,
                        lastModified: new Date()
                    });
                }
            }
        }

        repository.files = categorizedFiles;
        repository.structure = {
            totalFiles: codeFiles.length,
            totalDirectories: fileTree.filter(f => f.type === 'tree').length,
            analysedFiles: Object.values(categorizedFiles).reduce((sum, arr) => sum + arr.length, 0),
            codeFiles: codeFiles.slice(0, 100).map(f => ({
                path: f.path,
                type: f.path.split('.').pop(),
                size: f.size
            }))
        };

        repository.connection.status = 'connected';
        repository.connection.lastSync = Date.now();
        repository.connection.lastSyncStatus = 'success';

        const syncDuration = Date.now() - syncStartTime;
        await repository.addSyncHistory({
            status: 'success',
            filesAnalyzed: repository.structure.analysedFiles,
            duration: syncDuration,
            errors: []
        });

        await repository.save();

        console.log(`[REPO_SYNC_SUCCESS] Files synced: ${repository.structure.analysedFiles}`);

        return res.json({
            success: true,
            message: 'Repository synced successfully',
            data: {
                repository: {
                    id: repository._id,
                    filesAnalyzed: repository.structure.analysedFiles,
                    totalFiles: repository.structure.totalFiles,
                    syncDuration: syncDuration,
                    lastSync: repository.connection.lastSync
                }
            }
        });

    } catch (error) {
        console.log(`[REPO_SYNC_ERROR] ${error.message}`);

        repository.connection.status = 'error';
        repository.connection.lastSyncStatus = 'failed';
        repository.connection.lastSyncError = error.message;

        await repository.addSyncHistory({
            status: 'failed',
            filesAnalyzed: 0,
            duration: Date.now() - syncStartTime,
            errors: [error.message]
        });

        await repository.save();

        return res.status(500).json({
            success: false,
            message: 'Failed to sync repository',
            error: error.message,
            code: 'SYNC_FAILED'
        });
    }
});

const getRepositoryFiles = catchAsync(async (req, res) => {
    const { projectId, repositoryId } = req.params;
    const { category } = req.query;

    console.log(`[REPO_FILES] Project: ${projectId}, Repository: ${repositoryId}, Category: ${category || 'all'}`);

    const repository = await Repository.findOne({
        _id: repositoryId,
        project: projectId,
        isDeleted: false
    });

    if (!repository) {
        return res.status(404).json({
            success: false,
            message: 'Repository not found',
            code: 'REPOSITORY_NOT_FOUND'
        });
    }

    let files = {};

    if (category) {
        if (repository.files[category]) {
            files[category] = repository.files[category].map(f => ({
                path: decrypt(f.path),
                name: decrypt(f.name),
                analyzed: f.analyzed,
                lastModified: f.lastModified
            }));
        }
    } else {
        Object.keys(repository.files).forEach(cat => {
            files[cat] = repository.files[cat].map(f => ({
                path: decrypt(f.path),
                name: decrypt(f.name),
                analyzed: f.analyzed,
                lastModified: f.lastModified
            }));
        });
    }

    return res.json({
        success: true,
        data: {
            files: files,
            structure: repository.structure
        }
    });
});

const getFileContent = catchAsync(async (req, res) => {
    const { projectId, repositoryId } = req.params;
    const { filePath, category } = req.query;

    console.log(`[REPO_FILE_CONTENT] Repository: ${repositoryId}, File: ${filePath}`);

    if (!filePath || !category) {
        return res.status(400).json({
            success: false,
            message: 'File path and category are required',
            code: 'MISSING_PARAMETERS'
        });
    }

    const repository = await Repository.findOne({
        _id: repositoryId,
        project: projectId,
        isDeleted: false
    });

    if (!repository) {
        return res.status(404).json({
            success: false,
            message: 'Repository not found',
            code: 'REPOSITORY_NOT_FOUND'
        });
    }

    const categoryFiles = repository.files[category];
    if (!categoryFiles) {
        return res.status(404).json({
            success: false,
            message: 'Category not found',
            code: 'CATEGORY_NOT_FOUND'
        });
    }

    const file = categoryFiles.find(f => decrypt(f.path) === filePath);
    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
            code: 'FILE_NOT_FOUND'
        });
    }

    return res.json({
        success: true,
        data: {
            file: {
                path: decrypt(file.path),
                name: decrypt(file.name),
                content: decrypt(file.content),
                analyzed: file.analyzed,
                lastModified: file.lastModified
            }
        }
    });
});

const updateRepositorySettings = catchAsync(async (req, res) => {
    const { projectId, repositoryId } = req.params;
    const { autoSync, syncFrequency } = req.body;

    console.log(`[REPO_UPDATE_SETTINGS] Repository: ${repositoryId}`);

    const repository = await Repository.findOne({
        _id: repositoryId,
        project: projectId,
        isDeleted: false
    });

    if (!repository) {
        return res.status(404).json({
            success: false,
            message: 'Repository not found',
            code: 'REPOSITORY_NOT_FOUND'
        });
    }

    if (autoSync !== undefined) {
        repository.connection.autoSync = autoSync;
    }

    if (syncFrequency && ['manual', 'hourly', 'daily', 'weekly', 'on-commit'].includes(syncFrequency)) {
        repository.connection.syncFrequency = syncFrequency;
    }

    if (repository.connection.autoSync && repository.connection.syncFrequency !== 'manual') {
        await repository.scheduleNextSync();
    }

    await repository.save();

    console.log(`[REPO_UPDATE_SETTINGS_SUCCESS] Settings updated`);

    return res.json({
        success: true,
        message: 'Repository settings updated successfully',
        data: {
            repository: {
                id: repository._id,
                autoSync: repository.connection.autoSync,
                syncFrequency: repository.connection.syncFrequency,
                nextSyncAt: repository.connection.nextSyncAt
            }
        }
    });
});

const disconnectRepository = catchAsync(async (req, res) => {
    const { projectId, repositoryId } = req.params;

    console.log(`[REPO_DISCONNECT] Project: ${projectId}, Repository: ${repositoryId}`);

    const repository = await Repository.findOne({
        _id: repositoryId,
        project: projectId,
        isDeleted: false
    });

    if (!repository) {
        return res.status(404).json({
            success: false,
            message: 'Repository not found',
            code: 'REPOSITORY_NOT_FOUND'
        });
    }

    await repository.disconnect(req.user._id);

    const project = await Project.findById(projectId);
    if (project && project.repository) {
        project.repository.connected = false;
        await project.save();
    }

    console.log(`[REPO_DISCONNECT_SUCCESS] Repository disconnected`);

    return res.json({
        success: true,
        message: 'Repository disconnected successfully',
        data: {
            repositoryId: repositoryId,
            disconnected: true
        }
    });
});

const refreshRepositoryToken = catchAsync(async (req, res) => {
    const { projectId, repositoryId } = req.params;
    const { accessToken } = req.body;

    console.log(`[REPO_REFRESH_TOKEN] Repository: ${repositoryId}`);

    if (!accessToken) {
        return res.status(400).json({
            success: false,
            message: 'Access token is required',
            code: 'TOKEN_REQUIRED'
        });
    }

    const repository = await Repository.findOne({
        _id: repositoryId,
        project: projectId,
        isDeleted: false
    });

    if (!repository) {
        return res.status(404).json({
            success: false,
            message: 'Repository not found',
            code: 'REPOSITORY_NOT_FOUND'
        });
    }

    const fullName = decrypt(repository.fullName);

    try {
        await fetchGitHubRepoDetails(fullName, encrypt(accessToken));
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid access token',
            code: 'INVALID_TOKEN'
        });
    }

    repository.authentication.accessToken = encrypt(accessToken);
    repository.connection.status = 'connected';
    await repository.save();

    console.log(`[REPO_REFRESH_TOKEN_SUCCESS] Token refreshed`);

    return res.json({
        success: true,
        message: 'Repository access token refreshed successfully',
        data: {
            repositoryId: repository._id
        }
    });
});

module.exports = {
    connectRepository,
    getRepository,
    getRepositoriesByProject,
    updateRepositoryBranch,
    syncRepository,
    getRepositoryFiles,
    getFileContent,
    updateRepositorySettings,
    disconnectRepository,
    refreshRepositoryToken
};