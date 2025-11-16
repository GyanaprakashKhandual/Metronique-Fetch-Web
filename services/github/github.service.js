const { createOctokitInstance, getRepository, listBranches, getFileContent, verifyWebhookSignature, createWebhook, deleteWebhook, getRateLimit } = require('../config/github.config');
const Repository = require('../models/repository.model');
const AuditLog = require('../models/audit.log.model');

class GitHubService {
    async connectRepository(projectId, repoUrl, accessToken, userId, metadata = {}) {
        console.log(`[GitHubService] Connecting repository to project ${projectId}: ${repoUrl}`);

        try {
            const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
            if (!match) {
                throw new Error('Invalid GitHub repository URL format');
            }

            const [, owner, repoName] = match;
            console.log(`[GitHubService] Parsed repository: ${owner}/${repoName}`);

            const repoData = await getRepository(accessToken, owner, repoName);
            console.log(`[GitHubService] Retrieved repository data for ${owner}/${repoName}`);

            const branches = await listBranches(accessToken, owner, repoName);
            console.log(`[GitHubService] Retrieved ${branches.length} branches for ${owner}/${repoName}`);

            const repository = new Repository({
                project: projectId,
                owner: userId,
                provider: 'github',
                name: repoData.name,
                fullName: repoData.full_name,
                url: repoData.html_url,
                cloneUrl: repoData.clone_url,
                sshUrl: repoData.ssh_url,
                repositoryOwner: owner,
                repositoryId: repoData.id.toString(),
                defaultBranch: repoData.default_branch,
                selectedBranch: repoData.default_branch,
                isPrivate: repoData.private,
                description: repoData.description,
                language: repoData.language,
                size: repoData.size,
                starCount: repoData.stargazers_count,
                forkCount: repoData.forks_count,
                openIssuesCount: repoData.open_issues_count,
                branches: branches.map(b => ({
                    name: b.name,
                    sha: b.commit.sha,
                    protected: b.protected,
                    lastCommit: {
                        sha: b.commit.sha,
                        message: '',
                        author: '',
                        date: new Date()
                    }
                })),
                authentication: {
                    type: 'oauth',
                    accessToken: accessToken
                },
                connection: {
                    status: 'connected',
                    connectedAt: new Date(),
                    lastSync: new Date(),
                    lastSyncStatus: 'success'
                },
                metadata: {
                    createdAt: new Date(repoData.created_at),
                    updatedAt: new Date(repoData.updated_at),
                    pushedAt: new Date(repoData.pushed_at),
                    topics: repoData.topics || [],
                    hasIssues: repoData.has_issues,
                    hasProjects: repoData.has_projects,
                    hasWiki: repoData.has_wiki,
                    hasPages: repoData.has_pages,
                    archived: repoData.archived,
                    disabled: repoData.disabled
                }
            });

            await repository.save();

            await AuditLog.create({
                user: userId,
                action: 'repository_connected',
                actionCategory: 'project',
                entityType: 'repository',
                entityId: repository._id,
                entityName: repository.fullName,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Repository connected to project`,
                    owner,
                    repoName
                },
                ...metadata
            });

            console.log(`[GitHubService] Repository connected successfully: ${repository._id}`);
            return repository;
        } catch (error) {
            console.error(`[GitHubService] Error connecting repository:`, error.message);
            throw error;
        }
    }

    async syncRepository(repositoryId, accessToken, userId, metadata = {}) {
        console.log(`[GitHubService] Syncing repository: ${repositoryId}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            repository.connection.status = 'syncing';
            await repository.save();

            const repoData = await getRepository(accessToken, repository.repositoryOwner, repository.name);
            console.log(`[GitHubService] Retrieved updated repository data for ${repository.fullName}`);

            const branches = await listBranches(accessToken, repository.repositoryOwner, repository.name);
            console.log(`[GitHubService] Retrieved ${branches.length} updated branches`);

            repository.starCount = repoData.stargazers_count;
            repository.forkCount = repoData.forks_count;
            repository.openIssuesCount = repoData.open_issues_count;
            repository.branches = branches.map(b => ({
                name: b.name,
                sha: b.commit.sha,
                protected: b.protected,
                lastCommit: {
                    sha: b.commit.sha,
                    message: '',
                    author: '',
                    date: new Date()
                }
            }));

            repository.connection.status = 'connected';
            repository.connection.lastSync = new Date();
            repository.connection.lastSyncStatus = 'success';

            const syncDuration = Date.now() - repository.connection.lastSync;
            await repository.addSyncHistory({
                status: 'success',
                filesAnalyzed: branches.length,
                duration: syncDuration,
                errors: []
            });

            await repository.save();

            await AuditLog.create({
                user: userId,
                action: 'repository_synced',
                actionCategory: 'project',
                entityType: 'repository',
                entityId: repositoryId,
                entityName: repository.fullName,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Repository synced successfully`,
                    branchesCount: branches.length
                },
                ...metadata
            });

            console.log(`[GitHubService] Repository synced successfully: ${repositoryId}`);
            return repository;
        } catch (error) {
            console.error(`[GitHubService] Error syncing repository:`, error.message);

            const repository = await Repository.findById(repositoryId);
            if (repository) {
                repository.connection.status = 'error';
                repository.connection.lastSyncStatus = 'failed';
                repository.connection.lastSyncError = error.message;
                await repository.save();
            }

            throw error;
        }
    }

    async setupWebhook(repositoryId, webhookUrl, accessToken, userId, events = ['push', 'pull_request'], metadata = {}) {
        console.log(`[GitHubService] Setting up webhook for repository ${repositoryId}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            const webhook = await createWebhook(accessToken, repository.repositoryOwner, repository.name, webhookUrl, events);
            console.log(`[GitHubService] Webhook created successfully for ${repository.fullName}`);

            repository.webhook = {
                configured: true,
                webhookId: webhook.id.toString(),
                secret: webhook.config?.secret,
                url: webhook.config?.url,
                events: webhook.events,
                active: webhook.active,
                lastTriggered: null,
                totalTriggers: 0
            };

            await repository.save();

            await AuditLog.create({
                user: userId,
                action: 'integration_connected',
                actionCategory: 'project',
                entityType: 'repository',
                entityId: repositoryId,
                entityName: repository.fullName,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Webhook configured for repository`,
                    events
                },
                ...metadata
            });

            console.log(`[GitHubService] Webhook setup completed for repository ${repositoryId}`);
            return repository;
        } catch (error) {
            console.error(`[GitHubService] Error setting up webhook:`, error.message);
            throw error;
        }
    }

    async removeWebhook(repositoryId, accessToken, userId, metadata = {}) {
        console.log(`[GitHubService] Removing webhook from repository ${repositoryId}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            if (!repository.webhook.webhookId) {
                throw new Error('No webhook configured for this repository');
            }

            await deleteWebhook(accessToken, repository.repositoryOwner, repository.name, parseInt(repository.webhook.webhookId));
            console.log(`[GitHubService] Webhook deleted successfully for ${repository.fullName}`);

            repository.webhook = {
                configured: false,
                webhookId: null,
                secret: null,
                url: null,
                events: [],
                active: false,
                lastTriggered: null,
                totalTriggers: 0
            };

            await repository.save();

            await AuditLog.create({
                user: userId,
                action: 'integration_disconnected',
                actionCategory: 'project',
                entityType: 'repository',
                entityId: repositoryId,
                entityName: repository.fullName,
                status: 'success',
                severity: 'info',
                details: { description: `Webhook removed from repository` },
                ...metadata
            });

            console.log(`[GitHubService] Webhook removal completed for repository ${repositoryId}`);
            return repository;
        } catch (error) {
            console.error(`[GitHubService] Error removing webhook:`, error.message);
            throw error;
        }
    }

    async handleWebhookEvent(repositoryId, signature, payload) {
        console.log(`[GitHubService] Processing webhook event for repository ${repositoryId}`);

        try {
            const isValid = verifyWebhookSignature(JSON.stringify(payload), signature);

            if (!isValid) {
                console.warn(`[GitHubService] Invalid webhook signature for repository ${repositoryId}`);
                throw new Error('Invalid webhook signature');
            }

            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            repository.webhook.lastTriggered = new Date();
            repository.webhook.totalTriggers++;

            const eventType = payload.action || payload.ref?.split('/').pop() || 'unknown';
            console.log(`[GitHubService] Webhook event processed: ${eventType} for repository ${repositoryId}`);

            await repository.save();
            return { success: true, eventType };
        } catch (error) {
            console.error(`[GitHubService] Error handling webhook event:`, error.message);
            throw error;
        }
    }

    async checkRateLimit(accessToken) {
        console.log(`[GitHubService] Checking GitHub API rate limit`);

        try {
            const rateLimit = await getRateLimit(accessToken);
            console.log(`[GitHubService] Rate limit check completed: ${rateLimit.rate.remaining}/${rateLimit.rate.limit}`);
            return rateLimit;
        } catch (error) {
            console.error(`[GitHubService] Error checking rate limit:`, error.message);
            throw error;
        }
    }

    async disconnectRepository(repositoryId, userId, metadata = {}) {
        console.log(`[GitHubService] Disconnecting repository ${repositoryId}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            await repository.disconnect(userId);

            await AuditLog.create({
                user: userId,
                action: 'repository_disconnected',
                actionCategory: 'project',
                entityType: 'repository',
                entityId: repositoryId,
                entityName: repository.fullName,
                status: 'success',
                severity: 'warning',
                details: { description: `Repository disconnected from project` },
                ...metadata
            });

            console.log(`[GitHubService] Repository disconnected successfully: ${repositoryId}`);
            return repository;
        } catch (error) {
            console.error(`[GitHubService] Error disconnecting repository:`, error.message);
            throw error;
        }
    }

    async getBranchContent(repositoryId, branch, path, accessToken) {
        console.log(`[GitHubService] Fetching content from branch ${branch} at path ${path}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            const content = await getFileContent(accessToken, repository.repositoryOwner, repository.name, path);
            console.log(`[GitHubService] Content retrieved successfully from ${repository.fullName}/${branch}/${path}`);

            return content;
        } catch (error) {
            console.error(`[GitHubService] Error fetching branch content:`, error.message);
            throw error;
        }
    }

    async getRepositoryStructure(repositoryId, accessToken) {
        console.log(`[GitHubService] Fetching repository structure for ${repositoryId}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            const octokit = createOctokitInstance(accessToken);
            const { data } = await octokit.rest.repos.getContent({
                owner: repository.repositoryOwner,
                repo: repository.name,
                path: ''
            });

            const structure = Array.isArray(data) ? data : [data];
            console.log(`[GitHubService] Repository structure retrieved with ${structure.length} root items`);

            return structure;
        } catch (error) {
            console.error(`[GitHubService] Error fetching repository structure:`, error.message);
            throw error;
        }
    }
}

module.exports = new GitHubService();