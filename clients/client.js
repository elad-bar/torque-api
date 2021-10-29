
class ClientBase {
    constructor() {
        this.isConnected = false;
        this.enabled = false;
        this.name = null;
        this.config = null;
      };

    get IsConnected() {
        return this.isConnected;
    }

    get Enabled() {
        return this.enabled;
    }

    Enable(){
        this.enabled = true;
    };

    Disable(){
        this.enabled = false;
    };

    Connect() {

    };

    Initialize(config) {
        if(this.name && config.output) {
            console.info(`Initializing client: ${this.name}`);

            this.config = config.output[this.name];

            if(this.config) {
                this.Enable();

                this.Connect();
            } 
        }
    };

    SendRaw(message) {

    };

    SendData(message) {

    };
}

module.exports.ClientBase = ClientBase;