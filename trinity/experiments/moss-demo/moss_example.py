"""
MOSS (llM-oriented Operating System Simulation) example for Neo.

This script demonstrates how to wrap Python modules as tools for an agent
using MOSSProtocolTool, enabling code-driven context management.

Requires:
  pip install openai-moss-agents openai-agents-python
  export OPENAI_API_KEY="sk-..."

Note: MOSS maintains Python context across interactions, avoiding stateless
tool calls. Perfect for agents that need to build up state (like exploring
a data stream or maintaining a knowledge cache).
"""

from agents import Agent
from openai_moss_agents.moss_tool import MOSSProtocolTool

# Create a tool that exposes the terminal library.
# The name is the Python module path inside openai_moss_agents.example_moss_libs
tool = MOSSProtocolTool(
    name="openai_moss_agents.example_moss_libs.terminal",
)

# Generate instructions that explain the tool to the LLM.
instruction = tool.with_instruction(
    "You are a helpful assistant with terminal access. Use the terminal tool to execute shell commands when needed."
)

# Build the agent.
moss_agent = Agent(
    name="moss_agent",
    instructions=instruction,
    tools=[tool.as_agent_tool()],
)

# Example usage (would require running an OpenAI model):
# async def main():
#     result = await moss_agent.run("List files in the current directory")
#     print(result)
#
# if __name__ == "__main__":
#     import asyncio
#     asyncio.run(main())

print("MOSS agent configured. To run, provide an OpenAI API key and call agent.run().")
