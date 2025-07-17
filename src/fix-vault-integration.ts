/**
 * Fix Mercury Evolution to use BrainVault
 * 
 * Problems:
 * 1. Mercury is storing data outside the vault
 * 2. It's tracking fictional test paths instead of real notes
 * 3. Not integrated with Brain's note access
 * 
 * Solution:
 * 1. Change MERCURY_VAULT_PATH to point to BrainVault/.mercury
 * 2. Hook into Brain's obsidian_note actions to track real navigation
 * 3. Use actual note paths from the vault
 */

// New environment variable in claude_desktop_config.json:
export const FIXED_CONFIG = {
  "mercury-evolution": {
    "command": "node",
    "args": [
      "/Users/bard/Code/mcp-mercury-evolution/dist/index.js"
    ],
    "env": {
      "MERCURY_VAULT_PATH": "/Users/bard/Code/claude-brain/data/BrainVault/.mercury",
      "BRAIN_DB_PATH": "/Users/bard/mcp/brain-data/brain.db",
      "OBSIDIAN_VAULT_PATH": "/Users/bard/Code/claude-brain/data/BrainVault"
    }
  }
};

// Modified evolution-api.ts constructor:
export const FIXED_CONSTRUCTOR = `
  constructor(vaultPath?: string) {
    // Use BrainVault's .mercury directory
    const obsidianVault = process.env.OBSIDIAN_VAULT_PATH || 
      '/Users/bard/Code/claude-brain/data/BrainVault';
    
    this.mercuryPath = vaultPath || 
      process.env.MERCURY_VAULT_PATH || 
      path.join(obsidianVault, '.mercury');
    
    // Ensure Mercury directory exists in the vault
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
`;

// Add Brain integration to track real note access:
export const BRAIN_HOOK = `
  /**
   * Hook to track when Brain accesses notes
   * This should be called by Brain whenever obsidian_note is used
   */
  async trackBrainNoteAccess(
    action: 'create' | 'read' | 'update' | 'delete',
    notePath: string,
    fromNote?: string
  ): Promise<void> {
    if (!this.currentSession) {
      // Auto-start session if needed
      await this.startTracking('brain-navigation');
    }
    
    // Record the real note access
    await this.recordStep(notePath, action === 'read' ? 'note' : action);
    
    // If navigating from another note, record the connection
    if (fromNote && this.currentSession.paths.length > 0) {
      const lastPath = this.currentSession.paths[this.currentSession.paths.length - 1];
      if (lastPath === fromNote) {
        // This creates a real connection between actual notes
        console.error(\`Recording navigation: \${fromNote} → \${notePath}\`);
      }
    }
  }
`;

// Example of real paths Mercury should track:
export const REAL_PATHS = [
  "brain_system/Brain Architecture.md",
  "protocols/Repository Update Protocol.md", 
  "projects/mercury-obsidian.md",
  "daily/2025-07-17.md",
  "references/MCP Server Development Guide.md"
];
