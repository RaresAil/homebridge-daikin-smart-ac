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
    return this.daikinAC.TargetHeaterCoolerState;
  },
  set: async function (value: CharacteristicValue) {
    const state = parseInt(value.toString(), 10);

    if (state !== this.daikinAC.TargetHeaterCoolerState) {
      const prevValue = this.daikinAC.TargetHeaterCoolerState;

      this.daikinAC.TargetHeaterCoolerState = state;
      const success = await this.daikinAC.saveControlInfo();
      if (!success) {
        this.daikinAC.TargetHeaterCoolerState = prevValue;
      }
    }
  }
};

export default characteristic;
