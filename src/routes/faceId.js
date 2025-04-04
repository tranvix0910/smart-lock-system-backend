import express from 'express';
import { 
    getFaceIdByUserId, 
} from '../app/controllers/FaceIDController.js';

const router = express.Router();

router.get('/:userId', getFaceIdByUserId);

export default router;