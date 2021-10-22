const http = require('http');
const url = require('url');

const mqtt = require('mqtt');
const fs = require('fs');

const API_PORT = 8128;

const TOPIC_TORQUE_DEVICE_STATUS = "torque/device/status";
const TOPIC_TORQUE_SERVER_STATUS = "torque/server/status";

const SUPPORTED_ENDPOINTS = [
    "/api/torque",
    "/favicon.ico"
];

const CONFIG_FILE_SENSORS = "./sensors.json";
const CONFIG_FILE_MQTT = "/config/mqtt.json";
const CONFIG_FILE_DEVICES = "/config/devices.json";

let mqttClient = null;

const config = {
    devices: null,
    hasDevices: false,
    mqtt: null,
    hasMQTTBroker: false,
    isMQTTBrokerConnected: false,
    sensors: require(CONFIG_FILE_SENSORS)
};

const initialize = () => {
    if (fs.existsSync(CONFIG_FILE_DEVICES)) {
        config.devices = require(CONFIG_FILE_DEVICES);
        config.hasDevices = config.devices !== undefined && config.devices !== null && Object.keys(config.devices).length > 0;

        if (config.hasDevices) {
            console.info(`Devices configuration loaded, Settings: ${JSON.stringify(config.devices)}`);           
            
        } else {
            console.error(`No devices configured, please check '${CONFIG_FILE_DEVICES}'`);        
        } 
    }
    
    if (fs.existsSync(CONFIG_FILE_MQTT)) {
        config.mqtt = require(CONFIG_FILE_MQTT);
        config.hasMQTTBroker = config.mqtt !== null;

        if (config.hasMQTTBroker) {
            console.info(`MQTT Configuration loaded, Settings: ${JSON.stringify(config.mqtt)}`);

            connectMQTTBroker();

        } else {
            console.error(`No MQTT Broker configured, please check '${CONFIG_FILE_MQTT}'`);        
        }
    }

    if(config.hasDevices && config.hasMQTTBroker) {
        console.info(`Starting server on port ${API_PORT}`);

        app.listen(API_PORT, '0.0.0.0');
    }
};

const connectMQTTBroker = () => {
    const connectUrl = `mqtt://${config.mqtt.host}:${config.mqtt.port}`;
    
    try {
        console.info(`Starting connection to MQTT Broker '${connectUrl}'`);

        mqttClient = mqtt.connect(connectUrl, {
            clientId: config.mqtt.clientId,
            clean: true,
            connectTimeout: 4000,
            username: config.mqtt.username,
            password: config.mqtt.password,
            reconnectPeriod: 1000,
          });

        bindMQTTBrokerEvents();

    } catch(ex) {
        console.error(`Failed to connect MQTT Broker, Url: ${connectUrl}, Error: ${ex}`);
    }
    
}

const publishMessage = (topic, message) => {
    if(config.isMQTTBrokerConnected) {
        data = JSON.stringify(message);

        mqttClient.publish(topic, data, { qos: 0, retain: false }, (error) => {
            if (error) {
                console.error(`Failed to publish data: ${data} to '${topic}', Error: ${error}`);
            }
        });
    } else {
        console.warn(`Failed to publish message: ${message} to '${topic}', MQTT Broker is disconnected`);
    }
};

const convertToReadable = (data) => {
    const result = {};

    if(data !== null) {
		const dataItemKeys = Object.keys(data);

        dataItemKeys.forEach(k => {
            const newKey = config.sensors[k];
            const value = k.endsWith("[]") ? data[k][0] : data[k];

            result[newKey] = value;
        });

        const username = result.Username;
        result["device"] = config.devices[username];
    }

    return result;
}

const app = http.createServer((request, response) => {
    try {
		const requestData = url.parse(request.url, true);
        const address = requestData.pathname;	
        const queryParams = requestData.query;
        const data = convertToReadable(queryParams);
        const queryString = JSON.stringify(queryParams);
        
        let message = `Message handled`;
        let responseCode = 200;
    
        if(data.device === undefined || data.device === null) {
            message = `Unknown device, Username: ${data.Username}`;
            responseCode = 403;
        }
    
        if(request.method !== 'GET' && responseCode === 200) {
            message = `${request.method} method is not supported`;
            responseCode = 405;
        }
    
        if(!SUPPORTED_ENDPOINTS.includes(address) && responseCode === 200) {
            message = `${address} endpoint is not supported`;
            responseCode = 400;
        } 
    
        if(responseCode == 200) {
            console.info(`${message}, Data: ${queryString}`);
    
            publishMessage(TOPIC_TORQUE_DEVICE_STATUS, data);
    
        }  else {
            console.warn(`Failed to handle message, Error: ${message}, Data: ${queryString}`);
    
            response.writeHead(responseCode);
            response.end(message);
        } 

    } catch(ex) {
        const errorMessage = `Failed to process request, Error: ${ex}`

        console.error(errorMessage);
        response.writeHead(400);
        response.end(errorMessage);
    }
    
});

const bindMQTTBrokerEvents = () => {
    mqttClient.on('connect', () => {
        console.info(`MQTT Borker connected`);

        config.isMQTTBrokerConnected = true;

        const data = {
            connected: true
        };

        publishMessage(TOPIC_TORQUE_SERVER_STATUS, data);
    });

    mqttClient.on('reconnect', () => {
        console.info(`MQTT Borker re-connected`);

        config.isMQTTBrokerConnected = true;

        const data = {
            connected: true
        };

        publishMessage(TOPIC_TORQUE_SERVER_STATUS, data);
    });

    mqttClient.on('close', () => {
        console.warn(`MQTT Borker disconnected`);
        
        config.isMQTTBrokerConnected = false;
    });

    mqttClient.on('disconnect', (packet) => {
        console.warn(`MQTT Borker disconnected, Packet: ${packet}`);
        
        config.isMQTTBrokerConnected = false;
    });

    mqttClient.on('offline', () => {
        console.warn(`MQTT Borker is offline`);
        
        config.isMQTTBrokerConnected = false;
    });

    mqttClient.on('end', () => {
        console.info(`MQTT Borker connection was terminated`);
        
        config.isMQTTBrokerConnected = false;
    });

    mqttClient.on('error', (error) => {
        console.error(`MQTT Borker connection error, Error: ${error}`);
        
        config.isMQTTBrokerConnected = false;
    });
}

initialize();
