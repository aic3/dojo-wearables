/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { RuntimeUserSettings, DojoData, SettingsManager, logUser, AssetManager } from "dojo-common"

/**
 * DojoShirt Application - Showcasing avatar attachments.
 */
export default class DojoShirt {
	// Container for preloaded dojo-shirt prefabs.
	
	private dojoData = new DojoData();
	private shirtData = this.dojoData.getShirtData();
	private beltData = this.dojoData.getBeltData();
	private transformData = this.dojoData.getTransformData();

	// settings endpoint
	private settingsEndpoint = process.env["X_FUNCTIONS_WEB"]; 
	private settingsKey = process.env["X_FUNCTIONS_KEY"];
	private runtimeSettings = new Map<MRE.Guid, RuntimeUserSettings>();
	private assetMgr: AssetManager;
	private settingsMgr: SettingsManager;
	private initialized = false;
	
	/**
	 * Constructs a new instance of this class.
	 * @param context The MRE SDK context.
	 * @param baseUrl The baseUrl to this project's `./public` folder.
	 */
	constructor(private context: MRE.Context) {
		console.log("creating MRE context for: " + context.user.name);
		this.settingsMgr = new SettingsManager(this.settingsEndpoint, this.settingsKey);
		this.assetMgr = new AssetManager(context);

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
		const execArgv = process.execArgv.join();
		const argv = process.argv.join();
		const isDebug = argv.includes('inspect') || argv.includes('debug') 
			|| execArgv.includes('inspect') || execArgv.includes('debug');

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
		if(this.initialized){
			console.log(" startedImpl - App initialized.");
			return;
		}

		// Preload all the models.
		await this.preloadShirts();
		await this.preloadBelts();

		// Show the menu.
		this.showShirtsMenu();

		// create the rewards button
		this.createRewardButton();
		this.initialized = true;
		console.log("Initialized: true");
	}

	/**
	 * Called when a user leaves the application (probably left the Altspace world where this app is running).
	 * @param user The user that left the building.
	 */
	private userLeft(user: MRE.User) {
		// save the user settings
		this.saveUserSettings(user);

		// If the user was wearing anything, destroy it. Otherwise it would be
		// orphaned in the world.
		this.removeAssets(user);
	}

	/**
	 * Called when a user joins the app
	 * @param user 
	 */
	private async userJoined(user: MRE.User) {
		logUser(user, "joined");

		const settings = await this.settingsMgr.loadUserSettings(user);
		const runtime: RuntimeUserSettings = {
			intialized: false,
			settings: settings,
			shirt: null,
			belt: null
		};

		// set the runtime settings
		this.runtimeSettings.set(user.id, runtime);

		// ensure the started implementation has finished
		await this.startedImpl();

		// intialize the user shirt
		if(settings.shirt !== null && settings.shirt !== undefined){
			logUser(user, "Intializing shirt: " + settings.shirt);
			this.wearShirt(settings.shirt, user);
		}

		// initialize the user belt
		const beltKey = this.getBeltKey(settings.level);
		if (beltKey !== null){
			logUser(user, "Initializing belt: " + beltKey);
			this.wearBelt(beltKey, settings.level, user);
		}

		// set the runtime settings as initialized
		const initSettings = this.runtimeSettings.get(user.id);
		initSettings.intialized = true;
		this.runtimeSettings.set(user.id, initSettings);
		logUser(user, "intialized");
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
	 * create the interactable buttons
	 */
	private createRewardButton() {
		const menu = MRE.Actor.Create(this.context, {});
		const anchorX = 4;
		const anchorY = 2.5;

		this.assetMgr.createMREButton(menu.id,
			"levelUp",
			"Level Up",
			{x:anchorX, y:anchorY, z:0},
			user => this.incrementLevel(1, user));

		this.assetMgr.createMREButton(menu.id,
			"levelDown",
			"Level Down",
			{x:anchorX, y:anchorY - 0.5, z:0},
			user => this.incrementLevel(-1, user));
		
		this.assetMgr.createMREButton(menu.id,
			"cleanLevel",
			"Clear",
			{x:anchorX, y:anchorY - 1, z:0},
			user => {
				this.removeUserBelt(user);
				const runtime = this.runtimeSettings.get(user.id);
				runtime.settings.level = -1;
				this.runtimeSettings.set(user.id, runtime);
			});

		this.assetMgr.createMREButton(menu.id,
			"saveSettings",
			"Save Settings",
			{x:anchorX, y:anchorY - 2, z:0},
			user => {
				this.saveUserSettings(user);
				user.prompt("Settings Saved", false);
			});
	}

	/**
	 * returns the belt key for a target level
	 */
	private getBeltKey(level: number){
		const belts = Object.keys(this.beltData.belts);
		let beltKey = null;

		if(level >= 0 && level < belts.length) {
			beltKey = belts[level];
		}

		return beltKey;
	}

	/**
	 * incrementLevel
	 */
	private incrementLevel(increment: number, user: MRE.User) {
		let level = -1;
		const belts = Object.keys(this.beltData.belts);
		let beltKey = null;
		let runtime = this.runtimeSettings.get(user.id);

		// get the current level 
		if(runtime.settings !== null) {
			level = runtime.settings.level;
		}

		level += increment;

		// apply the belt to the user
		if(level < 0) {
			logUser(user, "Min level reached: " + level);
			this.removeUserBelt(user);
			
			// min level
			level = -1;
		} else if (level > belts.length) {
			logUser(user, "Max level reached: " + level);
			beltKey = belts[belts.length - 1];

			// max level
			level = belts.length - 1;
		} else {
			beltKey = belts[level];

			logUser(user, "Setting user level: " + level);
			this.wearBelt(beltKey, level, user);
		}

		// update the runtime settings
		runtime = this.runtimeSettings.get(user.id);
		
		// update the level 
		runtime.settings.level = level;
		this.runtimeSettings.set(user.id, runtime);
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
	 * preload the dojo belt assets 
	 */
	private preloadBelts() {
		return Promise.all(
			Object.keys(this.beltData.belts).map(beltId => {
				const belt = this.beltData.belts[beltId];
				return this.assetMgr.loadAsset(beltId, belt.resourceName);				
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

	private wearBelt(id: string, level: number, user: MRE.User) {
		const transformRecord = this.transformData[this.beltData.transform];
		const userId = user.id;
		const prefabs = this.assetMgr.getPrefabs();

		logUser(user, "assigning belt id: " + id);
		
		// If the user is wearing a belt, destroy it.
		this.removeUserBelt(user);

		// Create the model and attach it to the avatar
		const runtime = this.runtimeSettings.get(user.id);

		// create the belt
		runtime.belt = MRE.Actor.CreateFromPrefab(this.context, {
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

		// update the current setting
		runtime.settings.level = level;
		this.runtimeSettings.set(user.id, runtime);
	}

	private async saveUserSettings(user: MRE.User){
		// save the user settings
		const runtime = this.runtimeSettings.get(user.id);
		if(runtime.settings !== null){
			// add the username if needed
			if(runtime.settings.name === null){
				runtime.settings.name = user.name;
			}

			await this.settingsMgr.setUserSettings(runtime.settings)
			.then(function(success){
				console.log("[" + user.id + "|" + user.name + "]: settings saved");
			});
		}
	}

	/**
	 * 
	 * @param user Remove the user assets
	 */
	private removeAssets(user: MRE.User) {
		// remove any attached assets
		this.removeUserBelt(user);
		this.removeUserShirt(user);
	}

	/**
	 * removes the allocated belt
	 * @param user 
	 */
	private removeUserBelt(user: MRE.User){
		const runtime = this.runtimeSettings.get(user.id);
		logUser(user, "removing belt");

		if(runtime.belt !== null){
			runtime.belt.destroy();
			runtime.belt = null;
		}

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
