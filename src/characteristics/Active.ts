import {
  CharacteristicGetHandler,
  CharacteristicSetHandler,
  CharacteristicValue,
  Nullable
} from 'homebridge';

import { AccessoryThisType } from '../Accessory';
import { delay } from '../utils';

const characteristic: {
  get: CharacteristicGetHandler;
  set: CharacteristicSetHandler;
} & AccessoryThisType = {
  get: async function (): Promise<Nullable<CharacteristicValue>> {
    await this.daikinAC.getControlInfo();
    return this.daikinAC.Active;
  },
  set: async function (value: CharacteristicValue) {
    const active = parseInt(value.toString(), 10);

    if (active !== this.daikinAC.Active) {
      const prevValue = this.daikinAC.Active;
      this.daikinAC.Active = active;
      const success = await this.daikinAC.saveControlInfo();

      if (!success) {
        this.daikinAC.Active = prevValue;
      }
    } else {
      await delay(10);
    }

    this.currentStateCharacteristic!.updateValue(
      this.daikinAC.CurrentHeaterCoolerState
    );
  }
};

export default characteristic;
