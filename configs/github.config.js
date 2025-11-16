const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');

const githubConfig = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL || `${process.env.BACKEND_URL}/api/v1/github/callback`,
    scope: ['repo', 'read:user', 'user:email', 'read:org', 'admin:repo_hook'],
    apiVersion: '2022-11-28',
    baseUrl: 'https://api.github.com',
    timeout: 30000,
    retryAttempts: 3
};

const validateConfig = () => {
    const requiredFields = ['clientId', 'clientSecret', 'webhookSecret'];
    const missingFields = requiredFields.filter(field => !githubConfig[field]);

    if (missingFields.length > 0) {
        console.error('GitHub Configuration Error: Missing required fields:', missingFields.join(', '));
        process.exit(1);
    }

    console.log('GitHub Configuration Validated Successfully');
};

const createOctokitInstance = (accessToken) => {
    try {
        const octokit = new Octokit({
            auth: accessToken,
            baseUrl: githubConfig.baseUrl,
            timeout: githubConfig.timeout,
            userAgent: 'metronique-fetch-api',
            request: {
                retries: githubConfig.retryAttempts
            }
        });

        console.log('Octokit Instance Created Successfully');
        return octokit;
    } catch (error) {
        console.error('Octokit Instance Creation Error:', error.message);
        throw error;
    }
};

const createAppOctokit = () => {
    try {
        if (!githubConfig.appId || !githubConfig.privateKey) {
            console.error('GitHub App Configuration Missing: APP_ID or PRIVATE_KEY required');
            return null;
        }

        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: githubConfig.appId,
                privateKey: githubConfig.privateKey.replace(/\\n/g, '\n')
            }
        });

        console.log('GitHub App Octokit Instance Created Successfully');
        return octokit;
    } catch (error) {
        console.error('GitHub App Octokit Creation Error:', error.message);
        return null;
    }
};

const getAuthorizationUrl = (state) => {
    try {
        const params = new URLSearchParams({
            client_id: githubConfig.clientId,
            redirect_uri: githubConfig.callbackUrl,
            scope: githubConfig.scope.join(' '),
            state: state || generateState(),
            allow_signup: 'true'
        });

        const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
        console.log('GitHub Authorization URL Generated');
        return authUrl;
    } catch (error) {
        console.error('Authorization URL Generation Error:', error.message);
        throw error;
    }
};

const exchangeCodeForToken = async (code) => {
    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: githubConfig.clientId,
                client_secret: githubConfig.clientSecret,
                code: code
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('GitHub Token Exchange Error:', data.error_description);
            throw new Error(data.error_description);
        }

        console.log('GitHub Access Token Obtained Successfully');
        return data.access_token;
    } catch (error) {
        console.error('Token Exchange Error:', error.message);
        throw error;
    }
};

const getUserInfo = async (accessToken) => {
    try {
        const octokit = createOctokitInstance(accessToken);
        const { data } = await octokit.rest.users.getAuthenticated();
        console.log(`GitHub User Info Retrieved: ${data.login}`);
        return data;
    } catch (error) {
        console.error('GitHub User Info Retrieval Error:', error.message);
        throw error;
    }
};

const listUserRepositories = async (accessToken, options = {}) => {
    try {
        const octokit = createOctokitInstance(accessToken);
        const { data } = await octokit.rest.repos.listForAuthenticatedUser({
            sort: options.sort || 'updated',
            direction: options.direction || 'desc',
            per_page: options.perPage || 100,
            page: options.page || 1,
            type: options.type || 'all'
        });
        console.log(`Retrieved ${data.length} Repositories from GitHub`);
        return data;
    } catch (error) {
        console.error('Repository List Retrieval Error:', error.message);
        throw error;
    }
};

const getRepository = async (accessToken, owner, repo) => {
    try {
        const octokit = createOctokitInstance(accessToken);
        const { data } = await octokit.rest.repos.get({ owner, repo });
        console.log(`Repository Retrieved: ${owner}/${repo}`);
        return data;
    } catch (error) {
        console.error(`Repository Retrieval Error (${owner}/${repo}):`, error.message);
        throw error;
    }
};

const getRepositoryContent = async (accessToken, owner, repo, path = '') => {
    try {
        const octokit = createOctokitInstance(accessToken);
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
        console.log(`Repository Content Retrieved: ${owner}/${repo}/${path}`);
        return data;
    } catch (error) {
        console.error(`Content Retrieval Error (${owner}/${repo}/${path}):`, error.message);
        throw error;
    }
};

const getFileContent = async (accessToken, owner, repo, path) => {
    try {
        const octokit = createOctokitInstance(accessToken);
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path });

        if (data.type !== 'file') {
            throw new Error('Path is not a file');
        }

        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        console.log(`File Content Retrieved: ${owner}/${repo}/${path}`);
        return { ...data, decodedContent: content };
    } catch (error) {
        console.error(`File Content Retrieval Error (${owner}/${repo}/${path}):`, error.message);
        throw error;
    }
};

const listBranches = async (accessToken, owner, repo) => {
    try {
        const octokit = createOctokitInstance(accessToken);
        const { data } = await octokit.rest.repos.listBranches({ owner, repo });
        console.log(`Branches Retrieved: ${owner}/${repo} (${data.length} branches)`);
        return data;
    } catch (error) {
        console.error(`Branches Retrieval Error (${owner}/${repo}):`, error.message);
        throw error;
    }
};

const createWebhook = async (accessToken, owner, repo, webhookUrl, events = ['push', 'pull_request']) => {
    try {
        const octokit = createOctokitInstance(accessToken);
        const { data } = await octokit.rest.repos.createWebhook({
            owner,
            repo,
            config: {
                url: webhookUrl,
                content_type: 'json',
                secret: githubConfig.webhookSecret,
                insecure_ssl: process.env.NODE_ENV === 'production' ? '0' : '1'
            },
            events: events,
            active: true
        });
        console.log(`Webhook Created: ${owner}/${repo} -> ${webhookUrl}`);
        return data;
    } catch (error) {
        console.error(`Webhook Creation Error (${owner}/${repo}):`, error.message);
        throw error;
    }
};

const deleteWebhook = async (accessToken, owner, repo, hookId) => {
    try {
        const octokit = createOctokitInstance(accessToken);
        await octokit.rest.repos.deleteWebhook({ owner, repo, hook_id: hookId });
        console.log(`Webhook Deleted: ${owner}/${repo} (Hook ID: ${hookId})`);
        return true;
    } catch (error) {
        console.error(`Webhook Deletion Error (${owner}/${repo}):`, error.message);
        throw error;
    }
};

const verifyWebhookSignature = (payload, signature) => {
    try {
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', githubConfig.webhookSecret);
        const digest = 'sha256=' + hmac.update(payload).digest('hex');
        const isValid = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));

        if (isValid) {
            console.log('Webhook Signature Verified Successfully');
        } else {
            console.error('Webhook Signature Verification Failed');
        }

        return isValid;
    } catch (error) {
        console.error('Webhook Signature Verification Error:', error.message);
        return false;
    }
};

const getRateLimit = async (accessToken) => {
    try {
        const octokit = createOctokitInstance(accessToken);
        const { data } = await octokit.rest.rateLimit.get();
        console.log(`GitHub Rate Limit: ${data.rate.remaining}/${data.rate.limit}`);
        return data;
    } catch (error) {
        console.error('Rate Limit Check Error:', error.message);
        throw error;
    }
};

const searchRepositories = async (accessToken, query, options = {}) => {
    try {
        const octokit = createOctokitInstance(accessToken);
        const { data } = await octokit.rest.search.repos({
            q: query,
            sort: options.sort || 'stars',
            order: options.order || 'desc',
            per_page: options.perPage || 30,
            page: options.page || 1
        });
        console.log(`Repository Search Results: ${data.total_count} repositories found`);
        return data;
    } catch (error) {
        console.error('Repository Search Error:', error.message);
        throw error;
    }
};

const generateState = () => {
    return require('crypto').randomBytes(16).toString('hex');
};

validateConfig();

module.exports = {
    githubConfig,
    createOctokitInstance,
    createAppOctokit,
    getAuthorizationUrl,
    exchangeCodeForToken,
    getUserInfo,
    listUserRepositories,
    getRepository,
    getRepositoryContent,
    getFileContent,
    listBranches,
    createWebhook,
    deleteWebhook,
    verifyWebhookSignature,
    getRateLimit,
    searchRepositories
};