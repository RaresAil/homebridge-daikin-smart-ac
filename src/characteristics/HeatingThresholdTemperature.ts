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
    return this.daikinAC.HeatingThresholdTemperature;
  },
  set: async function (value: CharacteristicValue) {
    if (value !== this.daikinAC.HeatingThresholdTemperature) {
      const prevValue = this.daikinAC.HeatingThresholdTemperature;

      this.daikinAC.HeatingThresholdTemperature = parseInt(
        value.toString(),
        10
      );
      const success = await this.daikinAC.saveControlInfo();
      if (!success) {
        this.daikinAC.HeatingThresholdTemperature = prevValue;
      }
    }
  }
};

export default characteristic;
