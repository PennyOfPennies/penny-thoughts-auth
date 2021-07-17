import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
	const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
	const TEST_SECRET = core.getInput("TEST_SECRET");
	// const { context = {} } = github;
	// const { pull_request } = context.payload;
	if (TEST_SECRET == "SUPER_DEV_SECRET") console.log("should be dev")
	else console.log("should be production")
	console.log("A Test", TEST_SECRET.split("_").join(" "))
}

run();