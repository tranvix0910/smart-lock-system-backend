import Device from '../models/Device.js';
import { sendDeviceCommandLockState, sendDeviceCommandConnect } from '../services/aws/IoTCore/mqttService.js';
import { publishMessage, subscribeToTopic } from '../../util/AWSIoTCore.js';

// [POST] /api/devices/create-device
export const createDevice = async (req, res) => {
    try {
        const { userId, deviceId, macAddress, secretKey, deviceName, location, userName } = req.body;

        if (!userId || !deviceId || !macAddress || !secretKey) {
            return res.status(400).json({
                success: false,
                message: 'userId, deviceId, macAddress, and secret are required'
            });
        }

        let existingDevice = await Device.findOne({ deviceId });
        if (existingDevice) {
            return res.status(400).json({
                success: false,
                message: 'Device with this deviceId already exists'
            }); 
        }

        existingDevice = await Device.findOne({ macAddress });
        if (existingDevice) {
            return res.status(400).json({   
                success: false,
                message: 'Device with this MAC address already exists'
            });
        }

        const newDevice = new Device({ 
            userId, 
            deviceId, 
            macAddress, 
            secretKey,
            deviceName, 
            location,
            userName,
            batteryLevel: 100,
        });
        
        await newDevice.save();

        const topic = `smartlock/${userId}/${deviceId}`;
        subscribeToTopic(topic);

        await sendDeviceCommandConnect(newDevice);

        res.status(201).json({
            success: true,
            message: 'Device created successfully',
            data: {
                device: newDevice
            }
        });
    } catch (error) {
        console.error('Create device error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error when creating device',
            error: error.message
        });
    }
};

// [GET] /api/devices/get-device-by-user-id/:userId
export const getDeviceByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const devices = await Device.find({ userId });

        if (!devices || devices.length === 0) {
            return res.status(200).json({
                success: false,
                message: 'Device not found'
            });
        }

        devices.forEach(device => {
            const topic = `smartlock/${userId}/${device.deviceId}`;
            subscribeToTopic(topic);
        });

        const simplifiedDevices = devices.map(device => ({
            userId: device.userId,
            batteryLevel: device.batteryLevel,
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            location: device.location,
            lockState: device.lockState,
            macAddress: device.macAddress,
            status: device.status,
            systemLocked: device.systemLocked,
            systemLockedAt: device.systemLockedAt
        }));

        res.status(200).json({
            success: true,
            data: simplifiedDevices
        });
    } catch (error) {
        console.error('Error in getDeviceByUserId:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// [PUT] /api/devices/change-device-state/:deviceId
export const changeDeviceState = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { lockState } = req.body;

        if (!['LOCK', 'UNLOCK'].includes(lockState)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid state. Only LOCK or UNLOCK is allowed'
            });
        }

        const device = await Device.findOne({ deviceId });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        if (device.status !== 'ONLINE') {
            return res.status(400).json({
                success: false,
                message: 'Device is offline, cannot change state'
            });
        }

        await sendDeviceCommandLockState(device, lockState);
        
        device.lockState = lockState;
        await device.save();

        res.status(200).json({
            success: true,
            message: `Device has been ${lockState === 'LOCK' ? 'locked' : 'unlocked'} successfully`,
            data: {
                device: device
            }
        });

    } catch (error) {
        console.error('Change device state error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error when changing device state',
            error: error.message
        });
    }
};

// [PUT] /api/devices/:userId/:deviceId/update
export const updateDevice = async (req, res) => {
    try {
        const { userId, deviceId } = req.params;
        const { deviceName, location } = req.body;

        const device = await Device.findOne({ userId, deviceId });      

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        device.deviceName = deviceName;
        device.location = location;
        await device.save();

        res.status(200).json({
            success: true,
            message: 'Device updated successfully'
        });
    } catch (error) {
        console.error('Update device error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error when updating device',
            error: error.message
        });
    }
}

// [GET] /api/devices/delete-device-request/:userId/:deviceId
export const deleteDeviceRequest = async (req, res) => {
    try {
        const { userId, deviceId } = req.params;

        const device = await Device.findOne({ userId, deviceId });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }   

        const topicSubscribe = `smartlock-delete/${userId}/${deviceId}`;
        const topicPublish = `server-delete/${userId}/${deviceId}`;

        subscribeToTopic(topicSubscribe);
        publishMessage(topicPublish, {
            userId: userId,
            deviceId: deviceId,
            mode: 'DELETE DEVICE REQUEST',
            timestamp: new Date().toISOString()
        });

        res.status(200).json({
            success: true,
            message: 'Device deletion request sent successfully'
        });
        
    } catch (error) {
        console.error('Delete device request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error when sending device deletion request',
            error: error.message
        });
    }
}

// [DELETE] /api/devices/delete-device/:userId/:deviceId
export const deleteDevice = async (req, res) => {
    try {
        const { userId, deviceId } = req.params;

        const device = await Device.findOne({ userId, deviceId });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        const topic = `server-delete/${userId}/${deviceId}`;
        const message = {
            userId: userId,
            deviceId: deviceId,
            mode: 'DELETED DEVICE FROM SERVER',
            timestamp: new Date().toISOString()
        };
        publishMessage(topic, message);

        await device.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Device deleted successfully'
        });
    } catch (error) {
        console.error('Delete device error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error when deleting device',
            error: error.message
        });
    }
};

// [POST] /api/devices/unlock-device/:userId/:deviceId
export const unlockDevice = async (req, res) => {
    try {
        const { userId, deviceId } = req.params;
        const { faceId } = req.body;

        if (!userId || !deviceId) {
            return res.status(400).json({
                success: false,
                message: 'userId and deviceId are required'
            });
        }

        const device = await Device.findOne({ deviceId, userId });
        
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }
        
        const unlockSystemTopic = `unlockSystem-smartlock/${userId}/${deviceId}`;
        subscribeToTopic(unlockSystemTopic);
        
        const publishTopic = `unlockSystem-server/${userId}/${deviceId}`;
        publishMessage(publishTopic, {
            faceId: faceId,
            mode: 'UNLOCK SYSTEM REQUEST FROM SERVER'
        });

        return res.status(200).json({
            success: true,
            message: 'Unlock request sent to device successfully',
            data: {
                deviceId,
                userId,
                requestTime: device.lastUnlockRequest
            }
        });
    } catch (error) {
        console.error('Error sending unlock request:', error);
        return res.status(500).json({
            success: false,
            message: 'Error sending unlock request',
            error: error.message
        });
    }
};


