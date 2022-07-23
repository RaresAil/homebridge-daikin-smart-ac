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
    return this.daikinAC.SwingMode;
  },
  set: async function (value: CharacteristicValue) {
    const swing = parseInt(value.toString(), 10);

    if (swing !== this.daikinAC.SwingMode) {
      const prevValue = this.daikinAC.SwingMode;

      this.daikinAC.SwingMode = swing;
      const success = await this.daikinAC.saveControlInfo();
      if (!success) {
        this.daikinAC.SwingMode = prevValue;
      }
    }
  }
};

export default characteristic;
