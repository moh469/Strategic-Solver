#!/usr/bin/env node

// Script to update .env file with deployed contract addresses
// Run this after deployment to automatically update configuration

const fs = require('fs');
const path = require('path');

function updateEnvFile(deploymentOutput) {
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    // Read existing .env file or create new one
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    } else {
        // Use template as base
        const templatePath = path.join(__dirname, '.env.template');
        if (fs.existsSync(templatePath)) {
            envContent = fs.readFileSync(templatePath, 'utf8');
        }
    }
    
    // Parse deployment addresses from forge output
    const addresses = parseDeploymentOutput(deploymentOutput);
    
    // Update environment variables
    envContent = updateEnvValue(envContent, 'INTENTS_MANAGER_11155111', addresses.IntentsManager);
    envContent = updateEnvValue(envContent, 'COW_MATCHER_11155111', addresses.CoWMatcher);
    envContent = updateEnvValue(envContent, 'CFMM_ADAPTER_11155111', addresses.CFMMAdapter);
    envContent = updateEnvValue(envContent, 'CROSS_CHAIN_BRIDGE_11155111', addresses.CrossChainIntentBridge);
    envContent = updateEnvValue(envContent, 'SOLVER_ROUTER_11155111', addresses.SolverRouter);
    
    // Write back to .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ .env file updated with deployed contract addresses');
    console.log('\n📋 Deployed Addresses:');
    Object.entries(addresses).forEach(([name, address]) => {
        console.log(`${name}: ${address}`);
    });
}

function parseDeploymentOutput(output) {
    const addresses = {};
    const lines = output.split('\n');
    
    for (const line of lines) {
        if (line.includes('IntentsManager:')) {
            addresses.IntentsManager = line.split(':')[1].trim();
        } else if (line.includes('CoWMatcher:')) {
            addresses.CoWMatcher = line.split(':')[1].trim();
        } else if (line.includes('CFMMAdapter:')) {
            addresses.CFMMAdapter = line.split(':')[1].trim();
        } else if (line.includes('CrossChainIntentBridge:')) {
            addresses.CrossChainIntentBridge = line.split(':')[1].trim();
        } else if (line.includes('SolverRouter:')) {
            addresses.SolverRouter = line.split(':')[1].trim();
        }
    }
    
    return addresses;
}

function updateEnvValue(content, key, value) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(content)) {
        return content.replace(regex, newLine);
    } else {
        return content + '\n' + newLine;
    }
}

// If script is run directly with deployment output
if (require.main === module) {
    const deploymentOutput = process.argv[2];
    if (deploymentOutput) {
        updateEnvFile(deploymentOutput);
    } else {
        console.log('Usage: node update-env.js "<deployment_output>"');
    }
}

module.exports = { updateEnvFile };
