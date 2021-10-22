const http = require('http');
const url = require('url');

const mqtt = require('mqtt');
const fs = require('fs');
var md = require('markdown-it')();

const API_PORT = 8128;

const TOPIC_TORQUE_DEVICE_STATUS = "torque/device/status";
const TOPIC_TORQUE_SERVER_STATUS = "torque/server/status";

const ENDPOINT_TORQUE_DATA = "/api/torque";
const ENDPOINT_TORQUE_README_1 = "";
const ENDPOINT_TORQUE_README_2 = "/";
const ENDPOINT_TORQUE_FAVICON = "/favicon.ico"

const ENDPOINT_TORQUE_README = [
	ENDPOINT_TORQUE_README_1,
	ENDPOINT_TORQUE_README_2
];

const SUPPORTED_ENDPOINTS = [
    ENDPOINT_TORQUE_README_1,
    ENDPOINT_TORQUE_README_2,
    ENDPOINT_TORQUE_FAVICON,
	ENDPOINT_TORQUE_DATA
];

const CONFIG_FILE_SENSORS = "./sensors.json";
const CONFIG_FILE_MQTT = "/config/mqtt.json";
const CONFIG_FILE_DEVICES = "/config/devices.json";
const CONFIG_FILE_README_MD = "./README.md";
const CONFIG_FILE_README_HTML = "./README.html";

let mqttClient = null;

const config = {
    devices: null,
    hasDevices: false,
    mqtt: null,
    hasMQTTBroker: false,
    isMQTTBrokerConnected: false,
    sensors: require(CONFIG_FILE_SENSORS),
    readmeHtml: null
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

    if (fs.existsSync(CONFIG_FILE_README_MD) && fs.existsSync(CONFIG_FILE_README_HTML)) {
        const readmeFileContent = fs.readFileSync(CONFIG_FILE_README_MD, 'utf8');
        const readmeContent = md.render(readmeFileContent);

        const readmeHTMLContent = fs.readFileSync(CONFIG_FILE_README_HTML, 'utf8');
        config.readmeHtml = readmeHTMLContent.replace("[README]", readmeContent)
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
            const value = data[k];

            result[newKey] = value;
        });

        const username = result.Username;
        result["device"] = config.devices[username];
    }

    return result;
}

const app = http.createServer((request, response) => {
    let canProceed = true;
    
    const setResponseStatus = (statusCode, content) => {
        if(canProceed) {
            response.writeHead(statusCode);
            response.end(content);

            canProceed = statusCode === 200;

            if(!canProceed) {
                console.error(content);
            }
        }
    }

    try {
        const requestData = url.parse(request.url, true);
        const address = requestData.pathname;
        const isDataRequest = ENDPOINT_TORQUE_DATA === address;
        const isFaviconRequest = ENDPOINT_TORQUE_FAVICON === address;
        const isReadmeRequest = ENDPOINT_TORQUE_README.includes(address);

        if(request.method !== 'GET') {
            setResponseStatus(405, `${request.method} method is not supported`);
        }
    
        if(!SUPPORTED_ENDPOINTS.includes(address)) {
            setResponseStatus(400, `${address} endpoint is not supported`);
        } 		
		
        if(canProceed) {
            if(isDataRequest) {
                const queryParams = requestData.query;
                const data = convertToReadable(queryParams);
                
                if(data.device === undefined || data.device === null) {
                    setResponseStatus(403, `Unknown device, Username: ${data.Username}`);
    
                } else {
                    publishMessage(TOPIC_TORQUE_DEVICE_STATUS, data);
    
                    setResponseStatus(200, "OK!");
                }           
            } else if (isReadmeRequest) {
                setResponseStatus(200, config.readmeHtml);

            } else if (isFaviconRequest) {
                setResponseStatus(200, "favicon");

            } else {
                setResponseStatus(404, "");

            }
        }        

    } catch(ex) {
        setResponseStatus(400, `Failed to process request, Error: ${ex}`);
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
