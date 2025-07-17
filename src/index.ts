#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { MercuryEvolutionAPI } from './evolution-api.js';
import { BrainSync } from './brain-sync.js';

/**
 * MCP Server for Mercury Context Evolution Engine
 * 
 * This server provides evolution features that work alongside
 * the existing Brain system:
 * - Path tracking and heat maps
 * - Intent analysis
 * - Adaptive context loading
 * - Success-based learning
 */
class MercuryEvolutionServer {
  private server: Server;
  private evolutionAPI: MercuryEvolutionAPI;
  private brainSync: BrainSync;

  constructor() {
    this.server = new Server({
      name: 'mcp-mercury-evolution',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.evolutionAPI = new MercuryEvolutionAPI();
    this.brainSync = new BrainSync();

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(
      ListToolsRequestSchema, 
      async () => {
        return {
          tools: this.getToolSchemas()
        };
      }
    );

    // Handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'mercury_start_tracking':
            return await this.handleStartTracking(args);
          
          case 'mercury_record_step':
            return await this.handleRecordStep(args);
          
          case 'mercury_end_tracking':
            return await this.handleEndTracking(args);
          
          case 'mercury_analyze_intent':
            return await this.handleAnalyzeIntent(args);
          
          case 'mercury_get_heat_map':
            return await this.handleGetHeatMap(args);
          
          case 'mercury_evolve_context':
            return await this.handleEvolveContext(args);
          
          case 'mercury_sync_with_brain':
            return await this.handleSyncWithBrain(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }]
        };
      }
    });
  }

  private getToolSchemas(): Tool[] {
    return [
      {
        name: 'mercury_start_tracking',
        description: 'Start tracking a knowledge navigation session',
        inputSchema: {
          type: 'object',
          properties: {
            intent: {
              type: 'string',
              description: 'What you are trying to accomplish'
            }
          },
          required: ['intent']
        }
      },
      {
        name: 'mercury_record_step',
        description: 'Record a navigation step in the current session',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path or identifier of the accessed resource'
            },
            type: {
              type: 'string',
              enum: ['note', 'search', 'link', 'create'],
              description: 'Type of interaction'
            }
          },
          required: ['path', 'type']
        }
      },
      {
        name: 'mercury_end_tracking',
        description: 'End the current tracking session with a success rating',
        inputSchema: {
          type: 'object',
          properties: {
            success: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Success rating (0-1)'
            }
          },
          required: ['success']
        }
      },
      {
        name: 'mercury_analyze_intent',
        description: 'Analyze user intent from natural language input',
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'User input to analyze'
            }
          },
          required: ['input']
        }
      },
      {
        name: 'mercury_get_heat_map',
        description: 'Get the current knowledge heat map',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of hot nodes to return',
              default: 10
            }
          }
        }
      },
      {
        name: 'mercury_evolve_context',
        description: 'Load context adaptively based on intent and patterns',
        inputSchema: {
          type: 'object',
          properties: {
            intent: {
              type: 'string',
              description: 'Current intent or task'
            },
            maxTokens: {
              type: 'number',
              description: 'Maximum tokens to load',
              default: 30000
            }
          },
          required: ['intent']
        }
      },
      {
        name: 'mercury_sync_with_brain',
        description: 'Sync evolution data with Brain memory system',
        inputSchema: {
          type: 'object',
          properties: {
            direction: {
              type: 'string',
              enum: ['brain-to-mercury', 'mercury-to-brain', 'bidirectional'],
              default: 'brain-to-mercury'
            }
          }
        }
      }
    ];
  }

  // Handler implementations
  private async handleStartTracking(args: any) {
    const result = await this.evolutionAPI.startTracking(args.intent);
    return {
      content: [{
        type: 'text',
        text: `🎯 Started tracking session: ${result.sessionId}\nIntent: ${args.intent}`
      }]
    };
  }

  private async handleRecordStep(args: any) {
    await this.evolutionAPI.recordStep(args.path, args.type);
    return {
      content: [{
        type: 'text',
        text: `📝 Recorded ${args.type}: ${args.path}`
      }]
    };
  }

  private async handleEndTracking(args: any) {
    const result = await this.evolutionAPI.endTracking(args.success);
    return {
      content: [{
        type: 'text',
        text: `✅ Session ended\n` +
               `Path length: ${result.pathLength}\n` +
               `Duration: ${Math.round(result.duration / 1000)}s\n` +
               `Success: ${Math.round(args.success * 100)}%\n` +
               `Heat updated: ${result.heatUpdated ? 'Yes' : 'No'}`
      }]
    };
  }

  private async handleAnalyzeIntent(args: any) {
    const analysis = await this.evolutionAPI.analyzeIntent(args.input);
    return {
      content: [{
        type: 'text',
        text: `🧠 Intent Analysis:\n` +
               `Primary: ${analysis.intent} (${Math.round(analysis.confidence * 100)}%)\n` +
               `Signals: ${analysis.signals.join(', ')}\n` +
               `${analysis.alternatives.length > 0 ? 
                 `Alternatives: ${analysis.alternatives.join(', ')}` : ''}`
      }]
    };
  }

  private async handleGetHeatMap(args: any) {
    const heatMap = await this.evolutionAPI.getHeatMap(args.limit || 10);
    
    let text = '🔥 Knowledge Heat Map:\n\n';
    text += 'Hot Nodes:\n';
    heatMap.hotNodes.forEach((node: any, i: number) => {
      text += `${i + 1}. ${node.path} (heat: ${node.heat.toFixed(2)}, accesses: ${node.accessCount})\n`;
    });
    
    if (heatMap.strongEdges.length > 0) {
      text += '\nStrong Connections:\n';
      heatMap.strongEdges.forEach((edge: any, i: number) => {
        text += `${i + 1}. ${edge.from} → ${edge.to} (strength: ${edge.heat.toFixed(2)})\n`;
      });
    }
    
    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }

  private async handleEvolveContext(args: any) {
    const result = await this.evolutionAPI.evolveContext(args.intent, args.maxTokens);
    
    let text = `🧬 Adaptive Context Loading:\n\n`;
    text += `Intent: ${result.intent}\n`;
    text += `Confidence: ${Math.round(result.confidence * 100)}%\n`;
    text += `Loaded: ${result.loadedPaths.length} paths (${result.totalTokens} tokens)\n\n`;
    
    if (result.loadedPaths.length > 0) {
      text += 'Loaded Paths:\n';
      result.loadedPaths.forEach((path: any, i: number) => {
        text += `${i + 1}. ${path.path} (gradient: ${path.gradient.toFixed(2)})\n`;
      });
    }
    
    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }

  private async handleSyncWithBrain(args: any) {
    const result = await this.brainSync.sync(args.direction || 'brain-to-mercury');
    
    return {
      content: [{
        type: 'text',
        text: `🔄 Sync complete:\n` +
               `Direction: ${args.direction}\n` +
               `Paths synced: ${result.pathsSynced}\n` +
               `Heat map updated: ${result.heatMapUpdated ? 'Yes' : 'No'}`
      }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Mercury Evolution MCP Server running...');
  }
}

// Start the server
const server = new MercuryEvolutionServer();
server.run().catch(console.error);
