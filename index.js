const core = require('@actions/core');
const { exec } = require('@actions/exec');
const fetch = require("node-fetch");
const { Octokit } = require("@octokit/rest");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet(
  "ModuleSymbhasOwnPrABCDEFGHNRVfgctiUvzKqYTJkLxpZXIjQW",
  5
);

const shuffleArray = (array) => {
  const arrayCopy = array.slice(0);
  return arrayCopy.sort(() => Math.random() - 0.5);
}

const createAsigneeList = (usernames, prCount) => {
  const jobsPerUsername = split(prCount, usernames.length);
  console.log(jobsPerUsername);
  return shuffleArray(shuffleArray(usernames).flatMap((username, i) => Array(jobsPerUsername[i]).fill(username)));
}

const split = (number, parts) => {
  if(number % parts === 0) {
    return Array(parts).fill(number / parts);
  } else {
    const a =  number % parts;
    const b = (number - (number % parts)) / parts;
    return [...Array(a).fill(b+1), ...Array(parts-a).fill(b)];
  }
}



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
    const pathToChangelogFolder = core.getInput('changelog-folder-path');
    const startingBranch = core.getInput('starting-branch')
    const jobBoardApiUrl = core.getInput('jobboard-api');
    const jobBoardApiToken = core.getInput('jobboard-token');
    const asigneeUsernames = core.getInput('asignees');
    
    
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    await exec('git', [ '-C', workingDirectory, 'status']);
    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.name', authorName ]);
    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.email', authorEmail ]);
    
    await exec('git', [ '-C', workingDirectory, 'checkout', startingBranch]);

    const result = await fetch(jobBoardApiUrl, {
      "method": "GET",
      "headers": {
        "authorization": jobBoardApiToken,
      }
    });

    const { published, archived } = await result.json();

    const octokit = new Octokit({
      auth: githubToken,
    });

    const createdPRs = [];

    const asignees = createAsigneeList(asigneeUsernames.split(','), published.length);

    console.log(asigneeUsernames, asigneeUsernames.split(','), asignees);

    for (let index = 0; index < published.length; index++) {
      const { title, jobPostMarkdown, jobPostFilename, titleCompany, hashtags } = published[index];

      const branch = `${branchPrefix}/${titleCompany}-${nanoid()}`;
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
Check the content of the job ad [here](https://github.com/${owner}/${repo}/blob/${branch}/${pathToContentFolder}/${jobPostFilename}).
        
Task | Evaluation | Comment
------------ | ------------- | ------------- 
Relevant job post | ✔️ / ❌ |
Readable title | ✔️ / ❌ |
Title has less than 30 letters | ✔️ / ❌ |
Relevant hashtags | ✔️ / ❌ |
Relevant summary | ✔️ / ❌ |
Correct job type | ✔️ / ❌ |
Content formatted correctly | ✔️ / ❌ |
Links are not broken | ✔️ / ❌ |
Changed featured if needed | ✔️ / ❌ |
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
      console.log(`Lucky asignee is ${asignees[index]}`);
      
      const result = await octokit.pulls.requestReviewers({
        owner,
        repo,
        pull_number: number,
        reviewers: [asignees[index]]
      });

      console.log(result);

      await exec('git', [ '-C', workingDirectory, 'checkout', startingBranch]); 

      createdPRs.push({
        branch,
        number,
      });
    }

    const changelog = `
# Release ${new Date().toDateString()};
${createdPRs.map(p => `- [${p.branch}](https://github.com/${owner}/${repo}/pull/${p.number})`).join('\n')}
    `;

    const prMessage = createdPRs.map(p => `[${p.branch}](https://github.com/${owner}/${repo}/pull/${p.number}) | ✔️ / ❌`).join('\n');

    const releaseBranch = `${releaseBranchPrefix}/${new Date().toISOString().split('T')[0]}-${nanoid()}`;
    
    await exec('git', [ '-C', workingDirectory, 'checkout', startingBranch]);

    await exec('git', [ '-C', workingDirectory, 'branch', releaseBranch]);
    await exec('git', [ '-C', workingDirectory, 'checkout', releaseBranch]);
    await exec('git', [ '-C', workingDirectory, 'push', '--set-upstream', 'origin', releaseBranch ]);
    
    await exec('git', [ '-C', workingDirectory, 'checkout', startingBranch]);

    await exec('bash', [ '-c', `echo "${changelog}" > ${workingDirectory}/${pathToChangelogFolder}/release-${new Date().getTime()}.md`]);
    await exec('git', [ '-C', workingDirectory, 'add', '-A' ]);
    await exec('git', [ '-C', workingDirectory, 'commit', '--no-verify', '-m', `preparing for ${releaseBranch}` ]);
    await exec('git', [ '-C', workingDirectory, 'push', '--set-upstream', 'origin', startingBranch ]);


    const response = await octokit.pulls.create({
      owner,
      repo,
      title: `Release ${new Date().toDateString()}`,
      head: startingBranch,
      base: releaseBranch,
      body: `
# Release ${new Date().toDateString()}
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

    await octokit.pulls.requestReviewers({
      owner,
      repo,
      pull_number: number,
      reviewers: [asignees[index]]
    });


  } catch (error) {
    console.log(error.message);
    core.setFailed(error.message)
  }
})();