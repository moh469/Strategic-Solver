const fs = require('fs');
const path = require('path');

async function main() {
    // Read the sample intent
    const intent = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample-intent.json'), 'utf8'));
    
    console.log('Submitting intent:', intent);
    
    try {
        // Submit to backend
        const response = await fetch('http://localhost:3001/api/submit-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(intent),
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const text = await response.text();
        console.log('Raw response:', text);
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse response as JSON:', e.message);
            process.exit(1);
        }
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main().catch(console.error);
