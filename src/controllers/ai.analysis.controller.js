const Project = require('../models/project.model');
const ApiEndpoint = require('../models/api.endpoint.model');
const AuditLog = require('../models/audit.model');
const { catchAsync } = require('../utils/error.util');
const codeAnalysisService = require('../services/ai/code.analysis.service');

const startAnalysis = catchAsync(async (req, res) => {
    const { projectId } = req.body;
    console.log(`[AI_ANALYSIS] Starting analysis for project: ${projectId}`);

    if (!projectId) {
        return res.status(400).json({
            success: false,
            message: 'Project ID is required',
            code: 'PROJECT_ID_REQUIRED'
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
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    if (!project.repository.connected) {
        return res.status(400).json({
            success: false,
            message: 'Repository not connected',
            code: 'REPOSITORY_NOT_CONNECTED'
        });
    }

    if (project.analysis.status === 'analyzing') {
        return res.status(400).json({
            success: false,
            message: 'Analysis already in progress',
            code: 'ANALYSIS_IN_PROGRESS'
        });
    }

    // Update analysis status
    project.analysis.status = 'analyzing';
    project.analysis.startedAt = Date.now();
    project.analysis.aiProvider = 'anthropic';
    await project.save();

    // Start analysis in background (async)
    codeAnalysisService.analyzeRepository(projectId, req.user._id)
        .catch(error => {
            console.error(`[AI_ANALYSIS] Analysis failed for project ${projectId}:`, error);
        });

    await AuditLog.create({
        user: req.user._id,
        action: 'analysis_started',
        actionCategory: 'analysis',
        entityType: 'project',
        entityId: project._id,
        status: 'success',
        severity: 'info',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[AI_ANALYSIS] Analysis started for project: ${projectId}`);

    return res.json({
        success: true,
        message: 'Analysis started successfully',
        data: {
            projectId,
            status: 'analyzing',
            message: 'Repository analysis in progress. This may take a few minutes.'
        }
    });
});

const getAnalysisStatus = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    console.log(`[AI_ANALYSIS] Fetching analysis status: ${projectId}`);

    const project = await Project.findById(projectId)
        .select('analysis')
        .lean();

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    console.log(`[AI_ANALYSIS] Analysis status: ${project.analysis.status}`);

    return res.json({
        success: true,
        data: {
            status: project.analysis.status,
            startedAt: project.analysis.startedAt,
            completedAt: project.analysis.completedAt,
            totalFiles: project.analysis.totalFiles,
            totalRoutes: project.analysis.totalRoutes,
            totalControllers: project.analysis.totalControllers,
            totalModels: project.analysis.totalModels,
            totalEndpoints: project.analysis.totalEndpoints
        }
    });
});

const getDiscoveredAPIs = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    console.log(`[AI_ANALYSIS] Fetching discovered APIs: ${projectId}`);

    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
        });
    }

    const skip = (page - 1) * limit;

    const endpoints = await ApiEndpoint.find({
        project: projectId,
        isDeleted: false
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await ApiEndpoint.countDocuments({
        project: projectId,
        isDeleted: false
    });

    console.log(`[AI_ANALYSIS] APIs fetched: ${endpoints.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            endpoints,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});

module.exports = {
    startAnalysis,
    getAnalysisStatus,
    getDiscoveredAPIs
};