const TestScript = require('../models/test.script.model');
const Project = require('../models/project.model');
const ApiEndpoint = require('../models/api.endpoint.model');
const AuditLog = require('../models/audit.model');
const { catchAsync } = require('../utils/error.util');

const createTestScript = catchAsync(async (req, res) => {
    const { projectId, endpointId, name, description, framework, scriptType } = req.body;
    console.log(`[TEST_SCRIPT] Creating test script for project: ${projectId}`);

    if (!projectId || !endpointId || !name) {
        console.warn(`[TEST_SCRIPT] Creation failed: Missing required fields`);
        return res.status(400).json({
            success: false,
            message: 'Project ID, endpoint ID, and name are required',
            code: 'MISSING_FIELDS'
        });
    }

    // Check project exists and user has access
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

    // Check endpoint exists
    const endpoint = await ApiEndpoint.findById(endpointId);
    if (!endpoint) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found',
            code: 'ENDPOINT_NOT_FOUND'
        });
    }

    // Create test script
    const testScript = new TestScript({
        project: projectId,
        endpoint: endpointId,
        name: name.trim(),
        description: description?.trim(),
        framework: framework || 'rest-assured',
        language: 'java',
        scriptType: scriptType || 'functional',
        content: {
            testClass: {
                name: `${name.replace(/\s+/g, '')}Test`,
                packageName: `com.test.${project.slug}.tests`,
                imports: [],
                annotations: ['@Test'],
                content: ''
            }
        },
        configuration: {
            timeout: 30000,
            retryCount: 0,
            retryDelay: 1000,
            parallel: false,
            priority: 'medium',
            tags: [],
            groups: []
        },
        generation: {
            generatedBy: 'anthropic',
            generatedAt: Date.now(),
            model: 'claude-sonnet-4',
            confidence: 0
        },
        status: 'draft',
        isActive: false,
        createdBy: req.user._id
    });

    await testScript.save();

    // Add to project
    project.testScripts.push(testScript._id);
    project.stats.totalTests++;
    await project.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'test_script_created',
        actionCategory: 'testing',
        entityType: 'test_script',
        entityId: testScript._id,
        status: 'success',
        severity: 'info',
        details: { projectId, endpointId, name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[TEST_SCRIPT] Test script created: ${testScript._id}`);

    return res.status(201).json({
        success: true,
        message: 'Test script created successfully',
        data: {
            testScript: {
                id: testScript._id,
                name: testScript.name,
                framework: testScript.framework,
                status: testScript.status
            }
        }
    });
});

const getTestScripts = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { page = 1, limit = 20, status, framework, scriptType } = req.query;
    console.log(`[TEST_SCRIPT] Fetching test scripts for project: ${projectId}`);

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

    const query = {
        project: projectId,
        isDeleted: false
    };

    if (status) query.status = status;
    if (framework) query.framework = framework;
    if (scriptType) query.scriptType = scriptType;

    const skip = (page - 1) * limit;

    const testScripts = await TestScript.find(query)
        .populate('endpoint', 'method path description')
        .populate('testSuite', 'name')
        .select('-content.testClass.content -content.featureFile.content')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await TestScript.countDocuments(query);

    console.log(`[TEST_SCRIPT] Test scripts fetched: ${testScripts.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            testScripts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});

const getTestScriptById = catchAsync(async (req, res) => {
    const { scriptId } = req.params;
    console.log(`[TEST_SCRIPT] Fetching test script: ${scriptId}`);

    const testScript = await TestScript.findById(scriptId)
        .populate('project', 'name slug')
        .populate('endpoint', 'method path description')
        .populate('testSuite', 'name')
        .populate('createdBy', 'firstName lastName email')
        .lean();

    if (!testScript) {
        return res.status(404).json({
            success: false,
            message: 'Test script not found',
            code: 'TEST_SCRIPT_NOT_FOUND'
        });
    }

    // Check access
    const project = await Project.findById(testScript.project._id);
    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    console.log(`[TEST_SCRIPT] Test script fetched: ${testScript.name}`);

    return res.json({
        success: true,
        data: { testScript }
    });
});

module.exports = {
    createTestScript,
    getTestScripts,
    getTestScriptById
};