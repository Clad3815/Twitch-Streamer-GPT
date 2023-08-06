const axios = require('axios');
const fs = require('fs');
const path = require('path');

const repoOwner = 'Clad3815'; // Replace with the repository owner's username
const repoName = 'Twitch-Streamer-GPT'; // Replace with the repository name
const branch = 'main'; // Replace with the branch name

const fetchFiles = async (dirPath = '') => {
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${dirPath}?ref=${branch}`;
    const response = await axios.get(url);
    return response.data;
};

const downloadFile = async (filePath) => {
    const url = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${filePath}`;
    const response = await axios.get(url);
    fs.writeFileSync(path.join(__dirname, filePath), response.data);
    console.log(`Downloaded ${filePath}`);
};

const processFiles = async (dirPath = '') => {
    let files = await fetchFiles(dirPath);

    // Remove update.js from the list of files
    files = files.filter((file) => file.path !== 'update.js');

    for (const file of files) {
        if (file.type === 'file' && (file.path.endsWith('.js') || file.path.endsWith('.bat') || file.path.endsWith('package.json') )) {
            await downloadFile(file.path);
        } else if (file.type === 'dir') {
            // Recursively process subdirectories
            await processFiles(file.path);
        }
    }
};

console.log('Updating the code from GitHub...');

processFiles();
