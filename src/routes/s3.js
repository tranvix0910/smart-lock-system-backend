import express from 'express';
import {
    uploadImageToS3,
    getPresignedUrl
} from '../app/controllers/S3Controller.js';

const router = express.Router();

router.post('/upload-image', uploadImageToS3);
router.post('/get-presigned-url', getPresignedUrl);

export default router; 