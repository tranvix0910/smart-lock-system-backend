import RecentAccessLogs from '../models/RecentAccessLogs.js';

// [GET] /api/recent-access-logs
export const getRecentAccessLogs = async (req, res) => {
    try {
        const logs = await RecentAccessLogs.find({ })
        if (!logs || logs.length === 0) {
            return res.status(200).json([]);
        }
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Error in getRecentAccessLogsByDeviceId:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error when getting recent access logs',
            error: error.message
        });
    }
};

