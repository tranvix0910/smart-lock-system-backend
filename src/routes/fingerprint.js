import express from 'express';
import { requestAddFingerid, getFingerprint, deleteFingerprintRequest } from '../app/controllers/FingerprintController.js';

const router = express.Router();

router.post('/request-add-fingerid/:userId/:deviceId', requestAddFingerid);
router.get('/get-fingerprint/:userId', getFingerprint);
router.post('/delete-fingerprint-request/:userId/:deviceId/:fingerprintId', deleteFingerprintRequest);

export default router;