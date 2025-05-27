const config = require('../config/config.json');
const { getAwsProfiles, getAwsCallerIdentity } = require('../services/awsService');
const {execPromiseWithOptions} = require("../utils/execUtils");

async function getProfiles(req, res) {
  try {
    const profiles = await getAwsProfiles();
    const callerIdentities = await Promise.all(profiles.map(async (profile) => {
      return {
        name: profile,
        identity: await getAwsCallerIdentity(profile)
      };
    }));
    return res.json(callerIdentities);
  } catch (error) {
    console.error('Error fetching AWS profiles and caller identities:', error);
    return res.status(500).send('Internal Server Error');
  }
}

async function getCurrentProfile(req, res) {
  const profileName = config.profile;

    if (!profileName) {
        return res.status(400).send('Profile name is required');
    }

    try {
      const isValidProfile = await getAwsCallerIdentity(profileName);

      return res.json(isValidProfile);
    }
    catch (error) {
        console.error(`Error fetching profile ${profileName}:`, error);
        return res.status(403).send('Forbidden: Invalid profile');
    }
}

async function login(req, res) {
  const profileName = config.profile;

  if (!profileName) {
    return res.status(400).send('Profile name is required');
  }

  try {
    const { stdout, stderr } = await execPromiseWithOptions(`aws sso login --profile ${profileName}`);

    if (stderr) {
      console.error(`Error logging in with profile ${profileName}:`, stderr);
      return res.status(500).send('Internal Server Error');
    }

    console.log(`Successfully logged in with profile ${profileName}:`, stdout);

    return res.json({ message: `Successfully logged in with profile ${profileName}`, stdout });
  } catch (error) {
    console.error(`Error logging in with profile ${profileName}:`, error);
    return res.status(403).send('Forbidden: Invalid profile');
  }
}

module.exports = {
    getProfiles,
  getCurrentProfile,
  login
};
