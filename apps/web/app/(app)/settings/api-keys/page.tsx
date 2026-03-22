import { listApiKeys } from "@/actions/api-keys";
import { ApiKeysClient } from "./api-keys-client";

export default async function ApiKeysPage() {
  const result = await listApiKeys();
  const keys = result.success ? result.data : [];

  return <ApiKeysClient initialKeys={keys} />;
}
