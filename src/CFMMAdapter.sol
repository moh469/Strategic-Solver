// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Adapter contract for routing trades through an AMM (e.g., Uniswap)
// Used as a fallback when direct user-to-user matching is not possible

import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IUniswapV2Router02} from "../lib/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "../src/IntentsManager.sol";
import {console} from "../lib/forge-std/src/console.sol";

// Minimal interface for Uniswap V2 router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract CFMMAdapter {
    // Address of the AMM router (e.g., Uniswap)
    address public immutable router;

    // Set router address at deployment
    constructor(address _router) {
        router = _router;
    }

    // Struct to hold swap parameters
    struct SwapParams {
        address user;         // User initiating the swap
        address tokenIn;      // Token to sell
        address tokenOut;     // Token to buy
        uint256 amountIn;     // Amount to sell
        uint256 minAmountOut; // Minimum acceptable output
    }

    /**
     * @notice Executes a token swap via the AMM router
     * @dev Called by backend or another contract as a fallback route
     * @param params Swap parameters (user, tokens, amounts)
     * @return success True if swap succeeded, false if failed and tokens returned
     */
    function swapViaAMM(SwapParams memory params) external returns (bool) {
        address[] memory path = new address[](2);
        path[0] = params.tokenIn;
        path[1] = params.tokenOut;

        // Check that contract has enough allowance from user
        require(
            IERC20(params.tokenIn).allowance(params.user, address(this)) >= params.amountIn,
            "Insufficient allowance"
        );

        // Transfer tokens from user to this contract
        require(
            IERC20(params.tokenIn).transferFrom(
                params.user,
                address(this),
                params.amountIn
            ),
            "TransferFrom failed"
        );
        
        // Approve router to spend tokens
        require(
            IERC20(params.tokenIn).approve(router, params.amountIn),
            "Approve failed"
        );

        // Try to execute the swap on the AMM
        try IUniswapV2Router(router).swapExactTokensForTokens(
            params.amountIn,
            params.minAmountOut,
            path,
            params.user, // Send output tokens directly to user
            block.timestamp + 300 // 5 minute deadline
        ) returns (uint[] memory amounts) {
            require(amounts[1] >= params.minAmountOut, "Insufficient output");
            return true;
        } catch {
            // If swap fails, return tokens to user
            IERC20(params.tokenIn).transfer(params.user, params.amountIn);
            return false;
        }
    }
}

// This contract only executes swaps as instructed by the backend.
// No matching or routing logic is present here.