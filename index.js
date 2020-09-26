const core = require('@actions/core');
const { exec } = require('@actions/exec');
const { Octokit } = require("@octokit/rest");


(async () => {
  try {
    
    const files = core.getInput('files');
    const workingDirectory = core.getInput('working-directory');
    const authorName = core.getInput('author-name');
    const authorEmail = core.getInput('author-email');
    const branchPrefix = core.getInput('branch-prefix');
    const commitMessage = core.getInput('commit-message');
    const githubToken = core.getInput('github-token');

    const octokit = new Octokit({
      auth: githubToken,
    });
    
    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.name', authorName ])
    await exec('git', [ '-C', workingDirectory, 'config', '--local', 'user.email', authorEmail ])

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')

    files.foreach(file => {
      const { name, title, datetime, content }  = file;

      const branch = `${branchPrefix}/${title}`;
      const fullCommitMessage = `${commitMessage} ${title}`;

      await exec('git', [ '-C', workingDirectory, 'branch', branch]);
      await exec('git', [ '-C', workingDirectory, 'checkout', branch]);

      await exec('echo', [ content, '>' `${workingDirectory}/${name}`]);
      
      await exec('git', [ '-C', workingDirectory, 'add', '-A' ]);
      await exec('git', [ '-C', workingDirectory, 'commit', '--no-verify', '-m', fullCommitMessage ]);


      await octokit.pulls.create({
        owner,
        repo,
        title,
        head: branch,
        base: 'development',
        body: `
          ${title}
          ${new Date(datetime)}
        `,
        draft: true,
        maintainer_can_modify: true,
      });


      await exec('git', [ '-C', workingDirectory, 'checkout', branch]);
    
    });
  } catch (error) {
    core.setFailed(error.message)
  }
})();