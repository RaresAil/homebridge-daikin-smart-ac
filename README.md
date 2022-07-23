# Homebridge Daikin Smart AC

This plugin is an implementation of the Daikin AC's wifi adapter which communicates using a Local API. A disadvantage is that is not encrypted and i recommend to disable the out of home feature and allow the remote control only trough HomeKit

### Config

```json
{
  "name": "Daikin Smart ACs",
  "platform": "DaikinSmartAC",
  "ips": ["ipv4-here"]
}
```

### Features

- Swing Mode
- Room Temperature
- 6 Speeds (including Night) (The POWERFUL mode is not included)
- Heating / Cooling features
- Target temperature set
- Auto mode
