/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
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

type TransformsDB = {
	[key: string]: TransformDescriptor;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ShirtDatabase: ShirtDatabase = require('../public/shirts.json');

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
		// Show the menu.
		this.showShirtsMenu();
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
					contents: ''.padStart(8, ' ') + "Wear a Shirt",
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
					console.log("pre-loading asset: " + shirtId);
					return this.assets.loadGltf(asset.resourceName)
						.then(assets => {
							console.log(asset.resourceName + " loaded");
							this.prefabs[shirtId] = assets.find(a => a.prefab !== null) as MRE.Prefab;
						})
						.catch(e => {
							console.log("error: " + e);
							MRE.log.error("app", e);
						});
				} else {
					return Promise.resolve();
				}
			}));
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
		this.removeAssets(this.context.user(userId));

		const shirtRecord = ShirtDatabase[assetId];
		const transformRecord = TransformsDB[shirtRecord.transform];

		// If the user selected 'none', then early out.
		if (!shirtRecord.resourceName) {
			return;
		}

		// Create the model and attach it to the avatar's head.
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

	private removeAssets(user: MRE.User) {
		if (this.attachedShirts.has(user.id)) { this.attachedShirts.get(user.id).destroy(); }
		this.attachedShirts.delete(user.id);
	}
}
