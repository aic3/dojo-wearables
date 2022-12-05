/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import fetch, { Headers } from "node-fetch";
import { BeltsDB, RuntimeUserSettings, ShirtDatabase, TransformsDB, UserSettings } from "./shirtTypeSpecs";

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

	// settings endpoint
	private settingsEndpoint = process.env["X_FUNCTIONS_WEB"]; 
	private runtimeSettings = new Map<MRE.Guid, RuntimeUserSettings>();
	private initialized = false;
	
	/**
	 * Constructs a new instance of this class.
	 * @param context The MRE SDK context.
	 * @param baseUrl The baseUrl to this project's `./public` folder.
	 */
	constructor(private context: MRE.Context) {
		console.log("creating MRE context for: " + context.user.name);
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
		this.logUser(user, "joined");

		const settings = await this.loadUserSettings(user);
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
			this.logUser(user, "Intializing shirt: " + settings.shirt);
			this.wearShirt(settings.shirt, user);
		}

		// initialize the user belt
		const beltKey = this.getBeltKey(settings.level);
		if (beltKey !== null){
			this.logUser(user, "Initializing belt: " + beltKey);
			this.wearBelt(beltKey, settings.level, user);
		}

		// set the runtime settings as initialized
		const initSettings = this.runtimeSettings.get(user.id);
		initSettings.intialized = true;
		this.runtimeSettings.set(user.id, initSettings);
		this.logUser(user, "intialized");
	}

	/**
	 * load the user settings
	 * @param user 
	 */
	private async loadUserSettings(user: MRE.User) {
		this.logUser(user, "loading settings using endpoint: " + this.settingsEndpoint);
		
		// exec the api call 
		const apiSet = await this.apiCall<UserSettings>(
			this.settingsEndpoint + "/api/getusersettings",
			"POST",
			null,
			JSON.stringify( {
				"id": user.id.toString()
			})
		);

		// convert the promise
		// need a cleaner way to convert
		const s = JSON.stringify(apiSet);
		const settings = JSON.parse(s) as UserSettings;

		if(settings.name === null){
			settings.name = user.name;
		}
		
		this.logUser(user, "user API returned: " + JSON.stringify(settings));
		return settings;
	}

	private async saveUserSettings(user: MRE.User){
		// save the user settings
		const runtime = this.runtimeSettings.get(user.id);
		if(runtime.settings !== null){
			// add the username if needed
			if(runtime.settings.name === null){
				runtime.settings.name = user.name;
			}

			await this.setUserSettings(runtime.settings)
			.then(function(success){
				console.log("[" + user.id + "|" + user.name + "]: settings saved");
			});
		}
	}

	/**
	 * saves the current users settings
	 * @param settings 
	 */
	private async setUserSettings(settings: UserSettings){
		const endpoint = this.settingsEndpoint + "/api/setusersettings";
		console.log("Saving user settings [" + endpoint + "]: " + JSON.stringify(settings));

		// set the current settings		
		const userSettings = await this.apiCall<UserSettings>(
			endpoint,
			"POST",
			null,
			JSON.stringify(settings));

		return userSettings;
	}

	/**
	 * api call with json unwrapping
	 * ref: ref: https://stackoverflow.com/questions/41103360/how-to-use-fetch-in-typescript
	 * @param uri 
	 * @param method 
	 * @param headers 
	 * @returns 
	 */
	private async apiCall<T>(uri: string, method = "GET", headers: Headers = null, body: string = null){
		const funcKey = process.env["X_FUNCTIONS_KEY"];
		if(headers === null){
			headers = new Headers();
		}
		headers.append("x-functions-key", funcKey);

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
		})
		.catch((reason) => {
			console.log("error calling: " + uri + ", message: " + reason);
		}); 
	}

	/**
	 * Show a menu
	 */
	private showShirtsMenu() {
		// Create a parent object for all the menu items.
		const menu = MRE.Actor.Create(this.context, {});
		const shirts = Object.keys(ShirtDatabase);
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
			this.createButton(menu.id,
				shirtId,
				ShirtDatabase[shirtId].displayName,
				{x:0, y:y, z:0},
				user => this.wearShirt(shirtId, user));

			y = y - 0.5;
		}

		// create the clear button
		this.createButton(menu.id,
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

		this.createButton(menu.id,
			"levelUp",
			"Level Up",
			{x:anchorX, y:anchorY, z:0},
			user => this.incrementLevel(1, user));

		this.createButton(menu.id,
			"levelDown",
			"Level Down",
			{x:anchorX, y:anchorY - 0.5, z:0},
			user => this.incrementLevel(-1, user));
		
		this.createButton(menu.id,
			"cleanLevel",
			"Clear",
			{x:anchorX, y:anchorY - 1, z:0},
			user => {
				this.removeUserBelt(user);
				const runtime = this.runtimeSettings.get(user.id);
				runtime.settings.level = -1;
				this.runtimeSettings.set(user.id, runtime);
			});

		this.createButton(menu.id,
			"saveSettings",
			"Save Settings",
			{x:anchorX, y:anchorY - 2, z:0},
			user => {
				this.saveUserSettings(user);
			});

		this.createButton(menu.id,
			"promptUser",
			"User Prompt",
			{x:anchorX, y:anchorY - 2.5, z:0},
			user => {
				this.logUser(user, "prompting user");
				user.prompt("Question?", true)
				.then(response => {
					let responseText = "No response submitted";
					if(response.submitted){
						responseText = "We received: " + response.text;
					}

					this.logUser
					user.prompt(responseText, false);
				});
			});
	}

	/**
	 * Creates an MRE button
	 * @param parentId 
	 * @param name 
	 * @param text 
	 * @param position 
	 * @param handler 
	 */
	private createButton(parentId: MRE.Guid,
		name: string,
		text: string,
		position: MRE.Vector3Like, 
		handler: MRE.ActionHandler<MRE.ButtonEventData>) {

		// Create menu button
		const buttonMesh = this.assets.createBoxMesh('button', 0.3, 0.3, 0.01);

		// create the level up button
		const button = MRE.Actor.Create(this.context, {
			actor: {
				parentId: parentId,
				name: name,
				appearance: { meshId: buttonMesh.id },
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: { position: { x: position.x, y:position.y, z:position.z } }
				}
			}
		});

		// ensure the value will clear the current belt
		button.setBehavior(MRE.ButtonBehavior)
			.onClick(handler);

		// Create a label for the  button
		MRE.Actor.Create(this.context, {
			actor: {
				parentId: parentId,
				name: 'label',
				text: {
					contents: text,
					height: 0.5,
					anchor: MRE.TextAnchorLocation.MiddleLeft
				},
				transform: {
					local: { position: { x: position.x + 0.5, y:position.y, z:position.z } }
				}
			}
		});
	}

	/**
	 * returns the belt key for a target level
	 */
	private getBeltKey(level: number){
		const belts = Object.keys(BeltsDB.belts);
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
		const belts = Object.keys(BeltsDB.belts);
		let beltKey = null;
		let runtime = this.runtimeSettings.get(user.id);

		// get the current level 
		if(runtime.settings !== null) {
			level = runtime.settings.level;
		}

		level += increment;

		// apply the belt to the user
		if(level < 0) {
			this.logUser(user, "Min level reached: " + level);
			this.removeUserBelt(user);
			
			// min level
			level = -1;
		} else if (level > belts.length) {
			this.logUser(user, "Max level reached: " + level);
			beltKey = belts[belts.length - 1];

			// max level
			level = belts.length - 1;
		} else {
			beltKey = belts[level];

			this.logUser(user, "Setting user level: " + level);
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
			Object.keys(ShirtDatabase).map(shirtId => {
				const asset = ShirtDatabase[shirtId];
				if (asset.resourceName) {
					return this.preloadAsset(shirtId, asset.resourceName);					
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
	 * logs a user activity
	 */
	private logUser(user: MRE.User, msg: string){
		console.log("[" + user.id + "|" + user.name + "]: " + msg);
	}

	/**
	 * Instantiate an asset and attach it to the avatar's head.
	 * @param assetId The id of the asset in the database.
	 * @param userId The id of the user we will attach the hassetat to.
	 */
	private wearShirt(id: string, user: MRE.User) {
		// If the user is wearing an asset, destroy it.
		this.logUser(user, "assigning shirt");
		this.removeUserShirt(user);

		const shirtRecord = ShirtDatabase[id];
		const transformRecord = TransformsDB[shirtRecord.transform];
		const userId = user.id;

		// If the user selected 'none', then early out.
		if (!shirtRecord.resourceName) {
			return;
		}

		// Create the model and attach it to the avatar
		const runtime = this.runtimeSettings.get(user.id);

		runtime.shirt = MRE.Actor.CreateFromPrefab(this.context, {
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
		});

		runtime.settings.shirt = id;
		this.runtimeSettings.set(user.id, runtime);
	}

	private wearBelt(id: string, level: number, user: MRE.User) {
		const transformRecord = TransformsDB[BeltsDB.transform];
		const userId = user.id;

		this.logUser(user, "assigning belt id: " + id);
		
		// If the user is wearing a belt, destroy it.
		this.removeUserBelt(user);

		// Create the model and attach it to the avatar
		const runtime = this.runtimeSettings.get(user.id);

		// create the belt
		runtime.belt = MRE.Actor.CreateFromPrefab(this.context, {
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
		});

		// update the current setting
		runtime.settings.level = level;
		this.runtimeSettings.set(user.id, runtime);
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
		this.logUser(user, "removing belt");

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
		this.logUser(user, "removing shirt");

		if(runtime.shirt !== null){
			runtime.shirt.destroy();
			runtime.shirt = null;
		}

		this.runtimeSettings.set(user.id, runtime);
	}
}
