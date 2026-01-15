import type { GitHubRepo, ArchitectureAnalysis } from './types';
import { updateAnalysisStatus, completeAnalysisJob, failAnalysisJob } from './analysis';
import { downloadRepoTarball } from './github';
import { saveAnalysis } from './storage';
import { setCacheMetadata } from './cache';

export async function runAnalysis(
  analysisId: string,
  repo: GitHubRepo
): Promise<void> {
  try {
    console.log(`[Analyzer] Starting analysis for ${repo.owner}/${repo.name} (ID: ${analysisId})`);

    // Step 1: Download repository
    await updateAnalysisStatus(analysisId, {
      status: 'downloading',
      progress: 10,
      message: `Downloading ${repo.owner}/${repo.name}...`,
    });

    // Download repository tarball
    let buffer: Buffer;
    if (!process.env.GITHUB_TOKEN && !process.env.ANTHROPIC_API_KEY) {
      console.log('[Analyzer] No GitHub/Anthropic tokens - using mock mode');
      buffer = Buffer.from(''); // Mock empty buffer
    } else {
      console.log('[Analyzer] Downloading repository tarball...');
      const tarball = await downloadRepoTarball(repo);
      buffer = Buffer.from(await tarball.arrayBuffer());
      console.log(`[Analyzer] Downloaded ${buffer.length} bytes`);
    }

    // Step 2: Extract files
    await updateAnalysisStatus(analysisId, {
      status: 'extracting',
      progress: 30,
      message: 'Extracting repository files...',
    });

    // Step 3: Analyze with Claude
    await updateAnalysisStatus(analysisId, {
      status: 'analyzing',
      progress: 50,
      message: 'Analyzing code architecture with Claude...',
    });

    // TODO: Call Claude Agent SDK to analyze the codebase
    // For now, we'll create a mock analysis
    const analysis = await analyzeWithClaude(repo, buffer);

    // Step 4: Generate diagram
    await updateAnalysisStatus(analysisId, {
      status: 'generating',
      progress: 80,
      message: 'Generating architecture diagram...',
    });

    // Add timestamp and repo info
    const fullAnalysis: ArchitectureAnalysis = {
      ...analysis,
      timestamp: Date.now(),
      repoInfo: repo,
    };

    // Step 5: Save to storage
    const blobUrl = await saveAnalysis(repo, fullAnalysis);

    // Step 6: Update cache metadata
    await setCacheMetadata(repo, {
      timestamp: Date.now(),
      blobUrl,
    });

    // Complete the analysis
    await completeAnalysisJob(analysisId, fullAnalysis);
    console.log(`[Analyzer] Analysis completed successfully for ${repo.owner}/${repo.name}`);

  } catch (error) {
    console.error('[Analyzer] Analysis error:', error);
    await failAnalysisJob(
      analysisId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

async function analyzeWithClaude(
  repo: GitHubRepo,
  codeBuffer: Buffer
): Promise<Omit<ArchitectureAnalysis, 'timestamp' | 'repoInfo'>> {
  // If no API key or empty buffer (dev mode), return mock
  if (!process.env.ANTHROPIC_API_KEY || codeBuffer.length === 0) {
    console.log('[Analyzer] Using mock analysis (no API key or empty buffer)');
    return getMockAnalysis(repo);
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const tar = await import('tar');
  const path = await import('path');
  const fs = await import('fs');
  const os = await import('os');

  // Extract tarball to temp directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));

  try {
    console.log(`[Analyzer] Extracting tarball to ${tempDir}`);

    // Extract the tarball (strip root directory from GitHub tarball)
    // Write buffer to a temp file first, then extract
    const tarPath = path.join(tempDir, 'repo.tar.gz');
    fs.writeFileSync(tarPath, codeBuffer);

    await tar.x({
      file: tarPath,
      cwd: tempDir,
      strip: 1,
    });

    // Remove the tarball file
    fs.unlinkSync(tarPath);

    // Find all relevant source files
    const sourceFiles = await findSourceFiles(tempDir);
    console.log(`[Analyzer] Found ${sourceFiles.length} source files`);

    // Read a sample of key files
    const fileSamples = await readKeyFiles(tempDir, sourceFiles);

    // Call Claude to analyze
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `You are analyzing the ${repo.owner}/${repo.name} GitHub repository to create an interactive architecture diagram.

Repository structure:
${sourceFiles.slice(0, 50).join('\n')}

Key files content:
${fileSamples}

Your task:
1. Analyze the codebase architecture and identify the main components, services, and data flows
2. Create a Mermaid flowchart diagram that shows:
   - Client/user entry points
   - Main application components and services
   - Data storage layers (databases, caches, file systems)
   - External services or APIs
   - Request/response flows
3. Define 2-4 animated flows showing CONCRETE USER SCENARIOS, not generic descriptions
   - Each flow should represent a SPECIFIC real-world use case (e.g., "User creates a new post", "User logs in", "Payment processing")
   - Include detailed step descriptions that explain what actually happens at each component
   - Make the flows tell a story that helps developers understand the system

IMPORTANT: For the flows, think like you're explaining to a new developer:
- What does the user DO? (concrete action)
- What API endpoints are called? (specific routes)
- What database queries run? (actual operations)
- What gets cached/queued/processed?

Example of GOOD flow steps:
- "User clicks 'Submit' button on checkout form"
- "API validates credit card via Stripe webhook"
- "Database creates order record with transaction ID"

Example of BAD flow steps (too generic):
- "User interacts with system"
- "API processes request"
- "Data is stored"

Requirements for the Mermaid diagram:
- Use flowchart TD (top-down) orientation
- Use meaningful node IDs (e.g., Client, API, Database, Cache)
- Include emojis in node labels to make them visually distinct (e.g., "🖥️ Client", "🗄️ Database")
- Use different node shapes: rectangles for services, cylinders for data stores, etc.
- Add styled nodes with different colors for different layers
- Show clear directional arrows with labels describing the interaction

Example style to follow:
\`\`\`
flowchart TD
    Client["🖥️ Client<br/>Browser"]
    API["⚙️ API Server<br/>Express/Fastify"]
    DB[("🗄️ Database<br/>PostgreSQL")]
    Cache[("💾 Cache<br/>Redis")]

    Client -->|HTTP Request| API
    API -->|Query| DB
    API -->|Get/Set| Cache
    DB -->|Data| API
    Cache -->|Data| API
    API -->|Response| Client

    style Client fill:#3498db,stroke:#2980b9,stroke-width:3px,color:#fff
    style API fill:#2ecc71,stroke:#27ae60,stroke-width:3px,color:#fff
    style DB fill:#e74c3c,stroke:#c0392b,stroke-width:3px,color:#fff
    style Cache fill:#f39c12,stroke:#e67e22,stroke-width:3px,color:#fff
\`\`\`

IMPORTANT: You must respond with ONLY a valid JSON object, no other text. The JSON must have this exact structure:
{
  "diagram": "flowchart TD\\n    Node1[\\"Label\\"]\\n    ...",
  "flows": [
    {
      "name": "Creating a Blog Post",
      "description": "User publishes a new blog post through the admin interface",
      "steps": [
        {"step": 1, "node": "Client", "message": "User clicks 'Publish' button in admin UI", "duration": 800},
        {"step": 2, "node": "API", "message": "Validates auth token and routes request", "request": "POST /api/posts\nAuthorization: Bearer eyJ...", "duration": 800},
        {"step": 3, "node": "Database", "message": "Creates new post record", "request": "INSERT INTO posts (title, content, author_id) VALUES (...)", "duration": 1000},
        {"step": 4, "node": "Cache", "message": "Invalidates cached post list", "request": "DEL posts:list", "duration": 600},
        {"step": 5, "node": "Client", "message": "Shows success and redirects user", "response": "201 Created\nLocation: /posts/123", "duration": 800}
      ],
      "nodes": ["Client", "API", "Database", "Cache"]
    }
  ]
}

Notice how each step tells a SPECIFIC story with technical details:
- Step 1: What button the user clicks (user action)
- Step 2: What HTTP method and route (with "request" field showing the actual HTTP request)
- Step 3: What SQL operation (with "request" field showing the actual SQL query)
- Step 4: What cache operation (with "request" field showing cache commands)
- Step 5: What the user sees (with "response" field showing HTTP response)

Include "request" or "response" fields where applicable:
- "request": For outgoing operations (HTTP requests, SQL queries, cache commands, API calls)
- "response": For incoming data (HTTP responses, query results, API responses)

CRITICAL OUTPUT FORMAT REQUIREMENTS:
- Do NOT include any explanatory text before or after the JSON
- Do NOT wrap the JSON in markdown code blocks
- Do NOT add comments or notes
- Your response must start with { and end with }
- Return ONLY the raw JSON object

Make the diagram accurate to the actual architecture found in the code.`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Extract JSON from response (handle markdown code blocks and extra text)
    let jsonText = textContent.text.trim();

    // Try to find JSON in code blocks first
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    } else {
      // Try to find JSON object directly - find first { and last }
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }
    }

    // Parse and validate JSON
    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Analyzer] Failed to parse JSON from Claude response');
      console.error('[Analyzer] Raw response:', textContent.text);
      console.error('[Analyzer] Extracted JSON attempt:', jsonText.substring(0, 500));
      throw new Error(`Failed to parse Claude response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate required fields
    if (!result.diagram || !result.flows) {
      console.error('[Analyzer] Invalid response structure:', result);
      throw new Error('Claude response missing required fields (diagram or flows)');
    }

    console.log('[Analyzer] Successfully generated diagram with Claude');
    return result;

  } finally {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function findSourceFiles(dir: string): Promise<string[]> {
  const fs = await import('fs');
  const path = await import('path');
  const files: string[] = [];

  // First check what's actually in the directory
  const topLevelEntries = fs.readdirSync(dir);
  console.log(`[Analyzer] Top-level entries in ${dir}:`, topLevelEntries);

  const walk = (currentDir: string, baseDir: string) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      // Skip node_modules, .git, etc.
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath, baseDir);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  };

  walk(dir, dir);
  return files;
}

async function readKeyFiles(dir: string, allFiles: string[]): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');

  // Priority patterns for key files
  const keyPatterns = [
    /package\.json$/,
    /README\.md$/i,
    /^src\/.*\.(ts|js|tsx|jsx)$/,
    /^lib\/.*\.(ts|js|tsx|jsx)$/,
    /^app\/.*\.(ts|js|tsx|jsx)$/,
    /server\.(ts|js)$/,
    /index\.(ts|js|tsx|jsx)$/,
    /main\.(ts|js|tsx|jsx)$/,
  ];

  const keyFiles = allFiles
    .filter(f => keyPatterns.some(pattern => pattern.test(f)))
    .slice(0, 10); // Limit to 10 files

  const samples: string[] = [];

  for (const file of keyFiles) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      // Truncate very long files
      const truncated = content.length > 2000 ? content.slice(0, 2000) + '\n... (truncated)' : content;
      samples.push(`\n=== ${file} ===\n${truncated}`);
    } catch (err) {
      // Skip files we can't read
    }
  }

  return samples.join('\n');
}

function getMockAnalysis(repo: GitHubRepo): Omit<ArchitectureAnalysis, 'timestamp' | 'repoInfo'> {
  return {
    diagram: `flowchart TD
    Client["🖥️ Client<br/>Browser"]
    Server["⚙️ Server<br/>${repo.name}"]
    DB[("🗄️ Database")]
    Cache[("💾 Cache")]

    Client -->|Request| Server
    Server -->|Query| DB
    Server -->|Read/Write| Cache
    DB -->|Data| Server
    Cache -->|Data| Server
    Server -->|Response| Client

    style Client fill:#3498db,stroke:#2980b9,stroke-width:3px,color:#fff
    style Server fill:#2ecc71,stroke:#27ae60,stroke-width:3px,color:#fff
    style DB fill:#e74c3c,stroke:#c0392b,stroke-width:3px,color:#fff
    style Cache fill:#f39c12,stroke:#e67e22,stroke-width:3px,color:#fff`,
    flows: [
      {
        name: 'User Request Flow',
        description: 'A typical user request through the system',
        steps: [
          { step: 1, node: 'Client', message: 'User initiates request', duration: 800 },
          { step: 2, node: 'Server', message: 'Server receives request', duration: 800 },
          { step: 3, node: 'Cache', message: 'Check cache for data', duration: 600 },
          { step: 4, node: 'DB', message: 'Query database if cache miss', duration: 1000 },
          { step: 5, node: 'Server', message: 'Process and format response', duration: 800 },
          { step: 6, node: 'Client', message: 'Return response to client', duration: 800 },
        ],
        nodes: ['Client', 'Server', 'Cache', 'DB'],
      },
    ],
  };
}
