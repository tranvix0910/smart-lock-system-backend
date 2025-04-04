import FaceID from '../models/FaceID.js';

// [GET] /api/face-id/:userId
export const getFaceIdByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const faceId = await FaceID.findOne(
            { userId },
            {
                userName: 1,
                userId: 1,
                deviceId: 1,
                s3Url: 1,
                faceId: 1,
                createdAt: 1,
                _id: 0
            }
        );

        if (!faceId) {
            return res.status(404).json({
                success: false,
                message: 'Face ID not found for this user'
            });
        }

        return res.status(200).json({
            success: true,
            data: faceId
        });
    } catch (error) {
        console.error('Error in getFaceIdByUserId:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving Face ID',
            error: error.message
        });
    }
};
