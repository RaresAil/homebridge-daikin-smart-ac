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
    return this.daikinAC.RotationSpeed;
  },
  set: async function (value: CharacteristicValue) {
    const speed = parseInt(value.toString(), 10);
    if (speed !== this.daikinAC.RotationSpeed) {
      const prevValue = this.daikinAC.RotationSpeed;

      this.daikinAC.RotationSpeed = speed;
      const success = await this.daikinAC.saveControlInfo();
      if (!success) {
        this.daikinAC.RotationSpeed = prevValue;
      }
    }
  }
};

export default characteristic;
