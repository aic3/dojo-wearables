/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { AssetManager } from './assetManager';
import { RuntimeUserSettings } from './dojoTypes';
import { SettingsManager } from './settingsManager';
import { logUser } from './utility';

export abstract class DojoApp {
	protected settingsEndpoint: string;
	protected settingsKey: string;
	protected runtimeSettings = new Map<MRE.Guid, RuntimeUserSettings>();
	protected assetMgr: AssetManager;
	protected settingsMgr: SettingsManager;
	protected initialized = false;

	protected abstract preloadAssets(): void;
	protected abstract createUX(): Promise<void>;
	protected abstract initUserSession(user: MRE.User): void;
	protected abstract closeUserSession(user: MRE.User): void;

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
	public async started() {
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

		console.log("DojoApp Altspace VR web started");
	}

	// use () => {} syntax here to get proper scope binding when called via setTimeout()
	// if async is required, next line becomes private startedImpl = async () => {
	protected startedImpl = async () => {
		if (this.initialized) {
			console.log("startedImpl - App initialized.");
			return;
		}

		// Preload all the models.
		this.preloadAssets();

		// Show the menu.
		await this.createUX();

		this.initialized = true;
		console.log("Initialized: true");
	}

	/**
	 * Called when a user leaves the application (probably left the Altspace world where this app is running).
	 * @param user The user that left the building.
	 */
	protected userLeft(user: MRE.User) {
		// close out the user session
		this.closeUserSession(user);
	}

	/**
	 * Called when a user joins the app
	 * @param user 
	 */
	protected async userJoined(user: MRE.User) {
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

		// intialize the user session
		this.initUserSession(user);

		// set the runtime settings as initialized
		const initSettings = this.runtimeSettings.get(user.id);
		initSettings.intialized = true;
		this.runtimeSettings.set(user.id, initSettings);
		logUser(user, "intialized");
	}
}
