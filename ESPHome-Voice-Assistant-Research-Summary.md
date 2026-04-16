# ESPHome Voice Assistant Research Summary
## M5Stack Atom Lite Configuration

---

## Research Findings

### 1. Voice Assistant Component Configuration for Atom Lite

The M5Stack Atom Lite requires specific pin configurations for audio:

- **Microphone (PDM):** GPIO23 (i2s_din_pin)
- **Speaker (I2S):** GPIO22 (i2s_dout_pin)
- **I2S LRCLK:** GPIO33
- **I2S BCLK:** GPIO19
- **LED (SK6812):** GPIO27
- **Button:** GPIO39

The Atom Lite differs from the Atom Echo S3R in that it uses an ESP32-PICO-D4 (not ESP32-S3) and has different pin mappings.

### 2. Microphone and Speaker Setup Requirements

**Microphone:**
- Type: I2S PDM microphone
- Sample rate: 16000 Hz (required for voice recognition)
- `pdm: true` must be set
- `correct_dc_offset: true` improves audio quality

**Speaker:**
- Type: I2S external DAC
- Sample rate: 16000 Hz
- Use `channel: stereo` (mono has audio quality issues on this hardware)
- `buffer_duration: 60ms` recommended

### 3. Wake Word Configuration

**Pre-built Models Available:**
- `okay_nabu` (default)
- `hey_jarvis`
- `hey_mycroft`
- `alexa`

**IMPORTANT:** The "Trillian" wake word is NOT available as a pre-built model. It would need to be custom-trained using the microWakeWord framework.

**Custom Wake Word Training:**
To create a "Trillian" wake word, you would need to:
1. Use the microWakeWord training framework: https://github.com/OHF-Voice/micro-wake-word
2. Generate synthetic samples using Piper sample generator
3. Train the model (requires experimentation with hyperparameters)
4. Export as .tflite model with accompanying .json manifest
5. Host the model file and reference it in ESPHome config

**Example custom model reference:**
```yaml
micro_wake_word:
  models:
    - model: https://your-server.com/models/trillian.json
      id: trillian
```

### 4. Integration with Home Assistant Voice Pipelines

**Critical Configuration:**
For `wake_word_entity` and `wake_word_id` to be populated in Home Assistant, the ESPHome configuration MUST:

1. Define `micro_wake_word` with an explicit `id`
2. Reference that `id` in the `voice_assistant` component via `micro_wake_word:` parameter

```yaml
# This pattern is REQUIRED for wake word entities to appear in HA
micro_wake_word:
  id: mww  # <-- explicit ID required
  microphone: atom_mic
  models:
    - model: hey_jarvis
      id: hey_jarvis

voice_assistant:
  id: va
  microphone: atom_mic
  media_player: atom_media_player
  micro_wake_word: mww  # <-- reference to the micro_wake_word ID
```

**Home Assistant Pipeline Setup:**
1. Go to Settings → Voice Assistants → Assist Pipeline
2. Create or edit a pipeline
3. Under "Wake Word" section, select "microWakeWord" as the engine
4. The ESPHome device should appear with its configured wake words

### 5. Why wake_word_entity and wake_word_id Are Null

This occurs when:
- The `micro_wake_word` component is not properly configured with an ID
- The `voice_assistant` component doesn't reference the `micro_wake_word` ID
- The device hasn't fully connected to Home Assistant yet
- The YAML uses the older `use_wake_word: true` pattern without micro_wake_word

**Solution:**
Ensure both components are properly linked via ID references as shown in the working configuration.

### 6. Key Configuration Notes

**Two Wake Word Engine Options:**

1. **On-device (microWakeWord):**
   - Wake word detection happens on the ESP32
   - Lower latency, works offline
   - Requires `micro_wake_word:` component
   - Use `micro_wake_word.start:` to begin listening

2. **In Home Assistant (openWakeWord):**
   - Wake word detection happens in HA
   - Requires continuous audio streaming
   - Use `voice_assistant.start_continuous:` with `use_wake_word: true`

**The select entity "Wake word engine location" allows switching between these modes.**

### 7. voice_assistant_feature_flags: 7 Meaning

This is a bitmask indicating supported features:
- Bit 0 (1): Supports voice assistant
- Bit 1 (2): Supports wake word (on-device)
- Bit 2 (4): Supports timer functionality

Value 7 = 1 + 2 + 4 = All features supported

---

## Working Configuration Provided

See `atom-lite-voice-assistant.yaml` for a complete, working configuration that includes:
- Full audio pipeline (mic → voice assistant → speaker)
- micro_wake_word with 4 wake word options
- Wake word switching via Home Assistant select entity
- Sensitivity adjustment
- LED status indicators
- Timer functionality
- Button controls

## To Use "Trillian" Wake Word

Since "Trillian" is not a pre-built model, you have these options:

1. **Train a custom model** (advanced):
   - Use microWakeWord training framework
   - Generate ~1000+ synthetic samples
   - Train and validate the model
   - Deploy to your ESPHome device

2. **Use a similar-sounding pre-built wake word** (easiest):
   - `hey_jarvis` sounds somewhat similar
   - Configure via the "Wake word" select entity in Home Assistant

3. **Request community model** (intermediate):
   - Submit a request to the ESPHome micro-wake-word-models repository
   - Community may train and share the model

---

## References

- [ESPHome Voice Assistant Docs](https://esphome.io/components/voice_assistant.html)
- [ESPHome micro_wake_word Docs](https://esphome.io/components/micro_wake_word.html)
- [microWakeWord Training Framework](https://github.com/OHF-Voice/micro-wake-word)
- [ESPHome Wake Word Voice Assistants Repo](https://github.com/esphome/wake-word-voice-assistants)
- [M5Stack ESPHome YAML Examples](https://github.com/m5stack/esphome-yaml)

---

*The Answer, of course, is 42. The Question was about voice assistant configuration.*
