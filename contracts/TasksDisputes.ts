export const TasksDisputesContract = {
  address: "0xa35bd39899a8619344ceb953bab0b3333d2f0ea7",
  abi: [
    {
      type: "constructor",
      inputs: [
        {
          name: "_tasks",
          type: "address",
          internalType: "contract ITasks",
        },
      ],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "createDispute",
      inputs: [
        {
          name: "_dao",
          type: "address",
          internalType: "contract IDAO",
        },
        { name: "_metadata", type: "bytes", internalType: "bytes" },
        { name: "_startDate", type: "uint64", internalType: "uint64" },
        { name: "_endDate", type: "uint64", internalType: "uint64" },
        {
          name: "_disputeInfo",
          type: "tuple",
          internalType: "struct ITaskDisputes.DisputeInfo",
          components: [
            {
              name: "taskId",
              type: "uint256",
              internalType: "uint256",
            },
            {
              name: "partialNativeReward",
              type: "uint96[]",
              internalType: "uint96[]",
            },
            {
              name: "partialReward",
              type: "uint88[]",
              internalType: "uint88[]",
            },
          ],
        },
      ],
      outputs: [],
      stateMutability: "payable",
    },
    {
      type: "function",
      name: "getDisputeCost",
      inputs: [{ name: "_dao", type: "address", internalType: "contract IDAO" }],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "getGovernancePlugin",
      inputs: [{ name: "_dao", type: "address", internalType: "contract IDAO" }],
      outputs: [{ name: "", type: "address", internalType: "address" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "owner",
      inputs: [],
      outputs: [{ name: "", type: "address", internalType: "address" }],
      stateMutability: "pure",
    },
    {
      type: "function",
      name: "supportsInterface",
      inputs: [{ name: "_interfaceId", type: "bytes4", internalType: "bytes4" }],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "updateDisputeCost",
      inputs: [
        {
          name: "_disputeCost",
          type: "uint256",
          internalType: "uint256",
        },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "updateGovernancePlugin",
      inputs: [
        {
          name: "_governancePlugin",
          type: "address",
          internalType: "address",
        },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "updateManager",
      inputs: [
        {
          name: "_manager",
          type: "address",
          internalType: "contract IDAOManager",
        },
        { name: "_role", type: "uint256", internalType: "uint256" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "event",
      name: "DisputeCreated",
      inputs: [
        {
          name: "dao",
          type: "address",
          indexed: true,
          internalType: "contract IDAO",
        },
        {
          name: "dispute",
          type: "tuple",
          indexed: false,
          internalType: "struct ITaskDisputes.DisputeInfo",
          components: [
            {
              name: "taskId",
              type: "uint256",
              internalType: "uint256",
            },
            {
              name: "partialNativeReward",
              type: "uint96[]",
              internalType: "uint96[]",
            },
            {
              name: "partialReward",
              type: "uint88[]",
              internalType: "uint88[]",
            },
          ],
        },
        {
          name: "governancePlugin",
          type: "address",
          indexed: false,
          internalType: "address",
        },
        {
          name: "proposalId",
          type: "uint256",
          indexed: false,
          internalType: "uint256",
        },
      ],
      anonymous: false,
    },
    { type: "error", name: "TransferToDAOFailed", inputs: [] },
    { type: "error", name: "Underpaying", inputs: [] },
  ],
} as const;
