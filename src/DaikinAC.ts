import { API, Characteristic, Logger } from 'homebridge';
import AsyncLock from 'async-lock';
import axios from 'axios';

import { Mode, Status } from './types/Status';

export class DaikinAC {
  private readonly lock = new AsyncLock();
  private lastUpdate = 0;

  private readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  private readonly getControlInfoUrl: URL;
  private readonly setControlInfoUrl: URL;
  private readonly sensorInfoUrl: URL;

  private status: Status = new Status();

  public readonly MAX_COOLING_TEMPERATURE = 32;
  public readonly MIN_COOLING_TEMPERATURE = 18;

  public readonly MAX_HEATING_TEMPERATURE = 30;
  public readonly MIN_HEATING_TEMPERATURE = 10;
  public readonly UUID: string;

  public get acStatus(): Status {
    return this.status.clone();
  }

  constructor(
    private readonly log: Logger,
    private readonly api: API,
    public readonly ip: string
  ) {
    this.UUID = this.api.hap.uuid.generate(ip);
    this.setControlInfoUrl = new URL(`http://${ip}/aircon/set_control_info`);
    this.getControlInfoUrl = new URL(`http://${ip}/aircon/get_control_info`);
    this.sensorInfoUrl = new URL(`http://${ip}/aircon/get_sensor_info`);
  }

  public async setup(): Promise<boolean> {
    return this.getControlInfo();
  }

  public async getControlInfo(): Promise<boolean> {
    return this.lock.acquire('api', async () => {
      try {
        if (Date.now() - this.lastUpdate < 200) {
          return true;
        }

        this.log.debug(`[${this.ip}] Getting device info`);

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

        const rawToObject = (raw: string[]): Record<string, string> =>
          raw.reduce((acc, item) => {
            const [key, value] = item.split('=');
            return {
              ...acc,
              [key]: value
            };
          }, {});

        const controlInfo = rawToObject(controlInfoRaw);
        const sensorInfo = rawToObject(sensorInfoRaw);

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
}
