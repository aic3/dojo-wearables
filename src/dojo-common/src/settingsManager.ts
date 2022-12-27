/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { apiCall, logUser } from './utility';
import { UserSettings } from './dojoTypes';
import { Headers } from 'node-fetch';

export class SettingsManager{
	private endpoint: string;
	private key: string;
	
	/**
	 * initialize the class
	 * @param endpoint 
	 * @param key 
	 */
	constructor(endpoint: string, key: string){
		this.endpoint = endpoint;
		this.key = key;
	}

	/**
	 * load the user settings
	 * @param user 
	 */
	public async loadUserSettings(user: MRE.User) {
		logUser(user, "loading settings using endpoint: " + this.endpoint);
		
		// exec the api call 
		const apiSet = await apiCall<UserSettings>(
			this.endpoint + "/api/getusersettings",
			"POST",
			this.getHeaders(),
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
		
		logUser(user, "user API returned: " + JSON.stringify(settings));
		return settings;
	}

	/**
	 * saves the current users settings
	 * @param settings 
	 */
	public async setUserSettings(settings: UserSettings){
		const endpoint = this.endpoint + "/api/setusersettings";
		console.log("Saving user settings [" + endpoint + "]: " + JSON.stringify(settings));

		// set the current settings		
		const userSettings = await apiCall<UserSettings>(
			endpoint,
			"POST",
			this.getHeaders(),
			JSON.stringify(settings));

		return userSettings;
	}

	/**
	 * Get the headers for the Azure function call
	 * @returns 
	 */
	private getHeaders() {
		const headers = new Headers();
		headers.append("x-functions-key", this.key);

		return headers;
	}
}
