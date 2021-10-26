const express = require('express');
const slugify = require('slugify');
const fs = require('fs');
const md = require('markdown-it')();
const {ConsoleClient} = require("../clients/console.js");
const {MQTTClient} = require("../clients/mqtt.js");
const {MemoryClient} = require("../clients/memory.js");
const {InfluxDBClient} = require("../clients/influxdb.js");
const middleware = require("./middlewares.js");

const CONSTS = require("./consts.js");

class TorqueAPI {
    constructor() {
        this.devices = require(CONSTS.CONFIG_FILE_DEVICES);
        this.sensors = require(CONSTS.CONFIG_FILE_SENSORS);
        this.config = null;
        this.api = express();

        this.clients = [
            new ConsoleClient(),
            new MemoryClient(),
            new InfluxDBClient(),
            new MQTTClient()
        ];

        this.readmeHtml = null;
    };

    Initialize() {
        console.debug("Initializing TorqueAPI");

        if (fs.existsSync(CONSTS.CONFIG_FILE_README_MD) && fs.existsSync(CONSTS.CONFIG_FILE_README_HTML)) {
            const readmeFileContent = fs.readFileSync(CONSTS.CONFIG_FILE_README_MD, CONSTS.README_FILE_ENCODING);
            const readmeContent = md.render(readmeFileContent);
    
            const readmeHTMLContent = fs.readFileSync(CONSTS.CONFIG_FILE_README_HTML, CONSTS.README_FILE_ENCODING);
            this.readmeHtml = readmeHTMLContent.replace(CONSTS.README_PLACEHOLDER, readmeContent)
        }

        if(fs.existsSync(CONSTS.CONFIG_FILE_API)) {
            this.config = require(CONSTS.CONFIG_FILE_API);

            this.sensors.forEach(s => {
                s.name = slugify(s.description, CONSTS.SLUGIFY_CONFIG);
            });
    
            this.clients.forEach(c => c.Initialize());
    
            console.info(`Starting API on port ${CONSTS.API_PORT}`);
        
            this.bindEndpoints();
    
            this.api.use(middleware);
            this.api.listen(CONSTS.API_PORT);
        } else {
            console.error(`Failed to start API, '${CONSTS.CONFIG_FILE_API}' is missing`);
        }
        
    };

    bindEndpoints() {
        const clients = this.clients;
        const consoleClient = clients[0];
        const memoryClient = clients[1];
        
        const devices = this.devices;
        const setResponseStatus = this.setResponseStatus;
        const convertToReadable = this.convertToReadable;
        const sensors = this.sensors;
        const readmeHtml = this.readmeHtml;

        this.api.get(CONSTS.ENDPOINT_DEBUG, function (req, res) {
            setResponseStatus(res, 200, { debug: consoleClient.enabled });
        });
        
        this.api.post(CONSTS.ENDPOINT_DEBUG, function (req, res) {
            consoleClient.Enable();
    
            setResponseStatus(res, 200, { debug: consoleClient.enabled });
        });
    
        this.api.delete(CONSTS.ENDPOINT_DEBUG, function (req, res) {
            consoleClient.Disable();
    
            setResponseStatus(res, 200, { debug: consoleClient.enabled });
        });
    
        this.api.get(CONSTS.ENDPOINT_HOME, function (req, res) {
            setResponseStatus(res, 200, readmeHtml);
        });
        
        this.api.get(CONSTS.ENDPOINT_TORQUE_SENSORS, function (req, res) {
            setResponseStatus(res, 200, sensors);
        });
    
        if(memoryClient.enabled) {
            this.api.get(CONSTS.ENDPOINT_TORQUE_RAW, function (req, res) {
                setResponseStatus(res, 200, memoryClient.rawItems);
            });

            this.api.get(CONSTS.ENDPOINT_TORQUE_DATA, function (req, res) {
                setResponseStatus(res, 200, memoryClient.dataItems);
            });
        }

        this.api.get(CONSTS.ENDPOINT_TORQUE, function (req, res) {
            clients.forEach(c => c.SendRaw(req.query));
    
            const data = convertToReadable(req.query, sensors, devices);
            
            if(data.device === undefined || data.device === null) {
                setResponseStatus(res, 403, `Unknown device, Username: ${data.username}`);
    
            } else {
                clients.forEach(c => c.SendData(data));
    
                setResponseStatus(res, 200, CONSTS.TORQUE_STATS_RESPONSE_CONTENT);
            }
        });
    };

    
    convertToReadable(data, sensors, devices) {
        const result = {};

        if(data !== null) {
            sensors.forEach(torqueSensor => {
                const key = torqueSensor.id;
                
                const tmpDataItem = data[key];

                if(tmpDataItem !== undefined) {
                    const isArray = torqueSensor.type === CONSTS.TYPE_ARRAY;
                    const isString = torqueSensor.type === CONSTS.TYPE_STRING;
                    
                    const dataItem = isArray ? tmpDataItem[0] : tmpDataItem;
                    
                    result[torqueSensor.name] = isString ? dataItem : parseFloat(dataItem);
                }
            });

            const username = result.username;
            result[CONSTS.TORQUE_STATS_DEVICE] = devices[username];
        }

        return result;
    };

    setResponseStatus(response, statusCode, content) {
        response.status(statusCode);
        response.send(content);

        if(statusCode >= 400) {
            console.error(content);
        }
    };
};

module.exports.TorqueAPI = TorqueAPI;