import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  Service
} from 'homebridge';

import { PlatformAccessory } from './types/PlatformAccessory';
import { AccessoryContext } from './types/AccessoryContext';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { Config } from './types/Config';
import { Accessory } from './Accessory';
import { DaikinAC } from './DaikinAC';

export class Platform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  public readonly cachedAccessories: PlatformAccessory[] = [];
  public readonly registeredDevices: Accessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: Config,
    public readonly api: API
  ) {
    this.api.on('didFinishLaunching', () => {
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.cachedAccessories.push(accessory);
  }

  private async discoverDevices() {
    try {
      if (!this.config.ips?.length) {
        this.cleanAccessories();
        return;
      }

      const devices = Array.from(new Set(this.config.ips)).map(
        async (ip: string) => {
          const daikinAC = new DaikinAC(this.log, this.api, ip);
          const success = await daikinAC.setup();
          if (!success) {
            this.log.warn(`Failed to setup Daikin AC (${ip})`);
            return;
          }

          this.log.info(`Successfully setup Daikin AC (${ip})`);
          this.loadDevice(daikinAC);
        }
      );

      await Promise.all(devices);
      this.checkOldDevices();
    } catch (error: any) {
      this.log.error(`Error for discoverDevices: ${error?.message}`);
    }
  }

  private checkOldDevices() {
    // this.cachedAccessories.map((accessory) => {
    //   try {
    //     const exists = this.registeredDevices.find(
    //       (device) => device.UUID === accessory.UUID
    //     );
    //     if (!exists) {
    //       this.log.info('Remove cached accessory:', accessory.displayName);
    //       this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
    //         accessory
    //       ]);
    //     }
    //   } catch (error: any) {
    //     this.log.error(
    //       `Error for device: ${accessory.displayName} | ${error?.message}`
    //     );
    //   }
    // });
  }

  private cleanAccessories() {
    try {
      if (this.cachedAccessories.length > 0) {
        this.log.debug(
          '[PLATFORM]',
          'Removing cached accessories (Count:',
          `${this.cachedAccessories.length})`
        );

        this.api.unregisterPlatformAccessories(
          PLUGIN_NAME,
          PLATFORM_NAME,
          this.cachedAccessories
        );
      }
    } catch (error: any) {
      this.log.error(`Error for cached accessories: ${error?.message}`);
    }
  }

  private loadDevice(daikinAC: DaikinAC) {
    try {
      const existingAccessory = this.cachedAccessories.find(
        (accessory) => accessory.UUID === daikinAC.UUID
      );

      if (existingAccessory) {
        this.log.info(
          'Restoring existing accessory from cache:',
          existingAccessory.displayName
        );

        existingAccessory.context = {
          name: existingAccessory.displayName,
          daikinAC
        };

        this.registeredDevices.push(new Accessory(this, existingAccessory));
        return;
      }

      this.log.info('Adding new accessory:', daikinAC.ip);
      const accessory = new this.api.platformAccessory<AccessoryContext>(
        'Daikin AC',
        daikinAC.UUID
      );

      accessory.context = {
        name: accessory.displayName,
        daikinAC
      };

      this.registeredDevices.push(new Accessory(this, accessory));
      return this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
        accessory
      ]);
    } catch (error: any) {
      this.log.error(`Error loadDevice for ${daikinAC.ip}: ${error?.message}`);
    }
  }
}
