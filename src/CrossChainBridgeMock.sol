// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @title CrossChainBridgeMock
/// @notice A simplified contract that simulates bridging tokens between chains.
/// @dev This is for demonstration only and does actual token transfers for bridgeOut.
contract CrossChainBridgeMock {
    /// @notice Event emitted when tokens are bridged out
    event BridgedOut(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 targetChainId
    );

    /// @notice Event emitted when tokens are bridged in
    event BridgedIn(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 sourceChainId
    );

    /// @notice Simulated balances (for bridgeIn calls)
    mapping(address => mapping(address => uint256)) public userBalances;

    /// @notice Deposit tokens for bridging to another chain
    /// @dev Transfers tokens from user to this contract to simulate locking tokens.
    function bridgeOut(
        address token,
        uint256 amount,
        uint256 targetChainId
    ) external {
        require(amount > 0, "Amount must be > 0");

        IERC20 tokenContract = IERC20(token);

        // Check allowance and balance before transferFrom
        require(tokenContract.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
        require(tokenContract.balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Transfer tokens from the user to this contract
        bool success = tokenContract.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        emit BridgedOut(msg.sender, token, amount, targetChainId);
    }

    /// @notice Finalize bridging in (simulate receiving tokens from another chain)
    /// @dev In real implementation, this would be triggered by cross-chain message
    function bridgeIn(
        address user,
        address token,
        uint256 amount,
        uint256 sourceChainId
    ) external {
        require(amount > 0, "Amount must be > 0");

        userBalances[user][token] += amount;

        emit BridgedIn(user, token, amount, sourceChainId);
    }
}
