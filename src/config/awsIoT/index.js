import awsIoT from 'aws-iot-device-sdk';

const device = awsIoT.device({
    keyPath: process.env.AWS_IOT_KEY,
    certPath: process.env.AWS_IOT_CERT,
    caPath: process.env.AWS_IOT_CA,
    clientId: process.env.AWS_IOT_CLIENT_ID,
    host: process.env.AWS_IOT_HOST,
});

export default device;






