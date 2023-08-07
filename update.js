const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const repoOwner = 'Clad3815'; // Replace with the repository owner's username
const repoName = 'Twitch-Streamer-GPT'; // Replace with the repository name
const branch = 'main'; // Replace with the branch name
const hashFilePath = 'fileHashes.json';

const fetchFiles = async (dirPath = '') => {
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${dirPath}?ref=${branch}`;
    const response = await axios.get(url);
    return response.data.map((file) => ({
        path: file.path,
        sha: file.sha,
        type: file.type
    }));
};

const ensureDirExists = async (dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
};

const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch (error) {
        return false;
    }
};

const downloadFile = async (filePath, fileSha) => {
    // Check if the local hash matches the remote hash
    let localHashes;
    try {
        localHashes = JSON.parse(await fs.readFile(hashFilePath, 'utf8'));
    } catch (error) {
        localHashes = {}; // Initialize if file not found
    }

    if (localHashes[filePath] === fileSha) {
        console.log(`Skipped ${filePath} (no changes)`);
        return; // Skip download if hashes match
    }
    if (filePath.endsWith('.json')) {
        const fullPath = path.join(__dirname, filePath);
        console.log(`Checking if ${filePath} exists locally`);
        if (await fileExists(fullPath)) {
            console.log(`Skipped ${filePath} (already exists locally)`);
            return;
        }
    }

    const url = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${filePath}`;
    const response = await axios.get(url, { responseType: 'text' });
    const dirName = path.join(__dirname, path.dirname(filePath));
    await ensureDirExists(dirName);
    let data = response.data;
    if (filePath.endsWith('.json')) {
        try {
            data = JSON.stringify(JSON.parse(response.data), null, 2);
        } catch (error) {
            console.error(`Failed to parse JSON for ${filePath}`, error);
        }
    }

    await fs.writeFile(path.join(__dirname, filePath), data);

    // Update the local hash
    localHashes[filePath] = fileSha;
    await fs.writeFile(hashFilePath, JSON.stringify(localHashes, null, 2));

    console.log(`Downloaded ${filePath}`);
};

const processFile = async (file) => {
    if (file.path.endsWith('.js') || file.path.endsWith('.bat') || file.path.endsWith('.json')) {
        await downloadFile(file.path, file.sha); // Pass the SHA hash
        await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 0.1 second to avoid GitHub API rate limit
    }
};

const processDirectory = async (dirPath) => {
    await processFiles(dirPath);
};

const processFiles = async (dirPath = '') => {
    let files = await fetchFiles(dirPath);
    files = files.filter((file) => file.path !== 'update.js');

    for (const file of files) {
        if (file.type === 'file') {
            await processFile(file);
        } else if (file.type === 'dir') {
            await processDirectory(file.path);
        }
    }
};

console.log('Updating the code from GitHub...');
processFiles();
