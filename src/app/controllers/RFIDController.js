import RFID from '../models/RFID.js';
import { subscribeToTopic, publishMessage } from '../../util/AWSIoTCore.js';

// [POST] /api/rfid/request-add-rfid/:userId/:deviceId
const requestAddRfid = async (req, res) => {
    try {
        const { userId, deviceId } = req.params;
        const { faceId, rfidId } = req.body;

        console.log(faceId, rfidId);
        console.log(userId, deviceId);

        if (!userId || !deviceId || !faceId) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required fields' 
            });
        }
        const topicSubscribe = `addRFIDCard-smartlock/${userId}/${deviceId}`;
        const topicPublish = `addRFIDCard-server/${userId}/${deviceId}`;
        subscribeToTopic(topicSubscribe);
        publishMessage(topicPublish, {
            userId,
            deviceId,
            faceId,
            rfidId,
            mode: 'ADD RFID CARD REQUEST FROM SERVER'
        });

        res.status(200).json({ 
            success: true,
            userId: userId,
            message: 'RFID request added successfully',
            topicSubscribe
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error sending RFID request',
            error: error.message
        });
    }
};

// [POST] /api/rfid/add-rfid/:userId/:deviceId
const addRfid = async (req, res) => {
    const { userId, deviceId } = req.params;
    const { rfidId } = req.body;

    const rfid = await RFID.create({ userId, deviceId, rfidId });
    res.status(200).json(rfid);
};

// [GET] /api/rfid/get-rfid/:userId 
const getRfid = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const rfid = await RFID.find({ userId });
        res.status(200).json({
            success: true,
            rfid: rfid
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting RFID',
            error: error.message
        });
    }
};

// [POST] /api/rfid/request-delete-rfid/:userId/:deviceId
const requestDeleteRfid = async (req, res) => {
    try {
        const { userId, deviceId } = req.params;
        const { faceId, rfidId, rfidIdLength } = req.body;

        const topicSubscribe = `deleteRFIDCard-smartlock/${userId}/${deviceId}`;
        const topicPublish = `deleteRFIDCard-server/${userId}/${deviceId}`;

        subscribeToTopic(topicSubscribe);
        publishMessage(topicPublish, {
            faceId,
            rfidId,
            rfidIdLength,
            mode: 'DELETE RFID CARD REQUEST FROM SERVER'
        });

        res.status(200).json({
            success: true,
            userId: userId,
            message: 'RFID request deleted successfully',
            topicSubscribe
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending RFID request',
            error: error.message
        });
    }
};

// [DELETE] /api/rfid/delete-rfid/:userId/:deviceId
const deleteRfid = async (req, res) => {
    try {
        const { userId, deviceId } = req.params;
        const { rfidId } = req.body;

        const rfid = await RFID.deleteOne({ userId, deviceId, rfidId });
        res.status(200).json(rfid);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting RFID',
            error: error.message
        });
    }
};

// [POST] /api/rfid/get-username-by-rfid
const getUsernameByRfidId = async (req, res) => {
    try {
        const { rfidId } = req.body;
        
        if (!rfidId) {
            return res.status(400).json({
                success: false,
                message: 'RFID ID is required'
            });
        }
        
        const rfidCard = await RFID.findOne({ rfidId });
        
        if (!rfidCard) {
            return res.status(404).json({
                success: false,
                message: 'RFID card not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: {
                userName: rfidCard.userName,
            }
        });
    } catch (error) {
        console.error('Error getting username by RFID ID:', error);
        return res.status(500).json({
            success: false,
            message: 'Error getting username by RFID ID',
            error: error.message
        });
    }
}

export { requestAddRfid, getRfid, requestDeleteRfid, addRfid, deleteRfid, getUsernameByRfidId };
