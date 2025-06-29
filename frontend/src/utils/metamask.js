import { ethers } from "ethers";

/**
 * Request a signature from the user using MetaMask.
 * @param {string} message - The message to be signed.
 * @returns {Promise<{signature: string, address: string}>} - The signature and the user's address.
 */
export async function requestSignature(message) {
    if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Request the user's address
    const address = await signer.getAddress();

    // Request the user's signature
    const signature = await signer.signMessage(message);

    return { signature, address };
}
