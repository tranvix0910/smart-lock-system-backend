import express from 'express';
import { requestAddRfid } from '../app/controllers/RFIDController.js';

const router = express.Router();

router.post('/request-add-rfid/:userId/:deviceId', requestAddRfid);

export default router; 