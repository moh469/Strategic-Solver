// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IntentsManager {

    enum IntentStatus {
        Pending,
        Matched,
        Fallback,
        Fulfilled,
        Cancelled
    }

    struct Intent {
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 chainId;
        IntentStatus status;
    }

    uint256 public nextIntentId = 0;
    mapping(uint256 => Intent) public intents;

    event IntentSubmitted(
        uint256 indexed intentId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 chainId
    );

    event IntentStatusUpdated(uint256 indexed intentId, IntentStatus newStatus);

    /// @notice Submit a new intent to swap tokens
    function submitIntent(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 chainId
    ) external returns (uint256) {

        uint256 intentId = nextIntentId++;
        intents[intentId] = Intent({
            user: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            chainId: chainId,
            status: IntentStatus.Pending
        });

        emit IntentSubmitted(
            intentId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            chainId
        );

        return intentId;
    }

    /// @notice Mark an intent's status (called by solver or system logic)
    // Changed from external to public to allow internal calls
    function updateIntentStatus(uint256 intentId, IntentStatus newStatus) public {
        require(intentId < nextIntentId, "Invalid intent ID");
        intents[intentId].status = newStatus;
        emit IntentStatusUpdated(intentId, newStatus);
    }

    // Now this works fine — calls internal/public function updateIntentStatus
    function markFulfilled(uint256 intentId) external {
        updateIntentStatus(intentId, IntentStatus.Fulfilled);
    }

    function getIntent(uint256 intentId) external view returns (Intent memory) {
        require(intentId < nextIntentId, "Intent does not exist");
        return intents[intentId];
    }

    function isPending(uint256 intentId) external view returns (bool) {
        return intents[intentId].status == IntentStatus.Pending;
    }
}
