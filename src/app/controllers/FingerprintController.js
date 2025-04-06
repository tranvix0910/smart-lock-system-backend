import { publishMessage, subscribeToTopic } from '../../util/AWSIoTCore.js';
import Fingerprint from '../../app/models/Fingerprint.js';

// [POST] /api/fingerprint/request-add-fingerid/:userId
export const requestAddFingerid = async (req, res) => {
    try {

        const { userId, deviceId } = req.params;
        const { faceId } = req.body;
        
        if (!userId || !deviceId) {
            return res.status(400).json({
                success: false,
                message: 'userId and deviceId are required'
            });
        }
        const topicSubscribe = `addFingerprint-smartlock/${userId}/${deviceId}`;
        const topicPublish = `addFingerprint-server/${userId}/${deviceId}`;
        subscribeToTopic(topicSubscribe);
        publishMessage(topicPublish, {
            userId,
            deviceId,
            faceId,
            mode: 'ADD FINGERPRINT REQUEST FROM SERVER'
        });
    return res.status(200).json({
        success: true,
        userId: userId,
            message: 'Fingerprint request added successfully',
            topicSubscribe
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error adding fingerprint request'
        });
    }
};

// [GET] /api/fingerprint/get-fingerprint/:userId
export const getFingerprint = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required'
            });
        }
        
        const fingerprints = await Fingerprint.find(
            { userId },
            {
                userId: 1,
                deviceId: 1,
                faceId: 1,
                userName: 1,
                fingerprintId: 1,
                fingerprintTemplate: 1,
                createdAt: 1,
                _id: 0
            }
        ).sort({ createdAt: -1 });

        if (!fingerprints || fingerprints.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No fingerprints found for this user'
            });
        }
        
        return res.status(200).json({
            success: true,
            count: fingerprints.length,
            data: fingerprints
        });
    } catch (error) {
        console.error('Error in getFingerprint:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving fingerprints',
            error: error.message
        });
    }
};

// [DELETE] /api/fingerprint/delete-fingerprint/:userId/:fingerprintId
export const deleteFingerprint = async (req, res) => {
    try {
        const { userId, fingerprintId } = req.params;
        
        if (!userId || !fingerprintId) {
            return res.status(400).json({
                success: false,
                message: 'userId and fingerprintId are required'
            });
        }
        
        const result = await Fingerprint.deleteOne({ userId, fingerprintId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Fingerprint not found'

            });
        }
        return res.status(200).json({
            success: true,
            message: 'Fingerprint deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteFingerprint:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting fingerprint',
            error: error.message
        });
    }
};
