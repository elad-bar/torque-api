const API_PORT = 8128;

const ENDPOINT_TORQUE = "/api/torque";
const ENDPOINT_TORQUE_SENSORS = "/api/torque/sensors/:apiKey/";
const ENDPOINT_TORQUE_DATA = "/api/torque/data/:apiKey/";
const ENDPOINT_TORQUE_RAW = "/api/torque/raw/:apiKey/";
const ENDPOINT_HOME = "";
const ENDPOINT_DEBUG = "/api/debug/:apiKey/";

const SECURED_ENDPOINTS = [
    ENDPOINT_TORQUE_SENSORS,
    ENDPOINT_TORQUE_DATA,
    ENDPOINT_TORQUE_RAW,
    ENDPOINT_DEBUG
];

const CONFIG_FILE_API = "/config/api.json";
const CONFIG_FILE_DEVICES = "/config/devices.json";
const CONFIG_FILE_SENSORS = "../torque.json";
const CONFIG_FILE_README_MD = "./README.md";
const CONFIG_FILE_README_HTML = "./README.html";

const SLUGIFY_CONFIG = {
    replacement: '_',  // replace spaces with replacement character, defaults to `-`
    remove: /[*+~.()/'"!:@]/g, // remove characters that match regex, defaults to `undefined`
    lower: true,      // convert to lower case, defaults to `false`
    strict: false,     // strip special characters except replacement, defaults to `false`
    locale: 'en',       // language code of the locale to use
    trim: true         // trim leading and trailing replacement chars, defaults to `true`
  };

const README_PLACEHOLDER = "[README]";
const README_FILE_ENCODING = "utf-8";

const TORQUE_STATS_RESPONSE_CONTENT = "OK!";
const TORQUE_STATS_DEVICE = "device";

const TYPE_STRING = "string";
const TYPE_ARRAY = "array";

module.exports = {
    API_PORT,
    ENDPOINT_TORQUE,
    ENDPOINT_TORQUE_SENSORS,
    ENDPOINT_TORQUE_DATA,
    ENDPOINT_TORQUE_RAW,
    ENDPOINT_HOME,
    ENDPOINT_DEBUG,
    CONFIG_FILE_API,
    CONFIG_FILE_DEVICES,
    CONFIG_FILE_SENSORS,
    CONFIG_FILE_README_MD,
    CONFIG_FILE_README_HTML,
    SECURED_ENDPOINTS,
    SLUGIFY_CONFIG,
    README_PLACEHOLDER,
    README_FILE_ENCODING,
    TORQUE_STATS_RESPONSE_CONTENT,
    TORQUE_STATS_DEVICE,
    TYPE_ARRAY,
    TYPE_STRING
};