#!/usr/bin/env node
/**
 * Template extractor - reads TypeScript const templates and outputs their content
 * Usage: node extract-template.js <template-file> <const-name>
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node extract-template.js <template-file> <const-name>');
    process.exit(1);
}

const [templateFile, constName] = args;
const templatePath = path.resolve(__dirname, 'templates', templateFile);

if (!fs.existsSync(templatePath)) {
    console.error(`Template file not found: ${templatePath}`);
    process.exit(1);
}

const content = fs.readFileSync(templatePath, 'utf8');

// Extract the template content between backticks
const regex = new RegExp(`export const ${constName} = \`([\\s\\S]*?)\`;`, 'm');
const match = content.match(regex);

if (!match) {
    console.error(`Could not find constant ${constName} in ${templateFile}`);
    process.exit(1);
}

// Output the template content (without the backticks)
process.stdout.write(match[1]);
