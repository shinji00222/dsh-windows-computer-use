// Host-provided modules are loaded from DSH's own runtime, never bundled.
declare module '@deepseek-ai/schemastery' { const schema: any; export default schema; }
declare module '@deepseek-ai/dsh-mcp-client' { const plugin: unknown; export = plugin; }
