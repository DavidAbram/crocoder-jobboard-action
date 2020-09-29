const core = require('@actions/core');
const { exec } = require('@actions/exec');

(async () => {
  try {
    await exec('ls');
  } catch (error) {
    console.log(error.message);
    core.setFailed(error.message)
  }
})();