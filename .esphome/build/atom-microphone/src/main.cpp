// Auto generated code by esphome
// ========== AUTO GENERATED INCLUDE BLOCK BEGIN ===========
#include "esphome.h"
using namespace esphome;
using std::isnan;
using std::min;
using std::max;
using namespace microphone;
using namespace speaker;
using namespace light;
using namespace binary_sensor;
static logger::Logger *logger_logger_id;
static web_server_base::WebServerBase *web_server_base_webserverbase_id;
static captive_portal::CaptivePortal *captive_portal_captiveportal_id;
static wifi::WiFiComponent *wifi_wificomponent_id;
static mdns::MDNSComponent *mdns_mdnscomponent_id;
static esphome::ESPHomeOTAComponent *esphome_esphomeotacomponent_id;
static web_server::WebServerOTAComponent *web_server_webserverotacomponent_id;
static preferences::IntervalSyncer *preferences_intervalsyncer_id;
static safe_mode::SafeModeComponent *safe_mode_safemodecomponent_id;
static api::APIServer *api_apiserver_id;
using namespace api;
static i2s_audio::I2SAudioComponent *i2s_in;
static i2s_audio::I2SAudioMicrophone *atom_mic;
static i2s_audio::I2SAudioSpeaker *atom_speaker;
static voice_assistant::VoiceAssistant *voice_assistant_voiceassistant_id;
static microphone::MicrophoneSource *microphone_microphonesource_id;
static esp32_rmt_led_strip::ESP32RMTLEDStripLightOutput *esp32_rmt_led_strip_esp32rmtledstriplightoutput_id;
static light::AddressableLightState *atom_led;
static light::PulseLightEffect *light_pulselighteffect_id;
static gpio::GPIOBinarySensor *gpio_gpiobinarysensor_id;
static esp32::ESP32InternalGPIOPin *esp32_esp32internalgpiopin_id_2;
static binary_sensor::PressTrigger *binary_sensor_presstrigger_id;
static Automation<> *automation_id;
static voice_assistant::StartAction<> *voice_assistant_startaction_id;
static light::LightControlAction<> *light_lightcontrolaction_id;
static binary_sensor::ReleaseTrigger *binary_sensor_releasetrigger_id;
static Automation<> *automation_id_2;
static voice_assistant::StopAction<> *voice_assistant_stopaction_id;
static light::LightControlAction<> *light_lightcontrolaction_id_2;
// ========== AUTO GENERATED INCLUDE BLOCK END ==========="

void setup() {
  // ========== AUTO GENERATED CODE BEGIN ===========
  // network:
  //   enable_ipv6: false
  //   min_ipv6_addr_count: 0
  // esphome:
  //   name: atom-microphone
  //   friendly_name: Atom Microphone
  //   min_version: 2026.2.4
  //   build_path: build\atom-microphone
  //   platformio_options: {}
  //   environment_variables: {}
  //   includes: []
  //   includes_c: []
  //   libraries: []
  //   name_add_mac_suffix: false
  //   debug_scheduler: false
  //   areas: []
  //   devices: []
  App.pre_setup("atom-microphone", "Atom Microphone", false);
  // microphone:
  // speaker:
  // light:
  // binary_sensor:
  // logger:
  //   id: logger_logger_id
  //   baud_rate: 115200
  //   tx_buffer_size: 512
  //   deassert_rts_dtr: false
  //   task_log_buffer_size: 768
  //   hardware_uart: UART0
  //   level: DEBUG
  //   logs: {}
  //   runtime_tag_levels: false
  logger_logger_id = new logger::Logger(115200, 512);
  logger_logger_id->create_pthread_key();
  logger_logger_id->init_log_buffer(768);
  logger_logger_id->set_log_level(ESPHOME_LOG_LEVEL_DEBUG);
  logger_logger_id->set_uart_selection(logger::UART_SELECTION_UART0);
  logger_logger_id->pre_setup();
  logger_logger_id->set_component_source(LOG_STR("logger"));
  App.register_component(logger_logger_id);
  // web_server_base:
  //   id: web_server_base_webserverbase_id
  web_server_base_webserverbase_id = new web_server_base::WebServerBase();
  web_server_base_webserverbase_id->set_component_source(LOG_STR("web_server_base"));
  App.register_component(web_server_base_webserverbase_id);
  web_server_base::global_web_server_base = web_server_base_webserverbase_id;
  // captive_portal:
  //   id: captive_portal_captiveportal_id
  //   web_server_base_id: web_server_base_webserverbase_id
  //   compression: gzip
  captive_portal_captiveportal_id = new captive_portal::CaptivePortal(web_server_base_webserverbase_id);
  captive_portal_captiveportal_id->set_component_source(LOG_STR("captive_portal"));
  App.register_component(captive_portal_captiveportal_id);
  // wifi:
  //   ap:
  //     ssid: Atom-Mic Fallback
  //     password: !secret 'wifi_ap_password'
  //     id: wifi_wifiap_id
  //     ap_timeout: 90s
  //   id: wifi_wificomponent_id
  //   domain: .local
  //   reboot_timeout: 15min
  //   power_save_mode: LIGHT
  //   fast_connect: false
  //   enable_btm: false
  //   enable_rrm: false
  //   passive_scan: false
  //   enable_on_boot: true
  //   post_connect_roaming: true
  //   min_auth_mode: WPA2
  //   networks:
  //     - ssid: !secret 'wifi_ssid'
  //       password: !secret 'wifi_ap_password'
  //       id: wifi_wifiap_id_2
  //       priority: 0
  //   use_address: atom-microphone.local
  wifi_wificomponent_id = new wifi::WiFiComponent();
  wifi_wificomponent_id->set_use_address("atom-microphone.local");
  wifi_wificomponent_id->init_sta(1);
  {
  wifi::WiFiAP wifi_wifiap_id_2 = wifi::WiFiAP();
  wifi_wifiap_id_2.set_ssid("TAC");
  wifi_wifiap_id_2.set_password("section9");
  wifi_wifiap_id_2.set_priority(0);
  wifi_wificomponent_id->add_sta(wifi_wifiap_id_2);
  }
  {
  wifi::WiFiAP wifi_wifiap_id = wifi::WiFiAP();
  wifi_wifiap_id.set_ssid("Atom-Mic Fallback");
  wifi_wifiap_id.set_password("section9");
  wifi_wificomponent_id->set_ap(wifi_wifiap_id);
  }
  wifi_wificomponent_id->set_ap_timeout(90000);
  wifi_wificomponent_id->set_reboot_timeout(900000);
  wifi_wificomponent_id->set_power_save_mode(wifi::WIFI_POWER_SAVE_LIGHT);
  wifi_wificomponent_id->set_min_auth_mode(wifi::WIFI_MIN_AUTH_MODE_WPA2);
  wifi_wificomponent_id->set_component_source(LOG_STR("wifi"));
  App.register_component(wifi_wificomponent_id);
  // mdns:
  //   id: mdns_mdnscomponent_id
  //   disabled: false
  //   services: []
  mdns_mdnscomponent_id = new mdns::MDNSComponent();
  mdns_mdnscomponent_id->set_component_source(LOG_STR("mdns"));
  App.register_component(mdns_mdnscomponent_id);
  // ota:
  // ota.esphome:
  //   platform: esphome
  //   password: !secret 'wifi_ap_password'
  //   id: esphome_esphomeotacomponent_id
  //   version: 2
  //   port: 3232
  esphome_esphomeotacomponent_id = new esphome::ESPHomeOTAComponent();
  esphome_esphomeotacomponent_id->set_port(3232);
  esphome_esphomeotacomponent_id->set_auth_password("section9");
  esphome_esphomeotacomponent_id->set_component_source(LOG_STR("esphome.ota"));
  App.register_component(esphome_esphomeotacomponent_id);
  // ota.web_server:
  //   platform: web_server
  //   id: web_server_webserverotacomponent_id
  web_server_webserverotacomponent_id = new web_server::WebServerOTAComponent();
  // preferences:
  //   id: preferences_intervalsyncer_id
  //   flash_write_interval: 60s
  preferences_intervalsyncer_id = new preferences::IntervalSyncer();
  preferences_intervalsyncer_id->set_write_interval(60000);
  preferences_intervalsyncer_id->set_component_source(LOG_STR("preferences"));
  App.register_component(preferences_intervalsyncer_id);
  // safe_mode:
  //   id: safe_mode_safemodecomponent_id
  //   boot_is_good_after: 1min
  //   disabled: false
  //   num_attempts: 10
  //   reboot_timeout: 5min
  safe_mode_safemodecomponent_id = new safe_mode::SafeModeComponent();
  safe_mode_safemodecomponent_id->set_component_source(LOG_STR("safe_mode"));
  App.register_component(safe_mode_safemodecomponent_id);
  if (safe_mode_safemodecomponent_id->should_enter_safe_mode(10, 300000, 60000)) return;
  web_server_webserverotacomponent_id->set_component_source(LOG_STR("web_server.ota"));
  App.register_component(web_server_webserverotacomponent_id);
  // api:
  //   id: api_apiserver_id
  //   port: 6053
  //   reboot_timeout: 15min
  //   batch_delay: 100ms
  //   custom_services: false
  //   homeassistant_services: false
  //   homeassistant_states: false
  //   listen_backlog: 4
  //   max_connections: 8
  //   max_send_queue: 8
  api_apiserver_id = new api::APIServer();
  api_apiserver_id->set_component_source(LOG_STR("api"));
  App.register_component(api_apiserver_id);
  api_apiserver_id->set_port(6053);
  api_apiserver_id->set_reboot_timeout(900000);
  api_apiserver_id->set_batch_delay(100);
  api_apiserver_id->set_listen_backlog(4);
  api_apiserver_id->set_max_connections(8);
  // esp32:
  //   board: m5stack-atom
  //   framework:
  //     type: esp-idf
  //     version: 5.5.2
  //     sdkconfig_options: {}
  //     log_level: ERROR
  //     advanced:
  //       compiler_optimization: SIZE
  //       enable_idf_experimental_features: false
  //       enable_lwip_assert: true
  //       ignore_efuse_custom_mac: false
  //       ignore_efuse_mac_crc: false
  //       enable_lwip_mdns_queries: true
  //       enable_lwip_bridge_interface: false
  //       enable_lwip_tcpip_core_locking: true
  //       enable_lwip_check_thread_safety: true
  //       disable_libc_locks_in_iram: true
  //       disable_vfs_support_termios: true
  //       disable_vfs_support_select: true
  //       disable_vfs_support_dir: true
  //       freertos_in_iram: false
  //       ringbuf_in_iram: false
  //       heap_in_iram: false
  //       execute_from_psram: false
  //       loop_task_stack_size: 8192
  //       enable_ota_rollback: true
  //       use_full_certificate_bundle: false
  //       include_builtin_idf_components: []
  //       disable_debug_stubs: true
  //       disable_ocd_aware: true
  //       disable_usb_serial_jtag_secondary: true
  //       disable_dev_null_vfs: true
  //       disable_mbedtls_peer_cert: true
  //       disable_mbedtls_pkcs7: true
  //       disable_regi2c_in_iram: true
  //       disable_fatfs: true
  //     components: []
  //     platform_version: https:github.com/pioarduino/platform-espressif32/releases/download/55.03.37/platform-espressif32.zip
  //     source: pioarduino/framework-espidf@https:github.com/pioarduino/esp-idf/releases/download/v5.5.2/esp-idf-v5.5.2.tar.xz
  //   flash_size: 4MB
  //   variant: ESP32
  //   cpu_frequency: 160MHZ
  // i2s_audio:
  //   id: i2s_in
  //   i2s_lrclk_pin: 33
  //   i2s_bclk_pin: 19
  i2s_in = new i2s_audio::I2SAudioComponent();
  i2s_in->set_component_source(LOG_STR("i2s_audio"));
  App.register_component(i2s_in);
  i2s_in->set_lrclk_pin(33);
  i2s_in->set_bclk_pin(19);
  // microphone.i2s_audio:
  //   platform: i2s_audio
  //   id: atom_mic
  //   i2s_din_pin: 22
  //   pdm: false
  //   i2s_audio_id: i2s_in
  //   channel: right
  //   sample_rate: 16000
  //   bits_per_sample: 32.0
  //   i2s_mode: primary
  //   use_apll: false
  //   bits_per_channel: default
  //   mclk_multiple: 256
  //   correct_dc_offset: false
  //   adc_type: external
  //   num_channels: 1
  //   min_bits_per_sample: 32.0
  //   max_bits_per_sample: 32.0
  //   min_channels: 1
  //   max_channels: 1
  //   min_sample_rate: 16000
  //   max_sample_rate: 16000
  atom_mic = new i2s_audio::I2SAudioMicrophone();
  atom_mic->set_component_source(LOG_STR("i2s_audio.microphone"));
  App.register_component(atom_mic);
  atom_mic->set_parent(i2s_in);
  atom_mic->set_i2s_role(::I2S_ROLE_MASTER);
  atom_mic->set_slot_mode(::I2S_SLOT_MODE_MONO);
  atom_mic->set_std_slot_mask(::I2S_STD_SLOT_RIGHT);
  atom_mic->set_slot_bit_width(::I2S_SLOT_BIT_WIDTH_32BIT);
  atom_mic->set_sample_rate(16000);
  atom_mic->set_use_apll(false);
  atom_mic->set_mclk_multiple(::I2S_MCLK_MULTIPLE_256);
  atom_mic->set_din_pin(22);
  atom_mic->set_pdm(false);
  atom_mic->set_correct_dc_offset(false);
  // speaker.i2s_audio:
  //   platform: i2s_audio
  //   id: atom_speaker
  //   i2s_dout_pin: 25
  //   i2s_audio_id: i2s_in
  //   channel: mono
  //   sample_rate: 16000
  //   bits_per_sample: 16.0
  //   i2s_mode: primary
  //   use_apll: false
  //   bits_per_channel: default
  //   mclk_multiple: 256
  //   buffer_duration: 500ms
  //   timeout: 500ms
  //   i2s_comm_fmt: stand_i2s
  //   dac_type: external
  //   num_channels: 1
  //   min_bits_per_sample: 8
  //   max_bits_per_sample: 32
  //   min_channels: 1
  //   max_channels: 2
  //   min_sample_rate: 16000
  //   max_sample_rate: 48000
  atom_speaker = new i2s_audio::I2SAudioSpeaker();
  atom_speaker->set_component_source(LOG_STR("i2s_audio.speaker"));
  App.register_component(atom_speaker);
  atom_speaker->set_parent(i2s_in);
  atom_speaker->set_i2s_role(::I2S_ROLE_MASTER);
  atom_speaker->set_slot_mode(::I2S_SLOT_MODE_MONO);
  atom_speaker->set_std_slot_mask(::I2S_STD_SLOT_BOTH);
  atom_speaker->set_slot_bit_width(::I2S_SLOT_BIT_WIDTH_16BIT);
  atom_speaker->set_sample_rate(16000);
  atom_speaker->set_use_apll(false);
  atom_speaker->set_mclk_multiple(::I2S_MCLK_MULTIPLE_256);
  atom_speaker->set_dout_pin(25);
  atom_speaker->set_i2s_comm_fmt("std");
  atom_speaker->set_timeout(500);
  atom_speaker->set_buffer_duration(500);
  // voice_assistant:
  //   microphone:
  //     microphone: atom_mic
  //     bits_per_sample: 16
  //     id: microphone_microphonesource_id
  //     gain_factor: 1
  //     channels:
  //       - 0
  //   speaker: atom_speaker
  //   use_wake_word: true
  //   noise_suppression_level: 2
  //   auto_gain: 31
  //   volume_multiplier: 2.0
  //   id: voice_assistant_voiceassistant_id
  //   conversation_timeout: 300s
  voice_assistant_voiceassistant_id = new voice_assistant::VoiceAssistant();
  voice_assistant_voiceassistant_id->set_component_source(LOG_STR("voice_assistant"));
  App.register_component(voice_assistant_voiceassistant_id);
  microphone_microphonesource_id = new microphone::MicrophoneSource(atom_mic, 16, 1, false);
  microphone_microphonesource_id->add_channel(0);
  voice_assistant_voiceassistant_id->set_microphone_source(microphone_microphonesource_id);
  voice_assistant_voiceassistant_id->set_speaker(atom_speaker);
  voice_assistant_voiceassistant_id->set_use_wake_word(true);
  voice_assistant_voiceassistant_id->set_noise_suppression_level(2);
  voice_assistant_voiceassistant_id->set_auto_gain(31);
  voice_assistant_voiceassistant_id->set_volume_multiplier(2.0f);
  voice_assistant_voiceassistant_id->set_conversation_timeout(300000);
  voice_assistant_voiceassistant_id->set_has_timers(false);
  // light.esp32_rmt_led_strip:
  //   platform: esp32_rmt_led_strip
  //   rgb_order: GRB
  //   pin:
  //     number: 27
  //     mode:
  //       output: true
  //       input: false
  //       open_drain: false
  //       pullup: false
  //       pulldown: false
  //     id: esp32_esp32internalgpiopin_id
  //     inverted: false
  //     ignore_pin_validation_error: false
  //     ignore_strapping_warning: false
  //     drive_strength: 20.0
  //   num_leds: 1
  //   chipset: SK6812
  //   name: Atom LED
  //   id: atom_led
  //   effects:
  //     - pulse:
  //         name: Listening
  //         transition_length: 500ms
  //         update_interval: 500ms
  //         min_brightness: 0.0
  //         max_brightness: 1.0
  //       type_id: light_pulselighteffect_id
  //   disabled_by_default: false
  //   restore_mode: ALWAYS_OFF
  //   gamma_correct: 2.8
  //   default_transition_length: 1s
  //   flash_transition_length: 0s
  //   output_id: esp32_rmt_led_strip_esp32rmtledstriplightoutput_id
  //   rmt_symbols: 192
  //   is_rgbw: false
  //   is_wrgb: false
  //   use_psram: true
  //   reset_high: 0us
  //   reset_low: 0us
  esp32_rmt_led_strip_esp32rmtledstriplightoutput_id = new esp32_rmt_led_strip::ESP32RMTLEDStripLightOutput();
  atom_led = new light::AddressableLightState(esp32_rmt_led_strip_esp32rmtledstriplightoutput_id);
  App.register_light(atom_led);
  atom_led->set_component_source(LOG_STR("light"));
  App.register_component(atom_led);
  atom_led->set_name("Atom LED", 2073940068);
  atom_led->set_restore_mode(light::LIGHT_ALWAYS_OFF);
  atom_led->set_default_transition_length(1000);
  atom_led->set_flash_transition_length(0);
  atom_led->set_gamma_correct(2.8f);
  light_pulselighteffect_id = new light::PulseLightEffect("Listening");
  light_pulselighteffect_id->set_transition_on_length(500);
  light_pulselighteffect_id->set_transition_off_length(500);
  light_pulselighteffect_id->set_update_interval(500);
  light_pulselighteffect_id->set_min_max_brightness(0.0f, 1.0f);
  atom_led->add_effects({light_pulselighteffect_id});
  esp32_rmt_led_strip_esp32rmtledstriplightoutput_id->set_component_source(LOG_STR("esp32_rmt_led_strip.light"));
  App.register_component(esp32_rmt_led_strip_esp32rmtledstriplightoutput_id);
  esp32_rmt_led_strip_esp32rmtledstriplightoutput_id->set_num_leds(1);
  esp32_rmt_led_strip_esp32rmtledstriplightoutput_id->set_pin(27);
  esp32_rmt_led_strip_esp32rmtledstriplightoutput_id->set_led_params(300, 900, 600, 600, 0, 0);
  esp32_rmt_led_strip_esp32rmtledstriplightoutput_id->set_rgb_order(esp32_rmt_led_strip::ORDER_GRB);
  esp32_rmt_led_strip_esp32rmtledstriplightoutput_id->set_is_rgbw(false);
  esp32_rmt_led_strip_esp32rmtledstriplightoutput_id->set_is_wrgb(false);
  esp32_rmt_led_strip_esp32rmtledstriplightoutput_id->set_use_psram(true);
  esp32_rmt_led_strip_esp32rmtledstriplightoutput_id->set_rmt_symbols(192);
  // binary_sensor.gpio:
  //   platform: gpio
  //   pin:
  //     number: 39
  //     inverted: true
  //     mode:
  //       input: true
  //       output: false
  //       open_drain: false
  //       pullup: false
  //       pulldown: false
  //     id: esp32_esp32internalgpiopin_id_2
  //     ignore_pin_validation_error: false
  //     ignore_strapping_warning: false
  //     drive_strength: 20.0
  //   name: Atom Button
  //   on_press:
  //     - then:
  //         - voice_assistant.start:
  //             id: voice_assistant_voiceassistant_id
  //             silence_detection: true
  //           type_id: voice_assistant_startaction_id
  //         - light.turn_on:
  //             id: atom_led
  //             effect: Listening
  //             state: true
  //           type_id: light_lightcontrolaction_id
  //       automation_id: automation_id
  //       trigger_id: binary_sensor_presstrigger_id
  //   on_release:
  //     - then:
  //         - voice_assistant.stop:
  //             id: voice_assistant_voiceassistant_id
  //           type_id: voice_assistant_stopaction_id
  //         - light.turn_off:
  //             id: atom_led
  //             state: false
  //           type_id: light_lightcontrolaction_id_2
  //       automation_id: automation_id_2
  //       trigger_id: binary_sensor_releasetrigger_id
  //   disabled_by_default: false
  //   id: gpio_gpiobinarysensor_id
  //   use_interrupt: true
  //   interrupt_type: ANY
  gpio_gpiobinarysensor_id = new gpio::GPIOBinarySensor();
  App.register_binary_sensor(gpio_gpiobinarysensor_id);
  gpio_gpiobinarysensor_id->set_name("Atom Button", 2766977057UL);
  gpio_gpiobinarysensor_id->set_trigger_on_initial_state(false);
  gpio_gpiobinarysensor_id->set_component_source(LOG_STR("gpio.binary_sensor"));
  App.register_component(gpio_gpiobinarysensor_id);
  esp32_esp32internalgpiopin_id_2 = new esp32::ESP32InternalGPIOPin();
  esp32_esp32internalgpiopin_id_2->set_pin(::GPIO_NUM_39);
  esp32_esp32internalgpiopin_id_2->set_inverted(true);
  esp32_esp32internalgpiopin_id_2->set_drive_strength(::GPIO_DRIVE_CAP_2);
  esp32_esp32internalgpiopin_id_2->set_flags(gpio::Flags::FLAG_INPUT);
  gpio_gpiobinarysensor_id->set_pin(esp32_esp32internalgpiopin_id_2);
  gpio_gpiobinarysensor_id->set_interrupt_type(gpio::INTERRUPT_ANY_EDGE);
  binary_sensor_presstrigger_id = new binary_sensor::PressTrigger(gpio_gpiobinarysensor_id);
  automation_id = new Automation<>(binary_sensor_presstrigger_id);
  voice_assistant_startaction_id = new voice_assistant::StartAction<>();
  voice_assistant_startaction_id->set_parent(voice_assistant_voiceassistant_id);
  voice_assistant_startaction_id->set_silence_detection(true);
  light_lightcontrolaction_id = new light::LightControlAction<>(atom_led);
  light_lightcontrolaction_id->set_state(true);
  light_lightcontrolaction_id->set_effect("Listening");
  automation_id->add_actions({voice_assistant_startaction_id, light_lightcontrolaction_id});
  binary_sensor_releasetrigger_id = new binary_sensor::ReleaseTrigger(gpio_gpiobinarysensor_id);
  automation_id_2 = new Automation<>(binary_sensor_releasetrigger_id);
  voice_assistant_stopaction_id = new voice_assistant::StopAction<>();
  voice_assistant_stopaction_id->set_parent(voice_assistant_voiceassistant_id);
  light_lightcontrolaction_id_2 = new light::LightControlAction<>(atom_led);
  light_lightcontrolaction_id_2->set_state(false);
  automation_id_2->add_actions({voice_assistant_stopaction_id, light_lightcontrolaction_id_2});
  // md5:
  // sha256:
  //   {}
  // socket:
  //   implementation: bsd_sockets
  // audio:
  //   {}
  // web_server_idf:
  //   {}
  // =========== AUTO GENERATED CODE END ============
  App.setup();
}

void loop() {
  App.loop();
}
