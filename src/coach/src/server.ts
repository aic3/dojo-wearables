/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import dotenv from 'dotenv';
import { resolve as resolvePath } from 'path';
import App from './app';

// add some generic error handlers here, to log any exceptions we're not expecting
process.on('uncaughtException', err => console.log('uncaughtException', err));
process.on('unhandledRejection', reason => console.log('unhandledRejection', reason));

// Read .env if file exists
dotenv.config();

// This function starts the MRE server. It will be called immediately unless
// we detect that the code is running in a debuggable environment. If so, a
// small delay is introduced allowing time for the debugger to attach before
// the server starts accepting connections.
function runApp(port: number) {
	// Start listening for connections, and serve static files.
	console.log("creating MRE.Webhost on port: " + port);
	const server = new MRE.WebHost({
		// baseUrl: 'http://<ngrok-id>.ngrok.io',
		baseDir: resolvePath(__dirname, '../public') ,
		port: port
	});

	// Handle new application sessions
	server.adapter.onConnection(context => new App(context));
	console.log("Webhost created");
}

// Check whether code is running in a debuggable watched filesystem
// environment and if so, delay starting the app by one second to give
// the debugger time to detect that the server has restarted and reconnect.
// The delay value below is in milliseconds so 1000 is a one second delay.
// You may need to increase the delay or be able to decrease it depending
// on the speed of your machine.
const delay = 1000;
const pargv = process.execArgv.join();
const isDebug = pargv.includes('inspect') || pargv.includes('debug');

let port = 3901;
const portVar = process.argv.indexOf("port");

if (portVar > 0){
	port = parseInt(process.argv[portVar+1]);
}

console.log("argv: " + process.argv);
console.log("port: " + port);

// get the env variable if it is supplied
if (isDebug) {
	console.log("Running in debug mode");
	setTimeout(runApp, delay);
} else {
	console.log("Starting app on port: " + port);
	runApp(port);
}
