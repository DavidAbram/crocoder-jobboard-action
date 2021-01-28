const core = require('@actions/core');
const { exec } = require('@actions/exec');

const get = require('./get');
const archiveAll = require('./archiveAll');
const { wait } = require('./utils');


(async () => {
  try {

    const workingDirectory = core.getInput('working-directory');
    const authorName = core.getInput('author-name');
    const authorEmail = core.getInput('author-email');
    const branchPrefix = core.getInput('branch-prefix');
    const releaseBranchPrefix = core.getInput('release-branch-prefix');
    const commitMessage = core.getInput('commit-message');
    const githubToken = core.getInput('github-token');
    const pathToContentFolder = core.getInput('content-folder-path');
    const startingBranch = core.getInput('starting-branch')
    const jobBoardApiUrl = core.getInput('jobboard-api');
    const jobBoardApiToken = core.getInput('jobboard-token');
    const asigneeUsernames = core.getInput('asignees');
    const command = core.getInput('command');
    
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.name', authorName ]);
    await wait(200);
    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.email', authorEmail ]);
    await wait(200);

    switch (command) {
      case 'ARCHIVE_ALL':
        await archiveAll(jobBoardApiUrl, jobBoardApiToken, workingDirectory, pathToContentFolder);
        break;
      case 'GET':
      default:
        await get(owner, repo, branchPrefix, releaseBranchPrefix, commitMessage, githubToken, pathToContentFolder, jobBoardApiUrl, jobBoardApiToken, asigneeUsernames);
        break;
    }
  } catch (error) {
    console.log(error.message);
    core.setFailed(error.message)
  }
})();