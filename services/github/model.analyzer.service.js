const Repository = require('../models/repository.model');
const { anthropic, anthropicConfig } = require('../config/anthropic.config');
const { openai, openaiConfig } = require('../config/openai.config');

class ModelAnalyzerService {
    async analyzeModels(repositoryId, modelFiles, aiProvider = 'anthropic') {
        console.log(`[ModelAnalyzerService] Analyzing ${modelFiles.length} model files using ${aiProvider}`);

        try {
            const repository = await Repository.findById(repositoryId);

            if (!repository) {
                throw new Error('Repository not found');
            }

            const models = [];

            for (const file of modelFiles) {
                const fileModels = await this.parseModelFile(file.content, file.path, repository.technology.language);
                models.push(...fileModels);
            }

            console.log(`[ModelAnalyzerService] Extracted ${models.length} models from files`);

            const enrichedModels = await this.enrichModelsWithAI(models, aiProvider);

            repository.analysis.findings.models = models.length;
            await repository.save();

            console.log(`[ModelAnalyzerService] Model analysis completed: ${enrichedModels.length} models`);
            return enrichedModels;
        } catch (error) {
            console.error(`[ModelAnalyzerService] Error analyzing models:`, error.message);
            throw error;
        }
    }

    parseModelFile(content, filePath, language) {
        console.log(`[ModelAnalyzerService] Parsing model file: ${filePath}`);

        const models = [];

        if (language === 'java') {
            models.push(...this.parseJavaModels(content));
        } else if (language === 'javascript' || language === 'typescript') {
            models.push(...this.parseJSModels(content));
        } else if (language === 'python') {
            models.push(...this.parsePythonModels(content));
        }

        return models;
    }

    parseJavaModels(content) {
        const models = [];

        const classRegex = /(?:@Entity|@Document)?\s*(?:public|private|protected)?\s*class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            const className = match[1];
            const properties = this.extractJavaProperties(content, className);

            models.push({
                name: className,
                type: 'class',
                extends: match[2] || null,
                properties: properties,
                methods: [],
                annotations: [],
                isEntity: content.includes(`@Entity`) || content.includes(`@Document`)
            });
        }

        return models;
    }

    extractJavaProperties(content, className) {
        const properties = [];

        const propertyRegex = /(?:@[\w.]+)?\s*(?:private|public|protected)?\s*(?:final)?\s*([\w<>]+)\s+(\w+)(?:\s*=|;)/g;
        let match;

        while ((match = propertyRegex.exec(content)) !== null) {
            properties.push({
                name: match[2],
                type: match[1],
                nullable: match[1].includes('Optional')
            });
        }

        return properties;
    }

    parseJSModels(content) {
        const models = [];

        const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            const className = match[1];
            const properties = this.extractJSProperties(content);

            models.push({
                name: className,
                type: 'class',
                extends: match[2] || null,
                properties: properties,
                methods: [],
                annotations: [],
                isEntity: content.includes('mongoose') || content.includes('sequelize')
            });
        }

        const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/g;

        while ((match = interfaceRegex.exec(content)) !== null) {
            const interfaceName = match[1];
            const properties = this.extractTSProperties(content);

            models.push({
                name: interfaceName,
                type: 'interface',
                extends: match[2] || null,
                properties: properties,
                methods: [],
                annotations: [],
                isEntity: false
            });
        }

        return models;
    }

    extractJSProperties(content) {
        const properties = [];

        const constructorRegex = /constructor\s*\([^)]*\)\s*{([\s\S]*?)(?:^|\n)\s*}/gm;
        const match = constructorRegex.exec(content);

        if (match) {
            const constructorBody = match[1];
            const propRegex = /this\.(\w+)\s*=/g;
            let propMatch;

            while ((propMatch = propRegex.exec(constructorBody)) !== null) {
                properties.push({
                    name: propMatch[1],
                    type: 'any',
                    nullable: false
                });
            }
        }

        return properties;
    }

    extractTSProperties(content) {
        const properties = [];

        const propRegex = /(\w+)\s*:\s*([\w<>|\[\]]+)(?:\s*=|\s*[;,])/g;
        let match;

        while ((match = propRegex.exec(content)) !== null) {
            properties.push({
                name: match[1],
                type: match[2],
                nullable: match[2].includes('|') && match[2].includes('null')
            });
        }

        return properties;
    }

    parsePythonModels(content) {
        const models = [];

        const classRegex = /class\s+(\w+)(?:\(([^)]*)\))?\s*:/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            const className = match[1];
            const bases = match[2] ? match[2].split(',').map(b => b.trim()) : [];
            const properties = this.extractPythonProperties(content);

            models.push({
                name: className,
                type: 'class',
                extends: bases.length > 0 ? bases[0] : null,
                properties: properties,
                methods: [],
                annotations: [],
                isEntity: bases.some(b => b.includes('Model') || b.includes('Entity'))
            });
        }

        return models;
    }

    extractPythonProperties(content) {
        const properties = [];

        const initRegex = /def\s+__init__\s*\(self[^)]*\)\s*:([\s\S]*?)(?=\n\s{0,4}def|\nclass|$)/;
        const match = initRegex.exec(content);

        if (match) {
            const initBody = match[1];
            const propRegex = /self\.(\w+)\s*=/g;
            let propMatch;

            while ((propMatch = propRegex.exec(initBody)) !== null) {
                properties.push({
                    name: propMatch[1],
                    type: 'any',
                    nullable: false
                });
            }
        }

        return properties;
    }

    async enrichModelsWithAI(models, aiProvider) {
        console.log(`[ModelAnalyzerService] Enriching models with AI analysis using ${aiProvider}`);

        try {
            const modelSummary = models.map(m => `${m.name}: ${m.properties.map(p => p.name).join(', ')}`).join('\n');

            const enrichmentPrompt = `Analyze these data models and provide brief descriptions:
${modelSummary}

For each model, provide: purpose, relationships, validation requirements, and typical use cases.
Return as JSON array.`;

            let enrichedData;

            if (aiProvider === 'openai') {
                enrichedData = await this.enrichWithOpenAI(enrichmentPrompt);
            } else {
                enrichedData = await this.enrichWithAnthropic(enrichmentPrompt);
            }

            const enriched = models.map((model, index) => ({
                ...model,
                description: enrichedData[index]?.description || '',
                purpose: enrichedData[index]?.purpose || '',
                relationships: enrichedData[index]?.relationships || [],
                validations: enrichedData[index]?.validations || []
            }));

            console.log(`[ModelAnalyzerService] Models enriched successfully`);
            return enriched;
        } catch (error) {
            console.error(`[ModelAnalyzerService] Error enriching models with AI:`, error.message);
            return models;
        }
    }

    async enrichWithAnthropic(prompt) {
        console.log(`[ModelAnalyzerService] Enriching with Anthropic Claude`);

        try {
            const response = await anthropic.messages.create({
                model: anthropicConfig.model,
                max_tokens: anthropicConfig.maxTokens,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const content = response.content[0].text;
            const jsonMatch = content.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return [];
        } catch (error) {
            console.error(`[ModelAnalyzerService] Anthropic enrichment error:`, error.message);
            return [];
        }
    }

    async enrichWithOpenAI(prompt) {
        console.log(`[ModelAnalyzerService] Enriching with OpenAI GPT`);

        try {
            const response = await openai.chat.completions.create({
                model: openaiConfig.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: openaiConfig.maxTokens,
                temperature: openaiConfig.temperature
            });

            const content = response.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return [];
        } catch (error) {
            console.error(`[ModelAnalyzerService] OpenAI enrichment error:`, error.message);
            return [];
        }
    }

    async detectDataValidationIssues(models) {
        console.log(`[ModelAnalyzerService] Detecting data validation issues in ${models.length} models`);

        try {
            const issues = [];

            models.forEach(model => {
                model.properties.forEach(prop => {
                    if (prop.nullable && !prop.name.toLowerCase().includes('optional')) {
                        issues.push({
                            model: model.name,
                            property: prop.name,
                            severity: 'medium',
                            issue: 'Nullable property without Optional naming',
                            recommendation: 'Use Optional wrapper or rename property'
                        });
                    }

                    if (prop.type === 'any') {
                        issues.push({
                            model: model.name,
                            property: prop.name,
                            severity: 'low',
                            issue: 'Loose typing',
                            recommendation: 'Define specific type for property'
                        });
                    }
                });

                if (model.properties.length === 0) {
                    issues.push({
                        model: model.name,
                        property: null,
                        severity: 'medium',
                        issue: 'Model has no properties',
                        recommendation: 'Verify model definition is complete'
                    });
                }
            });

            console.log(`[ModelAnalyzerService] Found ${issues.length} potential data validation issues`);
            return issues;
        } catch (error) {
            console.error(`[ModelAnalyzerService] Error detecting validation issues:`, error.message);
            throw error;
        }
    }

    async analyzeModelRelationships(models) {
        console.log(`[ModelAnalyzerService] Analyzing relationships between ${models.length} models`);

        try {
            const relationships = [];

            for (let i = 0; i < models.length; i++) {
                for (let j = i + 1; j < models.length; j++) {
                    const model1 = models[i];
                    const model2 = models[j];

                    const relationship = this.detectRelationship(model1, model2);
                    if (relationship) {
                        relationships.push(relationship);
                    }
                }
            }

            console.log(`[ModelAnalyzerService] Found ${relationships.length} model relationships`);
            return relationships;
        } catch (error) {
            console.error(`[ModelAnalyzerService] Error analyzing model relationships:`, error.message);
            throw error;
        }
    }

    detectRelationship(model1, model2) {
        const model1LowerName = model1.name.toLowerCase();
        const model2LowerName = model2.name.toLowerCase();

        for (const prop of model1.properties) {
            if (prop.type.toLowerCase().includes(model2LowerName)) {
                return {
                    from: model1.name,
                    to: model2.name,
                    type: prop.type.includes('[]') || prop.type.includes('List') ? 'one-to-many' : 'many-to-one',
                    property: prop.name
                };
            }
        }

        return null;
    }

    async compareModels(model1, model2) {
        console.log(`[ModelAnalyzerService] Comparing models: ${model1.name} vs ${model2.name}`);

        try {
            const comparison = {
                model1Name: model1.name,
                model2Name: model2.name,
                commonProperties: [],
                uniqueToModel1: [],
                uniqueToModel2: [],
                typeConflicts: []
            };

            const props1 = model1.properties.map(p => p.name);
            const props2 = model2.properties.map(p => p.name);

            comparison.commonProperties = props1.filter(p => props2.includes(p));
            comparison.uniqueToModel1 = props1.filter(p => !props2.includes(p));
            comparison.uniqueToModel2 = props2.filter(p => !props1.includes(p));

            for (const common of comparison.commonProperties) {
                const prop1 = model1.properties.find(p => p.name === common);
                const prop2 = model2.properties.find(p => p.name === common);

                if (prop1.type !== prop2.type) {
                    comparison.typeConflicts.push({
                        property: common,
                        type1: prop1.type,
                        type2: prop2.type
                    });
                }
            }

            console.log(`[ModelAnalyzerService] Model comparison completed`);
            return comparison;
        } catch (error) {
            console.error(`[ModelAnalyzerService] Error comparing models:`, error.message);
            throw error;
        }
    }
}

module.exports = new ModelAnalyzerService();