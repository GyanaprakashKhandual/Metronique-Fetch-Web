const TestFile = require('../../models/test.file.model');

class CodeLintService {
    constructor() {
        this.javaRules = {
            naming: {
                classPattern: /^[A-Z][a-zA-Z0-9]*$/,
                methodPattern: /^[a-z][a-zA-Z0-9]*$/,
                variablePattern: /^[a-z][a-zA-Z0-9]*$/,
                constantPattern: /^[A-Z][A-Z0-9_]*$/
            },
            complexity: {
                maxMethodLength: 50,
                maxLineLength: 120,
                maxCyclomaticComplexity: 10
            }
        };
    }

    async lintFile(fileId) {
        try {
            console.log(`[CODE_LINT_SERVICE] LINT_FILE | File ID: ${fileId}`);

            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[CODE_LINT_SERVICE] LINT_FILE_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            const issues = [];

            switch (file.language) {
                case 'java':
                    issues.push(...this.lintJavaCode(file.content));
                    break;
                case 'javascript':
                case 'typescript':
                    issues.push(...this.lintJavaScriptCode(file.content));
                    break;
                case 'python':
                    issues.push(...this.lintPythonCode(file.content));
                    break;
                case 'gherkin':
                    issues.push(...this.lintGherkinCode(file.content));
                    break;
                default:
                    issues.push(...this.lintGenericCode(file.content));
            }

            console.log(`[CODE_LINT_SERVICE] LINT_FILE_SUCCESS | File: ${file.name} | Issues: ${issues.length} | Errors: ${issues.filter(i => i.severity === 'error').length} | Warnings: ${issues.filter(i => i.severity === 'warning').length}`);

            return {
                success: true,
                file: {
                    id: file._id,
                    name: file.name,
                    language: file.language
                },
                issues,
                summary: {
                    total: issues.length,
                    errors: issues.filter(i => i.severity === 'error').length,
                    warnings: issues.filter(i => i.severity === 'warning').length,
                    info: issues.filter(i => i.severity === 'info').length
                }
            };
        } catch (error) {
            console.error(`[CODE_LINT_SERVICE] LINT_FILE_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    lintJavaCode(content) {
        console.log(`[CODE_LINT_SERVICE] LINT_JAVA_CODE | Content Length: ${content.length}`);

        const issues = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trim();

            if (line.length > this.javaRules.complexity.maxLineLength) {
                issues.push({
                    line: lineNumber,
                    column: this.javaRules.complexity.maxLineLength,
                    message: `Line exceeds maximum length of ${this.javaRules.complexity.maxLineLength} characters`,
                    severity: 'warning',
                    rule: 'max-line-length',
                    code: 'JAVA001'
                });
            }

            if (trimmedLine.includes('\t')) {
                issues.push({
                    line: lineNumber,
                    column: line.indexOf('\t'),
                    message: 'Use spaces instead of tabs for indentation',
                    severity: 'warning',
                    rule: 'no-tabs',
                    code: 'JAVA002'
                });
            }

            if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*') && !trimmedLine.startsWith('*')) {
                if (trimmedLine.includes('System.out.println')) {
                    issues.push({
                        line: lineNumber,
                        column: line.indexOf('System.out.println'),
                        message: 'Avoid using System.out.println in production code. Use a logging framework instead',
                        severity: 'warning',
                        rule: 'no-system-out',
                        code: 'JAVA003'
                    });
                }

                if (trimmedLine.includes('catch') && trimmedLine.includes('(Exception e)')) {
                    issues.push({
                        line: lineNumber,
                        column: line.indexOf('Exception'),
                        message: 'Avoid catching generic Exception. Catch specific exceptions instead',
                        severity: 'warning',
                        rule: 'specific-catch',
                        code: 'JAVA004'
                    });
                }

                if (trimmedLine.includes('==') && !trimmedLine.includes('!=')) {
                    if (trimmedLine.match(/String.*==/)) {
                        issues.push({
                            line: lineNumber,
                            column: line.indexOf('=='),
                            message: 'Use .equals() for String comparison instead of ==',
                            severity: 'error',
                            rule: 'string-equals',
                            code: 'JAVA005'
                        });
                    }
                }

                if (/public\s+class\s+([a-z][a-zA-Z0-9]*)/.test(trimmedLine)) {
                    issues.push({
                        line: lineNumber,
                        column: 0,
                        message: 'Class name should start with uppercase letter',
                        severity: 'error',
                        rule: 'class-naming',
                        code: 'JAVA006'
                    });
                }

                const methodMatch = trimmedLine.match(/public\s+\w+\s+([A-Z][a-zA-Z0-9]*)\s*\(/);
                if (methodMatch) {
                    issues.push({
                        line: lineNumber,
                        column: line.indexOf(methodMatch[1]),
                        message: 'Method name should start with lowercase letter',
                        severity: 'error',
                        rule: 'method-naming',
                        code: 'JAVA007'
                    });
                }

                if (trimmedLine.includes('//') && !trimmedLine.startsWith('//')) {
                    const commentIndex = line.indexOf('//');
                    if (line.charAt(commentIndex - 1) !== ' ') {
                        issues.push({
                            line: lineNumber,
                            column: commentIndex,
                            message: 'Add space before inline comment',
                            severity: 'info',
                            rule: 'comment-spacing',
                            code: 'JAVA008'
                        });
                    }
                }

                if (trimmedLine.includes('TODO') || trimmedLine.includes('FIXME')) {
                    issues.push({
                        line: lineNumber,
                        column: 0,
                        message: 'TODO/FIXME comment found',
                        severity: 'info',
                        rule: 'todo-fixme',
                        code: 'JAVA009'
                    });
                }
            }

            if (trimmedLine === '') {
                const nextLine = lines[index + 1];
                if (nextLine && nextLine.trim() === '') {
                    issues.push({
                        line: lineNumber,
                        column: 0,
                        message: 'Multiple consecutive blank lines',
                        severity: 'info',
                        rule: 'no-multiple-blank-lines',
                        code: 'JAVA010'
                    });
                }
            }
        });

        console.log(`[CODE_LINT_SERVICE] LINT_JAVA_CODE_SUCCESS | Issues: ${issues.length}`);
        return issues;
    }

    lintJavaScriptCode(content) {
        console.log(`[CODE_LINT_SERVICE] LINT_JAVASCRIPT_CODE | Content Length: ${content.length}`);

        const issues = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trim();

            if (line.length > 120) {
                issues.push({
                    line: lineNumber,
                    column: 120,
                    message: 'Line exceeds maximum length of 120 characters',
                    severity: 'warning',
                    rule: 'max-line-length',
                    code: 'JS001'
                });
            }

            if (trimmedLine.includes('var ')) {
                issues.push({
                    line: lineNumber,
                    column: line.indexOf('var'),
                    message: 'Use const or let instead of var',
                    severity: 'warning',
                    rule: 'no-var',
                    code: 'JS002'
                });
            }

            if (trimmedLine.includes('console.log')) {
                issues.push({
                    line: lineNumber,
                    column: line.indexOf('console.log'),
                    message: 'Remove console.log statements before production',
                    severity: 'warning',
                    rule: 'no-console',
                    code: 'JS003'
                });
            }

            if (trimmedLine.includes('==') && !trimmedLine.includes('===')) {
                issues.push({
                    line: lineNumber,
                    column: line.indexOf('=='),
                    message: 'Use === instead of ==',
                    severity: 'error',
                    rule: 'strict-equality',
                    code: 'JS004'
                });
            }

            if (trimmedLine.includes('function') && !trimmedLine.includes('=>')) {
                if (!trimmedLine.match(/function\s+[a-z][a-zA-Z0-9]*/)) {
                    issues.push({
                        line: lineNumber,
                        column: 0,
                        message: 'Consider using arrow functions',
                        severity: 'info',
                        rule: 'prefer-arrow',
                        code: 'JS005'
                    });
                }
            }
        });

        console.log(`[CODE_LINT_SERVICE] LINT_JAVASCRIPT_CODE_SUCCESS | Issues: ${issues.length}`);
        return issues;
    }

    lintPythonCode(content) {
        console.log(`[CODE_LINT_SERVICE] LINT_PYTHON_CODE | Content Length: ${content.length}`);

        const issues = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trim();

            if (line.length > 79) {
                issues.push({
                    line: lineNumber,
                    column: 79,
                    message: 'Line exceeds PEP 8 maximum length of 79 characters',
                    severity: 'warning',
                    rule: 'max-line-length',
                    code: 'PY001'
                });
            }

            if (trimmedLine.includes('\t')) {
                issues.push({
                    line: lineNumber,
                    column: line.indexOf('\t'),
                    message: 'Use 4 spaces instead of tabs (PEP 8)',
                    severity: 'error',
                    rule: 'no-tabs',
                    code: 'PY002'
                });
            }

            if (trimmedLine.startsWith('def ')) {
                const methodMatch = trimmedLine.match(/def\s+([A-Z][a-zA-Z0-9_]*)\s*\(/);
                if (methodMatch) {
                    issues.push({
                        line: lineNumber,
                        column: 4,
                        message: 'Function name should be lowercase with underscores (PEP 8)',
                        severity: 'warning',
                        rule: 'function-naming',
                        code: 'PY003'
                    });
                }
            }

            if (trimmedLine.startsWith('class ')) {
                const classMatch = trimmedLine.match(/class\s+([a-z][a-zA-Z0-9_]*)/);
                if (classMatch) {
                    issues.push({
                        line: lineNumber,
                        column: 6,
                        message: 'Class name should use CapWords convention (PEP 8)',
                        severity: 'warning',
                        rule: 'class-naming',
                        code: 'PY004'
                    });
                }
            }

            if (trimmedLine.includes('print(')) {
                issues.push({
                    line: lineNumber,
                    column: line.indexOf('print('),
                    message: 'Use logging instead of print statements',
                    severity: 'info',
                    rule: 'no-print',
                    code: 'PY005'
                });
            }
        });

        console.log(`[CODE_LINT_SERVICE] LINT_PYTHON_CODE_SUCCESS | Issues: ${issues.length}`);
        return issues;
    }

    lintGherkinCode(content) {
        console.log(`[CODE_LINT_SERVICE] LINT_GHERKIN_CODE | Content Length: ${content.length}`);

        const issues = [];
        const lines = content.split('\n');
        let hasFeature = false;
        let hasScenario = false;

        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('Feature:')) {
                hasFeature = true;
            }

            if (trimmedLine.startsWith('Scenario:') || trimmedLine.startsWith('Scenario Outline:')) {
                hasScenario = true;
            }

            if (trimmedLine.startsWith('Given') || trimmedLine.startsWith('When') || trimmedLine.startsWith('Then')) {
                if (!hasFeature || !hasScenario) {
                    issues.push({
                        line: lineNumber,
                        column: 0,
                        message: 'Step must be inside a Scenario',
                        severity: 'error',
                        rule: 'step-in-scenario',
                        code: 'GH001'
                    });
                }
            }

            if (line.length > 150) {
                issues.push({
                    line: lineNumber,
                    column: 150,
                    message: 'Line exceeds recommended length of 150 characters',
                    severity: 'warning',
                    rule: 'max-line-length',
                    code: 'GH002'
                });
            }
        });

        if (!hasFeature) {
            issues.push({
                line: 1,
                column: 0,
                message: 'Feature file must contain a Feature declaration',
                severity: 'error',
                rule: 'require-feature',
                code: 'GH003'
            });
        }

        console.log(`[CODE_LINT_SERVICE] LINT_GHERKIN_CODE_SUCCESS | Issues: ${issues.length}`);
        return issues;
    }

    lintGenericCode(content) {
        console.log(`[CODE_LINT_SERVICE] LINT_GENERIC_CODE | Content Length: ${content.length}`);

        const issues = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const lineNumber = index + 1;

            if (line.length > 200) {
                issues.push({
                    line: lineNumber,
                    column: 200,
                    message: 'Line is very long',
                    severity: 'info',
                    rule: 'max-line-length',
                    code: 'GEN001'
                });
            }

            if (line.endsWith(' ') || line.endsWith('\t')) {
                issues.push({
                    line: lineNumber,
                    column: line.length - 1,
                    message: 'Trailing whitespace',
                    severity: 'info',
                    rule: 'no-trailing-spaces',
                    code: 'GEN002'
                });
            }
        });

        console.log(`[CODE_LINT_SERVICE] LINT_GENERIC_CODE_SUCCESS | Issues: ${issues.length}`);
        return issues;
    }

    async autoFix(fileId, issueCode) {
        try {
            console.log(`[CODE_LINT_SERVICE] AUTO_FIX | File: ${fileId} | Issue Code: ${issueCode}`);

            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[CODE_LINT_SERVICE] AUTO_FIX_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            let content = file.content;
            let fixed = false;

            switch (issueCode) {
                case 'JAVA002':
                case 'PY002':
                    content = content.replace(/\t/g, '    ');
                    fixed = true;
                    break;

                case 'JS002':
                    content = content.replace(/var\s+/g, 'const ');
                    fixed = true;
                    break;

                case 'JS004':
                    content = content.replace(/==/g, '===').replace(/!=/g, '!==');
                    fixed = true;
                    break;

                case 'GEN002':
                    const lines = content.split('\n');
                    content = lines.map(line => line.trimEnd()).join('\n');
                    fixed = true;
                    break;

                default:
                    console.log(`[CODE_LINT_SERVICE] AUTO_FIX_INFO | No auto-fix available for code: ${issueCode}`);
            }

            if (fixed) {
                file.content = content;
                await file.save();
                console.log(`[CODE_LINT_SERVICE] AUTO_FIX_SUCCESS | File: ${file.name} | Issue Code: ${issueCode}`);
            }

            return {
                success: true,
                fixed,
                message: fixed ? 'Issue fixed successfully' : 'No auto-fix available for this issue'
            };
        } catch (error) {
            console.error(`[CODE_LINT_SERVICE] AUTO_FIX_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }
}

module.exports = new CodeLintService();