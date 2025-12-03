const path = require('path');

const uploadConfig = {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600,
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB) || 100,
    uploadFolder: process.env.UPLOAD_FOLDER || './uploads',
    uploadPath: process.env.UPLOAD_PATH || '/uploads',
    baseUrl: process.env.BASE_URL || 'http://localhost:5000',
    enableCompression: process.env.ENABLE_COMPRESSION === 'true',
    enableVirusScan: process.env.ENABLE_VIRUS_SCAN === 'true',

    allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/mpeg',
        'video/quicktime'
    ],

    allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'xlsx', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mpeg', 'mov'],

    fileCategories: {
        image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        video: ['mp4', 'webm', 'mpeg', 'mov'],
        document: ['pdf', 'doc', 'docx', 'txt', 'xlsx', 'pptx']
    }
};

console.log(`[CONFIG_INIT] Upload Config Loaded | Max Size: ${uploadConfig.maxFileSizeMB}MB | Folder: ${uploadConfig.uploadFolder}`);

module.exports = uploadConfig;