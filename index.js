const core = require('@actions/core');
const { exec } = require('@actions/exec');
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
    
    await exec('ls');
    await exec('git', [ '-C', workingDirectory, 'status']);
    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.name', authorName ])
    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.email', authorEmail ])
    
    const result = await fetch(jobBoardApiUrl, {
      "method": "GET",
      "headers": {
        "authorization": jobBoardApiToken,
      }
    });

    const jobs = await result.json();

    console.log(jobs);

  } catch (error) {
    console.log(error.message);
    core.setFailed(error.message)
  }
})();