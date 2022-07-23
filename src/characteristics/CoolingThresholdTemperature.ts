import {
  CharacteristicGetHandler,
  CharacteristicSetHandler,
  CharacteristicValue,
  Nullable
} from 'homebridge';

import { AccessoryThisType } from '../Accessory';

const characteristic: {
  get: CharacteristicGetHandler;
  set: CharacteristicSetHandler;
} & AccessoryThisType = {
  get: async function (): Promise<Nullable<CharacteristicValue>> {
    await this.daikinAC.getControlInfo();
    return this.daikinAC.CoolingThresholdTemperature;
  },
  set: async function (value: CharacteristicValue) {
    if (value !== this.daikinAC.CoolingThresholdTemperature) {
      const prevValue = this.daikinAC.CoolingThresholdTemperature;

      this.daikinAC.CoolingThresholdTemperature = parseInt(
        value.toString(),
        10
      );
      const success = await this.daikinAC.saveControlInfo();
      if (!success) {
        this.daikinAC.CoolingThresholdTemperature = prevValue;
      }
    }
  }
};

export default characteristic;
