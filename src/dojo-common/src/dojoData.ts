import { BeltsDB, ShirtDatabase, TransformsDB } from "./dojoTypes";

// ref: https://smartdevpreneur.com/typescript-eslint-ignore-and-disable-type-rules/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ShirtData: ShirtDatabase = require('../public/shirts.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BeltData: BeltsDB = require('../public/belts.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TransformData: TransformsDB = require('../public/transforms.json');

export class DojoData {
	public getShirtData() {
		return ShirtData;
	}

	public getBeltData() {
		return BeltData;
	}

	public getTransformData() {
		return TransformData;
	}
}
