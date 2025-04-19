import express from 'express';
import { requestAddRfid, getRfid, requestDeleteRfid, deleteRfid, getUsernameByRfidId } from '../app/controllers/RFIDController.js';

const router = express.Router();

router.post('/request-add-rfid/:userId/:deviceId', requestAddRfid);
router.get('/get-rfid/:userId', getRfid);
router.post('/request-delete-rfid/:userId/:deviceId', requestDeleteRfid);
router.delete('/delete-rfid/:userId/:deviceId', deleteRfid);
router.post('/get-username-by-rfid', getUsernameByRfidId);

export default router; 