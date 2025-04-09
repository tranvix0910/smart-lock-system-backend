import { subscribeToTopic, publishMessage } from '../../../../util/AWSIoTCore.js';

export const sendDeviceCommandLockState = async (device, lockState) => {
    try {
        const command = {
            deviceId: device.deviceId,
            userId: device.userId,
            lockState: lockState,
            timestamp: new Date().toISOString()
        };
        publishMessage(`server/${device.userId}/${device.deviceId}`, command);
        return true;
    } catch (error) {
        console.error('Error sending device command:', error);
        throw error;
    }
};

export const sendDeviceCommandConnect = async (device) => {
    try {
        const command = {
            deviceId: device.deviceId,
            userId: device.userId,
            macAddress: device.macAddress,
            secretKey: device.secretKey,
            timestamp: new Date().toISOString()
        };

        const topic = `connect/${device.macAddress}/${device.deviceId}`;
        subscribeToTopic(topic);
        publishMessage(topic, command);
    } catch (error) {
        console.error('Error sending device command:', error);
        throw error;
    }
};