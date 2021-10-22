const express = require('express');
const slugify = require('slugify');
const mqtt = require('mqtt');
const fs = require('fs');
const md = require('markdown-it')();

const API_PORT = 8128;

const TOPIC_TORQUE_DEVICE_STATUS = "torque/device/status";
const TOPIC_TORQUE_SERVER_STATUS = "torque/server/status";

const ENDPOINT_TORQUE_DATA = "/api/torque";
const ENDPOINT_TORQUE_SENSORS = "/api/torque/sensors";
const ENDPOINT_HOME_1 = "";
const ENDPOINT_HOME_2 = "/";
const ENDPOINT_DEBUG = "/api/debug";


const CONFIG_FILE_SENSORS = "./torque.json";
const CONFIG_FILE_MQTT = "/config/mqtt.json";
const CONFIG_FILE_DEVICES = "/config/devices.json";
const CONFIG_FILE_README_MD = "./README.md";
const CONFIG_FILE_README_HTML = "./README.html";

const SPECIAL_TORQUE_KEYS = [
    "kff1001",
    "kff1005",
    "kff1006"
];

let mqttClient = null;
const app = express();

const config = {
    devices: null,
    hasDevices: false,
    mqtt: null,
    hasMQTTBroker: false,
    isMQTTBrokerConnected: false,
    sensors: require(CONFIG_FILE_SENSORS),
    readmeHtml: null,
	isDebug: false,
    slugify: {
        replacement: '_',  // replace spaces with replacement character, defaults to `-`
        remove: /[*+~.()/'"!:@]/g, // remove characters that match regex, defaults to `undefined`
        lower: true,      // convert to lower case, defaults to `false`
        strict: false,     // strip special characters except replacement, defaults to `false`
        locale: 'en',       // language code of the locale to use
        trim: true         // trim leading and trailing replacement chars, defaults to `true`
      }
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
    
    config.sensors.forEach(s => {
        s.name = slugify(s.description, config.slugify);
    });

    if(config.hasDevices && config.hasMQTTBroker) {
        console.info(`Starting server on port ${API_PORT}`);

        bindAPIEndpoints();

        app.listen(API_PORT);
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
        const data = JSON.stringify(message);

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
        config.sensors.forEach(torqueSensor => {
            const key = torqueSensor.id;
            
            const tmpDataItem = data[key];

            if(tmpDataItem !== undefined) {
                const isArray = torqueSensor.type === "array";
				const isString = torqueSensor.type === "string";
				
				const dataItem = isArray ? tmpDataItem[0] : tmpDataItem;
				
                result[torqueSensor.name] = isString ? dataItem : parseFloat(dataItem);
            }
        });

        const username = result.username;
        result["device"] = config.devices[username];
    }

    return result;
}

const setResponseStatus = (response, statusCode, content) => {
    response.status(statusCode);
	response.send(content);

	if(statusCode >= 400) {
		console.error(content);
	}
};

const bindAPIEndpoints = () => {
	app.get(ENDPOINT_DEBUG, function (req, res) {
        setResponseStatus(res, 200, { debug: config.isDebug });
    });
	
    app.post(ENDPOINT_DEBUG, function (req, res) {
        config.isDebug = true;

        setResponseStatus(res, 200, { debug: config.isDebug });
    });

    app.delete(ENDPOINT_DEBUG, function (req, res) {
        config.isDebug = false;

        setResponseStatus(res, 200, { debug: config.isDebug });
    });

    app.get(ENDPOINT_HOME_1, function (req, res) {
        setResponseStatus(res, 200, config.readmeHtml);
    });

    app.get(ENDPOINT_HOME_2, function (req, res) {
        setResponseStatus(res, 200, config.readmeHtml);
    });

    app.get(ENDPOINT_TORQUE_SENSORS, function (req, res) {
        setResponseStatus(res, 200, config.sensors);
    });

    app.get(ENDPOINT_TORQUE_DATA, function (req, res) {
        if (config.isDebug) {
            console.debug(`Incoming request: ${JSON.stringify(req.query)}`);
        }

        const data = convertToReadable(req.query);
		
		if (config.isDebug) {
            console.debug(`Parsed request: ${JSON.stringify(data)}`);
        }
        
        if(data.device === undefined || data.device === null) {
            setResponseStatus(res, 403, `Unknown device, Username: ${data.username}`);

        } else {
            publishMessage(TOPIC_TORQUE_DEVICE_STATUS, data);

            setResponseStatus(res, 200, "OK!");
        }
    });
};

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
