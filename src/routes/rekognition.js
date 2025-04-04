import express from 'express';
import {
    createCollection,
    uploadImageToS3AndIndexFace
} from '../app/controllers/RekognitionController.js';

const router = express.Router();

router.post('/create-collection', createCollection);
router.post('/index-face/:userId/:deviceId', uploadImageToS3AndIndexFace);

export default router; 