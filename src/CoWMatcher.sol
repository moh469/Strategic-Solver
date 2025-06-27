// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { IntentsManager } from "./IntentsManager.sol";

/// @title CoWMatcher
/// @notice Settles matched intents on-chain, as determined by off-chain optimization (see integratedOptimizer.js)
contract CoWMatcher {
    IntentsManager public intentsManager;

    event MatchSettled(uint256 indexed intentAId, uint256 indexed intentBId, address userA, address userB, address tokenA, address tokenB, uint256 amountA, uint256 amountB);

    constructor(address _intentsManager) {
        intentsManager = IntentsManager(_intentsManager);
    }

    /// @notice Settle two matched intents (as determined off-chain)
    /// @dev Only verifies and settles, does not perform matching logic
    function settleMatchedOrders(uint256 intentAId, uint256 intentBId) external {
        IntentsManager.Intent memory a = intentsManager.getIntent(intentAId);
        IntentsManager.Intent memory b = intentsManager.getIntent(intentBId);
        require(a.status == IntentsManager.IntentStatus.Pending && b.status == IntentsManager.IntentStatus.Pending, "Already settled");
        require(a.tokenIn == b.tokenOut && a.tokenOut == b.tokenIn, "Tokens do not match");
        require(a.amountIn >= b.minAmountOut && b.amountIn >= a.minAmountOut, "Amounts do not match");
        require(a.user != address(0) && b.user != address(0), "Invalid user");
        require(a.user != b.user, "Cannot match with self");

        // Transfer tokens atomically
        require(IERC20(a.tokenIn).transferFrom(a.user, b.user, a.amountIn), "Transfer A->B failed");
        require(IERC20(b.tokenIn).transferFrom(b.user, a.user, b.amountIn), "Transfer B->A failed");

        // Mark intents as matched in IntentsManager
        intentsManager.updateIntentStatus(intentAId, IntentsManager.IntentStatus.Matched);
        intentsManager.updateIntentStatus(intentBId, IntentsManager.IntentStatus.Matched);

        emit MatchSettled(intentAId, intentBId, a.user, b.user, a.tokenIn, b.tokenIn, a.amountIn, b.amountIn);
    }
}
