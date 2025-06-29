// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import { IntentsManager } from "./IntentsManager.sol";
import { CCIPReceiver } from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import { IRouterClient } from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import { Client } from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

error InvalidIntent();
error InvalidChainSelector();
error InvalidSender();
error BridgeNotConfigured();
error InsufficientFee();
error FeesWithdrawFailed();

/// @title CrossChainIntentBridge
/// @notice Enables cross-chain intent transfer using Chainlink CCIP
contract CrossChainIntentBridge is CCIPReceiver, Ownable {
    IntentsManager public intentsManager;
    
    // Mapping of chain selector to bridge address on that chain
    mapping(uint64 => address) public bridgeAddresses;
    
    // Mapping to track trusted source chains and their bridges
    mapping(uint64 => address) public trustedSources;

    // Minimum fees required for cross-chain operations per destination
    mapping(uint64 => uint256) public minFees;

    event CrossChainIntentSent(uint64 destinationChainSelector, bytes32 messageId, uint256 intentId);
    event CrossChainIntentReceived(uint256 intentId, address user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 chainId);
    event BridgeAddressSet(uint64 chainSelector, address bridge);
    event TrustedSourceSet(uint64 chainSelector, address bridge);
    event MinFeeSet(uint64 chainSelector, uint256 fee);
    event FeesWithdrawn(address to, uint256 amount);

    constructor(address _intentsManager, address _ccipRouter) CCIPReceiver(_ccipRouter) Ownable(msg.sender) {
        intentsManager = IntentsManager(_intentsManager);
    }

    /// @notice Set the minimum fee required for a destination chain
    /// @param chainSelector The CCIP selector for the destination chain
    /// @param fee The minimum fee in native token
    function setMinFee(uint64 chainSelector, uint256 fee) external onlyOwner {
        minFees[chainSelector] = fee;
        emit MinFeeSet(chainSelector, fee);
    }

    /// @notice Set the bridge address for a destination chain
    /// @param chainSelector The CCIP selector for the destination chain
    /// @param bridgeAddress The address of the bridge on that chain
    function setBridgeAddress(uint64 chainSelector, address bridgeAddress) external onlyOwner {
        bridgeAddresses[chainSelector] = bridgeAddress;
        emit BridgeAddressSet(chainSelector, bridgeAddress);
    }

    /// @notice Set a trusted source chain and its bridge address
    /// @param chainSelector The CCIP selector for the source chain
    /// @param bridgeAddress The address of the bridge on that chain
    function setTrustedSource(uint64 chainSelector, address bridgeAddress) external onlyOwner {
        trustedSources[chainSelector] = bridgeAddress;
        emit TrustedSourceSet(chainSelector, bridgeAddress);
    }

    /// @notice Send an intent to another chain via CCIP
    /// @param destinationChainSelector The CCIP selector for the destination chain
    /// @param intentId The ID of the intent to send
    function sendIntentCrossChain(
        uint64 destinationChainSelector,
        uint256 intentId
    ) external payable {
        address destBridge = bridgeAddresses[destinationChainSelector];
        if (destBridge == address(0)) revert BridgeNotConfigured();
        if (msg.value < minFees[destinationChainSelector]) revert InsufficientFee();

        IntentsManager.Intent memory intent = intentsManager.getIntent(intentId);
        if (intent.user == address(0)) revert InvalidIntent();
        
        bytes memory data = abi.encode(intentId, intent.user, intent.tokenIn, intent.tokenOut, intent.amountIn, intent.minAmountOut, intent.chainId);
        
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(destBridge),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0)
        });
        
        bytes32 messageId = IRouterClient(getRouter()).ccipSend{value: msg.value}(
            destinationChainSelector,
            message
        );
        emit CrossChainIntentSent(destinationChainSelector, messageId, intentId);
    }

    /// @notice Receive an intent from another chain via CCIP
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        // Verify the sender is a trusted source
        uint64 sourceChainSelector = message.sourceChainSelector;
        address expectedSource = trustedSources[sourceChainSelector];
        if (expectedSource == address(0)) revert InvalidChainSelector();
        if (abi.decode(message.sender, (address)) != expectedSource) revert InvalidSender();

        (uint256 intentId, address user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 chainId) = abi.decode(message.data, (uint256, address, address, address, uint256, uint256, uint256));
        
        // Validate decoded data
        if (user == address(0)) revert InvalidIntent();
        
        intentsManager.submitIntent(tokenIn, tokenOut, amountIn, minAmountOut, chainId);
        emit CrossChainIntentReceived(intentId, user, tokenIn, tokenOut, amountIn, minAmountOut, chainId);
    }

    /// @notice Withdraw accumulated fees to the owner
    function withdrawFees() external onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = owner().call{value: amount}("");
        if (!success) revert FeesWithdrawFailed();
        emit FeesWithdrawn(owner(), amount);
    }

    /// @notice Allow the contract to receive native token for CCIP fees
    receive() external payable {}
}
