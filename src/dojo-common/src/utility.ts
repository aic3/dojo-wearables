/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import fetch, { Headers } from "node-fetch";

/**
	 * api call with json unwrapping
	 * ref: ref: https://stackoverflow.com/questions/41103360/how-to-use-fetch-in-typescript
	 * @param uri 
	 * @param method 
	 * @param headers 
	 * @returns 
	 */
export async function apiCall<T>(uri: string, method = "GET", headers: Headers = null, body: string = null) {
	return await fetch(uri, {
		method: method,
		headers: headers,
		body: body
	})
		.then((response) => {
			if (!response.ok) {
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
	 * generic error logging
	 */
export function logError(e: any){
	console.log("error: " + e);
	MRE.log.error("app", e);
}

/**
	 * logs a user activity
	 */
export function logUser(user: MRE.User, msg: string){
	console.log("[" + user.id + "|" + user.name + "]: " + msg);
}
