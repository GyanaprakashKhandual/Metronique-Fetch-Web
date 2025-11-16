const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

class LocalStorageService {
    constructor() {
        this.baseStoragePath = process.env.LOCAL_STORAGE_PATH || './storage';
        this.initialized = false;
        this.initialize();
    }

    async initialize() {
        console.log(`[LocalStorageService] Initialization started | BasePath: ${this.baseStoragePath}`);

        try {
            await this.ensureDirectoryExists(this.baseStoragePath);
            this.initialized = true;
            console.log(`[LocalStorageService] Initialization completed successfully`);
        } catch (error) {
            console.error(`[LocalStorageService] Initialization failed | Error: ${error.message}`);
            throw new Error(`Local storage initialization failed: ${error.message}`);
        }
    }

    ensureInitialized() {
        if (!this.initialized) {
            console.error(`[LocalStorageService] Service not initialized`);
            throw new Error('Local storage service not initialized');
        }
    }

    async ensureDirectoryExists(directoryPath) {
        try {
            await fs.access(directoryPath);
        } catch (error) {
            console.log(`[LocalStorageService] Creating directory | Path: ${directoryPath}`);
            await fs.mkdir(directoryPath, { recursive: true });
        }
    }

    getFullPath(relativePath) {
        return path.join(this.baseStoragePath, relativePath);
    }

    async upload(fileBuffer, filePath, metadata = {}) {
        this.ensureInitialized();

        const startTime = Date.now();
        const fullPath = this.getFullPath(filePath);
        const directory = path.dirname(fullPath);

        console.log(`[LocalStorageService] Upload started | Path: ${filePath} | Size: ${fileBuffer.length} bytes`);

        try {
            await this.ensureDirectoryExists(directory);
            await fs.writeFile(fullPath, fileBuffer);

            if (metadata && Object.keys(metadata).length > 0) {
                const metadataPath = `${fullPath}.metadata`;
                await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
                console.log(`[LocalStorageService] Metadata saved | Path: ${metadataPath}`);
            }

            const stats = await fs.stat(fullPath);

            const duration = Date.now() - startTime;
            console.log(`[LocalStorageService] Upload completed | Path: ${filePath} | Duration: ${duration}ms | ActualSize: ${stats.size} bytes`);

            return {
                success: true,
                path: filePath,
                fullPath: fullPath,
                url: this.buildFileUrl(filePath),
                size: stats.size
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[LocalStorageService] Upload failed | Path: ${filePath} | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async download(filePath) {
        this.ensureInitialized();

        const startTime = Date.now();
        const fullPath = this.getFullPath(filePath);

        console.log(`[LocalStorageService] Download started | Path: ${filePath}`);

        try {
            const fileBuffer = await fs.readFile(fullPath);

            const duration = Date.now() - startTime;
            console.log(`[LocalStorageService] Download completed | Path: ${filePath} | Duration: ${duration}ms | Size: ${fileBuffer.length} bytes`);

            return fileBuffer;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[LocalStorageService] Download failed | Path: ${filePath} | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async delete(filePath) {
        this.ensureInitialized();

        const startTime = Date.now();
        const fullPath = this.getFullPath(filePath);

        console.log(`[LocalStorageService] Delete started | Path: ${filePath}`);

        try {
            await fs.unlink(fullPath);

            const metadataPath = `${fullPath}.metadata`;
            try {
                await fs.unlink(metadataPath);
                console.log(`[LocalStorageService] Metadata deleted | Path: ${metadataPath}`);
            } catch (error) {
                console.log(`[LocalStorageService] No metadata file found | Path: ${metadataPath}`);
            }

            const duration = Date.now() - startTime;
            console.log(`[LocalStorageService] Delete completed | Path: ${filePath} | Duration: ${duration}ms`);

            return { success: true, path: filePath };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[LocalStorageService] Delete failed | Path: ${filePath} | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async move(sourcePath, destinationPath) {
        this.ensureInitialized();

        const startTime = Date.now();
        const sourceFullPath = this.getFullPath(sourcePath);
        const destFullPath = this.getFullPath(destinationPath);
        const destDirectory = path.dirname(destFullPath);

        console.log(`[LocalStorageService] Move started | Source: ${sourcePath} | Destination: ${destinationPath}`);

        try {
            await this.ensureDirectoryExists(destDirectory);
            await fs.rename(sourceFullPath, destFullPath);

            const sourceMetadataPath = `${sourceFullPath}.metadata`;
            const destMetadataPath = `${destFullPath}.metadata`;

            try {
                await fs.rename(sourceMetadataPath, destMetadataPath);
                console.log(`[LocalStorageService] Metadata moved`);
            } catch (error) {
                console.log(`[LocalStorageService] No metadata file to move`);
            }

            const duration = Date.now() - startTime;
            console.log(`[LocalStorageService] Move completed | Duration: ${duration}ms`);

            return { success: true, newPath: destinationPath };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[LocalStorageService] Move failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async copy(sourcePath, destinationPath) {
        this.ensureInitialized();

        const startTime = Date.now();
        const sourceFullPath = this.getFullPath(sourcePath);
        const destFullPath = this.getFullPath(destinationPath);
        const destDirectory = path.dirname(destFullPath);

        console.log(`[LocalStorageService] Copy started | Source: ${sourcePath} | Destination: ${destinationPath}`);

        try {
            await this.ensureDirectoryExists(destDirectory);
            await fs.copyFile(sourceFullPath, destFullPath);

            const sourceMetadataPath = `${sourceFullPath}.metadata`;
            const destMetadataPath = `${destFullPath}.metadata`;

            try {
                await fs.copyFile(sourceMetadataPath, destMetadataPath);
                console.log(`[LocalStorageService] Metadata copied`);
            } catch (error) {
                console.log(`[LocalStorageService] No metadata file to copy`);
            }

            const duration = Date.now() - startTime;
            console.log(`[LocalStorageService] Copy completed | Duration: ${duration}ms`);

            return { success: true, newPath: destinationPath };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[LocalStorageService] Copy failed | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async exists(filePath) {
        this.ensureInitialized();

        const fullPath = this.getFullPath(filePath);
        console.log(`[LocalStorageService] Checking existence | Path: ${filePath}`);

        try {
            await fs.access(fullPath);
            console.log(`[LocalStorageService] File exists | Path: ${filePath}`);
            return true;
        } catch (error) {
            console.log(`[LocalStorageService] File does not exist | Path: ${filePath}`);
            return false;
        }
    }

    async getMetadata(filePath) {
        this.ensureInitialized();

        const fullPath = this.getFullPath(filePath);
        console.log(`[LocalStorageService] Retrieving metadata | Path: ${filePath}`);

        try {
            const stats = await fs.stat(fullPath);

            let customMetadata = {};
            const metadataPath = `${fullPath}.metadata`;

            try {
                const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                customMetadata = JSON.parse(metadataContent);
                console.log(`[LocalStorageService] Custom metadata loaded | Path: ${metadataPath}`);
            } catch (error) {
                console.log(`[LocalStorageService] No custom metadata found | Path: ${metadataPath}`);
            }

            console.log(`[LocalStorageService] Metadata retrieved | Path: ${filePath} | Size: ${stats.size} bytes`);

            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                accessed: stats.atime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                permissions: stats.mode,
                ...customMetadata
            };
        } catch (error) {
            console.error(`[LocalStorageService] Metadata retrieval failed | Path: ${filePath} | Error: ${error.message}`);
            throw error;
        }
    }

    async list(directoryPath, options = {}) {
        this.ensureInitialized();

        const fullPath = this.getFullPath(directoryPath);
        console.log(`[LocalStorageService] Listing files | Directory: ${directoryPath} | Recursive: ${options.recursive || false}`);

        try {
            const files = [];

            if (options.recursive) {
                await this.listRecursive(fullPath, directoryPath, files);
            } else {
                const entries = await fs.readdir(fullPath, { withFileTypes: true });

                for (const entry of entries) {
                    if (entry.name.endsWith('.metadata')) continue;

                    if (entry.isFile()) {
                        const filePath = path.join(directoryPath, entry.name);
                        const fileFullPath = path.join(fullPath, entry.name);
                        const stats = await fs.stat(fileFullPath);

                        files.push({
                            name: entry.name,
                            path: filePath,
                            fullPath: fileFullPath,
                            size: stats.size,
                            isDirectory: false,
                            lastModified: stats.mtime
                        });
                    } else if (entry.isDirectory()) {
                        const dirPath = path.join(directoryPath, entry.name);
                        const dirFullPath = path.join(fullPath, entry.name);

                        files.push({
                            name: entry.name,
                            path: dirPath,
                            fullPath: dirFullPath,
                            isDirectory: true
                        });
                    }
                }
            }

            console.log(`[LocalStorageService] Files listed | Directory: ${directoryPath} | Count: ${files.length}`);

            return files;
        } catch (error) {
            console.error(`[LocalStorageService] List failed | Directory: ${directoryPath} | Error: ${error.message}`);
            throw error;
        }
    }

    async listRecursive(fullPath, relativePath, files) {
        const entries = await fs.readdir(fullPath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.name.endsWith('.metadata')) continue;

            const entryFullPath = path.join(fullPath, entry.name);
            const entryRelativePath = path.join(relativePath, entry.name);

            if (entry.isFile()) {
                const stats = await fs.stat(entryFullPath);

                files.push({
                    name: entry.name,
                    path: entryRelativePath,
                    fullPath: entryFullPath,
                    size: stats.size,
                    isDirectory: false,
                    lastModified: stats.mtime
                });
            } else if (entry.isDirectory()) {
                files.push({
                    name: entry.name,
                    path: entryRelativePath,
                    fullPath: entryFullPath,
                    isDirectory: true
                });

                await this.listRecursive(entryFullPath, entryRelativePath, files);
            }
        }
    }

    async createDirectory(directoryPath) {
        this.ensureInitialized();

        const fullPath = this.getFullPath(directoryPath);
        console.log(`[LocalStorageService] Creating directory | Path: ${directoryPath}`);

        try {
            await fs.mkdir(fullPath, { recursive: true });
            console.log(`[LocalStorageService] Directory created | Path: ${directoryPath}`);

            return { success: true, path: directoryPath, fullPath: fullPath };
        } catch (error) {
            console.error(`[LocalStorageService] Directory creation failed | Path: ${directoryPath} | Error: ${error.message}`);
            throw error;
        }
    }

    async deleteDirectory(directoryPath, recursive = false) {
        this.ensureInitialized();

        const startTime = Date.now();
        const fullPath = this.getFullPath(directoryPath);

        console.log(`[LocalStorageService] Deleting directory | Path: ${directoryPath} | Recursive: ${recursive}`);

        try {
            if (recursive) {
                await fs.rm(fullPath, { recursive: true, force: true });
            } else {
                await fs.rmdir(fullPath);
            }

            const duration = Date.now() - startTime;
            console.log(`[LocalStorageService] Directory deleted | Path: ${directoryPath} | Duration: ${duration}ms`);

            return { success: true, path: directoryPath };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[LocalStorageService] Directory deletion failed | Path: ${directoryPath} | Duration: ${duration}ms | Error: ${error.message}`);
            throw error;
        }
    }

    async getUrl(filePath, expiresIn = 3600) {
        this.ensureInitialized();

        console.log(`[LocalStorageService] Generating URL | Path: ${filePath} | ExpiresIn: ${expiresIn}s`);

        try {
            const token = this.generateAccessToken(filePath, expiresIn);
            const url = this.buildFileUrl(filePath, token);

            console.log(`[LocalStorageService] URL generated | Path: ${filePath}`);

            return url;
        } catch (error) {
            console.error(`[LocalStorageService] URL generation failed | Path: ${filePath} | Error: ${error.message}`);
            throw error;
        }
    }

    buildFileUrl(filePath, token = null) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        const urlPath = `/storage/${filePath}`;

        if (token) {
            return `${baseUrl}${urlPath}?token=${token}`;
        }

        return `${baseUrl}${urlPath}`;
    }

    generateAccessToken(filePath, expiresIn) {
        const secret = process.env.STORAGE_SECRET || 'default-storage-secret';
        const expiresAt = Date.now() + (expiresIn * 1000);

        const payload = JSON.stringify({ path: filePath, exp: expiresAt });
        const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

        const token = Buffer.from(`${payload}.${signature}`).toString('base64');

        console.log(`[LocalStorageService] Access token generated | Path: ${filePath} | ExpiresAt: ${new Date(expiresAt).toISOString()}`);

        return token;
    }

    verifyAccessToken(token, filePath) {
        console.log(`[LocalStorageService] Verifying access token | Path: ${filePath}`);

        try {
            const secret = process.env.STORAGE_SECRET || 'default-storage-secret';
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const [payloadStr, signature] = decoded.split('.');

            const expectedSignature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

            if (signature !== expectedSignature) {
                console.warn(`[LocalStorageService] Invalid token signature | Path: ${filePath}`);
                return false;
            }

            const payload = JSON.parse(payloadStr);

            if (payload.path !== filePath) {
                console.warn(`[LocalStorageService] Token path mismatch | Expected: ${filePath} | Got: ${payload.path}`);
                return false;
            }

            if (Date.now() > payload.exp) {
                console.warn(`[LocalStorageService] Token expired | Path: ${filePath}`);
                return false;
            }

            console.log(`[LocalStorageService] Token verified successfully | Path: ${filePath}`);
            return true;
        } catch (error) {
            console.error(`[LocalStorageService] Token verification failed | Path: ${filePath} | Error: ${error.message}`);
            return false;
        }
    }

    async calculateDirectorySize(directoryPath) {
        this.ensureInitialized();

        const fullPath = this.getFullPath(directoryPath);
        console.log(`[LocalStorageService] Calculating directory size | Path: ${directoryPath}`);

        try {
            let totalSize = 0;

            const calculateSize = async (currentPath) => {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });

                for (const entry of entries) {
                    const entryPath = path.join(currentPath, entry.name);

                    if (entry.isFile()) {
                        const stats = await fs.stat(entryPath);
                        totalSize += stats.size;
                    } else if (entry.isDirectory()) {
                        await calculateSize(entryPath);
                    }
                }
            };

            await calculateSize(fullPath);

            console.log(`[LocalStorageService] Directory size calculated | Path: ${directoryPath} | Size: ${totalSize} bytes`);

            return {
                totalSize: totalSize,
                formatted: this.formatBytes(totalSize)
            };
        } catch (error) {
            console.error(`[LocalStorageService] Size calculation failed | Path: ${directoryPath} | Error: ${error.message}`);
            throw error;
        }
    }

    async cleanupEmptyDirectories(directoryPath) {
        this.ensureInitialized();

        const fullPath = this.getFullPath(directoryPath);
        console.log(`[LocalStorageService] Cleaning up empty directories | Path: ${directoryPath}`);

        try {
            let cleanedCount = 0;

            const cleanup = async (currentPath) => {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });

                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const entryPath = path.join(currentPath, entry.name);
                        await cleanup(entryPath);
                    }
                }

                const updatedEntries = await fs.readdir(currentPath);
                if (updatedEntries.length === 0 && currentPath !== fullPath) {
                    await fs.rmdir(currentPath);
                    cleanedCount++;
                    console.log(`[LocalStorageService] Empty directory removed | Path: ${currentPath}`);
                }
            };

            await cleanup(fullPath);

            console.log(`[LocalStorageService] Cleanup completed | Removed: ${cleanedCount} directories`);

            return { success: true, cleanedCount: cleanedCount };
        } catch (error) {
            console.error(`[LocalStorageService] Cleanup failed | Path: ${directoryPath} | Error: ${error.message}`);
            throw error;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    async getStorageStats() {
        this.ensureInitialized();

        console.log(`[LocalStorageService] Retrieving storage statistics`);

        try {
            const result = await this.calculateDirectorySize('');

            console.log(`[LocalStorageService] Storage stats retrieved | Total: ${result.formatted}`);

            return {
                basePath: this.baseStoragePath,
                totalSize: result.totalSize,
                formatted: result.formatted
            };
        } catch (error) {
            console.error(`[LocalStorageService] Stats retrieval failed | Error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new LocalStorageService();