const TestFile = require('../models/test.file.model');
const CodeChangeHistory = require('../models/code.change.history.model');

class FileParserService {
    async parseFile(projectId, folderId, fileContent, fileName, filePath, fileType, language, userId) {
        console.log(`[FileParserService] Parsing file: ${fileName} (${language})`);

        try {
            const testFile = new TestFile({
                project: projectId,
                folder: folderId,
                name: fileName,
                fileName: fileName,
                path: filePath,
                extension: fileName.split('.').pop(),
                type: fileType,
                language: language,
                content: fileContent,
                originalContent: fileContent,
                size: Buffer.byteLength(fileContent, 'utf-8'),
                lines: fileContent.split('\n').length,
                encoding: 'utf-8',
                createdBy: userId
            });

            const parsed = this.parseFileContent(fileContent, language);

            testFile.metadata = {
                className: parsed.className,
                packageName: parsed.packageName,
                imports: parsed.imports,
                methods: parsed.methods,
                annotations: parsed.annotations,
                dependencies: parsed.dependencies
            };

            const syntaxErrors = this.validateSyntax(fileContent, language);
            testFile.syntax = {
                valid: syntaxErrors.length === 0,
                errors: syntaxErrors
            };

            await testFile.save();

            console.log(`[FileParserService] File parsed successfully: ${fileName}`);
            return testFile;
        } catch (error) {
            console.error(`[FileParserService] Error parsing file ${fileName}:`, error.message);
            throw error;
        }
    }

    parseFileContent(content, language) {
        console.log(`[FileParserService] Extracting metadata from ${language} file`);

        const metadata = {
            className: null,
            packageName: null,
            imports: [],
            methods: [],
            annotations: [],
            dependencies: []
        };

        if (language === 'java') {
            metadata.packageName = this.extractJavaPackage(content);
            metadata.className = this.extractJavaClass(content);
            metadata.imports = this.extractJavaImports(content);
            metadata.methods = this.extractJavaMethods(content);
            metadata.annotations = this.extractJavaAnnotations(content);
        } else if (language === 'javascript' || language === 'typescript') {
            metadata.className = this.extractJSClass(content);
            metadata.imports = this.extractJSImports(content);
            metadata.methods = this.extractJSMethods(content);
            metadata.dependencies = this.extractJSDependencies(content);
        } else if (language === 'python') {
            metadata.className = this.extractPythonClass(content);
            metadata.imports = this.extractPythonImports(content);
            metadata.methods = this.extractPythonMethods(content);
        }

        return metadata;
    }

    extractJavaPackage(content) {
        const match = content.match(/^package\s+([^;]+);/m);
        return match ? match[1] : null;
    }

    extractJavaClass(content) {
        const match = content.match(/(?:public|private|protected)?\s*(?:class|interface|enum)\s+(\w+)/);
        return match ? match[1] : null;
    }

    extractJavaImports(content) {
        const regex = /^import\s+(?:static\s+)?([^;]+);/gm;
        const imports = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        return imports;
    }

    extractJavaMethods(content) {
        const regex = /(?:@\w+)?\s*(?:public|private|protected)?\s*(?:static)?\s*(?:[\w<>]+\s+)?(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{/g;
        const methods = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            methods.push({
                name: match[1],
                annotations: [],
                parameters: []
            });
        }

        return methods;
    }

    extractJavaAnnotations(content) {
        const regex = /@(\w+)/g;
        const annotations = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            if (!annotations.includes(match[1])) {
                annotations.push(match[1]);
            }
        }

        return annotations;
    }

    extractJSClass(content) {
        const classMatch = content.match(/class\s+(\w+)/);
        if (classMatch) return classMatch[1];

        const exportMatch = content.match(/export\s+(?:default\s+)?(?:class|function|const)\s+(\w+)/);
        return exportMatch ? exportMatch[1] : null;
    }

    extractJSImports(content) {
        const regex = /import\s+(?:{[^}]+}|[\w]+)\s+from\s+['"]([^'"]+)['"]/g;
        const imports = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        return imports;
    }

    extractJSMethods(content) {
        const regex = /(?:async\s+)?(?:static\s+)?(\w+)\s*\([^)]*\)\s*(?:=>|{)/g;
        const methods = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            methods.push({
                name: match[1],
                annotations: [],
                parameters: []
            });
        }

        return methods;
    }

    extractJSDependencies(content) {
        const dependencies = [];
        const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
        let match;

        while ((match = requireRegex.exec(content)) !== null) {
            dependencies.push(match[1]);
        }

        return dependencies;
    }

    extractPythonClass(content) {
        const match = content.match(/class\s+(\w+)/);
        return match ? match[1] : null;
    }

    extractPythonImports(content) {
        const imports = [];
        const fromRegex = /from\s+([^\s]+)\s+import\s+(.+)/g;
        const importRegex = /import\s+([^\s]+)/g;

        let match;

        while ((match = fromRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        return imports;
    }

    extractPythonMethods(content) {
        const regex = /def\s+(\w+)\s*\([^)]*\):/g;
        const methods = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            methods.push({
                name: match[1],
                annotations: [],
                parameters: []
            });
        }

        return methods;
    }

    validateSyntax(content, language) {
        console.log(`[FileParserService] Validating syntax for ${language} file`);

        const errors = [];

        if (language === 'java') {
            errors.push(...this.validateJavaSyntax(content));
        } else if (language === 'javascript' || language === 'typescript') {
            errors.push(...this.validateJSSyntax(content));
        } else if (language === 'python') {
            errors.push(...this.validatePythonSyntax(content));
        }

        return errors;
    }

    validateJavaSyntax(content) {
        const errors = [];
        const lines = content.split('\n');

        let braceCount = 0;
        lines.forEach((line, index) => {
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;

            if (line.trim().endsWith(';') === false && line.trim().length > 0 && !line.trim().startsWith('//')) {
                if (!line.includes('{') && !line.includes('}') && !line.includes('(')) {
                    if (!line.trim().endsWith('{') && !line.includes('*/')) {
                    }
                }
            }
        });

        if (braceCount !== 0) {
            errors.push({
                line: -1,
                column: 0,
                message: 'Mismatched braces',
                severity: 'error'
            });
        }

        return errors;
    }

    validateJSSyntax(content) {
        const errors = [];
        let braceCount = 0;
        let bracketCount = 0;
        let parenthesesCount = 0;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (char === '[') bracketCount++;
            if (char === ']') bracketCount--;
            if (char === '(') parenthesesCount++;
            if (char === ')') parenthesesCount--;
        }

        if (braceCount !== 0) {
            errors.push({
                line: -1,
                column: 0,
                message: 'Mismatched braces { }',
                severity: 'error'
            });
        }

        if (bracketCount !== 0) {
            errors.push({
                line: -1,
                column: 0,
                message: 'Mismatched brackets [ ]',
                severity: 'error'
            });
        }

        if (parenthesesCount !== 0) {
            errors.push({
                line: -1,
                column: 0,
                message: 'Mismatched parentheses ( )',
                severity: 'error'
            });
        }

        return errors;
    }

    validatePythonSyntax(content) {
        const errors = [];
        const lines = content.split('\n');

        let indentStack = [0];
        lines.forEach((line, index) => {
            const leadingSpaces = line.match(/^[ ]*/)[0].length;
            const lineNumber = index + 1;

            if (line.trim().length === 0) return;

            if (leadingSpaces > indentStack[indentStack.length - 1]) {
                indentStack.push(leadingSpaces);
            } else if (leadingSpaces < indentStack[indentStack.length - 1]) {
                while (indentStack.length > 0 && indentStack[indentStack.length - 1] > leadingSpaces) {
                    indentStack.pop();
                }

                if (leadingSpaces !== indentStack[indentStack.length - 1]) {
                    errors.push({
                        line: lineNumber,
                        column: 0,
                        message: 'Inconsistent indentation',
                        severity: 'error'
                    });
                }
            }
        });

        return errors;
    }

    async recordFileChange(projectId, fileId, changeType, beforeContent, afterContent, userId, description) {
        console.log(`[FileParserService] Recording file change: ${changeType}`);

        try {
            const linesAdded = afterContent.split('\n').length - beforeContent.split('\n').length;
            const linesRemoved = beforeContent.split('\n').length - afterContent.split('\n').length;

            const change = new CodeChangeHistory({
                file: fileId,
                project: projectId,
                changeType: changeType,
                action: changeType,
                description: description,
                changes: {
                    before: { content: beforeContent },
                    after: { content: afterContent },
                    linesAdded: Math.max(0, linesAdded),
                    linesRemoved: Math.max(0, linesRemoved)
                },
                createdBy: userId
            });

            await change.save();

            console.log(`[FileParserService] File change recorded successfully`);
            return change;
        } catch (error) {
            console.error(`[FileParserService] Error recording file change:`, error.message);
            throw error;
        }
    }

    async getFileAnalysis(fileId) {
        console.log(`[FileParserService] Getting analysis for file: ${fileId}`);

        try {
            const testFile = await TestFile.findById(fileId).populate('version.history');

            if (!testFile) {
                throw new Error('File not found');
            }

            const analysis = {
                name: testFile.name,
                path: testFile.path,
                language: testFile.language,
                size: testFile.size,
                lines: testFile.lines,
                syntax: testFile.syntax,
                metadata: testFile.metadata,
                status: testFile.status,
                versions: testFile.version.history.length
            };

            console.log(`[FileParserService] File analysis retrieved: ${testFile.name}`);
            return analysis;
        } catch (error) {
            console.error(`[FileParserService] Error getting file analysis:`, error.message);
            throw error;
        }
    }
}

module.exports = new FileParserService();