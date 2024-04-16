export const TasksDisputesContract = {
  address: "0xb082d1323068ca6c123EB7eB94b104E0f83127DE",
  abi: [
    {
      type: "constructor",
      inputs: [{ name: "_tasks", type: "address", internalType: "contract ITasks" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "createDispute",
      inputs: [
        { name: "_dao", type: "address", internalType: "contract IDAO" },
        { name: "_metadata", type: "string", internalType: "string" },
        {
          name: "_managementInfo",
          type: "tuple",
          internalType: "struct ICreateTrustlessAction.ManagementInfo",
          components: [
            {
              name: "manager",
              type: "address",
              internalType: "contract IDAOManager",
            },
            { name: "role", type: "uint256", internalType: "uint256" },
            {
              name: "trustlessActions",
              type: "address",
              internalType: "contract ITrustlessActions",
            },
          ],
        },
        {
          name: "_trustlessActionsInfo",
          type: "tuple",
          internalType: "struct ICreateTrustlessAction.TrustlessActionsInfo",
          components: [
            {
              name: "manager",
              type: "address",
              internalType: "contract IDAOManager",
            },
            { name: "role", type: "uint256", internalType: "uint256" },
          ],
        },
        {
          name: "_disputeInfo",
          type: "tuple",
          internalType: "struct ITaskDisputes.DisputeInfo",
          components: [
            { name: "taskId", type: "uint256", internalType: "uint256" },
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
      name: "getCost",
      inputs: [{ name: "_dao", type: "address", internalType: "contract IDAO" }],
      outputs: [{ name: "cost", type: "uint256", internalType: "uint256" }],
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
      name: "tasks",
      inputs: [],
      outputs: [{ name: "", type: "address", internalType: "contract ITasks" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "updateCost",
      inputs: [{ name: "_cost", type: "uint256", internalType: "uint256" }],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "event",
      name: "TrustlessActionCreated",
      inputs: [
        {
          name: "dao",
          type: "address",
          indexed: true,
          internalType: "contract IDAO",
        },
        {
          name: "trustlessActions",
          type: "address",
          indexed: true,
          internalType: "contract ITrustlessActions",
        },
        {
          name: "actionId",
          type: "uint256",
          indexed: true,
          internalType: "uint256",
        },
      ],
      anonymous: false,
    },
    { type: "error", name: "TransferToDAOFailed", inputs: [] },
    { type: "error", name: "Underpaying", inputs: [] },
  ],
} as const;
