const express = require('express');
const slugify = require('slugify');
const fs = require('fs');
const md = require('markdown-it')();
const {ConsoleClient} = require("../clients/console.js");
const {MQTTClient} = require("../clients/mqtt.js");
const {InfluxDBClient} = require("../clients/influxdb.js");

const API_PORT = 8128;

const ENDPOINT_TORQUE_DATA = "/api/torque";
const ENDPOINT_TORQUE_SENSORS = "/api/torque/sensors";
const ENDPOINT_HOME = "";
const ENDPOINT_DEBUG = "/api/debug";

const CONFIG_FILE_DEVICES = "/config/devices.json";
const CONFIG_FILE_SENSORS = "../torque.json";
const CONFIG_FILE_README_MD = "./README.md";
const CONFIG_FILE_README_HTML = "./README.html";

class TorqueAPI {
    constructor() {
        this.devices = require(CONFIG_FILE_DEVICES);
        this.sensors = require(CONFIG_FILE_SENSORS);
        this.api = express();

        this.consoleClient = new ConsoleClient();

        this.clients = [
            new InfluxDBClient(),
            new MQTTClient()
        ];

        this.readmeHtml = null;

        this.slugifyConfig = {
            replacement: '_',  // replace spaces with replacement character, defaults to `-`
            remove: /[*+~.()/'"!:@]/g, // remove characters that match regex, defaults to `undefined`
            lower: true,      // convert to lower case, defaults to `false`
            strict: false,     // strip special characters except replacement, defaults to `false`
            locale: 'en',       // language code of the locale to use
            trim: true         // trim leading and trailing replacement chars, defaults to `true`
          };
    };

    Initialize() {
        console.debug("Initializing TorqueAPI");

        if (fs.existsSync(CONFIG_FILE_README_MD) && fs.existsSync(CONFIG_FILE_README_HTML)) {
            const readmeFileContent = fs.readFileSync(CONFIG_FILE_README_MD, 'utf8');
            const readmeContent = md.render(readmeFileContent);
    
            const readmeHTMLContent = fs.readFileSync(CONFIG_FILE_README_HTML, 'utf8');
            this.readmeHtml = readmeHTMLContent.replace("[README]", readmeContent)
        }

        this.sensors.forEach(s => {
            s.name = slugify(s.description, this.slugifyConfig);
        });

        this.consoleClient.Initialize();
        this.clients.forEach(c => c.Initialize());

        console.info(`Starting server on port ${API_PORT}`);
    
        this.bindEndpoints();

        this.api.use(express.json());
        this.api.listen(API_PORT);
    };

    bindEndpoints() {
        const clients = this.clients;
        const devices = this.devices;
        const consoleClient = this.consoleClient;
        const setResponseStatus = this.setResponseStatus;
        const convertToReadable = this.convertToReadable;
        const sensors = this.sensors;
        const readmeHtml = this.readmeHtml;

        this.api.get(ENDPOINT_DEBUG, function (req, res) {
            setResponseStatus(res, 200, { debug: consoleClient.enabled });
        });
        
        this.api.post(ENDPOINT_DEBUG, function (req, res) {
            consoleClient.Enable();
    
            setResponseStatus(res, 200, { debug: consoleClient.enabled });
        });
    
        this.api.delete(ENDPOINT_DEBUG, function (req, res) {
            consoleClient.Disable();
    
            setResponseStatus(res, 200, { debug: consoleClient.enabled });
        });
    
        this.api.get(ENDPOINT_HOME, function (req, res) {
            setResponseStatus(res, 200, readmeHtml);
        });
        
        this.api.get(ENDPOINT_TORQUE_SENSORS, function (req, res) {
            setResponseStatus(res, 200, sensors);
        });
    
        this.api.get(ENDPOINT_TORQUE_DATA, function (req, res) {
            consoleClient.Send(`Incoming request: ${JSON.stringify(req.query)}`);
    
            const data = convertToReadable(req.query, sensors, devices);

            consoleClient.Send(`Parsed request: ${JSON.stringify(data)}`);
            
            if(data.device === undefined || data.device === null) {
                setResponseStatus(res, 403, `Unknown device, Username: ${data.username}`);
    
            } else {
                clients.forEach(c => c.Send(data));
    
                setResponseStatus(res, 200, "OK!");
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
                    const isArray = torqueSensor.type === "array";
                    const isString = torqueSensor.type === "string";
                    
                    const dataItem = isArray ? tmpDataItem[0] : tmpDataItem;
                    
                    result[torqueSensor.name] = isString ? dataItem : parseFloat(dataItem);
                }
            });

            const username = result.username;
            result["device"] = devices[username];
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