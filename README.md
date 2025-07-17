# MCP Mercury Evolution

An MCP server that adds Context Evolution Engine features to Claude's memory system. Works alongside the existing Brain tools to provide adaptive learning and pattern recognition.

## Features

- **Path Tracking**: Record navigation through knowledge
- **Intent Analysis**: Understand what users are trying to do
- **Heat Maps**: Visualize frequently accessed knowledge
- **Adaptive Loading**: Load context based on usage patterns
- **Brain Integration**: Sync with existing Brain memory

## Installation

```bash
cd /Users/bard/Code/mcp-mercury-evolution
npm install
npm run build
```

## Configuration

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    // ... existing servers ...
    "mercury-evolution": {
      "command": "node",
      "args": [
        "/Users/bard/Code/mcp-mercury-evolution/dist/index.js"
      ],
      "env": {
        "MERCURY_VAULT_PATH": "/path/to/your/vault/.mercury",
        "BRAIN_DB_PATH": "/Users/bard/mcp/brain-data/brain.db"
      }
    }
  }
}
```

## Usage

### Track Knowledge Navigation

```
# Start tracking
mercury_start_tracking("research heat map algorithms")

# Record steps as you navigate
mercury_record_step("concepts/heat-maps.md", "note")
mercury_record_step("algorithms/dijkstra.md", "link")
mercury_record_step("implementation/gradient.md", "create")

# End with success rating
mercury_end_tracking(0.8)  # 80% successful
```

### Analyze Intent

```
mercury_analyze_intent("how do I debug the path tracking issue?")
# Returns: intent=debug, confidence=85%, signals=[question, problem-solving]
```

### View Heat Map

```
mercury_get_heat_map(10)  # Top 10 hot nodes
# Shows frequently accessed knowledge and strong connections
```

### Adaptive Context Loading

```
mercury_evolve_context("implement gradient calculator", 30000)
# Loads relevant context based on intent and past patterns
```

### Sync with Brain

```
# Import Brain patterns into Mercury
mercury_sync_with_brain("brain-to-mercury")

# Export Mercury insights to Brain
mercury_sync_with_brain("mercury-to-brain")

# Bidirectional sync
mercury_sync_with_brain("bidirectional")
```

## How It Works

1. **Tracking**: Records your navigation paths through knowledge
2. **Learning**: Analyzes which paths lead to success
3. **Evolution**: Strengthens successful patterns, lets others fade
4. **Adaptation**: Loads context based on learned patterns

## Integration with Brain

The tool works alongside Brain:
- Brain handles memory storage
- Mercury Evolution tracks patterns
- Together they provide intelligent context

## Architecture

```
Claude → Brain (memories) → Still works!
      ↘
        Mercury Evolution (patterns) → Learns and adapts!
```

## Future Enhancements

- Real-time pattern detection
- Predictive preloading
- Visual pattern browser
- Export/import learned patterns

## Testing

```bash
npm test
```

## Development

```bash
npm run dev  # Watch mode
```

## License

MIT
