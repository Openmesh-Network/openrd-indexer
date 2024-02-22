export const TasksDraftsContract = {
  address: "0xd84209c19bf8ac0fddcf0bf4d720bde169247c17",
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
      name: "createDraftTask",
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
          name: "_taskInfo",
          type: "tuple",
          internalType: "struct ITaskDrafts.CreateTaskInfo",
          components: [
            {
              name: "metadata",
              type: "string",
              internalType: "string",
            },
            {
              name: "deadline",
              type: "uint64",
              internalType: "uint64",
            },
            {
              name: "manager",
              type: "address",
              internalType: "address",
            },
            {
              name: "disputeManager",
              type: "address",
              internalType: "address",
            },
            {
              name: "nativeBudget",
              type: "uint96",
              internalType: "uint96",
            },
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
                {
                  name: "amount",
                  type: "uint96",
                  internalType: "uint96",
                },
              ],
            },
            {
              name: "preapproved",
              type: "tuple[]",
              internalType: "struct ITasks.PreapprovedApplication[]",
              components: [
                {
                  name: "applicant",
                  type: "address",
                  internalType: "address",
                },
                {
                  name: "nativeReward",
                  type: "tuple[]",
                  internalType: "struct ITasks.NativeReward[]",
                  components: [
                    {
                      name: "to",
                      type: "address",
                      internalType: "address",
                    },
                    {
                      name: "amount",
                      type: "uint96",
                      internalType: "uint96",
                    },
                  ],
                },
                {
                  name: "reward",
                  type: "tuple[]",
                  internalType: "struct ITasks.Reward[]",
                  components: [
                    {
                      name: "nextToken",
                      type: "bool",
                      internalType: "bool",
                    },
                    {
                      name: "to",
                      type: "address",
                      internalType: "address",
                    },
                    {
                      name: "amount",
                      type: "uint88",
                      internalType: "uint88",
                    },
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
      name: "TaskDraftCreated",
      inputs: [
        {
          name: "dao",
          type: "address",
          indexed: true,
          internalType: "contract IDAO",
        },
        {
          name: "info",
          type: "tuple",
          indexed: false,
          internalType: "struct ITaskDrafts.CreateTaskInfo",
          components: [
            {
              name: "metadata",
              type: "string",
              internalType: "string",
            },
            {
              name: "deadline",
              type: "uint64",
              internalType: "uint64",
            },
            {
              name: "manager",
              type: "address",
              internalType: "address",
            },
            {
              name: "disputeManager",
              type: "address",
              internalType: "address",
            },
            {
              name: "nativeBudget",
              type: "uint96",
              internalType: "uint96",
            },
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
                {
                  name: "amount",
                  type: "uint96",
                  internalType: "uint96",
                },
              ],
            },
            {
              name: "preapproved",
              type: "tuple[]",
              internalType: "struct ITasks.PreapprovedApplication[]",
              components: [
                {
                  name: "applicant",
                  type: "address",
                  internalType: "address",
                },
                {
                  name: "nativeReward",
                  type: "tuple[]",
                  internalType: "struct ITasks.NativeReward[]",
                  components: [
                    {
                      name: "to",
                      type: "address",
                      internalType: "address",
                    },
                    {
                      name: "amount",
                      type: "uint96",
                      internalType: "uint96",
                    },
                  ],
                },
                {
                  name: "reward",
                  type: "tuple[]",
                  internalType: "struct ITasks.Reward[]",
                  components: [
                    {
                      name: "nextToken",
                      type: "bool",
                      internalType: "bool",
                    },
                    {
                      name: "to",
                      type: "address",
                      internalType: "address",
                    },
                    {
                      name: "amount",
                      type: "uint88",
                      internalType: "uint88",
                    },
                  ],
                },
              ],
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
  ],
} as const;
