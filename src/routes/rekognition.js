import express from 'express';
import {
    createCollection,
    IndexFace,
    deleteFace
} from '../app/controllers/RekognitionController.js';

const router = express.Router();

router.post('/create-collection', createCollection);
router.post('/index-face/:userId/:deviceId', IndexFace);
router.delete('/delete-face/:userId/:deviceId', deleteFace);

export default router; 