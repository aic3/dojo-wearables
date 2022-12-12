/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';

/**
 * DojoCoah Application
 */
export default class DojoCoach {
	// Container for preloaded dojo-coach prefabs.
	private assets: MRE.AssetContainer;

	// settings endpoint
	private speechSvcEndpoint = process.env["X_SPEECH_SVC_WEB"];
	
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

		// version to use with async code
		if (isDebug) {
			// use the local settings endpoint
			await new Promise(resolve => setTimeout(resolve, delay));
		}

		this.startedImpl();

		console.log("Dojo Coach Altspace VR web started. Speech endpoint :"
			+ this.speechSvcEndpoint);
	}

	// use () => {} syntax here to get proper scope binding when called via setTimeout()
	// if async is required, next line becomes private startedImpl = async () => {
	private startedImpl () {
		// create the rewards button
		this.createCoachOptions();
		console.log("App  started");
	}

	/**
	 * Called when a user leaves the application (probably left the Altspace world where this app is running).
	 * @param user The user that left the building.
	 */
	private userLeft(user: MRE.User) {
	}

	/**
	 * Called when a user joins the app
	 * @param user 
	 */
	private userJoined(user: MRE.User) {
		this.logUser(user, "intialized");
	}

	/**
	 * create the interactable buttons
	 */
	private createCoachOptions() {
		const menu = MRE.Actor.Create(this.context, {});
		const anchorX = 4;
		const anchorY = 2.5;

		this.createButton(menu.id,
			"promptUser",
			"User Prompt",
			{x:anchorX, y:anchorY - 0.5, z:0},
			user => {
				this.logUser(user, "prompting user");
				user.prompt("Question?", true)
				.then(response => {
					let responseText = "No response submitted";
					if(response.submitted){
						responseText = "We received: " + response.text;
					}

					user.prompt(responseText, false);
				});
			});

		this.createButton(menu.id,
			"playAudio",
			"Play Audio",
			{x:anchorX, y:anchorY - 1, z:0},
			user => {
				const date = new Date();
				// load the audo segment
				const msg = "Hello " + user.name + " you have activated AltSpace Audio on " + date.toLocaleString();
		
				this.playUserMsg(user, menu, msg)
				.then(value => {
					this.logUser(user, "audio complete");
				});
			});
	}

	private async playUserMsg(user: MRE.User, actor: MRE.Actor, msg: string){		
		const code = process.env["X_SPEECH_SVC_CODE"];
		const rootUri = this.speechSvcEndpoint; 
		const url = rootUri + "/api/ConvertTextToSpeech?code=" + code + "&text=" + msg + ".mp3";
		const soundName = "sounds" + MRE.newGuid();

		this.logUser(user, "sound: " + soundName + ", from :" + url);
		const sound = this.assets.createSound(soundName, {uri: url});
		await sound.created;

		// start the source 
		const instance = actor.startSound(sound.id, {looping: false,volume: 5, paused:false});
		
		this.logUser(user, "Sound created from: " + url);
		
		// return the sound instance
		return instance;
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
}
