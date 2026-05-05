import { McpServersAdminPage } from "@/features/tool-registry/mcp-admin/components/McpServersAdminPage";

export const metadata = {
  title: "MCP Servers | Tool Registry | Admin",
  description:
    "Admin view of MCP servers (tl_mcp_server) — sync status, configs, connected users, and per-server tool catalog.",
};

export default function Page() {
  return <McpServersAdminPage />;
}
