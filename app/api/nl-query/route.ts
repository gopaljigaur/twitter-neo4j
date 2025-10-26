import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { read } from '@/lib/neo4j';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const NEO4J_SCHEMA = `
Neo4j Database Schema:
======================

Node Types:
-----------
1. User
   Properties: screen_name (string), name (string), followers (int),
              statuses (int), profile_image_url (string)

2. Tweet
   Properties: id (string), text (string), created_at (datetime), favorites (int)

3. Hashtag
   Properties: name (string)

Relationships:
--------------
1. (User)-[:POSTS]->(Tweet) - A user posts a tweet
2. (Tweet)-[:TAGS]->(Hashtag) - A tweet contains a hashtag
3. (Tweet)-[:MENTIONS]->(User) - A tweet mentions a user

Example Cypher Queries:
-----------------------
1. Find users with high followers:
   MATCH (u:User) WHERE u.followers > 10000 RETURN u ORDER BY u.followers DESC LIMIT 10

2. Find tweets with a hashtag:
   MATCH (t:Tweet)-[:TAGS]->(h:Hashtag {name: 'neo4j'}) RETURN t LIMIT 10

3. Find influential users in a topic:
   MATCH (u:User)-[:POSTS]->(t:Tweet)-[:TAGS]->(h:Hashtag {name: 'ai'})
   WHERE u.followers > 5000
   RETURN u.screen_name, u.followers, count(t) as tweet_count
   ORDER BY u.followers DESC LIMIT 10

4. Find users mentioned together:
   MATCH (t:Tweet)-[:MENTIONS]->(u1:User)
   MATCH (t)-[:MENTIONS]->(u2:User)
   WHERE u1 <> u2
   RETURN u1.screen_name, u2.screen_name, count(t) as mentions
   ORDER BY mentions DESC LIMIT 10

5. Find related hashtags:
   MATCH (h1:Hashtag)<-[:TAGS]-(t:Tweet)-[:TAGS]->(h2:Hashtag)
   WHERE h1.name = 'neo4j' AND h1 <> h2
   RETURN h2.name, count(t) as co_occurrences
   ORDER BY co_occurrences DESC LIMIT 10

Safety Rules:
-------------
- ONLY generate READ queries (MATCH, RETURN, WITH, WHERE, ORDER BY, LIMIT, SKIP)
- NO WRITE operations (CREATE, DELETE, SET, REMOVE, MERGE)
- Always include LIMIT to prevent large result sets (max 100)
- Use proper WHERE clauses for filtering
- Return relevant properties only
`;

function validateCypherQuery(query: string): {
  valid: boolean;
  error?: string;
  needsLimit?: boolean;
} {
  const upperQuery = query.toUpperCase();

  // Check for write operations (must be whole words, not substrings)
  const writeOperations = [
    'CREATE',
    'DELETE',
    'SET',
    'REMOVE',
    'MERGE',
    'DROP',
    'DETACH',
  ];
  for (const op of writeOperations) {
    // Use word boundary regex to match complete words only
    const regex = new RegExp(`\\b${op}\\b`);
    if (regex.test(upperQuery)) {
      return { valid: false, error: `Write operation '${op}' is not allowed` };
    }
  }

  // Check if LIMIT is present
  const hasLimit = upperQuery.includes('LIMIT');

  // If LIMIT is present, validate it
  if (hasLimit) {
    const limitMatch = upperQuery.match(/LIMIT\s+(\d+)/);
    if (limitMatch) {
      const limitValue = parseInt(limitMatch[1]);
      if (limitValue > 1000) {
        return { valid: false, error: 'LIMIT cannot exceed 1000' };
      }
    }
  }

  return { valid: true, needsLimit: !hasLimit };
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (
      !process.env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY === 'your_gemini_api_key_here'
    ) {
      return NextResponse.json(
        {
          error:
            'Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file.',
        },
        { status: 500 }
      );
    }

    // Generate Cypher query using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `${NEO4J_SCHEMA}

User Question: ${query}

Generate a Cypher query to answer this question. Return ONLY the Cypher query, no explanations or markdown formatting.
The query must be safe (read-only).

Important notes about LIMIT:
- If the user specifies a number (e.g., "top 5", "show 10", "first 20"), use that exact number as the LIMIT.
- If the user doesn't specify a number, do NOT add a LIMIT clause - the system will apply a default limit.
- Never use a LIMIT greater than 1000.

Cypher Query:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let cypherQuery = response.text().trim();

    // Clean up the query (remove markdown code blocks if present)
    cypherQuery = cypherQuery
      .replace(/```cypher\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Validate the query
    const validation = validateCypherQuery(cypherQuery);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Generated query failed validation',
          details: validation.error,
          generatedQuery: cypherQuery,
        },
        { status: 400 }
      );
    }

    // Add default LIMIT if not present
    let finalQuery = cypherQuery;
    if (validation.needsLimit) {
      finalQuery = `${cypherQuery} LIMIT 100`;
    }

    // Execute the query
    try {
      const queryResult = await read(finalQuery, {});

      // Filter out internal/technical fields from results
      const internalFields = [
        'embedding',        // 384-dimensional vectors (not useful for users)
        'import_method',    // Internal metadata about how data was loaded
        'id_str',          // String version of ID (redundant, we have 'id')
      ];

      const cleanValue = (value: any): any => {
        if (value === null || value === undefined) return value;

        // Handle arrays
        if (Array.isArray(value)) {
          return value.map(cleanValue);
        }

        // Handle objects (including Neo4j nodes)
        if (typeof value === 'object') {
          const cleaned: any = {};
          for (const [k, v] of Object.entries(value)) {
            // Skip internal fields
            if (internalFields.includes(k)) {
              continue;
            }
            cleaned[k] = cleanValue(v);
          }
          return cleaned;
        }

        return value;
      };

      const cleanResults = queryResult.map((row: any) => cleanValue(row));

      return NextResponse.json({
        success: true,
        query: finalQuery,
        results: cleanResults,
        resultCount: cleanResults.length,
      });
    } catch (execError: any) {
      return NextResponse.json(
        {
          error: 'Query execution failed',
          details: execError.message,
          generatedQuery: cypherQuery,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('NL Query API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process natural language query',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
