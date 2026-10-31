// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal non-upgradeable task escrow prototype. Audit and network verification required.
/// @dev Token address must be verified before deployment. No admin withdrawal is provided.
interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract SkillMintEscrow {
    enum Status { None, Funded, Submitted, RevisionRequested, Released, Refunded, Disputed }

    struct Work {
        address client;
        address worker;
        uint256 amount;
        Status status;
        bytes32 submissionDigest;
    }

    IERC20Minimal public immutable token;
    uint256 public nextWorkId = 1;
    address public immutable arbitrator;
    uint256 private _entered = 1;
    mapping(uint256 => Work) public works;

    modifier nonReentrant() {
        require(_entered == 1, "REENTRANT_CALL");
        _entered = 2;
        _;
        _entered = 1;
    }

    error Unauthorized();
    error InvalidState();
    error InvalidAddress();
    error InvalidAmount();
    error TransferFailed();
    error InvalidResolution();

    event WorkFunded(uint256 indexed workId, address indexed client, address indexed worker, uint256 amount);
    event WorkSubmitted(uint256 indexed workId, bytes32 submissionDigest);
    event RevisionRequested(uint256 indexed workId);
    event WorkReleased(uint256 indexed workId, address indexed worker, uint256 amount);
    event WorkRefunded(uint256 indexed workId, address indexed client, uint256 amount);
    event WorkDisputed(uint256 indexed workId, address indexed by);
    event DisputeResolved(uint256 indexed workId, address indexed recipient, uint256 amount);

    constructor(address tokenAddress, address arbitratorAddress) {
        if (tokenAddress == address(0) || arbitratorAddress == address(0)) revert InvalidAddress();
        token = IERC20Minimal(tokenAddress);
        arbitrator = arbitratorAddress;
    }

    function fund(address worker, uint256 amount) external nonReentrant returns (uint256 workId) {
        if (worker == address(0) || worker == msg.sender) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (!token.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        workId = nextWorkId++;
        works[workId] = Work(msg.sender, worker, amount, Status.Funded, bytes32(0));
        emit WorkFunded(workId, msg.sender, worker, amount);
    }

    function submit(uint256 workId, bytes32 submissionDigest) external {
        Work storage w = works[workId];
        if (msg.sender != w.worker) revert Unauthorized();
        if (w.status != Status.Funded && w.status != Status.RevisionRequested) revert InvalidState();
        if (submissionDigest == bytes32(0)) revert InvalidAmount();
        w.submissionDigest = submissionDigest;
        w.status = Status.Submitted;
        emit WorkSubmitted(workId, submissionDigest);
    }

    function requestRevision(uint256 workId) external {
        Work storage w = works[workId];
        if (msg.sender != w.client) revert Unauthorized();
        if (w.status != Status.Submitted) revert InvalidState();
        w.status = Status.RevisionRequested;
        emit RevisionRequested(workId);
    }

    function approve(uint256 workId) external nonReentrant {
        Work storage w = works[workId];
        if (msg.sender != w.client) revert Unauthorized();
        if (w.status != Status.Submitted) revert InvalidState();
        w.status = Status.Released;
        uint256 amount = w.amount;
        w.amount = 0;
        if (!token.transfer(w.worker, amount)) revert TransferFailed();
        emit WorkReleased(workId, w.worker, amount);
    }

    function cancelBeforeSubmission(uint256 workId) external nonReentrant {
        Work storage w = works[workId];
        if (msg.sender != w.client) revert Unauthorized();
        if (w.status != Status.Funded) revert InvalidState();
        w.status = Status.Refunded;
        uint256 amount = w.amount;
        w.amount = 0;
        if (!token.transfer(w.client, amount)) revert TransferFailed();
        emit WorkRefunded(workId, w.client, amount);
    }

    function raiseDispute(uint256 workId) external {
        Work storage w = works[workId];
        if (msg.sender != w.client && msg.sender != w.worker) revert Unauthorized();
        if (w.status != Status.Funded && w.status != Status.Submitted && w.status != Status.RevisionRequested) revert InvalidState();
        w.status = Status.Disputed;
        emit WorkDisputed(workId, msg.sender);
    }

    /// @notice Resolves a disputed work item to either its client or worker.
    /// @dev The arbitrator is trusted; dispute policy and appeal process must be documented off-chain.
    function resolveDispute(uint256 workId, bool payWorker) external nonReentrant {
        if (msg.sender != arbitrator) revert Unauthorized();
        Work storage w = works[workId];
        if (w.status != Status.Disputed) revert InvalidState();
        address recipient = payWorker ? w.worker : w.client;
        uint256 amount = w.amount;
        if (amount == 0) revert InvalidAmount();
        w.amount = 0;
        w.status = payWorker ? Status.Released : Status.Refunded;
        if (!token.transfer(recipient, amount)) revert TransferFailed();
        emit DisputeResolved(workId, recipient, amount);
    }
}