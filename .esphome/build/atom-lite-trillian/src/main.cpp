// Auto generated code by esphome
// ========== AUTO GENERATED INCLUDE BLOCK BEGIN ===========
#include "esphome.h"
using namespace esphome;
using std::isnan;
using std::min;
using std::max;
using namespace light;
using namespace binary_sensor;
using namespace microphone;
using namespace speaker;
using namespace text_sensor;
using namespace sensor;
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
static api::UserServiceTrigger<api::enums::SUPPORTS_RESPONSE_NONE> *api_userservicetrigger_id;
static Automation<> *automation_id;
static voice_assistant::StartAction<> *voice_assistant_startaction_id;
static esp32_rmt_led_strip::ESP32RMTLEDStripLightOutput *esp32_rmt_led_strip_esp32rmtledstriplightoutput_id;
static light::AddressableLightState *status_led;
static light::PulseLightEffect *light_pulselighteffect_id;
static light::PulseLightEffect *light_pulselighteffect_id_2;
static gpio::GPIOBinarySensor *trillian_button;
static binary_sensor::DelayedOnFilter *binary_sensor_delayedonfilter_id;
static binary_sensor::DelayedOffFilter *binary_sensor_delayedofffilter_id;
static esp32::ESP32InternalGPIOPin *esp32_esp32internalgpiopin_id_2;
static binary_sensor::PressTrigger *binary_sensor_presstrigger_id;
static Automation<> *automation_id_3;
static voice_assistant::StartAction<> *voice_assistant_startaction_id_2;
static status::StatusBinarySensor *status_statusbinarysensor_id;
static voice_assistant::VoiceAssistant *va;
static i2s_audio::I2SAudioMicrophone *atom_microphone;
static i2s_audio::I2SAudioSpeaker *atom_speaker;
static i2s_audio::I2SAudioComponent *i2s_out;
static interval::IntervalTrigger *interval_intervaltrigger_id;
static Automation<> *automation_id_10;
static wifi::WiFiConnectedCondition<> *wifi_wificonnectedcondition_id;
static NotCondition<> *notcondition_id;
static IfAction<> *ifaction_id;
static light::LightControlAction<> *light_lightcontrolaction_id_9;
static DelayAction<> *delayaction_id_3;
static light::LightControlAction<> *light_lightcontrolaction_id_10;
static template_::TemplateTextSensor *template__templatetextsensor_id;
static uptime::UptimeSecondsSensor *uptime_uptimesecondssensor_id;
static wifi_signal::WiFiSignalSensor *wifi_signal_wifisignalsensor_id;
static light::LightControlAction<> *light_lightcontrolaction_id;
static binary_sensor::ReleaseTrigger *binary_sensor_releasetrigger_id;
static Automation<> *automation_id_4;
static voice_assistant::StopAction<> *voice_assistant_stopaction_id_2;
static light::LightControlAction<> *light_lightcontrolaction_id_2;
static api::UserServiceTrigger<api::enums::SUPPORTS_RESPONSE_NONE> *api_userservicetrigger_id_2;
static Automation<> *automation_id_2;
static voice_assistant::StopAction<> *voice_assistant_stopaction_id;
using namespace api;
static microphone::MicrophoneSource *microphone_microphonesource_id;
static Automation<> *automation_id_5;
static light::LightControlAction<> *light_lightcontrolaction_id_3;
static Automation<std::string> *automation_id_7;
static light::LightControlAction<std::string> *light_lightcontrolaction_id_5;
static Automation<> *automation_id_8;
static DelayAction<> *delayaction_id;
static light::LightControlAction<> *light_lightcontrolaction_id_6;
static Automation<std::string, std::string> *automation_id_9;
static light::LightControlAction<std::string, std::string> *light_lightcontrolaction_id_7;
static DelayAction<std::string, std::string> *delayaction_id_2;
static light::LightControlAction<std::string, std::string> *light_lightcontrolaction_id_8;
static Automation<> *automation_id_6;
static light::LightControlAction<> *light_lightcontrolaction_id_4;
// ========== AUTO GENERATED INCLUDE BLOCK END ==========="

void setup() {
  // ========== AUTO GENERATED CODE BEGIN ===========
  // network:
  //   enable_ipv6: false
  //   min_ipv6_addr_count: 0
  // esphome:
  //   name: atom-lite-trillian
  //   friendly_name: Atom Lite Trillian
  //   platformio_options:
  //     board_build.flash_mode: dio
  //   min_version: 2026.2.4
  //   build_path: build\atom-lite-trillian
  //   environment_variables: {}
  //   includes: []
  //   includes_c: []
  //   libraries: []
  //   name_add_mac_suffix: false
  //   debug_scheduler: false
  //   areas: []
  //   devices: []
  App.pre_setup("atom-lite-trillian", "Atom Lite Trillian", false);
  // light:
  // binary_sensor:
  // microphone:
  // speaker:
  // text_sensor:
  // sensor:
  // logger:
  //   level: DEBUG
  //   id: logger_logger_id
  //   baud_rate: 115200
  //   tx_buffer_size: 512
  //   deassert_rts_dtr: false
  //   task_log_buffer_size: 768
  //   hardware_uart: UART0
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
  //     ssid: Atom-Lite-Trillian
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
  //       password: !secret 'wifi_password'
  //       id: wifi_wifiap_id_2
  //       priority: 0
  //   use_address: atom-lite-trillian.local
  wifi_wificomponent_id = new wifi::WiFiComponent();
  wifi_wificomponent_id->set_use_address("atom-lite-trillian.local");
  wifi_wificomponent_id->init_sta(1);
  {
  wifi::WiFiAP wifi_wifiap_id_2 = wifi::WiFiAP();
  wifi_wifiap_id_2.set_ssid("YourWiFiSSID");
  wifi_wifiap_id_2.set_password("YourWiFiPassword");
  wifi_wifiap_id_2.set_priority(0);
  wifi_wificomponent_id->add_sta(wifi_wifiap_id_2);
  }
  {
  wifi::WiFiAP wifi_wifiap_id = wifi::WiFiAP();
  wifi_wifiap_id.set_ssid("Atom-Lite-Trillian");
  wifi_wifiap_id.set_password("fallback123");
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
  //   password: !secret 'ota_password'
  //   id: esphome_esphomeotacomponent_id
  //   version: 2
  //   port: 3232
  esphome_esphomeotacomponent_id = new esphome::ESPHomeOTAComponent();
  esphome_esphomeotacomponent_id->set_port(3232);
  esphome_esphomeotacomponent_id->set_auth_password("ota_password_123");
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
  //   encryption:
  //     key: !secret 'api_encryption_key'
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
  //   actions:
  //     - then:
  //         - voice_assistant.start:
  //             id: va
  //             silence_detection: true
  //           type_id: voice_assistant_startaction_id
  //       automation_id: automation_id
  //       trigger_id: api_userservicetrigger_id
  //       variables: {}
  //       action: start_voice_assistant
  //       supports_response: none
  //     - then:
  //         - voice_assistant.stop:
  //             id: va
  //           type_id: voice_assistant_stopaction_id
  //       automation_id: automation_id_2
  //       trigger_id: api_userservicetrigger_id_2
  //       variables: {}
  //       action: stop_voice_assistant
  //       supports_response: none
  api_apiserver_id = new api::APIServer();
  api_apiserver_id->set_component_source(LOG_STR("api"));
  App.register_component(api_apiserver_id);
  api_apiserver_id->set_port(6053);
  api_apiserver_id->set_reboot_timeout(900000);
  api_apiserver_id->set_batch_delay(100);
  api_apiserver_id->set_listen_backlog(4);
  api_apiserver_id->set_max_connections(8);
  api_userservicetrigger_id = new api::UserServiceTrigger<api::enums::SUPPORTS_RESPONSE_NONE>("start_voice_assistant", {});
  automation_id = new Automation<>(api_userservicetrigger_id);
  voice_assistant_startaction_id = new voice_assistant::StartAction<>();
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
  //   id: status_led
  //   name: Status LED
  //   default_transition_length: 0s
  //   effects:
  //     - pulse:
  //         name: Pulse Blue
  //         transition_length: 500ms
  //         update_interval: 500ms
  //         min_brightness: 0.5
  //         max_brightness: 1.0
  //       type_id: light_pulselighteffect_id
  //     - pulse:
  //         name: Flash Yellow
  //         transition_length: 200ms
  //         update_interval: 200ms
  //         min_brightness: 0.0
  //         max_brightness: 1.0
  //       type_id: light_pulselighteffect_id_2
  //   disabled_by_default: false
  //   restore_mode: ALWAYS_OFF
  //   gamma_correct: 2.8
  //   flash_transition_length: 0s
  //   output_id: esp32_rmt_led_strip_esp32rmtledstriplightoutput_id
  //   rmt_symbols: 192
  //   is_rgbw: false
  //   is_wrgb: false
  //   use_psram: true
  //   reset_high: 0us
  //   reset_low: 0us
  esp32_rmt_led_strip_esp32rmtledstriplightoutput_id = new esp32_rmt_led_strip::ESP32RMTLEDStripLightOutput();
  status_led = new light::AddressableLightState(esp32_rmt_led_strip_esp32rmtledstriplightoutput_id);
  App.register_light(status_led);
  status_led->set_component_source(LOG_STR("light"));
  App.register_component(status_led);
  status_led->set_name("Status LED", 610457177);
  status_led->set_restore_mode(light::LIGHT_ALWAYS_OFF);
  status_led->set_default_transition_length(0);
  status_led->set_flash_transition_length(0);
  status_led->set_gamma_correct(2.8f);
  light_pulselighteffect_id = new light::PulseLightEffect("Pulse Blue");
  light_pulselighteffect_id->set_transition_on_length(500);
  light_pulselighteffect_id->set_transition_off_length(500);
  light_pulselighteffect_id->set_update_interval(500);
  light_pulselighteffect_id->set_min_max_brightness(0.5f, 1.0f);
  light_pulselighteffect_id_2 = new light::PulseLightEffect("Flash Yellow");
  light_pulselighteffect_id_2->set_transition_on_length(200);
  light_pulselighteffect_id_2->set_transition_off_length(200);
  light_pulselighteffect_id_2->set_update_interval(200);
  light_pulselighteffect_id_2->set_min_max_brightness(0.0f, 1.0f);
  status_led->add_effects({light_pulselighteffect_id, light_pulselighteffect_id_2});
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
  //     mode:
  //       input: true
  //       output: false
  //       open_drain: false
  //       pullup: false
  //       pulldown: false
  //     inverted: true
  //     id: esp32_esp32internalgpiopin_id_2
  //     ignore_pin_validation_error: false
  //     ignore_strapping_warning: false
  //     drive_strength: 20.0
  //   name: Trillian Button
  //   id: trillian_button
  //   filters:
  //     - delayed_on: 50ms
  //       type_id: binary_sensor_delayedonfilter_id
  //     - delayed_off: 50ms
  //       type_id: binary_sensor_delayedofffilter_id
  //   on_press:
  //     - then:
  //         - voice_assistant.start:
  //             id: va
  //             silence_detection: true
  //           type_id: voice_assistant_startaction_id_2
  //         - light.turn_on:
  //             id: status_led
  //             red: 0.0
  //             green: 0.0
  //             blue: 1.0
  //             brightness: 1.0
  //             state: true
  //           type_id: light_lightcontrolaction_id
  //       automation_id: automation_id_3
  //       trigger_id: binary_sensor_presstrigger_id
  //   on_release:
  //     - then:
  //         - voice_assistant.stop:
  //             id: va
  //           type_id: voice_assistant_stopaction_id_2
  //         - light.turn_off:
  //             id: status_led
  //             state: false
  //           type_id: light_lightcontrolaction_id_2
  //       automation_id: automation_id_4
  //       trigger_id: binary_sensor_releasetrigger_id
  //   disabled_by_default: false
  //   use_interrupt: true
  //   interrupt_type: ANY
  trillian_button = new gpio::GPIOBinarySensor();
  App.register_binary_sensor(trillian_button);
  trillian_button->set_name("Trillian Button", 3869353371UL);
  trillian_button->set_trigger_on_initial_state(false);
  binary_sensor_delayedonfilter_id = new binary_sensor::DelayedOnFilter();
  binary_sensor_delayedonfilter_id->set_component_source(LOG_STR("binary_sensor"));
  App.register_component(binary_sensor_delayedonfilter_id);
  binary_sensor_delayedonfilter_id->set_delay(50);
  binary_sensor_delayedofffilter_id = new binary_sensor::DelayedOffFilter();
  binary_sensor_delayedofffilter_id->set_component_source(LOG_STR("binary_sensor"));
  App.register_component(binary_sensor_delayedofffilter_id);
  binary_sensor_delayedofffilter_id->set_delay(50);
  trillian_button->add_filters({binary_sensor_delayedonfilter_id, binary_sensor_delayedofffilter_id});
  trillian_button->set_component_source(LOG_STR("gpio.binary_sensor"));
  App.register_component(trillian_button);
  esp32_esp32internalgpiopin_id_2 = new esp32::ESP32InternalGPIOPin();
  esp32_esp32internalgpiopin_id_2->set_pin(::GPIO_NUM_39);
  esp32_esp32internalgpiopin_id_2->set_inverted(true);
  esp32_esp32internalgpiopin_id_2->set_drive_strength(::GPIO_DRIVE_CAP_2);
  esp32_esp32internalgpiopin_id_2->set_flags(gpio::Flags::FLAG_INPUT);
  trillian_button->set_pin(esp32_esp32internalgpiopin_id_2);
  trillian_button->set_interrupt_type(gpio::INTERRUPT_ANY_EDGE);
  binary_sensor_presstrigger_id = new binary_sensor::PressTrigger(trillian_button);
  automation_id_3 = new Automation<>(binary_sensor_presstrigger_id);
  voice_assistant_startaction_id_2 = new voice_assistant::StartAction<>();
  // binary_sensor.status:
  //   platform: status
  //   name: Status
  //   disabled_by_default: false
  //   id: status_statusbinarysensor_id
  //   entity_category: diagnostic
  //   device_class: connectivity
  //   update_interval: 1s
  status_statusbinarysensor_id = new status::StatusBinarySensor();
  App.register_binary_sensor(status_statusbinarysensor_id);
  status_statusbinarysensor_id->set_name("Status", 939730931);
  status_statusbinarysensor_id->set_entity_category(::ENTITY_CATEGORY_DIAGNOSTIC);
  status_statusbinarysensor_id->set_device_class("connectivity");
  status_statusbinarysensor_id->set_trigger_on_initial_state(false);
  status_statusbinarysensor_id->set_update_interval(1000);
  status_statusbinarysensor_id->set_component_source(LOG_STR("status.binary_sensor"));
  App.register_component(status_statusbinarysensor_id);
  // voice_assistant:
  //   id: va
  //   microphone:
  //     microphone: atom_microphone
  //     gain_factor: 1
  //     bits_per_sample: 16
  //     id: microphone_microphonesource_id
  //     channels:
  //       - 0
  //   speaker: atom_speaker
  //   use_wake_word: true
  //   noise_suppression_level: 2
  //   auto_gain: 31
  //   volume_multiplier: 2.0
  //   on_listening:
  //     then:
  //       - light.turn_on:
  //           id: status_led
  //           red: 0.0
  //           green: 0.0
  //           blue: 1.0
  //           brightness: 1.0
  //           effect: Pulse Blue
  //           state: true
  //         type_id: light_lightcontrolaction_id_3
  //     trigger_id: trigger_id
  //     automation_id: automation_id_5
  //   on_stt_vad_end:
  //     then:
  //       - light.turn_on:
  //           id: status_led
  //           red: 1.0
  //           green: 1.0
  //           blue: 1.0
  //           brightness: 1.0
  //           state: true
  //         type_id: light_lightcontrolaction_id_4
  //     trigger_id: trigger_id_2
  //     automation_id: automation_id_6
  //   on_tts_start:
  //     then:
  //       - light.turn_on:
  //           id: status_led
  //           red: 1.0
  //           green: 1.0
  //           blue: 1.0
  //           brightness: 1.0
  //           state: true
  //         type_id: light_lightcontrolaction_id_5
  //     trigger_id: trigger_id_3
  //     automation_id: automation_id_7
  //   on_end:
  //     then:
  //       - delay: 2s
  //         type_id: delayaction_id
  //       - light.turn_off:
  //           id: status_led
  //           state: false
  //         type_id: light_lightcontrolaction_id_6
  //     trigger_id: trigger_id_4
  //     automation_id: automation_id_8
  //   on_error:
  //     then:
  //       - light.turn_on:
  //           id: status_led
  //           red: 1.0
  //           green: 0.0
  //           blue: 0.0
  //           brightness: 1.0
  //           state: true
  //         type_id: light_lightcontrolaction_id_7
  //       - delay: 2s
  //         type_id: delayaction_id_2
  //       - light.turn_off:
  //           id: status_led
  //           state: false
  //         type_id: light_lightcontrolaction_id_8
  //     trigger_id: trigger_id_5
  //     automation_id: automation_id_9
  //   conversation_timeout: 300s
  va = new voice_assistant::VoiceAssistant();
  va->set_component_source(LOG_STR("voice_assistant"));
  App.register_component(va);
  // microphone.i2s_audio:
  //   platform: i2s_audio
  //   id: atom_microphone
  //   i2s_din_pin: 22
  //   pdm: true
  //   channel: left
  //   i2s_audio_id: i2s_out
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
  atom_microphone = new i2s_audio::I2SAudioMicrophone();
  atom_microphone->set_component_source(LOG_STR("i2s_audio.microphone"));
  App.register_component(atom_microphone);
  // speaker.i2s_audio:
  //   platform: i2s_audio
  //   id: atom_speaker
  //   i2s_dout_pin: 21
  //   i2s_audio_id: i2s_out
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
  // i2s_audio:
  //   id: i2s_out
  //   i2s_lrclk_pin: 25
  //   i2s_bclk_pin: 19
  i2s_out = new i2s_audio::I2SAudioComponent();
  i2s_out->set_component_source(LOG_STR("i2s_audio"));
  App.register_component(i2s_out);
  i2s_out->set_lrclk_pin(25);
  i2s_out->set_bclk_pin(19);
  // interval:
  //   - interval: 5s
  //     then:
  //       - if:
  //           condition:
  //             not:
  //               wifi.connected: {}
  //               type_id: wifi_wificonnectedcondition_id
  //             type_id: notcondition_id
  //           then:
  //             - light.turn_on:
  //                 id: status_led
  //                 red: 1.0
  //                 green: 1.0
  //                 blue: 0.0
  //                 brightness: 1.0
  //                 effect: Flash Yellow
  //                 state: true
  //               type_id: light_lightcontrolaction_id_9
  //             - delay: 1s
  //               type_id: delayaction_id_3
  //             - light.turn_off:
  //                 id: status_led
  //                 state: false
  //               type_id: light_lightcontrolaction_id_10
  //         type_id: ifaction_id
  //     trigger_id: trigger_id_6
  //     automation_id: automation_id_10
  //     id: interval_intervaltrigger_id
  //     startup_delay: 0s
  interval_intervaltrigger_id = new interval::IntervalTrigger();
  interval_intervaltrigger_id->set_component_source(LOG_STR("interval"));
  App.register_component(interval_intervaltrigger_id);
  automation_id_10 = new Automation<>(interval_intervaltrigger_id);
  wifi_wificonnectedcondition_id = new wifi::WiFiConnectedCondition<>();
  notcondition_id = new NotCondition<>(wifi_wificonnectedcondition_id);
  ifaction_id = new IfAction<>(notcondition_id);
  light_lightcontrolaction_id_9 = new light::LightControlAction<>(status_led);
  light_lightcontrolaction_id_9->set_state(true);
  light_lightcontrolaction_id_9->set_brightness(1.0f);
  light_lightcontrolaction_id_9->set_red(1.0f);
  light_lightcontrolaction_id_9->set_green(1.0f);
  light_lightcontrolaction_id_9->set_blue(0.0f);
  light_lightcontrolaction_id_9->set_effect("Flash Yellow");
  delayaction_id_3 = new DelayAction<>();
  delayaction_id_3->set_component_source(LOG_STR("interval"));
  App.register_component(delayaction_id_3);
  delayaction_id_3->set_delay(1000);
  light_lightcontrolaction_id_10 = new light::LightControlAction<>(status_led);
  light_lightcontrolaction_id_10->set_state(false);
  ifaction_id->add_then({light_lightcontrolaction_id_9, delayaction_id_3, light_lightcontrolaction_id_10});
  automation_id_10->add_actions({ifaction_id});
  interval_intervaltrigger_id->set_update_interval(5000);
  interval_intervaltrigger_id->set_startup_delay(0);
  // text_sensor.template:
  //   platform: template
  //   name: Voice Assistant State
  //   lambda: !lambda |-
  //     if (id(va).is_running()) {
  //       return std::string("Listening");
  //     } else {
  //       return std::string("Idle");
  //     }
  //   update_interval: 1s
  //   disabled_by_default: false
  //   id: template__templatetextsensor_id
  template__templatetextsensor_id = new template_::TemplateTextSensor();
  App.register_text_sensor(template__templatetextsensor_id);
  template__templatetextsensor_id->set_name("Voice Assistant State", 1518650454);
  template__templatetextsensor_id->set_update_interval(1000);
  template__templatetextsensor_id->set_component_source(LOG_STR("template.text_sensor"));
  App.register_component(template__templatetextsensor_id);
  template__templatetextsensor_id->set_template([]() -> esphome::optional<std::string> {
      #line 193 "atom-lite-trillian.yaml"
      if (va->is_running()) {
        return std::string("Listening");
      } else {
        return std::string("Idle");
      }
  });
  // sensor.uptime:
  //   platform: uptime
  //   name: Uptime
  //   disabled_by_default: false
  //   force_update: false
  //   id: uptime_uptimesecondssensor_id
  //   unit_of_measurement: s
  //   icon: mdi:timer-outline
  //   accuracy_decimals: 0
  //   device_class: duration
  //   state_class: total_increasing
  //   entity_category: diagnostic
  //   update_interval: 60s
  //   type: seconds
  uptime_uptimesecondssensor_id = new uptime::UptimeSecondsSensor();
  App.register_sensor(uptime_uptimesecondssensor_id);
  uptime_uptimesecondssensor_id->set_name("Uptime", 1324261225);
  uptime_uptimesecondssensor_id->set_icon("mdi:timer-outline");
  uptime_uptimesecondssensor_id->set_entity_category(::ENTITY_CATEGORY_DIAGNOSTIC);
  uptime_uptimesecondssensor_id->set_device_class("duration");
  uptime_uptimesecondssensor_id->set_state_class(sensor::STATE_CLASS_TOTAL_INCREASING);
  uptime_uptimesecondssensor_id->set_unit_of_measurement("s");
  uptime_uptimesecondssensor_id->set_accuracy_decimals(0);
  uptime_uptimesecondssensor_id->set_update_interval(60000);
  uptime_uptimesecondssensor_id->set_component_source(LOG_STR("uptime.sensor"));
  App.register_component(uptime_uptimesecondssensor_id);
  // sensor.wifi_signal:
  //   platform: wifi_signal
  //   name: WiFi Signal
  //   update_interval: 60s
  //   disabled_by_default: false
  //   force_update: false
  //   id: wifi_signal_wifisignalsensor_id
  //   unit_of_measurement: dBm
  //   accuracy_decimals: 0
  //   device_class: signal_strength
  //   state_class: measurement
  //   entity_category: diagnostic
  wifi_signal_wifisignalsensor_id = new wifi_signal::WiFiSignalSensor();
  App.register_sensor(wifi_signal_wifisignalsensor_id);
  wifi_signal_wifisignalsensor_id->set_name("WiFi Signal", 799351157);
  wifi_signal_wifisignalsensor_id->set_entity_category(::ENTITY_CATEGORY_DIAGNOSTIC);
  wifi_signal_wifisignalsensor_id->set_device_class("signal_strength");
  wifi_signal_wifisignalsensor_id->set_state_class(sensor::STATE_CLASS_MEASUREMENT);
  wifi_signal_wifisignalsensor_id->set_unit_of_measurement("dBm");
  wifi_signal_wifisignalsensor_id->set_accuracy_decimals(0);
  wifi_signal_wifisignalsensor_id->set_update_interval(60000);
  wifi_signal_wifisignalsensor_id->set_component_source(LOG_STR("wifi_signal.sensor"));
  App.register_component(wifi_signal_wifisignalsensor_id);
  // md5:
  // sha256:
  //   {}
  // socket:
  //   implementation: bsd_sockets
  // audio:
  //   {}
  // web_server_idf:
  //   {}
  voice_assistant_startaction_id_2->set_parent(va);
  voice_assistant_startaction_id_2->set_silence_detection(true);
  light_lightcontrolaction_id = new light::LightControlAction<>(status_led);
  light_lightcontrolaction_id->set_state(true);
  light_lightcontrolaction_id->set_brightness(1.0f);
  light_lightcontrolaction_id->set_red(0.0f);
  light_lightcontrolaction_id->set_green(0.0f);
  light_lightcontrolaction_id->set_blue(1.0f);
  automation_id_3->add_actions({voice_assistant_startaction_id_2, light_lightcontrolaction_id});
  binary_sensor_releasetrigger_id = new binary_sensor::ReleaseTrigger(trillian_button);
  automation_id_4 = new Automation<>(binary_sensor_releasetrigger_id);
  voice_assistant_stopaction_id_2 = new voice_assistant::StopAction<>();
  voice_assistant_stopaction_id_2->set_parent(va);
  light_lightcontrolaction_id_2 = new light::LightControlAction<>(status_led);
  light_lightcontrolaction_id_2->set_state(false);
  automation_id_4->add_actions({voice_assistant_stopaction_id_2, light_lightcontrolaction_id_2});
  voice_assistant_startaction_id->set_parent(va);
  voice_assistant_startaction_id->set_silence_detection(true);
  automation_id->add_actions({voice_assistant_startaction_id});
  api_userservicetrigger_id_2 = new api::UserServiceTrigger<api::enums::SUPPORTS_RESPONSE_NONE>("stop_voice_assistant", {});
  automation_id_2 = new Automation<>(api_userservicetrigger_id_2);
  voice_assistant_stopaction_id = new voice_assistant::StopAction<>();
  voice_assistant_stopaction_id->set_parent(va);
  automation_id_2->add_actions({voice_assistant_stopaction_id});
  api_apiserver_id->initialize_user_services({api_userservicetrigger_id, api_userservicetrigger_id_2});
  api_apiserver_id->set_noise_psk({27, 83, 196, 192, 86, 105, 66, 116, 109, 200, 78, 136, 100, 143, 94, 216, 53, 193, 129, 215, 16, 251, 160, 88, 212, 173, 161, 223, 62, 67, 177, 247});
  microphone_microphonesource_id = new microphone::MicrophoneSource(atom_microphone, 16, 1, false);
  microphone_microphonesource_id->add_channel(0);
  va->set_microphone_source(microphone_microphonesource_id);
  va->set_speaker(atom_speaker);
  va->set_use_wake_word(true);
  va->set_noise_suppression_level(2);
  va->set_auto_gain(31);
  va->set_volume_multiplier(2.0f);
  va->set_conversation_timeout(300000);
  automation_id_5 = new Automation<>(va->get_listening_trigger());
  light_lightcontrolaction_id_3 = new light::LightControlAction<>(status_led);
  light_lightcontrolaction_id_3->set_state(true);
  light_lightcontrolaction_id_3->set_brightness(1.0f);
  light_lightcontrolaction_id_3->set_red(0.0f);
  light_lightcontrolaction_id_3->set_green(0.0f);
  light_lightcontrolaction_id_3->set_blue(1.0f);
  light_lightcontrolaction_id_3->set_effect("Pulse Blue");
  automation_id_5->add_actions({light_lightcontrolaction_id_3});
  automation_id_7 = new Automation<std::string>(va->get_tts_start_trigger());
  light_lightcontrolaction_id_5 = new light::LightControlAction<std::string>(status_led);
  light_lightcontrolaction_id_5->set_state(true);
  light_lightcontrolaction_id_5->set_brightness(1.0f);
  light_lightcontrolaction_id_5->set_red(1.0f);
  light_lightcontrolaction_id_5->set_green(1.0f);
  light_lightcontrolaction_id_5->set_blue(1.0f);
  automation_id_7->add_actions({light_lightcontrolaction_id_5});
  automation_id_8 = new Automation<>(va->get_end_trigger());
  delayaction_id = new DelayAction<>();
  delayaction_id->set_component_source(LOG_STR("voice_assistant"));
  App.register_component(delayaction_id);
  delayaction_id->set_delay(2000);
  light_lightcontrolaction_id_6 = new light::LightControlAction<>(status_led);
  light_lightcontrolaction_id_6->set_state(false);
  automation_id_8->add_actions({delayaction_id, light_lightcontrolaction_id_6});
  automation_id_9 = new Automation<std::string, std::string>(va->get_error_trigger());
  light_lightcontrolaction_id_7 = new light::LightControlAction<std::string, std::string>(status_led);
  light_lightcontrolaction_id_7->set_state(true);
  light_lightcontrolaction_id_7->set_brightness(1.0f);
  light_lightcontrolaction_id_7->set_red(1.0f);
  light_lightcontrolaction_id_7->set_green(0.0f);
  light_lightcontrolaction_id_7->set_blue(0.0f);
  delayaction_id_2 = new DelayAction<std::string, std::string>();
  delayaction_id_2->set_component_source(LOG_STR("voice_assistant"));
  App.register_component(delayaction_id_2);
  delayaction_id_2->set_delay(2000);
  light_lightcontrolaction_id_8 = new light::LightControlAction<std::string, std::string>(status_led);
  light_lightcontrolaction_id_8->set_state(false);
  automation_id_9->add_actions({light_lightcontrolaction_id_7, delayaction_id_2, light_lightcontrolaction_id_8});
  automation_id_6 = new Automation<>(va->get_stt_vad_end_trigger());
  light_lightcontrolaction_id_4 = new light::LightControlAction<>(status_led);
  light_lightcontrolaction_id_4->set_state(true);
  light_lightcontrolaction_id_4->set_brightness(1.0f);
  light_lightcontrolaction_id_4->set_red(1.0f);
  light_lightcontrolaction_id_4->set_green(1.0f);
  light_lightcontrolaction_id_4->set_blue(1.0f);
  automation_id_6->add_actions({light_lightcontrolaction_id_4});
  va->set_has_timers(false);
  atom_microphone->set_parent(i2s_out);
  atom_microphone->set_i2s_role(::I2S_ROLE_MASTER);
  atom_microphone->set_slot_mode(::I2S_SLOT_MODE_MONO);
  atom_microphone->set_std_slot_mask(::I2S_STD_SLOT_LEFT);
  atom_microphone->set_slot_bit_width(::I2S_SLOT_BIT_WIDTH_32BIT);
  atom_microphone->set_sample_rate(16000);
  atom_microphone->set_use_apll(false);
  atom_microphone->set_mclk_multiple(::I2S_MCLK_MULTIPLE_256);
  atom_microphone->set_din_pin(22);
  atom_microphone->set_pdm(true);
  atom_microphone->set_correct_dc_offset(false);
  atom_speaker->set_parent(i2s_out);
  atom_speaker->set_i2s_role(::I2S_ROLE_MASTER);
  atom_speaker->set_slot_mode(::I2S_SLOT_MODE_MONO);
  atom_speaker->set_std_slot_mask(::I2S_STD_SLOT_BOTH);
  atom_speaker->set_slot_bit_width(::I2S_SLOT_BIT_WIDTH_16BIT);
  atom_speaker->set_sample_rate(16000);
  atom_speaker->set_use_apll(false);
  atom_speaker->set_mclk_multiple(::I2S_MCLK_MULTIPLE_256);
  atom_speaker->set_dout_pin(21);
  atom_speaker->set_i2s_comm_fmt("std");
  atom_speaker->set_timeout(500);
  atom_speaker->set_buffer_duration(500);
  // =========== AUTO GENERATED CODE END ============
  App.setup();
}

void loop() {
  App.loop();
}
