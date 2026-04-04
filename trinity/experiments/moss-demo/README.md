# MOSS Integration Prototype

Goal: Integrate `openai-moss-agents` to give Neo agents code-driven evolution and consistent context.

Approach:
- Use OpenAI Agents SDK (python) as base.
- Add `MOSSProtocolTool` to provide a Python module interface as a tool.
- The tool can expose libraries (terminal, math, etc.) and maintain state across interactions via MOSS protocol.

Status:
- This environment lacks Python package manager (pip), so full install/run not possible.
- Code is ready to test in a proper Python env with pip:

```bash
pip install openai-moss-agents openai-agents-python
```

Files:
- `moss_example.py`: Demonstrates creating a MOSS-enabled agent.

Next:
- Set up Python env with pip on host.
- Run example, evaluate context persistence.
