/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { logError } from './utility';

export class AssetManager {
	private context: MRE.Context;
	private assets: MRE.AssetContainer;
	private prefabs: { [key: string]: MRE.Prefab } = {};

	constructor(context: MRE.Context) {
		this.context = context;
		this.assets = new MRE.AssetContainer(context);
	}

	/**
	 * Creates an MRE button
	 * @param parentId 
	 * @param name 
	 * @param text 
	 * @param position 
	 * @param handler 
	 */
	public createMREButton( parentId: MRE.Guid,
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
					local: { position: { x: position.x, y: position.y, z: position.z } }
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
					local: { position: { x: position.x + 0.5, y: position.y, z: position.z } }
				}
			}
		});
	}

	public getPrefabs() {
		return this.prefabs;
	}

	/**
	 * preloads asset into the local prefabs
	 */
	public loadAsset(id: string, filename: string) {
		console.log("pre-loading asset[" + id + "]: " + filename);
		return this.assets.loadGltf(filename)
			.then(assets => {
				console.log(id + " loaded");
				this.prefabs[id] = assets.find(a => a.prefab !== null) as MRE.Prefab;
			})
			.catch(e => {
				logError(e);
			});
	}
}
