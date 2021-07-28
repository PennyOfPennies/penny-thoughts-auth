const lambdaLocal = require('lambda-local');
const path = require("path")

const eventsRecord = {
	simple: {
		key: 1,
		another_key: "Some text"
	}
}

/**
 * Runs the given list of events.
 * @param {string[]} events 
 */
function runEvents(events) {
	for (const event of events) {
		lambdaLocal.execute({
			event: eventsRecord[event],
			lambdaPath: path.join(__dirname, '../dist/index.js'),
			profilePath: '~/.aws/credentials',
			profileName: 'default',
			timeoutMs: 3000,
			callback: function(err, data) {
				if (err) {
						console.warn("ERROR", err);
				} else {
						// console.log("DATA", data);
				}
			}
		});
	}
}


const args = process.argv.slice(2)
const eventToUse = args.length > 0 ? args[0] : null
if (eventToUse == null || eventsRecord[eventToUse] == null) {
	console.log("RUNNING ALL EVENTS")
	runEvents(Object.keys(eventsRecord))
} else {
	console.log(`RUNNING EVENT ${eventToUse}`)
	runEvents([eventToUse])
}
