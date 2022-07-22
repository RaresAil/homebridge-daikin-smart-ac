import { Logger } from 'homebridge';
import axios from 'axios';

import { Status } from './types/Status';

export class DaikinAC {
  private readonly getControlInfoUrl: URL;
  private readonly setControlInfoUrl: URL;
  private readonly sensorInfoUrl: URL;

  private status: Status = new Status();

  public get acStatus(): Status {
    return this.status;
  }

  constructor(private readonly log: Logger, ip: string) {
    this.setControlInfoUrl = new URL(`http://${ip}/aircon/set_control_info`);
    this.getControlInfoUrl = new URL(`http://${ip}/aircon/get_control_info`);
    this.sensorInfoUrl = new URL(`http://${ip}/aircon/get_sensor_info`);
  }

  public async setup(): Promise<boolean> {
    return this.getControlInfo();
  }

  public async getControlInfo(): Promise<boolean> {
    try {
      const [cInfo, sInfo] = (
        await Promise.all([
          axios.get(this.getControlInfoUrl.toString()),
          axios.get(this.sensorInfoUrl.toString())
        ])
      ).map((response) => response.data);

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

      return this.status.wasSuccessUpdate;
    } catch (error) {
      this.log.error(error as string);
      return false;
    }
  }

  public async saveControlInfo(): Promise<boolean> {
    try {
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
  }
}
