// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "../../lib/forge-std/src/Script.sol";
import {IERC20} from "../../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IntentsManager} from "../../src/IntentsManager.sol";
import {CoWMatcher} from "../../src/CoWMatcher.sol";
import {CFMMAdapter} from "../../src/CFMMAdapter.sol";
import {CrossChainBridgeMock} from "../../src/CrossChainBridgeMock.sol";
import {DevOpsTools} from "../../lib/foundry-devops/src/DevOpsTools.sol";

contract EndToEndIntentFlow is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address user = vm.addr(deployerPrivateKey);
        console.log("User address:", user);

        vm.startBroadcast(deployerPrivateKey);

        uint256 chainId = block.chainid;

        IntentsManager intents = IntentsManager(DevOpsTools.get_most_recent_deployment("IntentsManager", chainId));
        CoWMatcher matcher = CoWMatcher(DevOpsTools.get_most_recent_deployment("CoWMatcher", chainId));
        CFMMAdapter cfmm = CFMMAdapter(DevOpsTools.get_most_recent_deployment("CFMMAdapter", chainId));
        CrossChainBridgeMock bridge = CrossChainBridgeMock(DevOpsTools.get_most_recent_deployment("CrossChainBridgeMock", chainId));

        address tokenA = 0xAa49045062B3216CF5Cf41A36Ec17FdA7Ec61b34; // mock WETH
        address tokenB = 0x5273cE0CFC959a12EDC5594eFD588034199D4f2D; // mock USDC

        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;

        // Approve intents manager, matcher, cfmm, bridge to spend tokenA & tokenB on behalf of user
        IERC20(tokenA).approve(address(intents), type(uint256).max);
        IERC20(tokenA).approve(address(matcher), type(uint256).max); // <-- Added approval for matcher
        IERC20(tokenA).approve(address(cfmm), type(uint256).max);
        IERC20(tokenA).approve(address(bridge), type(uint256).max);

        IERC20(tokenB).approve(address(intents), type(uint256).max);
        IERC20(tokenB).approve(address(matcher), type(uint256).max); // <-- Added approval for matcher
        IERC20(tokenB).approve(address(cfmm), type(uint256).max);
        IERC20(tokenB).approve(address(bridge), type(uint256).max);

        // Submit Intent A: tokenA -> tokenB
        uint256 intentA = intents.submitIntent(tokenA, tokenB, amountIn, minAmountOut, chainId);
        console.log("Intent A submitted:", intentA);

        // Submit Intent B: tokenB -> tokenA
        uint256 intentB = intents.submitIntent(tokenB, tokenA, amountIn, minAmountOut, chainId);
        console.log("Intent B submitted:", intentB);

        // Try match via CoW Matcher
        try matcher.settleMatchedOrders(intentA, intentB) {
            console.log("Matched via CoWMatcher:", intentA, intentB);
        } catch {
            console.log("CoWMatcher match failed. Falling back to CFMM...");

            CFMMAdapter.SwapParams memory fallbackParams = CFMMAdapter.SwapParams({
                user: user,
                tokenIn: tokenA,
                tokenOut: tokenB,
                amountIn: amountIn,
                minAmountOut: minAmountOut
            });

            bool success = cfmm.swapViaAMM(fallbackParams);
            require(success, "CFMM swap failed");
            console.log("Fallback swap via CFMM succeeded");
        }

        // Bridge tokenA out to chain 11155111
        bridge.bridgeOut(tokenA, 10 ether, 11155111);
        console.log("Bridged out tokenA to chain 11155111");

        vm.stopBroadcast();
    }
}
