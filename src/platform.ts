import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  Service
} from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { Config } from './types/Config';

import { PlatformAccessory } from './types/PlatformAccessory';

export class Platform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  public readonly cachedAccessories: PlatformAccessory[] = [];
  public readonly registeredDevices: unknown[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: Config,
    public readonly api: API
  ) {
    this.api.on('didFinishLaunching', () => {
      // 'DidFinishLaunching'
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.cachedAccessories.push(accessory);
  }

  // private checkOldDevices() {
  //   this.cachedAccessories.map((accessory) => {
  //     try {
  //       const exists = this.registeredDevices.find(
  //         (device) => device.UUID === accessory.UUID
  //       );

  //       if (!exists) {
  //         this.log.info('Remove cached accessory:', accessory.displayName);
  //         this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
  //           accessory
  //         ]);
  //       }
  //     } catch (error: any) {
  //       this.log.error(
  //         `Error for device: ${accessory.displayName} | ${error?.message}`
  //       );
  //     }
  //   });
  // }

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
}
