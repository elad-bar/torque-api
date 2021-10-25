const fs = require('fs');
const mqtt = require('mqtt');
const {ClientBase} = require("./client.js");

const CONFIG_FILE_MQTT = "/config/mqtt.json";

class MQTTClient extends ClientBase {
    constructor() {
        super();

        this.client = null;
        this.config = null
      };

    Initialize() {
        try {
            console.info("Initializing MQTTClient");

            if (fs.existsSync(CONFIG_FILE_MQTT)) {
                this.config = require(CONFIG_FILE_MQTT);

                this.enabled = true;

                const connectUrl = `mqtt://${this.config.host}:${this.config.port}`;
                console.info(`Starting connection to MQTT Broker '${connectUrl}'`);
                
                this.client = mqtt.connect(connectUrl, {
                    clientId: this.config.clientId,
                    clean: true,
                    connectTimeout: 4000,
                    username: this.config.username,
                    password: this.config.password,
                    reconnectPeriod: 1000,
                  });

                
                this.bindMQTTBrokerEvents();

                this.isConnected = true;                
            }
    
        } catch(ex) {
            console.error(`Failed to connect MQTT Broker, Error: ${ex}`);
        }   
    };

    SendData(message) {
        if(this.isConnected && this.enabled){
            const data = JSON.stringify(message);

            this.client.publish(this.config.topic, data, { qos: 0, retain: false }, (error) => {
                if (error) {
                    console.error(`Failed to publish data: ${data} to '${this.config.topic}', Error: ${error}`);
                }
            });
        }
    };

    bindMQTTBrokerEvents() {
        this.client.on('connect', () => {
            console.info(`MQTT Borker connected`);
    
            this.isConnected = true;
        });
    
        this.client.on('reconnect', () => {
            console.info(`MQTT Borker re-connected`);
    
            this.isConnected = true;
        });
    
        this.client.on('close', () => {
            console.warn(`MQTT Borker disconnected`);
            
            this.isConnected = false;
        });
    
        this.client.on('disconnect', (packet) => {
            console.warn(`MQTT Borker disconnected, Packet: ${packet}`);
            
            this.isConnected = false;
        });
    
        this.client.on('offline', () => {
            console.warn(`MQTT Borker is offline`);
            
            this.isConnected = false;
        });
    
        this.client.on('end', () => {
            console.info(`MQTT Borker connection was terminated`);
            
            this.isConnected = false;
        });
    
        this.client.on('error', (error) => {
            console.error(`MQTT Borker connection error, Error: ${error}`);
            
            this.isConnected = false;
        });
    };
};

module.exports.MQTTClient = MQTTClient;