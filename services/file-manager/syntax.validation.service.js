class SyntaxValidationService {
    validateJavaSyntax(code) {
        console.log(`[SyntaxValidationService] Validating Java syntax`);

        const errors = [];
        let braceCount = 0;

        const lines = code.split('\n');
        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;

            if (trimmed.length > 0 && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
                if (!trimmed.includes('class') && !trimmed.includes('interface')) {
                    errors.push({ line: idx + 1, message: 'Line may be missing semicolon' });
                }
            }
        });

        if (braceCount !== 0) {
            errors.push({ line: -1, message: 'Unmatched braces' });
        }

        console.log(`[SyntaxValidationService] Found ${errors.length} potential issues`);
        return { isValid: errors.length === 0, errors };
    }

    validateJavaScriptSyntax(code) {
        console.log(`[SyntaxValidationService] Validating JavaScript syntax`);

        const errors = [];
        let braceCount = 0, parenthesesCount = 0, bracketsCount = 0;

        for (let i = 0; i < code.length; i++) {
            if (code[i] === '{') braceCount++;
            if (code[i] === '}') braceCount--;
            if (code[i] === '(') parenthesesCount++;
            if (code[i] === ')') parenthesesCount--;
            if (code[i] === '[') bracketsCount++;
            if (code[i] === ']') bracketsCount--;
        }

        if (braceCount !== 0) errors.push({ message: 'Unmatched braces {}' });
        if (parenthesesCount !== 0) errors.push({ message: 'Unmatched parentheses ()' });
        if (bracketsCount !== 0) errors.push({ message: 'Unmatched brackets []' });

        console.log(`[SyntaxValidationService] Found ${errors.length} syntax errors`);
        return { isValid: errors.length === 0, errors };
    }

    validateJSONSyntax(code) {
        console.log(`[SyntaxValidationService] Validating JSON syntax`);

        try {
            JSON.parse(code);
            console.log(`[SyntaxValidationService] JSON is valid`);
            return { isValid: true, errors: [] };
        } catch (error) {
            console.log(`[SyntaxValidationService] JSON is invalid`);
            return { isValid: false, errors: [{ message: error.message }] };
        }
    }
}
module.exports = new SyntaxValidationService();