import express from 'express';
import { getRecentAccessLogs } from '../app/controllers/RecentAccessLogsController.js';

const router = express.Router();

router.get('/', getRecentAccessLogs);

export default router;