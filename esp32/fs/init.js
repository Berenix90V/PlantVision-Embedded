load('api_config.js');
load('api_events.js');
load('api_gcp.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_adc.js');
load('api_timer.js');
load('api_sys.js');

let light_pin = 34;
let led = Cfg.get('board.led1.pin');              // Built-in LED GPIO number
let onhi = Cfg.get('board.led1.active_high');     // LED on when high?
let state = {on: false, uptime: 0, light:0.0};  // Device state

let setLED = function(on) {
  let level = onhi ? on : !on;
  GPIO.write(led, level);
  print('LED on ->', on);
};

GPIO.set_mode(led, GPIO.MODE_OUTPUT);
setLED(state.on);

GPIO.set_mode(light_pin, GPIO.MODE_INPUT);

Timer.set(5*1000, Timer.REPEAT, function(){
  state.uptime = Sys.uptime();
  state.ram_free = Sys.free_ram();
  state.light = ADC.read(light_pin)/4096;
  print(JSON.stringify(state));
}, null);
// Update state every second, and report to cloud if online
/*
Timer.set(1000, Timer.REPEAT, function() {
  state.uptime = Sys.uptime();
  state.ram_free = Sys.free_ram();
  print('online:', online, JSON.stringify(state));
  if (online) reportState();
}, null);
*/

