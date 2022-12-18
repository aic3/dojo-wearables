/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { DojoData, logUser, DojoApp, UserSettings } from "dojo-common"

/**
 * DojoShirt Application - Showcasing avatar attachments.
 */
export default class DojoBelt extends DojoApp {
	// Container for preloaded dojo-shirt prefabs.
	
	private dojoData = new DojoData();
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
		await this.preloadBelts();
	}

	// load the ux
	protected createUX() {
		this.createRewardButton();
	}

	/**
	 * initialize the user session
	 * @param user 
	 * @param settings 
	 */
	protected initUserSession(user: MRE.User, settings: UserSettings): void {
		// initialize the user belt
		const beltKey = this.getBeltKey(settings.level);
		if (beltKey !== null){
			logUser(user, "Initializing belt: " + beltKey);
			this.wearBelt(beltKey, settings.level, user);
		}
	}

	/**
	 * close out the session
	 * @param user 
	 */
	protected closeUserSession(user: MRE.User): void {
		// save the user settings
		this.saveUserSettings(user, false, true);

		// If the user was wearing anything, destroy it. Otherwise it would be
		// orphaned in the world.
		this.removeUserBelt(user);
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
			"saveBeltSettings",
			"Save Belt Settings",
			{x:anchorX, y:anchorY - 2, z:0},
			user => {
				this.saveUserSettings(user, false, true);
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
	 * assigns the belt to the user
	 */
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
}
