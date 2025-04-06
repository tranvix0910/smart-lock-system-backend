import FaceID from '../models/FaceID.js';

// [GET] /api/face-id/:userId
export const getFaceIdByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const faceIds = await FaceID.find(
            { userId },
            {
                userName: 1,
                userId: 1,
                deviceId: 1,
                imageName: 1,
                faceId: 1,
                createdAt: 1,
                _id: 0
            }
        ).sort({ createdAt: -1 });

        if (!faceIds || faceIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Face IDs found for this user'
            });
        }

        return res.status(200).json({
            success: true,
            count: faceIds.length,
            data: faceIds
        });
    } catch (error) {
        console.error('Error in getFaceIdByUserId:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving Face IDs',
            error: error.message
        });
    }
};
