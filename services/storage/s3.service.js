const AWS = require("aws-sdk");
const path = require("path");
const { Readable } = require("stream");

class S3Service {
    constructor() {
        this.s3 = null;
        this.bucketName = process.env.AWS_S3_BUCKET_NAME;
        this.region = process.env.AWS_REGION || "us-east-1";
        this.initialized = false;
        this.initialize();
    }

    initialize() {
        console.log(
            `[S3Service] Initialization started | Region: ${this.region} | Bucket: ${this.bucketName}`
        );

        try {
            this.s3 = new AWS.S3({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: this.region,
                signatureVersion: "v4",
                s3ForcePathStyle: false,
                useAccelerateEndpoint: process.env.AWS_S3_ACCELERATE === "true",
            });

            this.initialized = true;
            console.log(`[S3Service] Initialization completed successfully`);
        } catch (error) {
            console.error(
                `[S3Service] Initialization failed | Error: ${error.message}`
            );
            throw new Error(`S3 initialization failed: ${error.message}`);
        }
    }

    ensureInitialized() {
        if (!this.initialized) {
            console.error(`[S3Service] Service not initialized`);
            throw new Error("S3 service not initialized");
        }
        if (!this.bucketName) {
            console.error(`[S3Service] Bucket name not configured`);
            throw new Error("S3 bucket name not configured");
        }
    }

    async upload(fileBuffer, filePath, metadata = {}) {
        this.ensureInitialized();

        const startTime = Date.now();
        console.log(
            `[S3Service] Upload started | Path: ${filePath} | Size: ${fileBuffer.length} bytes`
        );

        try {
            const params = {
                Bucket: this.bucketName,
                Key: filePath,
                Body: fileBuffer,
                ContentType: metadata.contentType || this.getContentType(filePath),
                Metadata: {
                    ...metadata,
                    uploadedAt: new Date().toISOString(),
                },
                ServerSideEncryption: "AES256",
                StorageClass: metadata.storageClass || "STANDARD",
            };

            if (metadata.acl) {
                params.ACL = metadata.acl;
            }

            const result = await this.s3.upload(params).promise();

            const duration = Date.now() - startTime;
            console.log(
                `[S3Service] Upload completed | Path: ${filePath} | Duration: ${duration}ms | ETag: ${result.ETag}`
            );

            return {
                success: true,
                key: result.Key,
                url: result.Location,
                etag: result.ETag,
                bucket: result.Bucket,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(
                `[S3Service] Upload failed | Path: ${filePath} | Duration: ${duration}ms | Error: ${error.message}`
            );
            throw error;
        }
    }

    async download(filePath) {
        this.ensureInitialized();

        const startTime = Date.now();
        console.log(`[S3Service] Download started | Path: ${filePath}`);

        try {
            const params = {
                Bucket: this.bucketName,
                Key: filePath,
            };

            const result = await this.s3.getObject(params).promise();

            const duration = Date.now() - startTime;
            console.log(
                `[S3Service] Download completed | Path: ${filePath} | Duration: ${duration}ms | Size: ${result.Body.length} bytes`
            );

            return result.Body;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(
                `[S3Service] Download failed | Path: ${filePath} | Duration: ${duration}ms | Error: ${error.message}`
            );
            throw error;
        }
    }

    async delete(filePath) {
        this.ensureInitialized();

        const startTime = Date.now();
        console.log(`[S3Service] Delete started | Path: ${filePath}`);

        try {
            const params = {
                Bucket: this.bucketName,
                Key: filePath,
            };

            await this.s3.deleteObject(params).promise();

            const duration = Date.now() - startTime;
            console.log(
                `[S3Service] Delete completed | Path: ${filePath} | Duration: ${duration}ms`
            );

            return { success: true, key: filePath };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(
                `[S3Service] Delete failed | Path: ${filePath} | Duration: ${duration}ms | Error: ${error.message}`
            );
            throw error;
        }
    }

    async move(sourcePath, destinationPath) {
        this.ensureInitialized();

        const startTime = Date.now();
        console.log(
            `[S3Service] Move started | Source: ${sourcePath} | Destination: ${destinationPath}`
        );

        try {
            await this.copy(sourcePath, destinationPath);
            await this.delete(sourcePath);

            const duration = Date.now() - startTime;
            console.log(`[S3Service] Move completed | Duration: ${duration}ms`);

            return { success: true, newKey: destinationPath };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(
                `[S3Service] Move failed | Duration: ${duration}ms | Error: ${error.message}`
            );
            throw error;
        }
    }

    async copy(sourcePath, destinationPath) {
        this.ensureInitialized();

        const startTime = Date.now();
        console.log(
            `[S3Service] Copy started | Source: ${sourcePath} | Destination: ${destinationPath}`
        );

        try {
            const params = {
                Bucket: this.bucketName,
                CopySource: `${this.bucketName}/${sourcePath}`,
                Key: destinationPath,
            };

            const result = await this.s3.copyObject(params).promise();

            const duration = Date.now() - startTime;
            console.log(
                `[S3Service] Copy completed | Duration: ${duration}ms | ETag: ${result.CopyObjectResult.ETag}`
            );

            return {
                success: true,
                key: destinationPath,
                etag: result.CopyObjectResult.ETag,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(
                `[S3Service] Copy failed | Duration: ${duration}ms | Error: ${error.message}`
            );
            throw error;
        }
    }

    async exists(filePath) {
        this.ensureInitialized();

        console.log(`[S3Service] Checking existence | Path: ${filePath}`);

        try {
            const params = {
                Bucket: this.bucketName,
                Key: filePath,
            };

            await this.s3.headObject(params).promise();
            console.log(`[S3Service] File exists | Path: ${filePath}`);
            return true;
        } catch (error) {
            if (error.code === "NotFound") {
                console.log(`[S3Service] File does not exist | Path: ${filePath}`);
                return false;
            }
            console.error(
                `[S3Service] Existence check failed | Path: ${filePath} | Error: ${error.message}`
            );
            throw error;
        }
    }

    async getMetadata(filePath) {
        this.ensureInitialized();

        console.log(`[S3Service] Retrieving metadata | Path: ${filePath}`);

        try {
            const params = {
                Bucket: this.bucketName,
                Key: filePath,
            };

            const result = await this.s3.headObject(params).promise();

            console.log(
                `[S3Service] Metadata retrieved | Path: ${filePath} | Size: ${result.ContentLength} bytes`
            );

            return {
                size: result.ContentLength,
                lastModified: result.LastModified,
                contentType: result.ContentType,
                etag: result.ETag,
                metadata: result.Metadata,
                storageClass: result.StorageClass,
            };
        } catch (error) {
            console.error(
                `[S3Service] Metadata retrieval failed | Path: ${filePath} | Error: ${error.message}`
            );
            throw error;
        }
    }

    async list(prefix, options = {}) {
        this.ensureInitialized();

        console.log(`[S3Service] Listing files | Prefix: ${prefix}`);

        try {
            const params = {
                Bucket: this.bucketName,
                Prefix: prefix,
                MaxKeys: options.maxKeys || 1000,
                Delimiter: options.delimiter || "",
            };

            if (options.continuationToken) {
                params.ContinuationToken = options.continuationToken;
            }

            const result = await this.s3.listObjectsV2(params).promise();

            const files = result.Contents.map((item) => ({
                key: item.Key,
                path: item.Key,
                size: item.Size,
                lastModified: item.LastModified,
                etag: item.ETag,
                storageClass: item.StorageClass,
            }));

            console.log(
                `[S3Service] Files listed | Prefix: ${prefix} | Count: ${files.length} | Truncated: ${result.IsTruncated}`
            );

            return {
                files: files,
                isTruncated: result.IsTruncated,
                nextContinuationToken: result.NextContinuationToken,
                keyCount: result.KeyCount,
            };
        } catch (error) {
            console.error(
                `[S3Service] List failed | Prefix: ${prefix} | Error: ${error.message}`
            );
            throw error;
        }
    }

    async createDirectory(directoryPath) {
        this.ensureInitialized();

        console.log(`[S3Service] Creating directory | Path: ${directoryPath}`);

        try {
            const normalizedPath = directoryPath.endsWith("/")
                ? directoryPath
                : `${directoryPath}/`;

            const params = {
                Bucket: this.bucketName,
                Key: normalizedPath,
                Body: "",
                ContentType: "application/x-directory",
            };

            await this.s3.putObject(params).promise();

            console.log(`[S3Service] Directory created | Path: ${normalizedPath}`);

            return { success: true, key: normalizedPath };
        } catch (error) {
            console.error(
                `[S3Service] Directory creation failed | Path: ${directoryPath} | Error: ${error.message}`
            );
            throw error;
        }
    }

    async deleteDirectory(directoryPath, recursive = false) {
        this.ensureInitialized();

        const startTime = Date.now();
        console.log(
            `[S3Service] Deleting directory | Path: ${directoryPath} | Recursive: ${recursive}`
        );

        try {
            const normalizedPath = directoryPath.endsWith("/")
                ? directoryPath
                : `${directoryPath}/`;

            if (!recursive) {
                await this.delete(normalizedPath);
                const duration = Date.now() - startTime;
                console.log(
                    `[S3Service] Directory deleted | Path: ${normalizedPath} | Duration: ${duration}ms`
                );
                return { success: true, key: normalizedPath };
            }

            const listResult = await this.list(normalizedPath, { recursive: true });
            const keysToDelete = listResult.files.map((file) => ({ Key: file.key }));

            if (keysToDelete.length > 0) {
                const batchSize = 1000;
                for (let i = 0; i < keysToDelete.length; i += batchSize) {
                    const batch = keysToDelete.slice(i, i + batchSize);

                    const params = {
                        Bucket: this.bucketName,
                        Delete: {
                            Objects: batch,
                            Quiet: false,
                        },
                    };

                    await this.s3.deleteObjects(params).promise();
                    console.log(
                        `[S3Service] Batch deleted | Progress: ${Math.min(
                            i + batchSize,
                            keysToDelete.length
                        )}/${keysToDelete.length}`
                    );
                }
            }

            const duration = Date.now() - startTime;
            console.log(
                `[S3Service] Directory deleted recursively | Path: ${normalizedPath} | Files: ${keysToDelete.length} | Duration: ${duration}ms`
            );

            return { success: true, deletedCount: keysToDelete.length };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(
                `[S3Service] Directory deletion failed | Path: ${directoryPath} | Duration: ${duration}ms | Error: ${error.message}`
            );
            throw error;
        }
    }

    async getUrl(filePath, expiresIn = 3600) {
        this.ensureInitialized();

        console.log(
            `[S3Service] Generating signed URL | Path: ${filePath} | ExpiresIn: ${expiresIn}s`
        );

        try {
            const params = {
                Bucket: this.bucketName,
                Key: filePath,
                Expires: expiresIn,
            };

            const url = await this.s3.getSignedUrlPromise("getObject", params);

            console.log(`[S3Service] Signed URL generated | Path: ${filePath}`);

            return url;
        } catch (error) {
            console.error(
                `[S3Service] URL generation failed | Path: ${filePath} | Error: ${error.message}`
            );
            throw error;
        }
    }

    async getUploadUrl(
        filePath,
        expiresIn = 3600,
        contentType = "application/octet-stream"
    ) {
        this.ensureInitialized();

        console.log(
            `[S3Service] Generating upload URL | Path: ${filePath} | ExpiresIn: ${expiresIn}s`
        );

        try {
            const params = {
                Bucket: this.bucketName,
                Key: filePath,
                Expires: expiresIn,
                ContentType: contentType,
            };

            const url = await this.s3.getSignedUrlPromise("putObject", params);

            console.log(`[S3Service] Upload URL generated | Path: ${filePath}`);

            return url;
        } catch (error) {
            console.error(
                `[S3Service] Upload URL generation failed | Path: ${filePath} | Error: ${error.message}`
            );
            throw error;
        }
    }

    async multipartUpload(fileBuffer, filePath, metadata = {}) {
        this.ensureInitialized();

        const startTime = Date.now();
        const partSize = 5 * 1024 * 1024;
        console.log(
            `[S3Service] Multipart upload started | Path: ${filePath} | Size: ${fileBuffer.length} bytes | PartSize: ${partSize}`
        );

        try {
            const params = {
                Bucket: this.bucketName,
                Key: filePath,
                ContentType: metadata.contentType || this.getContentType(filePath),
                Metadata: metadata,
            };

            const multipartUpload = await this.s3
                .createMultipartUpload(params)
                .promise();
            const uploadId = multipartUpload.UploadId;

            console.log(
                `[S3Service] Multipart upload initiated | UploadId: ${uploadId}`
            );

            const parts = [];
            const numParts = Math.ceil(fileBuffer.length / partSize);

            for (let i = 0; i < numParts; i++) {
                const start = i * partSize;
                const end = Math.min(start + partSize, fileBuffer.length);
                const partNumber = i + 1;

                const uploadParams = {
                    Bucket: this.bucketName,
                    Key: filePath,
                    PartNumber: partNumber,
                    UploadId: uploadId,
                    Body: fileBuffer.slice(start, end),
                };

                const partResult = await this.s3.uploadPart(uploadParams).promise();

                parts.push({
                    PartNumber: partNumber,
                    ETag: partResult.ETag,
                });

                console.log(
                    `[S3Service] Part uploaded | Part: ${partNumber}/${numParts} | ETag: ${partResult.ETag}`
                );
            }

            const completeParams = {
                Bucket: this.bucketName,
                Key: filePath,
                UploadId: uploadId,
                MultipartUpload: { Parts: parts },
            };

            const result = await this.s3
                .completeMultipartUpload(completeParams)
                .promise();

            const duration = Date.now() - startTime;
            console.log(
                `[S3Service] Multipart upload completed | Path: ${filePath} | Parts: ${numParts} | Duration: ${duration}ms`
            );

            return {
                success: true,
                key: result.Key,
                location: result.Location,
                etag: result.ETag,
                bucket: result.Bucket,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(
                `[S3Service] Multipart upload failed | Path: ${filePath} | Duration: ${duration}ms | Error: ${error.message}`
            );
            throw error;
        }
    }

    getContentType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            ".txt": "text/plain",
            ".html": "text/html",
            ".css": "text/css",
            ".js": "application/javascript",
            ".json": "application/json",
            ".xml": "application/xml",
            ".pdf": "application/pdf",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".mp4": "video/mp4",
            ".mp3": "audio/mpeg",
            ".zip": "application/zip",
            ".tar": "application/x-tar",
            ".gz": "application/gzip",
        };

        return contentTypes[ext] || "application/octet-stream";
    }

    async getBucketSize() {
        this.ensureInitialized();

        console.log(
            `[S3Service] Calculating bucket size | Bucket: ${this.bucketName}`
        );

        try {
            let totalSize = 0;
            let continuationToken = null;

            do {
                const params = {
                    Bucket: this.bucketName,
                    MaxKeys: 1000,
                    ContinuationToken: continuationToken,
                };

                const result = await this.s3.listObjectsV2(params).promise();

                totalSize += result.Contents.reduce((sum, item) => sum + item.Size, 0);
                continuationToken = result.NextContinuationToken;

                console.log(
                    `[S3Service] Bucket size calculation progress | CurrentTotal: ${totalSize} bytes`
                );
            } while (continuationToken);

            console.log(
                `[S3Service] Bucket size calculated | Total: ${totalSize} bytes`
            );

            return {
                totalSize: totalSize,
                formatted: this.formatBytes(totalSize),
            };
        } catch (error) {
            console.error(
                `[S3Service] Bucket size calculation failed | Error: ${error.message}`
            );
            throw error;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    }
}

module.exports = new S3Service();
