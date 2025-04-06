import express from 'express';
import { requestAddFingerid, getFingerprint } from '../app/controllers/FingerprintController.js';

const router = express.Router();

router.post('/request-add-fingerid/:userId/:deviceId', requestAddFingerid);
router.get('/get-fingerprint/:userId', getFingerprint);

export default router;