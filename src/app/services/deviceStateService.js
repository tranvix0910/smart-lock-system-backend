import Device from '../models/Device.js';

export const updateDeviceState = async (deviceId, lockState, timestamp) => {
    try {
        const updatedDevice = await Device.findOneAndUpdate(
            { deviceId },
            { 
                lockState,
                status: 'ONLINE',
                lastUpdate: new Date(timestamp)
            },
            { new: true }
        );
        return updatedDevice;
    } catch (error) {
        console.error('Error updating device state:', error);
        throw error;
    }
}; 