const core = require('@actions/core');
const { exec } = require('@actions/exec');
const fetch = require("node-fetch");
const { Octokit } = require("@octokit/rest");

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

    const octokit = new Octokit({
      auth: githubToken,
    });

    for (let index = 0; index < jobs.length; index++) {
      const { title, jobPostMarkdown, jobPostFilename, titleCompany } = jobs[index];

      const branch = `${branchPrefix}/${titleCompany}`;
      const fullCommitMessage = `${commitMessage} ${title}`;

      await exec('git', [ '-C', workingDirectory, 'branch', branch]);
      await exec('git', [ '-C', workingDirectory, 'checkout', branch]);

      await exec('bash', [ '-c', `curl ${jobPostMarkdown} -o ${workingDirectory}/${pathToContentFolder}/${jobPostFilename}`]);
      
      await exec('git', [ '-C', workingDirectory, 'add', '-A' ]);
      await exec('git', [ '-C', workingDirectory, 'commit', '--no-verify', '-m', fullCommitMessage ]);
      await exec('git', [ '-C', workingDirectory, 'push' ]);


      /*await octokit.pulls.create({
        owner,
        repo,
        title,
        head: branch,
        base: startingBranch,
        body: `
          ${title}
          ${new Date(datetime)}
        `,
        draft: true,
        maintainer_can_modify: true,
      });*/

      await exec('git', [ '-C', workingDirectory, 'checkout', startingBranch]); 
    }
  } catch (error) {
    console.log(error.message);
    core.setFailed(error.message)
  }
})();