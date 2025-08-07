import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { createHash } from 'crypto';

// Add similarity function for intent matching
function similarity(a: string, b: string): number {
  const longerLength = Math.max(a.length, b.length);
  if (longerLength === 0) return 1.0;
  
  // Simple Levenshtein-based similarity
  const editDistance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return (longerLength - editDistance) / longerLength;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

interface Session {
  id: string;
  intent: string;
  startTime: number;
  paths: string[];
  interactions: Array<{
    type: string;
    path: string;
    timestamp: number;
  }>;
}

interface HeatMapData {
  paths: any[];
  nodes: Array<[string, any]>;
  edges: Array<[string, any]>;
  intents: Array<[string, any]>;
  lastMaintenance: number;
  version: string;
}

/**
 * API for Mercury Context Evolution features
 */
export class MercuryEvolutionAPI {
  private mercuryPath: string;
  private currentSession: Session | null = null;

  constructor(vaultPath?: string) {
    // Use new consolidated Brain data location
    this.mercuryPath = vaultPath || 
      process.env.MERCURY_VAULT_PATH || 
      path.join(os.homedir(), '.claude-brain', 'mercury-evolution');
    
    // Ensure Mercury directory exists
    this.ensureMercuryDir();
  }
  
  private async ensureMercuryDir(): Promise<void> {
    try {
      await fs.mkdir(this.mercuryPath, { recursive: true });
      await fs.mkdir(path.join(this.mercuryPath, 'evolution'), { recursive: true });
      await fs.mkdir(path.join(this.mercuryPath, 'sessions'), { recursive: true });
    } catch (error) {
      console.error('Failed to create Mercury directories:', error);
    }
  }

  /**
   * Start tracking a knowledge navigation session
   */
  async startTracking(intent: string): Promise<{ sessionId: string }> {
    const sessionId = this.generateId();
    
    this.currentSession = {
      id: sessionId,
      intent,
      startTime: Date.now(),
      paths: [],
      interactions: []
    };

    // Save session start
    await this.saveSession();
    
    return { sessionId };
  }

  /**
   * Record a navigation step
   */
  async recordStep(resourcePath: string, type: string = 'note'): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active tracking session');
    }

    this.currentSession.paths.push(resourcePath);
    this.currentSession.interactions.push({
      type,
      path: resourcePath,
      timestamp: Date.now()
    });

    // Save session with updated data
    await this.saveSession();

    // Update heat in real-time
    await this.updateNodeHeat(resourcePath);
    
    // Update edge heat if not first step
    if (this.currentSession.paths.length > 1) {
      const prevPath = this.currentSession.paths[this.currentSession.paths.length - 2];
      await this.updateEdgeHeat(prevPath, resourcePath);
    }
  }

  /**
   * End tracking session with success rating
   */
  async endTracking(success: number): Promise<any> {
    if (!this.currentSession) {
      throw new Error('No active tracking session');
    }

    const duration = Date.now() - this.currentSession.startTime;
    
    // Create knowledge path
    const pathData = {
      id: this.generateId(),
      sequence: this.currentSession.paths,
      intent: this.currentSession.intent,
      timestamp: this.currentSession.startTime,
      duration,
      success,
      heat: 1.0,
      lastAccessed: Date.now(),
      accessCount: 1,
      metadata: {
        sessionId: this.currentSession.id,
        interactionCount: this.currentSession.interactions.length
      }
    };

    // Save path and update heat map
    const heatUpdated = await this.savePath(pathData);

    const result = {
      sessionId: this.currentSession.id,
      pathLength: this.currentSession.paths.length,
      duration,
      heatUpdated
    };

    this.currentSession = null;
    return result;
  }

  /**
   * Analyze intent from input text
   */
  async analyzeIntent(input: string): Promise<any> {
    // Simplified intent analysis (full version would use Mercury's extractors)
    const signals = [];
    const intent = this.detectIntent(input);
    const confidence = this.calculateConfidence(input, intent);
    
    // Detect signals
    if (input.match(/\b(how|what|why|when|where|who)\b/i)) {
      signals.push('question');
    }
    if (input.match(/\b(debug|fix|error|issue|problem)\b/i)) {
      signals.push('problem-solving');
    }
    if (input.match(/\b(create|build|implement|develop)\b/i)) {
      signals.push('creation');
    }
    if (input.match(/\b(analyze|research|explore|investigate)\b/i)) {
      signals.push('research');
    }

    const alternatives = this.getAlternativeIntents(intent, input);

    return {
      intent,
      confidence,
      signals,
      alternatives
    };
  }

  /**
   * Get current heat map data
   */
  async getHeatMap(limit: number = 10): Promise<any> {
    const heatMap = await this.loadHeatMap();
    
    // Convert and sort nodes by heat
    const nodes = Array.from(heatMap.nodes)
      .map(([path, data]) => ({ path, ...data }))
      .sort((a, b) => b.heat - a.heat)
      .slice(0, limit);

    // Get strong edges
    const edges = Array.from(heatMap.edges)
      .map(([key, data]) => ({ ...data }))
      .sort((a, b) => b.heat - a.heat)
      .slice(0, Math.floor(limit / 2));

    return {
      hotNodes: nodes,
      strongEdges: edges,
      totalPaths: heatMap.paths.length
    };
  }

  /**
   * Evolve context based on intent and patterns
   */
  async evolveContext(intent: string, maxTokens: number = 30000): Promise<any> {
    // Analyze intent
    const analysis = await this.analyzeIntent(intent);
    
    // Load heat map
    const heatMap = await this.loadHeatMap();
    
    // Find relevant paths
    const relevantPaths = this.findRelevantPaths(analysis, intent, heatMap);
    
    // Calculate loading plan
    const loadedPaths = this.calculateLoadingPlan(relevantPaths, maxTokens);
    
    return {
      intent: analysis.intent,
      confidence: analysis.confidence,
      loadedPaths,
      totalTokens: loadedPaths.reduce((sum, p) => sum + p.tokens, 0)
    };
  }

  /**
   * Track when Brain accesses notes - integrates with real note navigation
   */
  async trackBrainNoteAccess(
    action: 'create' | 'read' | 'update' | 'delete' | 'list',
    notePath: string,
    fromNote?: string
  ): Promise<void> {
    // Clean up the path to be relative to vault
    const cleanPath = notePath.replace(/^\//, '');
    
    // Auto-start session if needed
    if (!this.currentSession) {
      await this.startTracking('brain-navigation');
    }
    
    // Map Brain actions to Mercury types
    const typeMap = {
      'create': 'create',
      'read': 'note',
      'update': 'note',
      'delete': 'note',
      'list': 'search'
    };
    
    // Record the real note access
    await this.recordStep(cleanPath, typeMap[action]);
    
    // Log real navigation for debugging
    console.error(`Mercury tracked: ${action} ${cleanPath}`);
  }

  /**
   * Get real vault statistics
   */
  async getVaultStats(): Promise<any> {
    const heatMap = await this.loadHeatMap();
    const vaultPath = process.env.OBSIDIAN_VAULT_PATH || './vault';
    
    return {
      vaultPath,
      mercuryPath: this.mercuryPath,
      totalNotes: heatMap.nodes.length,
      totalConnections: heatMap.edges.length,
      totalSessions: heatMap.paths.length,
      hottest: heatMap.nodes.slice(0, 3).map(([path, data]) => ({
        path,
        heat: data.heat,
        accesses: data.accessCount
      }))
    };
  }

  private async loadHeatMap(): Promise<HeatMapData> {
    const heatMapPath = path.join(this.mercuryPath, 'evolution', 'heat-map.json');
    
    try {
      const content = await fs.readFile(heatMapPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Convert arrays back to Maps
      return {
        paths: data.paths || [],
        nodes: data.nodes || [],
        edges: data.edges || [],
        intents: data.intents || [],
        lastMaintenance: data.lastMaintenance || Date.now(),
        version: data.version || '1.0.0'
      };
    } catch (error) {
      // Return empty heat map if none exists
      return {
        paths: [],
        nodes: [],
        edges: [],
        intents: [],
        lastMaintenance: Date.now(),
        version: '1.0.0'
      };
    }
  }

  private async saveHeatMap(heatMap: HeatMapData): Promise<void> {
    const heatMapPath = path.join(this.mercuryPath, 'evolution', 'heat-map.json');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(heatMapPath), { recursive: true });
    
    // Save heat map
    await fs.writeFile(heatMapPath, JSON.stringify(heatMap, null, 2));
  }

  private async updateNodeHeat(nodePath: string, increment: number = 0.1): Promise<void> {
    const heatMap = await this.loadHeatMap();
    
    // Find or create node
    const nodeIndex = heatMap.nodes.findIndex(([path]) => path === nodePath);
    const now = Date.now();
    
    if (nodeIndex >= 0) {
      const node = heatMap.nodes[nodeIndex][1];
      node.heat = Math.min(1.0, node.heat + increment);
      node.lastAccessed = now;
      node.accessCount++;
    } else {
      heatMap.nodes.push([nodePath, {
        heat: increment,
        lastAccessed: now,
        accessCount: 1,
        avgDwellTime: 0
      }]);
    }
    
    await this.saveHeatMap(heatMap);
  }

  private async updateEdgeHeat(from: string, to: string, increment: number = 0.1): Promise<void> {
    const heatMap = await this.loadHeatMap();
    const edgeKey = `${from}→${to}`;
    
    // Find or create edge
    const edgeIndex = heatMap.edges.findIndex(([key]) => key === edgeKey);
    const now = Date.now();
    
    if (edgeIndex >= 0) {
      const edge = heatMap.edges[edgeIndex][1];
      edge.heat = Math.min(1.0, edge.heat + increment);
      edge.lastTraversed = now;
      edge.traversalCount++;
    } else {
      heatMap.edges.push([edgeKey, {
        from,
        to,
        heat: increment,
        traversalCount: 1,
        lastTraversed: now
      }]);
    }
    
    await this.saveHeatMap(heatMap);
  }

  private async savePath(pathData: any): Promise<boolean> {
    const heatMap = await this.loadHeatMap();
    
    // Add path
    heatMap.paths.push(pathData);
    
    // Keep only recent paths (last 1000)
    if (heatMap.paths.length > 1000) {
      heatMap.paths = heatMap.paths.slice(-1000);
    }
    
    await this.saveHeatMap(heatMap);
    return true;
  }

  private async saveSession(): Promise<void> {
    if (!this.currentSession) return;
    
    const sessionPath = path.join(
      this.mercuryPath, 
      'sessions',
      `${this.currentSession.id}.json`
    );
    
    await fs.mkdir(path.dirname(sessionPath), { recursive: true });
    await fs.writeFile(sessionPath, JSON.stringify(this.currentSession, null, 2));
  }

  private detectIntent(input: string): string {
    const lowered = input.toLowerCase();
    
    if (lowered.match(/\b(debug|fix|error|issue|problem|bug)\b/)) {
      return 'debug';
    }
    if (lowered.match(/\b(create|build|implement|develop|make)\b/)) {
      return 'implementation';
    }
    if (lowered.match(/\b(analyze|research|explore|investigate|find|learn)\b/)) {
      return 'research';
    }
    if (lowered.match(/\b(document|explain|describe|write)\b/)) {
      return 'documentation';
    }
    if (lowered.match(/\b(plan|design|architect|structure)\b/)) {
      return 'planning';
    }
    
    return 'general';
  }

  private calculateConfidence(input: string, intent: string): number {
    // Simple confidence based on keyword matches
    const keywords = {
      debug: /\b(debug|fix|error|issue|problem|bug|broken|fail)\b/gi,
      implementation: /\b(create|build|implement|develop|make|code|program)\b/gi,
      research: /\b(analyze|research|explore|investigate|find|learn|what|how|why)\b/gi,
      documentation: /\b(document|explain|describe|write|summarize|outline)\b/gi,
      planning: /\b(plan|design|architect|structure|organize|strategy)\b/gi
    };

    const pattern = keywords[intent as keyof typeof keywords];
    if (!pattern) return 0.5;

    const matches = input.match(pattern);
    const confidence = matches ? Math.min(0.5 + (matches.length * 0.1), 0.95) : 0.5;
    
    return confidence;
  }

  private getAlternativeIntents(primary: string, input: string): string[] {
    const allIntents = ['debug', 'implementation', 'research', 'documentation', 'planning'];
    const alternatives = [];
    
    for (const intent of allIntents) {
      if (intent !== primary) {
        const confidence = this.calculateConfidence(input, intent);
        if (confidence > 0.6) {
          alternatives.push(intent);
        }
      }
    }
    
    return alternatives.slice(0, 2);
  }

  private findRelevantPaths(analysis: any, originalInput: string, heatMap: HeatMapData): any[] {
    // Enhanced intent matching algorithm
    const results = [];
    const threshold = 0.3;
    
    for (const path of heatMap.paths) {
      if (path.success <= 0.5) continue; // Skip low-success paths
      
      let score = 0;
      const reasons = [];
      
      // 1. Exact intent match (highest priority)
      if (path.intent === analysis.intent) {
        score += 1.0;
        reasons.push("exact_intent_match");
      }
      
      // 2. Similarity to original input
      const similarityScore = similarity(originalInput, path.intent);
      if (similarityScore > 0.3) {
        score += similarityScore * 0.8;
        reasons.push(`text_similarity_${similarityScore.toFixed(2)}`);
      }
      
      // 3. Keyword overlap
      const inputWords = new Set(originalInput.toLowerCase().split(' '));
      const pathWords = new Set(path.intent.toLowerCase().split(' '));
      const intersection = new Set([...inputWords].filter(word => pathWords.has(word)));
      const overlap = intersection.size;
      
      if (overlap > 0) {
        const overlapScore = overlap / Math.max(inputWords.size, pathWords.size);
        score += overlapScore * 0.6;
        reasons.push(`keyword_overlap_${overlap}`);
      }
      
      // 4. Intent category matching
      const analyzedPathIntent = this.detectIntent(path.intent);
      if (analysis.intent !== 'general' && analyzedPathIntent === analysis.intent) {
        score += 0.5;
        reasons.push("category_match");
      }
      
      // Only include if above threshold
      if (score >= threshold) {
        results.push({
          ...path,
          relevance: score,
          matchReasons: reasons
        });
      }
    }
    
    // Sort by relevance score
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  private calculateLoadingPlan(paths: any[], maxTokens: number): any[] {
    const loadedPaths = [];
    let totalTokens = 0;
    
    for (const path of paths) {
      // Estimate tokens (simplified)
      const estimatedTokens = path.sequence.length * 500;
      
      if (totalTokens + estimatedTokens <= maxTokens) {
        loadedPaths.push({
          path: path.sequence[0],
          gradient: path.relevance,
          tokens: estimatedTokens
        });
        totalTokens += estimatedTokens;
      }
      
      if (totalTokens >= maxTokens * 0.8) break;
    }
    
    return loadedPaths;
  }

  private generateId(): string {
    return createHash('sha256')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex')
      .substring(0, 12);
  }
}
