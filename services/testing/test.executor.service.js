class TestExecutorService {
    constructor() {
        this.runningExecutions = new Map();
    }

    async executeTestSuite(testSuite, projectConfig, userId) {
        const startTime = Date.now();
        console.log(`[TestExecutorService] Executing test suite | Suite: ${testSuite.name} | Framework: ${projectConfig.framework}`);

        try {
            const execution = new TestExecution({
                project: projectConfig.projectId,
                testSuite: testSuite._id,
                executionType: 'on-demand',
                trigger: {
                    source: 'user',
                    triggeredBy: userId,
                    triggeredAt: new Date()
                },
                configuration: {
                    environment: projectConfig.environment || 'test',
                    baseUrl: projectConfig.baseUrl,
                    parallel: projectConfig.parallel || false,
                    threadCount: projectConfig.threadCount || 1,
                    timeout: projectConfig.timeout || 30000
                },
                status: 'pending',
                createdBy: userId
            });

            await execution.save();
            this.runningExecutions.set(execution._id.toString(), execution);

            console.log(`[TestExecutorService] Execution created | ExecutionId: ${execution._id}`);

            await execution.start();

            const results = await this.runTests(testSuite, projectConfig, execution);

            await execution.complete(results);

            this.runningExecutions.delete(execution._id.toString());

            const duration = Date.now() - startTime;
            console.log(`[TestExecutorService] Execution completed | ExecutionId: ${execution._id} | Duration: ${duration}ms | Status: ${results.status}`);

            return execution;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[TestExecutorService] Execution failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async runTests(testSuite, projectConfig, execution) {
        console.log(`[TestExecutorService] Running tests | Suite: ${testSuite.name} | Scripts: ${testSuite.testScripts?.length || 0}`);

        try {
            const results = {
                totalTests: testSuite.testScripts?.length || 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                status: 'completed',
                duration: 0
            };

            if (projectConfig.framework === 'rest-assured') {
                const output = await this.executeMavenTests(projectConfig);
                Object.assign(results, this.parseMavenResults(output));
            } else if (projectConfig.framework === 'cucumber') {
                const output = await this.executeCucumberTests(projectConfig);
                Object.assign(results, this.parseCucumberResults(output));
            } else {
                for (const scriptRef of testSuite.testScripts || []) {
                    const scriptResult = await this.executeScript(scriptRef.script, projectConfig, execution);

                    if (scriptResult.status === 'passed') results.passed++;
                    else if (scriptResult.status === 'failed') results.failed++;
                    else if (scriptResult.status === 'skipped') results.skipped++;
                }
            }

            console.log(`[TestExecutorService] Tests executed | Passed: ${results.passed} | Failed: ${results.failed} | Skipped: ${results.skipped}`);
            return results;
        } catch (error) {
            console.error(`[TestExecutorService] Test execution failed | Error: ${error.message}`);
            throw error;
        }
    }

    async executeMavenTests(projectConfig) {
        console.log(`[TestExecutorService] Executing Maven tests | ProjectPath: ${projectConfig.projectPath}`);

        try {
            const command = `cd ${projectConfig.projectPath} && mvn clean test`;
            const { stdout, stderr } = await execPromise(command);

            console.log(`[TestExecutorService] Maven execution completed`);
            return stdout;
        } catch (error) {
            console.error(`[TestExecutorService] Maven execution failed | Error: ${error.message}`);
            return error.stdout || '';
        }
    }

    parseMavenResults(output) {
        console.log(`[TestExecutorService] Parsing Maven results`);

        const results = { passed: 0, failed: 0, skipped: 0 };

        const passedMatch = output.match(/Tests run: (\d+)/);
        const failedMatch = output.match(/Failures: (\d+)/);
        const skippedMatch = output.match(/Skipped: (\d+)/);

        if (passedMatch) results.passed = parseInt(passedMatch[1]);
        if (failedMatch) results.failed = parseInt(failedMatch[1]);
        if (skippedMatch) results.skipped = parseInt(skippedMatch[1]);

        console.log(`[TestExecutorService] Maven results parsed | Passed: ${results.passed} | Failed: ${results.failed}`);
        return results;
    }

    async executeCucumberTests(projectConfig) {
        console.log(`[TestExecutorService] Executing Cucumber tests | ProjectPath: ${projectConfig.projectPath}`);

        try {
            const command = `cd ${projectConfig.projectPath} && mvn clean test -Dcucumber.options="--tags @smoke"`;
            const { stdout } = await execPromise(command);

            console.log(`[TestExecutorService] Cucumber execution completed`);
            return stdout;
        } catch (error) {
            console.error(`[TestExecutorService] Cucumber execution failed | Error: ${error.message}`);
            return error.stdout || '';
        }
    }

    parseCucumberResults(output) {
        console.log(`[TestExecutorService] Parsing Cucumber results`);

        const results = { passed: 0, failed: 0, skipped: 0 };

        const scenarioMatch = output.match(/(\d+) Scenarios \(.*?\)/);
        if (scenarioMatch) {
            const passedMatch = scenarioMatch[0].match(/(\d+) passed/);
            const failedMatch = scenarioMatch[0].match(/(\d+) failed/);
            const skippedMatch = scenarioMatch[0].match(/(\d+) skipped/);

            if (passedMatch) results.passed = parseInt(passedMatch[1]);
            if (failedMatch) results.failed = parseInt(failedMatch[1]);
            if (skippedMatch) results.skipped = parseInt(skippedMatch[1]);
        }

        console.log(`[TestExecutorService] Cucumber results parsed | Passed: ${results.passed} | Failed: ${results.failed}`);
        return results;
    }

    async executeScript(scriptId, projectConfig, execution) {
        console.log(`[TestExecutorService] Executing script | ScriptId: ${scriptId}`);

        const apiTesterService = require('./api.tester.service');
        return await apiTesterService.executeTest(scriptId, projectConfig, execution);
    }

    async cancelExecution(executionId, userId, reason) {
        console.log(`[TestExecutorService] Cancelling execution | ExecutionId: ${executionId}`);

        try {
            const execution = await TestExecution.findById(executionId);

            if (!execution) {
                throw new Error('Execution not found');
            }

            await execution.cancel(userId, reason);
            this.runningExecutions.delete(executionId);

            console.log(`[TestExecutorService] Execution cancelled | ExecutionId: ${executionId}`);
            return execution;
        } catch (error) {
            console.error(`[TestExecutorService] Cancellation failed | Error: ${error.message}`);
            throw error;
        }
    }

    getRunningExecutions() {
        return Array.from(this.runningExecutions.values());
    }
}

module.exports = new TestExecutorService();

