import deviceRoutes from './devices.js';
import recentAccessLogsRoutes from './recentAccessLogs.js';
import rekognitionRoutes from './rekognition.js';
import faceIdRoutes from './faceId.js';

export default function routes(app) {
    app.use('/api/devices', deviceRoutes);
    app.use('/api/recent-access-logs', recentAccessLogsRoutes);
    app.use('/api/rekognition', rekognitionRoutes);
    app.use('/api/face-id', faceIdRoutes);
}