class CodeFormattingService {
    formatJava(code) {
        console.log(`[CodeFormattingService] Formatting Java code`);

        let formatted = code
            .split('\n')
            .map(line => {
                const indent = line.match(/^\s*/)[0].length;
                const content = line.trim();
                return '  '.repeat(Math.floor(indent / 2)) + content;
            })
            .join('\n');

        return formatted;
    }

    formatJavaScript(code) {
        console.log(`[CodeFormattingService] Formatting JavaScript code`);

        let formatted = code
            .replace(/\{\s*/g, ' {\n')
            .replace(/\}\s*/g, '\n}\n')
            .replace(/;\s*/g, ';\n')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');

        return formatted;
    }

    formatJSON(code) {
        console.log(`[CodeFormattingService] Formatting JSON`);

        try {
            const parsed = JSON.parse(code);
            return JSON.stringify(parsed, null, 2);
        } catch (error) {
            console.error(`[CodeFormattingService] Invalid JSON:`, error.message);
            throw new Error('Invalid JSON format');
        }
    }

    normalizeLineEndings(code) {
        console.log(`[CodeFormattingService] Normalizing line endings`);

        return code.replace(/\r\n|\r/g, '\n');
    }

    removeTrailingWhitespace(code) {
        console.log(`[CodeFormattingService] Removing trailing whitespace`);

        return code
            .split('\n')
            .map(line => line.trimRight())
            .join('\n');
    }

    minifyJavaScript(code) {
        console.log(`[CodeFormattingService] Minifying JavaScript`);

        return code
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*/g, '')
            .replace(/\s+/g, ' ')
            .replace(/\s*([{}();,:])\s*/g, '$1')
            .trim();
    }
}
module.exports = new CodeFormattingService();