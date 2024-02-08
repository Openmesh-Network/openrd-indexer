import axios from "axios";

import { getFromIpfs } from "./ipfs";

export async function fetchMetadata(metadataUri: string): Promise<string> {
  if (metadataUri === "") {
    return "";
  }

  if (metadataUri.startsWith("ipfs://")) {
    // Get data from IPFS
    const data = await getFromIpfs(metadataUri.replace("ipfs://", ""));
    return JSON.stringify(data);
  } else if (metadataUri.startsWith("http://") || metadataUri.startsWith("https://")) {
    // Get data with http call
    const response = await axios.get(metadataUri);
    const data = response.data;
    return JSON.stringify(data);
  }

  throw new Error(`No idea how to get metadata from ${metadataUri}`);
}
