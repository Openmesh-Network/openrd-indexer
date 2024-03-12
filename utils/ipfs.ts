import { ed25519 } from "@ucanto/principal"; // Agents on Node should use Ed25519 keys
import { importDAG } from "@ucanto/core/delegation";
import { CarReader } from "@ipld/car";
import { create, Client } from "@web3-storage/w3up-client";
import { StoreMemory } from "@web3-storage/w3up-client/stores/memory";
import axios from "axios";

let _client: Client | undefined;
async function getClient(): Promise<Client> {
  if (!_client) {
    if (!process.env.WEB3_STORAGE_KEY) {
      throw new Error("WEB3_STORAGE_KEY environmental variable not found.");
    }
    const principal = ed25519.Signer.parse(process.env.WEB3_STORAGE_KEY);
    const store = new StoreMemory();
    const client = await create({ principal, store });

    // now give Agent the delegation from the Space
    if (!process.env.WEB3_STORAGE_PROOF) {
      throw new Error("WEB3_STORAGE_PROOF environmental variable not found.");
    }
    const proof = await parseProof(process.env.WEB3_STORAGE_PROOF);
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());

    _client = client;
  }

  return _client;
}

/** @param {string} data Base64 encoded CAR file */
async function parseProof(data: string) {
  const blocks: any[] = [];
  const reader = await CarReader.fromBytes(Buffer.from(data, "base64"));
  for await (const block of reader.blocks()) {
    blocks.push(block);
  }
  return importDAG(blocks);
}

/** Upload a string to Web3Storage (uploaded and pinned on IPFS) */
export async function addToIpfs(json: string): Promise<string> {
  const client = await getClient();
  const cid = await client.uploadFile(new Blob([json]), {}).then((link) => link.toString());
  return cid;
}

export async function getFromIpfs(hash: string): Promise<any> {
  let url: string;
  if (hash.startsWith("Qm")) {
    // V0 IPFS hash
    url = `https://ipfs.io/ipfs/${hash}`;
  } else {
    // V1 IPFS hash
    url = `https://${hash}.ipfs.w3s.link/`;
  }

  const res = await axios.get(url);
  return res.data;
}
