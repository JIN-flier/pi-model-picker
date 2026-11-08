# Pi Auto Model Manager

> A model manager extension for Pi Agent.

Features:

- JSON-based model configuration
- Peak / Off-peak model selection
- Thinking Level management
- Interactive model selector
- Automatic selector on new sessions
- Runtime configuration reload

Uages:

| Command                     | Behavior                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/model-picker`             | Opens the interactive model selector, allowing users to manually switch models or view the current status. |
| `/model-picker <your tier>` | Directly switches to the specified Tier (e.g., `high`, `low`), and load the corresponding model.           |
| `/model-picker reload`      | Reloads the configuration file, updates the session's config state, and notifies the result.               |
| `/model-picker status`      | Displays the current Model Manager status, including the active model, thinking level, and config path.    |

## Installation

Create the extension directory:

```bash
mkdir -p ~/.pi/agent/extensions/model-picker
```

create the config JSON file:

```bash
mkdir -p ~/.pi/agent/model-picker.json
```

config file scheme:

```json
{
  "timeZone": "Asia/Shanghai",

  "promptOnNewSession": true,
  "promptOnStartup": false,

  "holidays": ["2026-01-01", "2026-02-17", "2026-10-01"],

  "plans": {
    "peak": {
      "<tier-name>": {
        "provider": "<provider-name>",
        "id": "<model-name>",
        "thinking": "<thinking level>"
      }
    },

    "offPeak": {
      "<tier-name>": {
        "provider": "<provider-name>",
        "id": "<model-name>",
        "thinking": "<thinking level>"
      }
    }
  }
}
```
