const TestFile = require('../../models/test.file.model');

class SyntaxHighlightService {
    constructor() {
        this.languageTokens = {
            java: {
                keywords: ['public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends', 'implements', 'void', 'int', 'long', 'double', 'float', 'boolean', 'String', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'throw', 'throws', 'new', 'this', 'super', 'import', 'package'],
                types: ['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'String', 'void', 'Object', 'List', 'Map', 'Set', 'Array'],
                annotations: ['@Test', '@BeforeTest', '@AfterTest', '@BeforeClass', '@AfterClass', '@BeforeMethod', '@AfterMethod', '@DataProvider', '@Parameters', '@Override', '@Deprecated'],
                operators: ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '>>>'],
                delimiters: ['{', '}', '(', ')', '[', ']', ';', ',', '.']
            },
            javascript: {
                keywords: ['const', 'let', 'var', 'function', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'throw', 'new', 'this', 'class', 'extends', 'import', 'export', 'default', 'from', 'as'],
                types: ['Number', 'String', 'Boolean', 'Object', 'Array', 'Function', 'Promise', 'Date', 'RegExp'],
                operators: ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '>>>', '=>'],
                delimiters: ['{', '}', '(', ')', '[', ']', ';', ',', '.', ':', '?']
            },
            python: {
                keywords: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False'],
                types: ['int', 'float', 'str', 'bool', 'list', 'dict', 'tuple', 'set', 'object'],
                operators: ['+', '-', '*', '/', '//', '%', '**', '=', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not', '&', '|', '^', '~', '<<', '>>'],
                delimiters: ['(', ')', '[', ']', '{', '}', ':', ',', '.']
            },
            gherkin: {
                keywords: ['Feature', 'Background', 'Scenario', 'Scenario Outline', 'Given', 'When', 'Then', 'And', 'But', 'Examples'],
                operators: [],
                delimiters: ['|', '@']
            }
        };
    }

    async getTokens(fileId) {
        try {
            console.log(`[SYNTAX_HIGHLIGHT_SERVICE] GET_TOKENS | File ID: ${fileId}`);
            
            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[SYNTAX_HIGHLIGHT_SERVICE] GET_TOKENS_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            const tokens = this.tokenizeContent(file.content, file.language);

            console.log(`[SYNTAX_HIGHLIGHT_SERVICE] GET_TOKENS_SUCCESS | File: ${file.name} | Tokens: ${tokens.length} | Language: ${file.language}`);

            return {
                success: true,
                tokens,
                language: file.language
            };
        } catch (error) {
            console.error(`[SYNTAX_HIGHLIGHT_SERVICE] GET_TOKENS_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    tokenizeContent(content, language) {
        console.log(`[SYNTAX_HIGHLIGHT_SERVICE] TOKENIZE_CONTENT | Language: ${language} | Content Length: ${content.length}`);
        
        const lines = content.split('\n');
        const tokens = [];
        const languageConfig = this.languageTokens[language] || this.languageTokens.java;

        lines.forEach((line, lineNumber) => {
            let position = 0;
            const lineTokens = [];

            if (this.isComment(line, language)) {
                lineTokens.push({
                    type: 'comment',
                    value: line.trim(),
                    start: 0,
                    end: line.length,
                    line: lineNumber
                });
            } else if (this.isStringLine(line)) {
                const stringMatches = this.extractStrings(line);
                stringMatches.forEach(match => {
                    lineTokens.push({
                        type: 'string',
                        value: match.value,
                        start: match.start,
                        end: match.end,
                        line: lineNumber
                    });
                });
            } else {
                const words = line.split(/(\s+|[{}()\[\];,.])/);
                
                words.forEach(word => {
                    if (!word || /^\s+$/.test(word)) {
                        position += word.length;
                        return;
                    }

                    let tokenType = 'text';

                    if (languageConfig.keywords.includes(word)) {
                        tokenType = 'keyword';
                    } else if (languageConfig.types && languageConfig.types.includes(word)) {
                        tokenType = 'type';
                    } else if (languageConfig.annotations && word.startsWith('@')) {
                        tokenType = 'annotation';
                    } else if (/^[A-Z][a-zA-Z0-9]*$/.test(word)) {
                        tokenType = 'class';
                    } else if (/^\d+$/.test(word)) {
                        tokenType = 'number';
                    } else if (languageConfig.operators.includes(word)) {
                        tokenType = 'operator';
                    } else if (languageConfig.delimiters.includes(word)) {
                        tokenType = 'delimiter';
                    } else if (/^[a-z][a-zA-Z0-9]*$/.test(word)) {
                        tokenType = 'identifier';
                    }

                    lineTokens.push({
                        type: tokenType,
                        value: word,
                        start: position,
                        end: position + word.length,
                        line: lineNumber
                    });

                    position += word.length;
                });
            }

            tokens.push({
                line: lineNumber,
                tokens: lineTokens
            });
        });

        console.log(`[SYNTAX_HIGHLIGHT_SERVICE] TOKENIZE_CONTENT_SUCCESS | Total Lines: ${lines.length} | Total Token Groups: ${tokens.length}`);
        return tokens;
    }

    isComment(line, language) {
        const trimmed = line.trim();
        
        if (language === 'java' || language === 'javascript') {
            return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
        } else if (language === 'python') {
            return trimmed.startsWith('#');
        } else if (language === 'xml' || language === 'html') {
            return trimmed.startsWith('<!--');
        }
        
        return false;
    }

    isStringLine(line) {
        return line.includes('"') || line.includes("'") || line.includes('`');
    }

    extractStrings(line) {
        const strings = [];
        const regex = /(["'`])(?:(?=(\\?))\2.)*?\1/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            strings.push({
                value: match[0],
                start: match.index,
                end: match.index + match[0].length
            });
        }

        return strings;
    }

    async getSemanticTokens(fileId) {
        try {
            console.log(`[SYNTAX_HIGHLIGHT_SERVICE] GET_SEMANTIC_TOKENS | File ID: ${fileId}`);
            
            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[SYNTAX_HIGHLIGHT_SERVICE] GET_SEMANTIC_TOKENS_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            const semanticTokens = this.analyzeSemantics(file.content, file.language, file.metadata);

            console.log(`[SYNTAX_HIGHLIGHT_SERVICE] GET_SEMANTIC_TOKENS_SUCCESS | File: ${file.name} | Semantic Tokens: ${semanticTokens.length}`);

            return {
                success: true,
                semanticTokens,
                language: file.language
            };
        } catch (error) {
            console.error(`[SYNTAX_HIGHLIGHT_SERVICE] GET_SEMANTIC_TOKENS_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    analyzeSemantics(content, language, metadata) {
        console.log(`[SYNTAX_HIGHLIGHT_SERVICE] ANALYZE_SEMANTICS | Language: ${language}`);
        
        const semanticTokens = [];

        if (language === 'java' && metadata) {
            if (metadata.className) {
                semanticTokens.push({
                    type: 'class',
                    name: metadata.className,
                    category: 'declaration'
                });
            }

            if (metadata.methods && metadata.methods.length > 0) {
                metadata.methods.forEach(method => {
                    semanticTokens.push({
                        type: 'method',
                        name: method.name,
                        category: 'declaration',
                        annotations: method.annotations || [],
                        parameters: method.parameters || []
                    });
                });
            }

            if (metadata.imports && metadata.imports.length > 0) {
                metadata.imports.forEach(importPath => {
                    const className = importPath.split('.').pop();
                    semanticTokens.push({
                        type: 'class',
                        name: className,
                        category: 'import',
                        fullPath: importPath
                    });
                });
            }
        }

        console.log(`[SYNTAX_HIGHLIGHT_SERVICE] ANALYZE_SEMANTICS_SUCCESS | Semantic Tokens: ${semanticTokens.length}`);
        return semanticTokens;
    }

    async getThemeColors(theme = 'default') {
        console.log(`[SYNTAX_HIGHLIGHT_SERVICE] GET_THEME_COLORS | Theme: ${theme}`);
        
        const themes = {
            default: {
                keyword: '#0000FF',
                type: '#2B91AF',
                class: '#2B91AF',
                annotation: '#808080',
                string: '#A31515',
                number: '#098658',
                comment: '#008000',
                operator: '#000000',
                delimiter: '#000000',
                identifier: '#000000',
                method: '#795E26'
            },
            dark: {
                keyword: '#569CD6',
                type: '#4EC9B0',
                class: '#4EC9B0',
                annotation: '#9CDCFE',
                string: '#CE9178',
                number: '#B5CEA8',
                comment: '#6A9955',
                operator: '#D4D4D4',
                delimiter: '#D4D4D4',
                identifier: '#9CDCFE',
                method: '#DCDCAA'
            },
            monokai: {
                keyword: '#F92672',
                type: '#66D9EF',
                class: '#A6E22E',
                annotation: '#FD971F',
                string: '#E6DB74',
                number: '#AE81FF',
                comment: '#75715E',
                operator: '#F92672',
                delimiter: '#F8F8F2',
                identifier: '#F8F8F2',
                method: '#A6E22E'
            }
        };

        const colors = themes[theme] || themes.default;
        
        console.log(`[SYNTAX_HIGHLIGHT_SERVICE] GET_THEME_COLORS_SUCCESS | Theme: ${theme}`);
        
        return {
            success: true,
            theme,
            colors
        };
    }

    async validateSyntax(fileId) {
        try {
            console.log(`[SYNTAX_HIGHLIGHT_SERVICE] VALIDATE_SYNTAX | File ID: ${fileId}`);
            
            const file = await TestFile.findById(fileId);

            if (!file) {
                console.error(`[SYNTAX_HIGHLIGHT_SERVICE] VALIDATE_SYNTAX_ERROR | File not found: ${fileId}`);
                throw new Error('File not found');
            }

            const errors = this.findSyntaxErrors(file.content, file.language);

            file.syntax.valid = errors.length === 0;
            file.syntax.errors = errors;
            await file.save();

            console.log(`[SYNTAX_HIGHLIGHT_SERVICE] VALIDATE_SYNTAX_SUCCESS | File: ${file.name} | Errors: ${errors.length} | Valid: ${file.syntax.valid}`);

            return {
                success: true,
                valid: file.syntax.valid,
                errors
            };
        } catch (error) {
            console.error(`[SYNTAX_HIGHLIGHT_SERVICE] VALIDATE_SYNTAX_ERROR | Error: ${error.message} | Stack: ${error.stack}`);
            throw error;
        }
    }

    findSyntaxErrors(content, language) {
        console.log(`[SYNTAX_HIGHLIGHT_SERVICE] FIND_SYNTAX_ERRORS | Language: ${language} | Content Length: ${content.length}`);
        
        const errors = [];
        const lines = content.split('\n');

        if (language === 'java') {
            lines.forEach((line, index) => {
                const openBraces = (line.match(/\{/g) || []).length;
                const closeBraces = (line.match(/\}/g) || []).length;
                const openParens = (line.match(/\(/g) || []).length;
                const closeParens = (line.match(/\)/g) || []).length;

                if (openBraces !== closeBraces) {
                    errors.push({
                        line: index + 1,
                        column: 0,
                        message: 'Mismatched braces',
                        severity: 'error'
                    });
                }

                if (openParens !== closeParens) {
                    errors.push({
                        line: index + 1,
                        column: 0,
                        message: 'Mismatched parentheses',
                        severity: 'error'
                    });
                }

                if (line.trim().endsWith(';') === false && 
                    line.includes('=') && 
                    !line.includes('{') && 
                    !line.includes('for') &&
                    !line.trim().startsWith('//')) {
                    errors.push({
                        line: index + 1,
                        column: line.length,
                        message: 'Missing semicolon',
                        severity: 'warning'
                    });
                }
            });
        }

        console.log(`[SYNTAX_HIGHLIGHT_SERVICE] FIND_SYNTAX_ERRORS_SUCCESS | Errors Found: ${errors.length}`);
        return errors;
    }
}

module.exports = new SyntaxHighlightService();