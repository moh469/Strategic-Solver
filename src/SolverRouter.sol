// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SolverRouter {
    // Minimal implementation for deployment
    address public owner;
    constructor() {
        owner = msg.sender;
    }
}
