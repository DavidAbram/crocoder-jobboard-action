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

const wait = (ms) => {
  return new Promise((resolve) => {
      setTimeout(resolve, ms)
  })
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
    await wait(200);
    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.name', authorName ]);
    await wait(200);
    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.email', authorEmail ]);
    await wait(200);
    
    await exec('git', [ '-C', workingDirectory, 'checkout', startingBranch]);
    await wait(200);

    const result = await fetch(jobBoardApiUrl, {
      "method": "GET",
      "headers": {
        "authorization": jobBoardApiToken,
      }
    });
    await wait(200);

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
      await wait(200);
      await exec('git', [ '-C', workingDirectory, 'checkout', branch]);
      await wait(200);

      await exec('bash', [ '-c', `curl ${jobPostMarkdown} -o ${workingDirectory}/${pathToContentFolder}/${jobPostFilename}`]);
  
      await wait(200);
      await exec('git', [ '-C', workingDirectory, 'add', '-A' ]);
      await wait(200);
      await exec('git', [ '-C', workingDirectory, 'commit', '--no-verify', '-m', fullCommitMessage ]);
      await wait(200);
      await exec('git', [ '-C', workingDirectory, 'push', '--set-upstream', 'origin', branch ]);
      await wait(200);


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
      await wait(200);

      const { number } = response.data;

      await octokit.issues.setLabels({
        owner,
        repo,
        issue_number: number,
        labels: ['NEW JOBS'],
      });
      await wait(200);
      
      const result = await octokit.pulls.requestReviewers({
        owner,
        repo,
        pull_number: number,
        reviewers: [asignees[index]]
      });
      await wait(200);

      await exec('git', [ '-C', workingDirectory, 'checkout', startingBranch]); 
      console.log(`Lucky asignee is ${asignees[index]}`);

      createdPRs.push({
        branch,
        number,
      });
    }

    const changelog = `
# Release ${new Date().toDateString()};
${createdPRs.map(p => `- [${p.branch}](https://github.com/${owner}/${repo}/pull/${p.number})`).join('\n')}
    `;

    const releaseBranch = `${releaseBranchPrefix}/${new Date().toISOString().split('T')[0]}-${nanoid()}`;
    
    await exec('git', [ '-C', workingDirectory, 'checkout', startingBranch]);
    await wait(200);

    await exec('git', [ '-C', workingDirectory, 'branch', releaseBranch]);
    await wait(200);
    await exec('git', [ '-C', workingDirectory, 'checkout', releaseBranch]);
    await wait(200);
    await exec('git', [ '-C', workingDirectory, 'push', '--set-upstream', 'origin', releaseBranch ]);
    await wait(200);
    
    await exec('git', [ '-C', workingDirectory, 'checkout', startingBranch]);
    await wait(200);


  } catch (error) {
    console.log(error.message);
    core.setFailed(error.message)
  }
})();