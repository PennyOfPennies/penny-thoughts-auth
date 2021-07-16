import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
	const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
	const TEST_SECRET = core.getInput("TEST_SECRET");
	// const { context = {} } = github;
	// const { pull_request } = context.payload;

	// const exists = GITHUB_TOKEN ? "Token exists" : "Does not exist";
	
	// console.log("Hello, world!", exists, context);
	console.log("A Test", "JUST_A_SECRET")
	console.log("A Test", TEST_SECRET)
}

run();