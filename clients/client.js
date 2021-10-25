
class ClientBase {
    constructor() {
        this.isConnected = false;
        this.enabled = false;
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

    Initialize() {

    };

    SendRaw(message) {

    };

    SendData(message) {

    };
}

module.exports.ClientBase = ClientBase;