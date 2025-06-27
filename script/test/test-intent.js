const { ethers } = require('ethers');

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);

async function submitIntent() {
    try {
        const intent = {
            srcToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            dstToken: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
            amount: "1000000000000000000", // 1 WETH
            minReturn: "1800000000000000000000", // 1800 DAI
            user: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            validator: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            deadline: "1725000000"
        };

        console.log('Submitting intent:', JSON.stringify(intent, null, 2));

        const response = await fetch('http://localhost:3001/api/submit-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(intent),
        });

        console.log('Response status:', response.status);
        const text = await response.text();
        console.log('Response text:', text);
        
        try {
            const result = JSON.parse(text);
            console.log('Intent submitted successfully:', result);
        } catch (e) {
            console.log('Could not parse response as JSON');
        }

    } catch (error) {
        console.error('Error submitting intent:', error);
    }
}

submitIntent();
