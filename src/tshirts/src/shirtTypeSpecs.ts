/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';

/**
 * Shirt db entry
 */
 type ShirtDescriptor = {
	displayName: string;
	resourceName: string;
	transform: string;
};

/**
 * ShirtDB entry
 */
type BeltOrderDescriptor = {
	order: number;
	resourceName: string;
};

/**
 * belt descriptor
 */

type BeltDescriptor = {
	[key: string]: BeltOrderDescriptor;
};

/*
asset transforms
*/
type TransformDescriptor = {
	attachPoint: string;
	scale: {
		x: number;
		y: number;
		z: number;
	};
	rotation: {
		x: number;
		y: number;
		z: number;
	};
	position: {
		x: number;
		y: number;
		z: number;
	};
}

/**
 * The shirt database structure.
 */
export type ShirtDatabase = {
	[key: string]: ShirtDescriptor;
};

/**
 * belt database structure
 */
export type BeltsDB = {
	belts: BeltDescriptor;
	transform: string;
};

export type TransformsDB = {
	[key: string]: TransformDescriptor;
};

/**
 * user settings
 */
export type UserSettings = {
	id: string;
	name: string;
	shirt: string;
	level: number;
}

/**
 * runtime user settings
 */
export type RuntimeUserSettings = {
	intialized: boolean;
	settings: UserSettings;
	belt: MRE.Actor;
	shirt: MRE.Actor;
}
