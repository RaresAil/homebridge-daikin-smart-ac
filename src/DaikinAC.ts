import { API, Characteristic, Logger } from 'homebridge';
import AsyncLock from 'async-lock';
import axios from 'axios';

import { FanDirection, FanSpeed, Mode, Status } from './types/Status';

export class DaikinAC {
  private readonly lock = new AsyncLock();
  private lastUpdate = 0;

  private readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  private readonly getControlInfoUrl: URL;
  private readonly setControlInfoUrl: URL;
  private readonly sensorInfoUrl: URL;
  private readonly basicInfo: URL;

  private status: Status = new Status();
  private defaultName = 'DaikinAC';
  private mac = 'UNKNOWN';

  public readonly MAX_COOLING_TEMPERATURE = 32;
  public readonly MIN_COOLING_TEMPERATURE = 18;

  public readonly MAX_HEATING_TEMPERATURE = 30;
  public readonly MIN_HEATING_TEMPERATURE = 10;

  public readonly MAX_SPEED = 6;

  public readonly UUID: string;

  public get acStatus(): Status {
    return this.status.clone();
  }

  public get DefaultName(): string {
    return this.defaultName.toString();
  }

  public get MAC(): string {
    return this.mac.toString();
  }

  constructor(
    private readonly log: Logger,
    private readonly api: API,
    public readonly ip: string
  ) {
    this.UUID = this.api.hap.uuid.generate(ip);

    this.basicInfo = new URL(`http://${ip}/common/basic_info`);

    this.setControlInfoUrl = new URL(`http://${ip}/aircon/set_control_info`);
    this.getControlInfoUrl = new URL(`http://${ip}/aircon/get_control_info`);
    this.sensorInfoUrl = new URL(`http://${ip}/aircon/get_sensor_info`);
  }

  public async setup(): Promise<boolean> {
    const success = await this.lock.acquire('api', async () => {
      try {
        this.log.debug(`[${this.ip}] Getting device info`);

        const bInfo = (await axios.get(this.basicInfo.toString()))?.data;
        this.log.debug(`[${this.ip}] Raw response BASIC: (${bInfo})`);

        const basicInfoRaw: string[] = bInfo?.split(',');
        if (basicInfoRaw.length <= 1) {
          return false;
        }

        const basicInfo = this.rawToObject(basicInfoRaw);

        if (basicInfo.ret !== 'OK') {
          return false;
        }

        const { type, name, mac } = basicInfo;
        if (type !== 'aircon') {
          return false;
        }

        this.defaultName = decodeURIComponent(name);
        this.mac = this.formatMAC(mac);

        return true;
      } catch (error) {
        this.log.error(error as string);
        return false;
      }
    });

    if (!success) {
      return false;
    }

    return this.getControlInfo();
  }

  public async getControlInfo(): Promise<boolean> {
    return this.lock.acquire('api', async () => {
      try {
        if (Date.now() - this.lastUpdate < 200) {
          return true;
        }

        this.log.debug(`[${this.ip}] Getting device control info`);

        const [cInfo, sInfo] = (
          await Promise.all([
            axios.get(this.getControlInfoUrl.toString()),
            axios.get(this.sensorInfoUrl.toString())
          ])
        ).map((response) => response.data);

        this.log.debug(`[${this.ip}] Raw response CONTROL: (${cInfo})`);
        this.log.debug(`[${this.ip}] Raw response SENSOR: (${sInfo})`);

        const controlInfoRaw: string[] = cInfo?.split(',');
        const sensorInfoRaw: string[] = sInfo?.split(',');
        if (controlInfoRaw.length <= 1 || sensorInfoRaw.length <= 1) {
          return false;
        }

        const controlInfo = this.rawToObject(controlInfoRaw);
        const sensorInfo = this.rawToObject(sensorInfoRaw);

        if (controlInfo.ret !== 'OK' || sensorInfo.ret !== 'OK') {
          return false;
        }

        this.status.update(controlInfo, sensorInfo);
        this.lastUpdate = Date.now();

        return this.status.wasSuccessUpdate;
      } catch (error) {
        this.lastUpdate = Date.now();
        this.log.error(error as string);
        return false;
      }
    });
  }

  public async saveControlInfo(): Promise<boolean> {
    return this.lock.acquire('api', async () => {
      try {
        this.log.debug(
          `[${this.ip}] Saving device info with: (${this.status
            .toParams()
            .replace('&', ',')})`
        );

        const response = await axios.get(
          `${this.setControlInfoUrl.toString()}?${this.status.toParams()}`
        );

        const isSuccess =
          response.data?.split(',')?.[0]?.split('=')?.[1] === 'OK';

        return isSuccess;
      } catch (error) {
        this.log.error(error as string);
        return false;
      }
    });
  }

  private rawToObject(raw: string[]): Record<string, string> {
    return raw.reduce((acc, item) => {
      const [key, value] = item.split('=');
      return {
        ...acc,
        [key]: value
      };
    }, {});
  }

  private formatMAC(value: string) {
    const len = value.length / 2;
    let mac = '';

    for (let i = 0; i < len; i++) {
      mac += value.slice(i * 2, i * 2 + 2) + (i < len - 1 ? ':' : '');
    }

    return mac;
  }

  public get TargetHeaterCoolerState(): number {
    switch (this.status.mode) {
      case Mode.Cool:
        return this.Characteristic.TargetHeaterCoolerState.COOL;
      case Mode.Heat:
        return this.Characteristic.TargetHeaterCoolerState.HEAT;
      default:
        return this.Characteristic.TargetHeaterCoolerState.AUTO;
    }
  }

  public set TargetHeaterCoolerState(value: number) {
    switch (value) {
      case this.Characteristic.TargetHeaterCoolerState.COOL:
        this.status.mode = Mode.Cool;
        break;
      case this.Characteristic.TargetHeaterCoolerState.HEAT:
        this.status.mode = Mode.Heat;
        break;
      default:
        this.status.mode = Mode.Auto;
        break;
    }
  }

  public get CurrentHeaterCoolerState(): number {
    if (!this.status.power) {
      return this.Characteristic.CurrentHeaterCoolerState.INACTIVE;
    }

    switch (this.status.mode) {
      case Mode.Heat:
        return this.Characteristic.CurrentHeaterCoolerState.HEATING;
      case Mode.Cool:
        return this.Characteristic.CurrentHeaterCoolerState.COOLING;
      default:
        return this.Characteristic.CurrentHeaterCoolerState.IDLE;
    }
  }

  public get Active(): number {
    return this.status.power
      ? this.Characteristic.Active.ACTIVE
      : this.Characteristic.Active.INACTIVE;
  }

  public set Active(value: number) {
    this.status.power = value === this.Characteristic.Active.ACTIVE;
  }

  public get CoolingThresholdTemperature(): number {
    return this.status.coolTargetTemperature ?? this.MIN_COOLING_TEMPERATURE;
  }

  public set CoolingThresholdTemperature(value: number) {
    let temp = value;
    if (temp < this.MIN_COOLING_TEMPERATURE) {
      temp = this.MIN_COOLING_TEMPERATURE;
    }

    if (temp > this.MAX_COOLING_TEMPERATURE) {
      temp = this.MAX_COOLING_TEMPERATURE;
    }

    this.status.coolTargetTemperature = temp;
  }

  public get HeatingThresholdTemperature(): number {
    return this.status.heatTargetTemperature ?? this.MIN_HEATING_TEMPERATURE;
  }

  public set HeatingThresholdTemperature(value: number) {
    let temp = value;
    if (temp < this.MIN_HEATING_TEMPERATURE) {
      temp = this.MIN_HEATING_TEMPERATURE;
    }

    if (temp > this.MAX_HEATING_TEMPERATURE) {
      temp = this.MAX_HEATING_TEMPERATURE;
    }

    this.status.heatTargetTemperature = temp;
  }

  public get CurrentTemperature(): number {
    return this.status.roomTemperature ?? 0;
  }

  public get RotationSpeed(): number {
    switch (this.status.fanSpeed) {
      case FanSpeed.S1:
        return 2;
      case FanSpeed.S2:
        return 3;
      case FanSpeed.S3:
        return 4;
      case FanSpeed.S4:
        return 5;
      case FanSpeed.S5:
        return 6;
      default:
        return 1;
    }
  }

  public set RotationSpeed(value: number) {
    switch (value) {
      case 1:
        this.status.fanSpeed = FanSpeed.Night;
        break;
      case 2:
        this.status.fanSpeed = FanSpeed.S1;
        break;
      case 3:
        this.status.fanSpeed = FanSpeed.S2;
        break;
      case 4:
        this.status.fanSpeed = FanSpeed.S3;
        break;
      case 5:
        this.status.fanSpeed = FanSpeed.S4;
        break;
      case 6:
        this.status.fanSpeed = FanSpeed.S5;
        break;
      default:
        this.status.fanSpeed = FanSpeed.Auto;
        break;
    }
  }

  public get SwingMode(): number {
    switch (this.status.fanDirection) {
      case FanDirection.Vertical:
      case FanDirection.Horizontal:
      case FanDirection.VerticalAndHorizontal:
        return this.Characteristic.SwingMode.SWING_ENABLED;
      default:
        return this.Characteristic.SwingMode.SWING_DISABLED;
    }
  }

  public set SwingMode(value: number) {
    if (value === this.Characteristic.SwingMode.SWING_ENABLED) {
      this.status.fanDirection = FanDirection.Vertical;
      return;
    }

    this.status.fanDirection = FanDirection.Off;
  }
}
