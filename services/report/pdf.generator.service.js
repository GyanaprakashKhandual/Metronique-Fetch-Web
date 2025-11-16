const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const ExcelJS = require('exceljs');

class PDFGeneratorService {
    constructor() {
        this.pdfCache = new Map();
        this.reportsDir = path.join(process.env.REPORTS_DIR || './reports', 'pdf');
    }

    async generateExecutionReportPDF(report, options = {}) {
        const operationId = `PDF_GEN_${Date.now()}`;
        const startTime = Date.now();
        console.log(`[${operationId}] INITIATED | ReportId: ${report._id} | Title: ${report.name}`);

        try {
            const fileName = `${report._id}_execution.pdf`;
            const filePath = path.join(this.reportsDir, fileName);

            await fs.mkdir(this.reportsDir, { recursive: true });

            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                bufferPages: true
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            console.log(`[${operationId}] PDF_DOCUMENT_CREATED | Path: ${filePath}`);

            this.addReportHeader(doc, report);
            this.addExecutiveSummary(doc, report);
            this.addTestResults(doc, report);
            this.addPerformanceMetrics(doc, report);
            this.addFailureAnalysis(doc, report);
            this.addFooter(doc);

            doc.end();

            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            const duration = Date.now() - startTime;
            console.log(`[${operationId}] PDF_GENERATED_SUCCESSFULLY | Size: ${await this.getFileSize(filePath)} bytes | Duration: ${duration}ms`);

            return {
                filePath: filePath,
                fileName: fileName,
                size: await this.getFileSize(filePath),
                generatedAt: new Date()
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[${operationId}] PDF_GENERATION_FAILED | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    addReportHeader(doc, report) {
        console.log(`[HEADER_GENERATION] Adding report header`);

        doc.fontSize(24).font('Helvetica-Bold').text('Test Execution Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.fontSize(10).text(`Report ID: ${report._id}`, { align: 'center' });
        
        doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
        doc.moveDown(1);
    }

    addExecutiveSummary(doc, report) {
        console.log(`[SUMMARY_SECTION] Adding executive summary`);

        doc.fontSize(14).font('Helvetica-Bold').text('Executive Summary');
        doc.moveDown(0.5);

        const summary = report.summary;
        const summaryData = [
            ['Total Tests', summary.totalTests || 0],
            ['Passed', summary.passed || 0],
            ['Failed', summary.failed || 0],
            ['Skipped', summary.skipped || 0],
            ['Success Rate', `${summary.successRate || 0}%`],
            ['Duration', `${this.formatDuration(summary.duration || 0)}`]
        ];

        doc.fontSize(10).font('Helvetica');
        summaryData.forEach(([label, value]) => {
            doc.text(`${label}: ${value}`);
        });

        doc.moveDown(1);
    }

    addTestResults(doc, report) {
        console.log(`[TEST_RESULTS_SECTION] Adding test results`);

        doc.fontSize(14).font('Helvetica-Bold').text('Test Results');
        doc.moveDown(0.5);

        const failureData = report.failures || {};
        if (failureData.total > 0) {
            doc.fontSize(10).font('Helvetica').text(`Total Failures: ${failureData.total}`);
            
            if (failureData.byType && failureData.byType.length > 0) {
                doc.moveDown(0.3);
                doc.text('Failures by Type:', { underline: true });
                failureData.byType.forEach(item => {
                    doc.text(`  • ${item.type}: ${item.count} (${item.percentage}%)`);
                });
            }
        } else {
            doc.fontSize(10).font('Helvetica').text('All tests passed!', { color: '#00AA00' });
        }

        doc.moveDown(1);
    }

    addPerformanceMetrics(doc, report) {
        console.log(`[PERFORMANCE_SECTION] Adding performance metrics`);

        doc.fontSize(14).font('Helvetica-Bold').text('Performance Metrics');
        doc.moveDown(0.5);

        const perf = report.performance || {};
        const performanceData = [
            ['Average Response Time', `${perf.averageResponseTime || 0}ms`],
            ['Min Response Time', `${perf.minResponseTime || 0}ms`],
            ['Max Response Time', `${perf.maxResponseTime || 0}ms`],
            ['P95 Response Time', `${perf.p95ResponseTime || 0}ms`],
            ['Throughput', `${perf.rps || 0} RPS`]
        ];

        doc.fontSize(10).font('Helvetica');
        performanceData.forEach(([label, value]) => {
            doc.text(`${label}: ${value}`);
        });

        doc.moveDown(1);
    }

    addFailureAnalysis(doc, report) {
        console.log(`[FAILURE_ANALYSIS_SECTION] Adding failure analysis`);

        const failures = report.failures || {};

        if (failures.byEndpoint && failures.byEndpoint.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('Failure Analysis');
            doc.moveDown(0.5);

            doc.fontSize(10).font('Helvetica');
            failures.byEndpoint.forEach(item => {
                doc.text(`Endpoint: ${item.endpoint}`);
                doc.text(`  Failures: ${item.count}`);
            });

            doc.moveDown(1);
        }
    }

    addFooter(doc) {
        console.log(`[FOOTER_GENERATION] Adding footer`);

        const pageCount = doc.bufferedPageRange().count;
        
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).font('Helvetica').text(
                `Page ${i + 1} of ${pageCount}`,
                50,
                doc.page.height - 50,
                { align: 'center' }
            );
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (error) {
            console.error(`[GET_FILE_SIZE] Error: ${error.message}`);
            return 0;
        }
    }
}

class ExportService {
    constructor() {
        this.exportsDir = path.join(process.env.EXPORTS_DIR || './exports');
    }

    async exportReportAsJSON(report, options = {}) {
        const operationId = `EXPORT_JSON_${Date.now()}`;
        const startTime = Date.now();
        console.log(`[${operationId}] INITIATED | ReportId: ${report._id}`);

        try {
            const fileName = `${report._id}_report.json`;
            const filePath = path.join(this.exportsDir, fileName);

            await fs.mkdir(this.exportsDir, { recursive: true });

            const exportData = {
                reportId: report._id,
                name: report.name,
                type: report.type,
                generatedAt: new Date(),
                summary: report.summary,
                performance: report.performance,
                failures: report.failures,
                coverage: report.coverage,
                trends: report.trends,
                environment: report.environment
            };

            await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));

            const duration = Date.now() - startTime;
            const fileSize = await this.getFileSize(filePath);
            console.log(`[${operationId}] EXPORT_COMPLETED | Size: ${fileSize} bytes | Duration: ${duration}ms`);

            return {
                fileName: fileName,
                filePath: filePath,
                format: 'json',
                size: fileSize,
                exportedAt: new Date()
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[${operationId}] EXPORT_FAILED | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async exportReportAsCSV(report, options = {}) {
        const operationId = `EXPORT_CSV_${Date.now()}`;
        const startTime = Date.now();
        console.log(`[${operationId}] INITIATED | ReportId: ${report._id}`);

        try {
            const fileName = `${report._id}_report.csv`;
            const filePath = path.join(this.exportsDir, fileName);

            await fs.mkdir(this.exportsDir, { recursive: true });

            const records = [];
            
            if (report.testResults && Array.isArray(report.testResults)) {
                report.testResults.forEach((result, index) => {
                    records.push({
                        index: index + 1,
                        testCase: result.testCase || '',
                        status: result.status || '',
                        duration: result.timing?.duration || 0,
                        responseTime: result.response?.responseTime || 0,
                        statusCode: result.response?.statusCode || ''
                    });
                });
            }

            const csvWriter = createObjectCsvWriter({
                path: filePath,
                header: [
                    { id: 'index', title: 'Index' },
                    { id: 'testCase', title: 'Test Case' },
                    { id: 'status', title: 'Status' },
                    { id: 'duration', title: 'Duration (ms)' },
                    { id: 'responseTime', title: 'Response Time (ms)' },
                    { id: 'statusCode', title: 'Status Code' }
                ]
            });

            await csvWriter.writeRecords(records);

            const duration = Date.now() - startTime;
            const fileSize = await this.getFileSize(filePath);
            console.log(`[${operationId}] EXPORT_COMPLETED | Records: ${records.length} | Size: ${fileSize} bytes | Duration: ${duration}ms`);

            return {
                fileName: fileName,
                filePath: filePath,
                format: 'csv',
                size: fileSize,
                recordCount: records.length,
                exportedAt: new Date()
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[${operationId}] EXPORT_FAILED | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async exportReportAsExcel(report, options = {}) {
        const operationId = `EXPORT_EXCEL_${Date.now()}`;
        const startTime = Date.now();
        console.log(`[${operationId}] INITIATED | ReportId: ${report._id}`);

        try {
            const fileName = `${report._id}_report.xlsx`;
            const filePath = path.join(this.exportsDir, fileName);

            await fs.mkdir(this.exportsDir, { recursive: true });

            const workbook = new ExcelJS.Workbook();

            const summarySheet = workbook.addWorksheet('Summary');
            summarySheet.columns = [
                { header: 'Metric', key: 'metric', width: 20 },
                { header: 'Value', key: 'value', width: 20 }
            ];

            const summaryData = [
                { metric: 'Total Tests', value: report.summary?.totalTests || 0 },
                { metric: 'Passed', value: report.summary?.passed || 0 },
                { metric: 'Failed', value: report.summary?.failed || 0 },
                { metric: 'Skipped', value: report.summary?.skipped || 0 },
                { metric: 'Success Rate', value: `${report.summary?.successRate || 0}%` },
                { metric: 'Duration', value: this.formatDuration(report.summary?.duration || 0) }
            ];

            summarySheet.addRows(summaryData);

            if (report.testResults && Array.isArray(report.testResults)) {
                const resultsSheet = workbook.addWorksheet('Test Results');
                resultsSheet.columns = [
                    { header: 'Test Case', key: 'testCase', width: 30 },
                    { header: 'Status', key: 'status', width: 12 },
                    { header: 'Duration (ms)', key: 'duration', width: 15 },
                    { header: 'Response Time (ms)', key: 'responseTime', width: 18 },
                    { header: 'Status Code', key: 'statusCode', width: 12 }
                ];

                const rows = report.testResults.map(result => ({
                    testCase: result.testCase || '',
                    status: result.status || '',
                    duration: result.timing?.duration || 0,
                    responseTime: result.response?.responseTime || 0,
                    statusCode: result.response?.statusCode || ''
                }));

                resultsSheet.addRows(rows);
            }

            if (report.performance) {
                const perfSheet = workbook.addWorksheet('Performance');
                perfSheet.columns = [
                    { header: 'Metric', key: 'metric', width: 25 },
                    { header: 'Value', key: 'value', width: 20 }
                ];

                const perfData = [
                    { metric: 'Average Response Time', value: `${report.performance.averageResponseTime}ms` },
                    { metric: 'Min Response Time', value: `${report.performance.minResponseTime}ms` },
                    { metric: 'Max Response Time', value: `${report.performance.maxResponseTime}ms` },
                    { metric: 'P95 Response Time', value: `${report.performance.p95ResponseTime}ms` },
                    { metric: 'Throughput', value: `${report.performance.rps} RPS` }
                ];

                perfSheet.addRows(perfData);
            }

            await workbook.xlsx.writeFile(filePath);

            const duration = Date.now() - startTime;
            const fileSize = await this.getFileSize(filePath);
            console.log(`[${operationId}] EXPORT_COMPLETED | Sheets: ${workbook.worksheets.length} | Size: ${fileSize} bytes | Duration: ${duration}ms`);

            return {
                fileName: fileName,
                filePath: filePath,
                format: 'excel',
                size: fileSize,
                worksheets: workbook.worksheets.length,
                exportedAt: new Date()
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[${operationId}] EXPORT_FAILED | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async exportMetricsAsCSV(metrics, fileName) {
        const operationId = `METRICS_EXPORT_CSV_${Date.now()}`;
        console.log(`[${operationId}] EXPORTING_METRICS_TO_CSV | Count: ${metrics.length}`);

        try {
            const filePath = path.join(this.exportsDir, fileName);
            await fs.mkdir(this.exportsDir, { recursive: true });

            const records = metrics.map(metric => ({
                timestamp: metric.timestamp,
                metricType: metric.metricType,
                value: metric.value,
                unit: metric.unit || '',
                statusCode: metric.details?.statusCode || ''
            }));

            const csvWriter = createObjectCsvWriter({
                path: filePath,
                header: [
                    { id: 'timestamp', title: 'Timestamp' },
                    { id: 'metricType', title: 'Metric Type' },
                    { id: 'value', title: 'Value' },
                    { id: 'unit', title: 'Unit' },
                    { id: 'statusCode', title: 'Status Code' }
                ]
            });

            await csvWriter.writeRecords(records);

            console.log(`[${operationId}] EXPORT_COMPLETED | Records: ${records.length}`);

            return {
                fileName: fileName,
                filePath: filePath,
                recordCount: records.length
            };
        } catch (error) {
            console.error(`[${operationId}] EXPORT_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async bulkExportReports(reports, format = 'json') {
        const operationId = `BULK_EXPORT_${Date.now()}`;
        console.log(`[${operationId}] INITIATED | Reports: ${reports.length} | Format: ${format}`);

        try {
            const results = [];

            for (const report of reports) {
                console.log(`[${operationId}] EXPORTING | Report: ${report._id}`);

                let result;
                switch (format.toLowerCase()) {
                    case 'json':
                        result = await this.exportReportAsJSON(report);
                        break;
                    case 'csv':
                        result = await this.exportReportAsCSV(report);
                        break;
                    case 'excel':
                        result = await this.exportReportAsExcel(report);
                        break;
                    default:
                        throw new Error(`Unsupported format: ${format}`);
                }

                results.push(result);
            }

            console.log(`[${operationId}] BULK_EXPORT_COMPLETED | ExportedReports: ${results.length}`);

            return {
                totalReports: reports.length,
                successCount: results.length,
                failureCount: reports.length - results.length,
                exports: results
            };
        } catch (error) {
            console.error(`[${operationId}] BULK_EXPORT_FAILED | Error: ${error.message}`);
            throw error;
        }
    }

    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (error) {
            console.error(`[GET_FILE_SIZE] Error: ${error.message}`);
            return 0;
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    async cleanupOldExports(retentionDays = 30) {
        const operationId = `CLEANUP_EXPORTS_${Date.now()}`;
        console.log(`[${operationId}] CLEANING_UP_OLD_EXPORTS | RetentionDays: ${retentionDays}`);

        try {
            const files = await fs.readdir(this.exportsDir);
            let deletedCount = 0;

            for (const file of files) {
                const filePath = path.join(this.exportsDir, file);
                const stats = await fs.stat(filePath);
                const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);

                if (ageInDays > retentionDays) {
                    await fs.unlink(filePath);
                    deletedCount++;
                    console.log(`[${operationId}] DELETED | File: ${file}`);
                }
            }

            console.log(`[${operationId}] CLEANUP_COMPLETED | DeletedFiles: ${deletedCount}`);

            return {
                deletedCount: deletedCount,
                retentionDays: retentionDays
            };
        } catch (error) {
            console.error(`[${operationId}] CLEANUP_FAILED | Error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = {
    PDFGeneratorService: new PDFGeneratorService(),
    ExportService: new ExportService()
};