# Summary

* Intiially derived from the [Wear a Hat demo](https://github.com/microsoft/mixed-reality-extension-sdk-samples/tree/master/samples/wear-a-hat)

* [MRE SDK Docs](https://microsoft.github.io/mixed-reality-extension-sdk/)
* [Good MRE Dev Series](https://everythingaltspace.com/mre-development/)

## Setup

* Open a command prompt to this folder and run `npm install`. Keep the command prompt open if you wish to follow the command-oriented instructions that follows.
* Open the root folder of this repo in VSCode if you wish to follow the VSCode-oriented instructions.

## Build

### Build dojo-common 

- run under src\dojo-common

```
npm install
npm run build
```

### Link the MRE root to the dojo-common
- run under any of the MREs: belt, coach, shirts
```
npm link ../dojo-common
npm install
npm run build
```

* Command line: `npm run build`.
* VSCode: `Shift+Ctrl+B`, then select 'build samples/hello-world'.

## Run

* Command line: `npm start`.
* VSCode: Switch to the 'Run' tab (`Ctrl+Shift+D` will open it), select 'Launch hello-world project' from the dropdown at the top, and then `F5` to start it.

MRE apps are NodeJS servers. They operate akin to a web server. When you start your MRE, it won't do much until you connect to it from a client application like AltspaceVR or the MRETestBed.

## Test in [AltspaceVR](https://altvr.com)

* Download [AltspaceVR](https://altvr.com) and create an account.
* Launch the application and sign in. You'll start in your "home space".
* Open the World Editor (only available if you indicate you want to participate in the [Early Access Program](https://altvr.com/early-access-program/) in your AltspaceVR settings).
* Add a `Basics` / `SDK App` object with a Target URI of `ws://127.0.0.1:3901`.
* See the the app appear in your space.

## Test in Unity using the [MRETestBed](https://www.github.com/mixed-reality-extension-sdk-samples)

* Install [Unity](https://unity3d.com/get-unity/download), version 2019.2.12f1 or later.
* Clone the [MRE Unity repo](https://github.com/microsoft/mixed-reality-extension-unity).
* Open the 'MRETestBed' Unity project.
* Select the 'Standalone' scene. This scene is preconfigured to connect to your MRE running locally.
* Start the Unity scene, and see the app appear.

## Advanced: Debug with Hot-Reload

Whether developing an MRE or another kind of app, an efficient dev/test loop is essential. Devs familiar with making browser-based apps will be familiar with webpack's notion of "hot reload", that is, automatically applying changes as they're made without the need to explicitly stop/rebuild/restart your app. NodeJS apps can do this too.

This setup requires launching the app from a terminal. VSCode has a built-in terminal, or you can open a separate command prompt.

### Start the MRE with hot-reload enabled

1. In the terminal, in this project's folder, run: `npm run debug-watch`. This will build and start the MRE. The `debug-watch` task continues to run in the background, watching for code changes. It will rebuild and restart the app whenever files are modified.
2. In VSCode, press `Ctrl+Shift+D` to open the 'Run' tab, select 'Attach to running project' from the drop down at the top, then press `F5` to attach the VSCode debugger. This step isn't required, but allows you to set breakpoints and debug MRE execution.

### See hot-reload in action

Once you have your MRE up and running, and you've successfully spawned an instance in AltspaceVR or another supported platform, it is time to make some code changes and see hot reload in action:

* In VSCode, open `src/tshirts/app.ts`.
* Find the line `contents: ''.padStart(8, ' ') + "Dojo Shirts",` near the bottom of the file and change it to `contents: ''.padStart(8, ' ') + "Pick a Hat",`.
* Save the file.
* Watch how the changes to your code are automatically detected and reloaded. See the menu text change in response to your modified code.

## Attribution

Based on the MRE SDK [Wear a Hat demo](https://github.com/microsoft/mixed-reality-extension-sdk-samples/tree/master/samples/wear-a-hat)

## Ccontainer debugging

### Build locally

```cmd
docker build . -t dojo-tshirt  
```

### Run a local container instance

```cmd
docker run -it --rm  --name dojo-tshirt -p 3901:3901 -e X_FUNCTIONS_KEY={key to azure functions} dojo-tshirt
```

## Running Azure Storage containers locally

* ref: [Use the Azurite emulator for local Azure Storage development](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=docker-hub)

```cmd
docker run --name azurite -d  -p 10000:10000 -p 10001:10001 -p 10002:10002 -v c:/dev/data/azurite:/data mcr.microsoft.com/azure-storage/azurite 
```

## Notes

[Typescript library tutorial](https://www.tsmean.com/articles/how-to-write-a-typescript-library/)
[Selectivly ignoring tslint errors](https://stackoverflow.com/questions/59729654/how-ignore-typescript-errors-with-ts-ignore)
