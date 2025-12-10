const TestExecution = require('../models/test.execution.model');
const TestResult = require('../models/test.result.model');
const Project = require('../models/project.model');
const TestScript = require('../models/test.script.model');
const AuditLog = require('../models/audit.model');
const { catchAsync } = require('../utils/error.util');
const testExecutorService = require('../services/testing/test.executor.service');

const runTests = catchAsync(async (req, res) => {
    const { projectId, testScriptIds, environment, parallelExecution } = req.body;
    console.log(`[TEST_EXECUTION] Running tests for project: ${projectId}`);

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

    // Get test scripts to run
    let testScriptsToRun;
    if (testScriptIds && testScriptIds.length > 0) {
        testScriptsToRun = await TestScript.find({
            _id: { $in: testScriptIds },
            project: projectId,
            isActive: true,
            isDeleted: false
        });
    } else {
        // Run all active test scripts
        testScriptsToRun = await TestScript.find({
            project: projectId,
            isActive: true,
            isDeleted: false
        });
    }

    if (testScriptsToRun.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No active test scripts found',
            code: 'NO_TESTS_FOUND'
        });
    }

    // Create test execution record
    const testExecution = new TestExecution({
        project: projectId,
        testScripts: testScriptsToRun.map(ts => ts._id),
        executedBy: req.user._id,
        environment: environment || 'dev',
        configuration: {
            parallel: parallelExecution || false,
            threadCount: parallelExecution ? 3 : 1,
            timeout: project.testConfig.timeout || 30000,
            retryCount: project.testConfig.retryCount || 0
        },
        status: 'running',
        progress: {
            total: testScriptsToRun.length,
            completed: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            percentage: 0
        },
        startTime: Date.now()
    });

    await testExecution.save();

    // Add to project
    project.executions.push(testExecution._id);
    await project.save();

    // Start test execution in background
    testExecutorService.executeTests(testExecution._id, testScriptsToRun, req.user._id)
        .catch(error => {
            console.error(`[TEST_EXECUTION] Execution failed:`, error);
        });

    await AuditLog.create({
        user: req.user._id,
        action: 'test_execution_started',
        actionCategory: 'testing',
        entityType: 'test_execution',
        entityId: testExecution._id,
        status: 'success',
        severity: 'info',
        details: { projectId, totalTests: testScriptsToRun.length, environment },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[TEST_EXECUTION] Test execution started: ${testExecution._id}`);

    return res.status(201).json({
        success: true,
        message: 'Test execution started',
        data: {
            executionId: testExecution._id,
            status: testExecution.status,
            totalTests: testScriptsToRun.length,
            startTime: testExecution.startTime
        }
    });
});

const getExecutionStatus = catchAsync(async (req, res) => {
    const { executionId } = req.params;
    console.log(`[TEST_EXECUTION] Fetching execution status: ${executionId}`);

    const execution = await TestExecution.findById(executionId)
        .populate('project', 'name slug')
        .populate('executedBy', 'firstName lastName email')
        .select('-testResults')
        .lean();

    if (!execution) {
        return res.status(404).json({
            success: false,
            message: 'Test execution not found',
            code: 'EXECUTION_NOT_FOUND'
        });
    }

    // Check access
    const project = await Project.findById(execution.project._id);
    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    console.log(`[TEST_EXECUTION] Execution status: ${execution.status}`);

    return res.json({
        success: true,
        data: { execution }
});
});
const getExecutionResults = catchAsync(async (req, res) => {
    const { executionId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    const execution = await TestExecution.findById(executionId);
    if (!execution) {
        return res.status(404).json({
            success: false,
            message: 'Test execution not found',
            code: 'EXECUTION_NOT_FOUND'
        });
    }

    // Check access
    const project = await Project.findById(execution.project);
    const hasAccess = await project.hasAccess(req.user._id);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
        });
    }

    const query = { execution: executionId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const results = await TestResult.find(query)
        .populate('testScript', 'name framework scriptType')
        .populate('endpoint', 'method path')
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await TestResult.countDocuments(query);

    console.log(`[TEST_EXECUTION] Results fetched: ${results.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            results,
            summary: execution.summary,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});
const getExecutionHistory = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
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

    const query = { project: projectId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const executions = await TestExecution.find(query)
        .populate('executedBy', 'firstName lastName email')
        .select('-testResults -logs')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await TestExecution.countDocuments(query);

    console.log(`[TEST_EXECUTION] Execution history fetched: ${executions.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            executions,
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
    runTests,
    getExecutionStatus,
    getExecutionResults,
    getExecutionHistory
};