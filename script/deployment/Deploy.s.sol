// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../lib/forge-std/src/Script.sol";
import {IntentsManager} from "../../src/IntentsManager.sol";
import {CoWMatcher} from "../../src/CoWMatcher.sol";
import {CFMMAdapter} from "../../src/CFMMAdapter.sol";
import {CrossChainBridgeMock} from "../../src/CrossChainBridgeMock.sol";
import { CrossChainIntentBridge } from "../../src/CrossChainIntentBridge.sol";

contract DeployAll is Script {
    function run() external {
       uint256 deployerKey = uint256(vm.envBytes32("DEPLOYER_PRIVATE_KEY"));
        vm.startBroadcast(deployerKey);

        // Deploy IntentsManager
        IntentsManager intents = new IntentsManager();
        console.log("IntentsManager:", address(intents));

        // Deploy CoWMatcher
        CoWMatcher cow = new CoWMatcher(address(intents));
        console.log("CoWMatcher:", address(cow));

        // Replace this with real router if needed
        address router = vm.envAddress("UNISWAP_ROUTER_ADDRESS");

        // Deploy CFMMAdapter
        CFMMAdapter cfmm = new CFMMAdapter(router);
        console.log("CFMMAdapter:", address(cfmm));

        // Deploy CrossChainIntentBridge (requires IntentsManager and CCIP Router address)
        address ccipRouter = vm.envAddress("CCIP_ROUTER_ADDRESS");
        CrossChainIntentBridge bridge = new CrossChainIntentBridge(address(intents), ccipRouter);
        console.log("CrossChainIntentBridge:", address(bridge));

        // Optionally deploy CrossChainBridgeMock for testing
        CrossChainBridgeMock bridgeMock = new CrossChainBridgeMock();
        console.log("CrossChainBridgeMock:", address(bridgeMock));

        vm.stopBroadcast();
    }
}
