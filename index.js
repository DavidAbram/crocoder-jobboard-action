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
    const releaseBranchPrefix = core.getInput('release-branch-prefix');
    const commitMessage = core.getInput('commit-message');
    const githubToken = core.getInput('github-token');
    const pathToContentFolder = core.getInput('content-folder-path');
    const startingBranch = core.getInput('starting-branch')
    const jobBoardApiUrl = core.getInput('jobboard-api');
    const jobBoardApiToken = core.getInput('jobboard-token');
    
    
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    await exec('git', [ '-C', workingDirectory, 'status']);
    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.name', authorName ]);
    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.email', authorEmail ]);
    
    const releaseBranch = `${releaseBranchPrefix}/${new Date().toISOString().split('T')[0]}`;
    
    await exec('git', [ '-C', workingDirectory, 'branch', releaseBranch]);
    await exec('git', [ '-C', workingDirectory, 'push', '--set-upstream', 'origin', releaseBranch ]);

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

    const createdPRs = [];

    for (let index = 0; index < jobs.length; index++) {
      const { title, jobPostMarkdown, jobPostFilename, titleCompany, hashtags } = jobs[index];

      const branch = `${branchPrefix}/${titleCompany}`;
      const fullCommitMessage = `${commitMessage} ${title}`;

      await exec('git', [ '-C', workingDirectory, 'branch', branch]);
      await exec('git', [ '-C', workingDirectory, 'checkout', branch]);

      await exec('bash', [ '-c', `curl ${jobPostMarkdown} -o ${workingDirectory}/${pathToContentFolder}/${jobPostFilename}`]);
      
      await exec('git', [ '-C', workingDirectory, 'add', '-A' ]);
      await exec('git', [ '-C', workingDirectory, 'commit', '--no-verify', '-m', fullCommitMessage ]);
      await exec('git', [ '-C', workingDirectory, 'push', '--set-upstream', 'origin', branch ]);


      const response = await octokit.pulls.create({
        owner,
        repo,
        title,
        head: branch,
        base: startingBranch,
        body: `
# ${title}
### ${hashtags.join(' ')}
        
Dear CroCoder devs please use the table to evaluate the job ad.  
If you made any changes to the content of md file, please add a comment to the relevent row.  
Check the content of the job ad [here](https://github.com/${owner}/${repo}/blob/${branchPrefix}/${titleCompany}/${pathToContentFolder}/${jobPostFilename}).
        
Task | Evaluation | Comment
------------ | ------------- | ------------- 
Relevant job post | ✔️ / ❌ |
Readable title | ✔️ / ❌ |
Relevant hashtags | ✔️ / ❌ |
Content formatted correctly | ✔️ / ❌ |
Links are not broken | ✔️ / ❌ |
        `,
        draft: true,
        maintainer_can_modify: true,
      });

      const { number } = response.data;

      await octokit.issues.setLabels({
        owner,
        repo,
        issue_number: number,
        labels: ['NEW JOBS'],
      });

      await exec('git', [ '-C', workingDirectory, 'checkout', startingBranch]); 

      createdPRs.push({
        branch,
        number,
      });
    }

    const prMessage = createdPRs.map(p => `[${p.branch}](https://github.com/${owner}/${repo}/pull/${p.number}) | ✔️ / ❌`).join('\n');



    const response = await octokit.pulls.create({
      owner,
      repo,
      title: `Release ${new Date().toDateString()}`,
      head: startingBranch,
      base: releaseBranch,
      body: `
# Release ${new Date().toDateString()};
Don't merge until next PRs are merged or closed:  
Branch | Merged/Closed
------------ | ------------
${prMessage}
      `,
      draft: true,
      maintainer_can_modify: true,
    });

    const { number } = response.data;

    await octokit.issues.setLabels({
      owner,
      repo,
      issue_number: number,
      labels: ['RELEASE'],
    });


  } catch (error) {
    console.log(error.message);
    core.setFailed(error.message)
  }
})();