const express = require('express');
const upload = require('../configs/multer.config');
const { protect } = require('../middlewares/auth.middleware');
const { validateUploadMiddleware, validateSingleUploadMiddleware } = require('../middlewares/upload.middleware');
const FileUploadController = require('../controllers/file.upload.controller');

const router = express.Router();

console.log(`[FILE_ROUTES] INIT | Loading file upload routes`);

router.post(
    '/upload',
    protect,
    upload.single('file'),
    validateSingleUploadMiddleware,
    FileUploadController.uploadSingleFile
);

console.log(`[FILE_ROUTES] ROUTE_REGISTERED | POST /upload`);

router.post(
    '/upload-multiple',
    protect,
    upload.array('files', 10),
    validateUploadMiddleware,
    FileUploadController.uploadMultipleFiles
);

console.log(`[FILE_ROUTES] ROUTE_REGISTERED | POST /upload-multiple`);

router.get(
    '/files',
    protect,
    FileUploadController.getFiles
);

console.log(`[FILE_ROUTES] ROUTE_REGISTERED | GET /files`);

router.get(
    '/files/type/:fileType',
    protect,
    FileUploadController.getFilesByType
);

console.log(`[FILE_ROUTES] ROUTE_REGISTERED | GET /files/type/:fileType`);

router.get(
    '/file/:fileId',
    protect,
    FileUploadController.getFileById
);

console.log(`[FILE_ROUTES] ROUTE_REGISTERED | GET /file/:fileId`);

router.delete(
    '/delete/:fileId',
    protect,
    FileUploadController.deleteFile
);

console.log(`[FILE_ROUTES] ROUTE_REGISTERED | DELETE /delete/:fileId`);

router.post(
    '/delete-multiple',
    protect,
    FileUploadController.deleteMultipleFiles
);

console.log(`[FILE_ROUTES] ROUTE_REGISTERED | POST /delete-multiple`);

router.get(
    '/stats',
    protect,
    FileUploadController.getFileStats
);

console.log(`[FILE_ROUTES] ROUTE_REGISTERED | GET /stats`);

router.get(
    '/user/stats',
    protect,
    FileUploadController.getUserFileStats
);

console.log(`[FILE_ROUTES] ROUTE_REGISTERED | GET /user/stats`);

router.post(
    '/restore/:fileId',
    protect,
    FileUploadController.restoreDeletedFile
);

console.log(`[FILE_ROUTES] ROUTE_REGISTERED | POST /restore/:fileId`);

router.put(
    '/update/:fileId',
    protect,
    FileUploadController.updateFileMetadata
);

console.log(`[FILE_ROUTES] ROUTE_REGISTERED | PUT /update/:fileId`);

console.log(`[FILE_ROUTES] INIT_COMPLETE | All routes registered successfully`);

module.exports = router;