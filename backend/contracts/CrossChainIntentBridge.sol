// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { IntentsManager } from "./IntentsManager.sol";
import { CCIPReceiver } from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import { IRouterClient } from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import { Client } from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

/// @title CrossChainIntentBridge
/// @notice Enables cross-chain intent transfer using Chainlink CCIP
contract CrossChainIntentBridge is CCIPReceiver {
    IntentsManager public intentsManager;

    event CrossChainIntentSent(uint64 destinationChainSelector, bytes32 messageId, uint256 intentId);
    event CrossChainIntentReceived(uint256 intentId, address user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 chainId);

    constructor(address _intentsManager, address _ccipRouter) CCIPReceiver(_ccipRouter) {
        intentsManager = IntentsManager(_intentsManager);
    }

    /// @notice Send an intent to another chain via CCIP
    /// @param destinationChainSelector The CCIP selector for the destination chain
    /// @param intentId The ID of the intent to send
    function sendIntentCrossChain(
        uint64 destinationChainSelector,
        uint256 intentId
    ) external payable {
        IntentsManager.Intent memory intent = intentsManager.getIntent(intentId);
        bytes memory data = abi.encode(intentId, intent.user, intent.tokenIn, intent.tokenOut, intent.amountIn, intent.minAmountOut, intent.chainId);
        
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(address(0)), // update as needed
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
        (uint256 intentId, address user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 chainId) = abi.decode(message.data, (uint256, address, address, address, uint256, uint256, uint256));
        intentsManager.submitIntent(tokenIn, tokenOut, amountIn, minAmountOut, chainId);
        emit CrossChainIntentReceived(intentId, user, tokenIn, tokenOut, amountIn, minAmountOut, chainId);
    }
}
