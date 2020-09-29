const core = require('@actions/core');
const { exec } = require('@actions/exec');
const { Octokit } = require("@octokit/rest");
const fetch = require("node-fetch");


(async () => {
  try {

    const workingDirectory = core.getInput('working-directory');
    const authorName = core.getInput('author-name');
    const authorEmail = core.getInput('author-email');
    const branchPrefix = core.getInput('branch-prefix');
    const commitMessage = core.getInput('commit-message');
    const githubToken = core.getInput('github-token');
    const pathToContentFolder = core.getInput('content-folder-path');
    const startingBranch = core.getInput('starting-branch')
    const jobBoardApiUrl = core.getInput('jobboard-api');
    const jobBoardApiToken= core.getInput('jobboard-token');
    
    await exec('ls', ['status']);
  } catch (error) {
    core.setFailed(error.message)
  }
})();