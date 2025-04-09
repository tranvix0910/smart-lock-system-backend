import RFID from '../models/RFID.js';
import { subscribeToTopic, publishMessage } from '../../util/AWSIoTCore.js';

// [POST] /api/rfid/request-add-rfid/:userId/:deviceId
const requestAddRfid = async (req, res) => {
    try {
        const { userId, deviceId } = req.params;
        const { faceId } = req.body;

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
    const { userId } = req.params;
    const rfid = await RFID.find({ userId });
    res.status(200).json(rfid);
};

// [POST] /api/rfid/delete-rfid-request/:userId/:deviceId/:rfidId
const deleteRfidRequest = async (req, res) => {
    const { userId, deviceId, rfidId } = req.params;
    const rfid = await RFID.deleteOne({ userId, deviceId, rfidId });
    res.status(200).json(rfid);
};


export { requestAddRfid, getRfid, deleteRfidRequest, addRfid };
