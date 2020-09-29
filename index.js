const core = require('@actions/core');
const { exec } = require('@actions/exec');


(async () => {
  try {
    await exec('ls');
  } catch (error) {
    core.setFailed(error.message)
  }
})();