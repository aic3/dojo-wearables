/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import fetch, { BodyInit, HeaderInit, RequestInit } from "node-fetch";

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
 * The structure of the asset database.
 */
type ShirtDatabase = {
	[key: string]: ShirtDescriptor;
};

type BeltsDB = {
	belts: BeltDescriptor;
	transform: string;
};

type TransformsDB = {
	[key: string]: TransformDescriptor;
};

type UserSettings  = {
	id: string;
	name: string;
	shirt: string;
	belt: string;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ShirtDatabase: ShirtDatabase = require('../public/shirts.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BeltsDB: BeltsDB = require('../public/belts.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TransformsDB: TransformsDB = require('../public/transforms.json'); 

/**
 * DojoShirt Application - Showcasing avatar attachments.
 */
export default class DojoShirt {
	// Container for preloaded dojo-shirt prefabs.
	private assets: MRE.AssetContainer;
	private prefabs: { [key: string]: MRE.Prefab } = {};

	// Container for instantiated dojo shirt assets.
	private attachedShirts = new Map<MRE.Guid, MRE.Actor>();

	// Container for dojo belt user assignment
	private assignedBelts = new Map<MRE.Guid, MRE.Actor>();

	// track the user levels 
	private userLevels = new Map<MRE.Guid, number>();

	// settings endpoint
	private settingsEndpoint = "http://localhost:7071"; // "https://xyz.com";

	/**
	 * Constructs a new instance of this class.
	 * @param context The MRE SDK context.
	 * @param baseUrl The baseUrl to this project's `./public` folder.
	 */
	constructor(private context: MRE.Context) {
		console.log("creating MRE context for: "+ context.user.name);
		this.assets = new MRE.AssetContainer(context);
		// Hook the context events we're interested npm buildin.
		this.context.onStarted(() => this.started());
		this.context.onUserLeft(user => this.userLeft(user));
		this.context.onUserJoined(user => this.userJoined(user));
	}

	/**
	 * Called when  application session starts up.
	 */
	private async started() {
		// Check whether code is running in a debuggable watched filesystem
		// environment and if so delay starting the app by 1 second to give
		// the debugger time to detect that the server has restarted and reconnect.
		// The delay value below is in milliseconds so 1000 is a one second delay.
		// You may need to increase the delay or be able to decrease it depending
		// on the speed of your PC.
		const delay = 1000;
		const argv = process.execArgv.join();
		const isDebug = argv.includes('inspect') || argv.includes('debug');

		// // version to use with non-async code
		// if (isDebug) {
		// 	setTimeout(this.startedImpl, delay);
		// } else {
		// 	this.startedImpl();
		// }

		// version to use with async code
		if (isDebug) {
			// use the local settings endpoint
			this.settingsEndpoint = "http://localhost:7071";

			await new Promise(resolve => setTimeout(resolve, delay));
			await this.startedImpl();
		} else {
			await this.startedImpl();
		}

		console.log("TShirts Altspace VR web started");
	}

	// use () => {} syntax here to get proper scope binding when called via setTimeout()
	// if async is required, next line becomes private startedImpl = async () => {
	private startedImpl = async () => {
		// Preload all the models.
		await this.preloadShirts();

		await this.preloadBelts();

		// Show the menu.
		this.showShirtsMenu();

		// create the rewards button
		this.createRewardButton();
	}

	/**
	 * Called when a user leaves the application (probably left the Altspace world where this app is running).
	 * @param user The user that left the building.
	 */
	private userLeft(user: MRE.User) {
		// If the user was wearing anything, destroy it. Otherwise it would be
		// orphaned in the world.
		this.removeAssets(user);
	}

	/**
	 * Called when a user joins the app
	 * @param user 
	 */
	private async userJoined(user: MRE.User) {
		console.log("User [" + user.id + "]: " + user.name + " joined");
		await this.loadUserSettings(user);
	}

	/**
	 * load the user settings
	 * @param user 
	 */
	private async loadUserSettings(user: MRE.User) {
		console.log("loading user setitngs for : " + user.name + " ,using endpoint: " + this.settingsEndpoint);
		//const debugString = this.callUserSettingsAPI(user);

		const userSettings = await this.apiCall<UserSettings>(
			this.settingsEndpoint + "/api/usersettings",
			"POST",
			null,
			JSON.stringify( {
				"id": user.id.toString()
			}));
		
		console.log("user API returned: " +  JSON.stringify(userSettings));
	}

	/**
	 * api call with json unwrapping
	 * ref: ref: https://stackoverflow.com/questions/41103360/how-to-use-fetch-in-typescript
	 * @param uri 
	 * @param method 
	 * @param headers 
	 * @returns 
	 */
	private async apiCall<T>(uri: string, method = "GET", headers: HeaderInit = null, body:  string = null){
		return await fetch(uri, {
			method: method,
			headers: headers,
			body:body
		})
		.then((response) => {
			if(!response.ok){
				throw new Error(response.statusText);
			}
			return response.json() as Promise<{ data: T }>;
		})
		.then((data) => {
			return data;
		}); 
	}

	/**
	 * Show a menu
	 */
	private showShirtsMenu() {
		// Create a parent object for all the menu items.
		const menu = MRE.Actor.Create(this.context, {});
		let y = 0.3;

		// Create menu button
		const buttonMesh = this.assets.createBoxMesh('button', 0.3, 0.3, 0.01);

		// Loop over the database, creating a menu item for each entry.
		for (const shirtId of Object.keys(ShirtDatabase)) {
			// Create a clickable button.
			const button = MRE.Actor.Create(this.context, {
				actor: {
					parentId: menu.id,
					name: shirtId,
					appearance: { meshId: buttonMesh.id },
					collider: { geometry: { shape: MRE.ColliderType.Auto } },
					transform: {
						local: { position: { x: 0, y, z: 0 } }
					}
				}
			});

			// Set a click handler on the button.
			button.setBehavior(MRE.ButtonBehavior)
				.onClick(user => this.wearShirt(shirtId, user.id));

			// Create a label for the menu entry.
			MRE.Actor.Create(this.context, {
				actor: {
					parentId: menu.id,
					name: 'label',
					text: {
						contents: ShirtDatabase[shirtId].displayName,
						height: 0.5,
						anchor: MRE.TextAnchorLocation.MiddleLeft
					},
					transform: {
						local: { position: { x: 0.5, y, z: 0 } }
					}
				}
			});
			y = y + 0.5;
		}

		// Create a label for the menu title.
		MRE.Actor.Create(this.context, {
			actor: {
				parentId: menu.id,
				name: 'label',
				text: {
					contents: ''.padStart(8, ' ') + "Select a Shirt",
					height: 0.8,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: MRE.Color3.Yellow()
				},
				transform: {
					local: { position: { x: 0.5, y: y + 0.25, z: 0 } }
				}
			}
		});

		console.log("TShirt menu created");
	}

	private createRewardButton() {
		const menu = MRE.Actor.Create(this.context, {});
		const anchorX = 4;
		const anchorY = 2.5;

		// Create menu button
		const buttonMesh = this.assets.createBoxMesh('button', 0.3, 0.3, 0.01);

		// create the level up button
		// Create a clickable button.
		const levelUp = MRE.Actor.Create(this.context, {
			actor: {
				parentId: menu.id,
				name: "levelUp",
				appearance: { meshId: buttonMesh.id },
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: { position: { x: anchorX, y:anchorY, z: 0 } }
				}
			}
		});

		const levelDown = MRE.Actor.Create(this.context, {
			actor: {
				parentId: menu.id,
				name: "levelDown",
				appearance: { meshId: buttonMesh.id },
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: { position: { x: anchorX, y:anchorY - 0.5, z: 0 } }
				}
			}
		});

		// Set a click handler on the button.
		levelUp.setBehavior(MRE.ButtonBehavior)
			.onClick(user => this.incrementLevel(1, user));
		levelDown.setBehavior(MRE.ButtonBehavior)
			.onClick(user => this.incrementLevel(-1, user));

		// Create a label for the menu entries
		MRE.Actor.Create(this.context, {
			actor: {
				parentId: menu.id,
				name: 'label',
				text: {
					contents: "Level Up",
					height: 0.5,
					anchor: MRE.TextAnchorLocation.MiddleLeft
				},
				transform: {
					local: { position: { x: anchorX + 0.5, y:anchorY, z: 0 } }
				}
			}
		});

		MRE.Actor.Create(this.context, {
			actor: {
				parentId: menu.id,
				name: 'label',
				text: {
					contents: "Level Down",
					height: 0.5,
					anchor: MRE.TextAnchorLocation.MiddleLeft
				},
				transform: {
					local: { position: { x: anchorX + 0.5, y:anchorY - 0.5, z: 0 } }
				}
			}
		});
	}

	/**
	 * incrementLevel
	 */
	private incrementLevel(increment: number, user: MRE.User) {
		let level = -1;
		const belts = Object.keys(BeltsDB.belts);

		// get the current level 
		if(this.userLevels.has(user.id)) {
			level = this.userLevels.get(user.id);
		}

		level += increment;

		// apply the belt to the user
		if(level < 0) {
			console.log("Min level reached: " + user.name + ", level: " + level);
			this.userLevels.delete(user.id);
			this.removeUserAssets(this.assignedBelts, user);
		} else if (level > belts.length) {
			console.log("Max level reached: " + user.name + ", level: " + level);
		} else {
			const belt = belts[level].valueOf();
			const beltKey = belts[level];

			console.log("Setting user level " + user.name + ", level: " + level + ", belt: " + beltKey);
			this.userLevels.set(user.id, level);
			this.wearBelt(beltKey, user);
		}
	}

	/**
	 * Preload all  resources. This makes instantiating them faster and more efficient.
	 */
	private preloadShirts() {
		// Loop over the database, preloading each resource.
		// Return a promise of all the in-progress load promises. This
		// allows the caller to wait until all assets are done preloading
		// before continuing.
		return Promise.all(
			Object.keys(ShirtDatabase).map(shirtId => {
				const asset = ShirtDatabase[shirtId];
				if (asset.resourceName) {
					return this.preloadAsset(shirtId, asset.resourceName);					
				} else {
					return Promise.resolve();
				}
			}));
	}

	/**
	 * preload the dojo belt assets 
	 */
	private preloadBelts() {
		return Promise.all(
			Object.keys(BeltsDB.belts).map(beltId => {
				const belt = BeltsDB.belts[beltId];
				return this.preloadAsset(beltId, belt.resourceName);				
			})
		);
	}

	/**
	 * preloads asset into the local prefabs
	 */

	private preloadAsset(id: string, filename: string){
		console.log("pre-loading asset[" + id + "]: " + filename);
		return this.assets.loadGltf(filename)
			.then(assets => {
				console.log(id + " loaded");
				this.prefabs[id] = assets.find(a => a.prefab !== null) as MRE.Prefab;
			})
			.catch(e => {
				this.logError(e);
			});
	}

	/**
	 * generic error logging
	 */
	private logError(e: any){
		console.log("error: " + e);
		MRE.log.error("app", e);
	}

	/**
	 * Instantiate an asset and attach it to the avatar's head.
	 * @param assetId The id of the asset in the database.
	 * @param userId The id of the user we will attach the hassetat to.
	 */
	private wearShirt(assetId: string, userId: MRE.Guid) {
		// const user = this.context.user(userId);
		// console.log("Assigning shirt " + shirtId + " to user " + user.name + "(" + user.id + ")");

		// If the user is wearing an asset, destroy it.
		this.removeUserAssets(this.attachedShirts, this.context.user(userId));

		const shirtRecord = ShirtDatabase[assetId];
		const transformRecord = TransformsDB[shirtRecord.transform];

		// If the user selected 'none', then early out.
		if (!shirtRecord.resourceName) {
			return;
		}

		// Create the model and attach it to the avatar
		this.attachedShirts.set(userId, MRE.Actor.CreateFromPrefab(this.context, {
			prefab: this.prefabs[assetId],
			actor: {
				transform: {
					local: {
						position: transformRecord.position,
						rotation: MRE.Quaternion.FromEulerAngles(
							transformRecord.rotation.x * MRE.DegreesToRadians,
							transformRecord.rotation.y * MRE.DegreesToRadians,
							transformRecord.rotation.z * MRE.DegreesToRadians),
						scale: transformRecord.scale,
					}
				},
				attachment: {
					attachPoint: transformRecord.attachPoint as MRE.AttachPoint,
					userId
				}
			}
		}));
	}

	private wearBelt(id: string, user: MRE.User) {
		const belt = BeltsDB.belts[id];
		const transformRecord = TransformsDB[BeltsDB.transform];
		const userId = user.id;

		console.log("assigning belt: " + id + " to user: " + user.name);

		// If the user is wearing aa belt, destroy it.
		this.removeUserAssets(this.assignedBelts, user);

		// Create the model and attach it to the avatar
		this.assignedBelts.set(userId, MRE.Actor.CreateFromPrefab(this.context, {
			prefab: this.prefabs[id],
			actor: {
				transform: {
					local: {
						position: transformRecord.position,
						rotation: MRE.Quaternion.FromEulerAngles(
							transformRecord.rotation.x * MRE.DegreesToRadians,
							transformRecord.rotation.y * MRE.DegreesToRadians,
							transformRecord.rotation.z * MRE.DegreesToRadians),
						scale: transformRecord.scale,
					}
				},
				attachment: {
					attachPoint: transformRecord.attachPoint as MRE.AttachPoint,
					userId
				}
			}
		}));
	}

	/*
	Removes assests associated with the user
	*/
	private removeUserAssets(map: Map<MRE.Guid, MRE.Actor>, user: MRE.User) {
		console.log("removeUserAssets for[" + user.id + "]: " + user.name);

		if(map.has(user.id)){
			map.get(user.id).destroy();
		}
		map.delete(user.id);
	}

	private removeAssets(user: MRE.User) {
		// remove any attached shirts
		console.log("Removing assets for user [" + user.id + "]: " + user.name); 
		this.removeUserAssets(this.attachedShirts, user);
		this.removeUserAssets(this.assignedBelts, user);
	}
}
