import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MCP_BASE = "http://localhost:8000";

export async function handleChat(userMessage: string): Promise<string> {
  const toolsRes = await axios.get(`${MCP_BASE}/tools`);
  const tools = toolsRes.data.tools;

  const mcpTools = tools.map((t: any) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: `Eres un asistente que gestiona un CRM GoHighLevel.
El usuario te da instrucciones en español.
Usa las herramientas disponibles para ejecutar las acciones.
Responde siempre en español confirmando lo que hiciste.`,
    tools: mcpTools,
    messages: [{ role: "user", content: userMessage }],
  });

  for (const block of response.content) {
    if (block.type === "tool_use") {
      const toolRes = await axios.post(`${MCP_BASE}/tools/execute`, {
        name: block.name,
        arguments: block.input,
      });
      return `Acción: ${block.name}\nResultado: ${JSON.stringify(toolRes.data, null, 2)}`;
    }
    if (block.type === "text") {
      return block.text;
    }
  }

  return "No se pudo procesar la instrucción.";
}