const Influxdb = require('influxdb-v2');
const {ClientBase} = require("./client.js");

const INVALID_CHARS = [" ", ","];

class InfluxDBClient extends ClientBase {
    constructor() {
        super();

        this.client = null;
        this.name = "influxdb";
      };

    get IsConnected() {
        return this.isConnected;
    }

    get Enabled() {
        return this.enabled;
    }

    Connect() {
        try {
            if (this.enabled) {
                const url = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
                console.info(`Starting connection to InfluxDB '${url}'`);
        
                this.client = new Influxdb({
                    host: this.config.host,
                    protocol: this.config.protocol,
                    port: this.config.port,
                    token: this.config.token
                });
        
                this.isConnected = true;                
            }
    
        } catch(ex) {
            console.error(`Failed to connect InfluxDB, Error: ${ex}`);
        }   
    };

    SendData(message) {
        if(this.isConnected && this.enabled){
            this.client.write(
                {
                  org: this.config.organization, 
                  bucket: this.config.bucket, 
                },
                [{
                  measurement: this.config.measurement, 
                  tags: this.toTags(message),
                  fields: message
                }]
              );
        }
    };

    toTags(message) {
        const tags = {};
        const tagsKeys = Object.keys(message);
        tagsKeys.forEach(k => {
            const data = message[k];
            
            tags[k] = this.fixTag(data);
        });

        return tags;
    }

    fixTag(data) {
        data = data !== undefined && data !== null ? data.toString() : data;

        INVALID_CHARS.forEach(c => {
            data = data.split(c).join(`\\${c}`);
        });
        
        return data;
    };
};

module.exports.InfluxDBClient = InfluxDBClient;