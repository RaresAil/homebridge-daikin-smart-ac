import { Characteristic, Service } from 'homebridge';

import { PlatformAccessory } from './types/PlatformAccessory';
import { Platform } from './platform';
import { DaikinAC } from './DaikinAC';

import CoolingThresholdTemperature from './characteristics/CoolingThresholdTemperature';
import HeatingThresholdTemperature from './characteristics/HeatingThresholdTemperature';
import CurrentTemperature from './characteristics/CurrentTemperature';
import RotationSpeed from './characteristics/RotationSpeed';
import CurrentState from './characteristics/CurrentState';
import TargetState from './characteristics/TargetState';
import Active from './characteristics/Active';

export type AccessoryThisType = ThisType<{
  currentStateCharacteristic: Characteristic;
  heaterCoolerService: Service;
  platform: Platform;
  daikinAC: DaikinAC;
}>;

export class Accessory {
  private readonly currentStateCharacteristic?: Characteristic;
  private readonly heaterCoolerService?: Service;

  private get daikinAC(): DaikinAC {
    return this.accessory.context.daikinAC;
  }

  constructor(
    private readonly platform: Platform,
    private readonly accessory: PlatformAccessory
  ) {
    try {
      this.accessory
        .getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Daikin')
        .setCharacteristic(this.platform.Characteristic.Model, 'WifiAdapter')
        .setCharacteristic(
          this.platform.Characteristic.SerialNumber,
          this.daikinAC.UUID
        );

      this.heaterCoolerService =
        this.accessory.getService(this.platform.Service.HeaterCooler) ||
        this.accessory.addService(this.platform.Service.HeaterCooler);

      this.heaterCoolerService
        .getCharacteristic(this.platform.Characteristic.Active)
        .onGet(Active.get.bind(this))
        .onSet(Active.set.bind(this));

      this.currentStateCharacteristic = this.heaterCoolerService
        .getCharacteristic(
          this.platform.Characteristic.CurrentHeaterCoolerState
        )
        .onGet(CurrentState.get.bind(this));

      this.heaterCoolerService
        .getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
        .onGet(TargetState.get.bind(this))
        .onSet(TargetState.set.bind(this));

      this.heaterCoolerService
        .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
        .onGet(CurrentTemperature.get.bind(this));

      this.heaterCoolerService
        .getCharacteristic(
          this.platform.Characteristic.CoolingThresholdTemperature
        )
        .setProps({
          minValue: this.daikinAC.MIN_COOLING_TEMPERATURE,
          maxValue: this.daikinAC.MAX_COOLING_TEMPERATURE
        })
        .onGet(CoolingThresholdTemperature.get.bind(this))
        .onSet(CoolingThresholdTemperature.set.bind(this));

      this.heaterCoolerService
        .getCharacteristic(
          this.platform.Characteristic.HeatingThresholdTemperature
        )
        .setProps({
          minValue: this.daikinAC.MIN_HEATING_TEMPERATURE,
          maxValue: this.daikinAC.MAX_HEATING_TEMPERATURE
        })
        .onGet(HeatingThresholdTemperature.get.bind(this))
        .onSet(HeatingThresholdTemperature.set.bind(this));

      this.heaterCoolerService
        .getCharacteristic(this.platform.Characteristic.RotationSpeed)
        .setProps({
          minValue: 0,
          maxValue: this.daikinAC.MAX_SPEED,
          validValueRanges: [0, this.daikinAC.MAX_SPEED]
        })
        .onGet(RotationSpeed.get.bind(this))
        .onSet(RotationSpeed.set.bind(this));
    } catch (error: any) {
      this.platform.log.error(`Failed to setup accessory: ${error?.message}`);
    }
  }
}
