/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { DojoData, logUser, DojoApp, UserSettings } from "dojo-common"

/**
 * DojoShirt Application - Showcasing avatar attachments.
 */
export default class DojoShirt extends DojoApp {
	// Container for preloaded dojo-shirt prefabs.
	
	private dojoData = new DojoData();
	private shirtData = this.dojoData.getShirtData();
	private beltData = this.dojoData.getBeltData();
	private transformData = this.dojoData.getTransformData();
	
	/**
	 * Constructs a new instance of this class.
	 * @param context The MRE SDK context.
	 * @param baseUrl The baseUrl to this project's `./public` folder.
	 */
	constructor(protected context: MRE.Context) {
		// call the parent constructor
		super(context);
	}

	// load the shirt data
	protected async preloadAssets() {
		await this.preloadShirts();
	}

	// load the ux
	protected createUX() {
		this.showShirtsMenu();
	}

	/**
	 * initialize the user session
	 * @param user 
	 * @param settings 
	 */
	protected initUserSession(user: MRE.User, settings: UserSettings): void {
		// intialize the user shirt
		if(settings.shirt !== null && settings.shirt !== undefined){
			logUser(user, "Intializing shirt: " + settings.shirt);
			this.wearShirt(settings.shirt, user);
		}
	}

	/**
	 * close out the session
	 * @param user 
	 */
	protected closeUserSession(user: MRE.User): void {
		// save the user settings
		this.saveUserSettings(user, true, false);

		// If the user was wearing anything, destroy it. Otherwise it would be
		// orphaned in the world.
		this.removeUserShirt(user);
	}

	/**
	 * Show a menu
	 */
	private showShirtsMenu() {
		// Create a parent object for all the menu items.
		const menu = MRE.Actor.Create(this.context, {});
		const shirts = Object.keys(this.dojoData.getShirtData());
		let y = 2.5;

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
					local: { position: { x: 0.5, y: y + 0.75, z: 0 } }
				}
			}
		});

		// Loop over the database, creating a menu item for each entry.
		for (const shirtId of shirts) {
			this.assetMgr.createMREButton(menu.id,
				shirtId,
				this.shirtData[shirtId].displayName,
				{x:0, y:y, z:0},
				user => this.wearShirt(shirtId, user));

			y = y - 0.5;
		}

		// create the clear button
		this.assetMgr.createMREButton(menu.id,
			"clearShirt",
			"Clear",
			{x:0, y:y, z:0},
			user => {
				this.removeUserShirt(user);
				const runtime = this.runtimeSettings.get(user.id);
				runtime.settings.shirt = null;
				this.runtimeSettings.set(user.id, runtime);
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
			Object.keys(this.shirtData).map(shirtId => {
				const asset = this.shirtData[shirtId];
				if (asset.resourceName) {
					return this.assetMgr.loadAsset(shirtId, asset.resourceName);					
				} else {
					return Promise.resolve();
				}
			})
		);
	}

	/**
	 * Instantiate an asset and attach it to the avatar's head.
	 * @param assetId The id of the asset in the database.
	 * @param userId The id of the user we will attach the hassetat to.
	 */
	private wearShirt(id: string, user: MRE.User) {
		// If the user is wearing an asset, destroy it.
		logUser(user, "assigning shirt");
		const prefabs = this.assetMgr.getPrefabs();
		this.removeUserShirt(user);

		const shirtRecord = this.shirtData[id];
		const transformRecord = this.transformData[shirtRecord.transform];
		const userId = user.id;

		// If the user selected 'none', then early out.
		if (!shirtRecord.resourceName) {
			return;
		}

		// Create the model and attach it to the avatar
		const runtime = this.runtimeSettings.get(user.id);

		runtime.shirt = MRE.Actor.CreateFromPrefab(this.context, {
			prefab: prefabs[id],
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
		});

		runtime.settings.shirt = id;
		this.runtimeSettings.set(user.id, runtime);
	}

	/**
	 * removes the allocated shirt
	 */
	private removeUserShirt(user: MRE.User) {
		const runtime = this.runtimeSettings.get(user.id);
		logUser(user, "removing shirt");

		if(runtime.shirt !== null){
			runtime.shirt.destroy();
			runtime.shirt = null;
		}

		this.runtimeSettings.set(user.id, runtime);
	}
}
