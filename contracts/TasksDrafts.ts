export const TasksDraftsContract = {
  address: "0x21BAC8BA74E54eeCf9b67C509CF802f8FA938B67",
  abi: [
    {
      type: "constructor",
      inputs: [{ name: "_tasks", type: "address", internalType: "contract ITasks" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "createDraftTask",
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
          name: "_taskInfo",
          type: "tuple",
          internalType: "struct ITaskDrafts.CreateTaskInfo",
          components: [
            { name: "metadata", type: "string", internalType: "string" },
            { name: "deadline", type: "uint64", internalType: "uint64" },
            { name: "manager", type: "address", internalType: "address" },
            {
              name: "disputeManager",
              type: "address",
              internalType: "address",
            },
            { name: "nativeBudget", type: "uint96", internalType: "uint96" },
            {
              name: "budget",
              type: "tuple[]",
              internalType: "struct ITasks.ERC20Transfer[]",
              components: [
                {
                  name: "tokenContract",
                  type: "address",
                  internalType: "contract IERC20",
                },
                { name: "amount", type: "uint96", internalType: "uint96" },
              ],
            },
            {
              name: "preapproved",
              type: "tuple[]",
              internalType: "struct ITasks.PreapprovedApplication[]",
              components: [
                { name: "applicant", type: "address", internalType: "address" },
                {
                  name: "nativeReward",
                  type: "tuple[]",
                  internalType: "struct ITasks.NativeReward[]",
                  components: [
                    { name: "to", type: "address", internalType: "address" },
                    { name: "amount", type: "uint96", internalType: "uint96" },
                  ],
                },
                {
                  name: "reward",
                  type: "tuple[]",
                  internalType: "struct ITasks.Reward[]",
                  components: [
                    { name: "nextToken", type: "bool", internalType: "bool" },
                    { name: "to", type: "address", internalType: "address" },
                    { name: "amount", type: "uint88", internalType: "uint88" },
                  ],
                },
              ],
            },
          ],
        },
      ],
      outputs: [],
      stateMutability: "nonpayable",
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
