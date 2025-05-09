import express from 'express';
import { 
    getDeviceByUserId, 
    changeDeviceState, 
    createDevice, 
    updateDevice, 
    deleteDeviceRequest,
    deleteDevice,
    unlockDevice
} from '../app/controllers/DeviceController.js';

const router = express.Router();

router.post('/create-device', createDevice);
router.delete('/delete-device/:userId/:deviceId', deleteDevice);
router.get('/delete-device-request/:userId/:deviceId', deleteDeviceRequest);
router.get('/:userId', getDeviceByUserId);
router.put('/:deviceId/state', changeDeviceState);
router.put('/:userId/:deviceId/update', updateDevice);
router.post('/unlock-device/:userId/:deviceId', unlockDevice);

export default router;