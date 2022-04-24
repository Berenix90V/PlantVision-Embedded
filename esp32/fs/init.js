load('api_config.js');
load('api_gpio.js');
load('api_adc.js');
load('api_timer.js');
load('api_dht.js');
load('api_http.js');

let ip = Cfg.get("plants.backend");
let user = Cfg.get("plants.user");
let hub = Cfg.get("plants.hub");

//light pin configuration
let light_pin = 34;
// enable the pin to ADC: return 1 if success 0 otherwise
ADC.enable(light_pin);

// soil humidity pins
let soil_humidity_pins = [35,36,39];
ADC.enable(soil_humidity_pins[0]);
ADC.enable(soil_humidity_pins[1]);
ADC.enable(soil_humidity_pins[2]);

// get number of plants per hub
let plant_number = soil_humidity_pins.length;

// temperature and humidity pin configuration
let temperature_humidity_pin = 13;
let dht = DHT.create(temperature_humidity_pin, DHT.DHT11);

let state = {
  light: 0.0,
  temperature: 0.0,
  humidity: 0.0,
  moistures: [],
  plants: [],
}; // Device state


// Set input pins
GPIO.set_mode(light_pin, GPIO.MODE_INPUT);
GPIO.set_mode(temperature_humidity_pin, GPIO.MODE_INPUT);

// Ask for existing plants
Timer.set(5 * 1000, Timer.REPEAT, function() {
  HTTP.query({
    url: ip + "/hub/" + user + "/" + hub,
    headers: { 
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Host': '192.168.1.126:5000',
      'Content-Type': 'application/json'
   },
  success: function(body, full_http_msg) { 
    let res = JSON.parse(body);
    for (let index = 0; index < res.length; index++) {
      let element = res[index];
      state.plants[index] = {plant: element, pin: soil_humidity_pins[index]};
    }
  },
  error: function(err) { print(err); },  // Optional
  });
}, null);

// Fetch sensor data and send it to the backend
Timer.set(15 * 1000, Timer.REPEAT, function () {
  state.light = ADC.read(light_pin) * 100 / 4096; // 2667-4095
  state.temperature = dht.getTemp();
  state.humidity = dht.getHumidity();
  for (let index = 0; index < plant_number; index++) {
    state.moistures[index] = ADC.read(soil_humidity_pins[index]) * 100 / 4096;
  }
  print(JSON.stringify(state));
  sendPlantData();
}, null);

let sendPlantData = function() {
  let payload = [];
  for (let index = 0; index < state.moistures.length; index++) {
    let moisture = state.moistures[index];
    if(state.plants[index] !== null || state.plants[index] !== undefined) {
      payload[index] = {
        plantName: state.plants[index].plant.name,
        airTemperature: state.temperature,
        airHumidity: state.humidity,
        lightIntensity: state.light,
        soilMoisture: moisture
      };
    }
  }
  print("payload", JSON.stringify(payload));
  HTTP.query({
    url: ip + "/batch/" + user + "/" + hub,
    headers: { 
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Host': '192.168.1.126:5000',
      'Content-Type': 'application/json'
   },
   data: {
     readings: payload
   },
  success: function(body, full_http_msg) { print(body); },
  error: function(err) { print(err); },  // Optional
  });
};