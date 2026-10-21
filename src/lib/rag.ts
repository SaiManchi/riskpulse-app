import { OpenAI } from 'openai';
import { supabase, isSupabaseConfigured, isOpenAIConfigured } from './db';
import { DocumentMeta } from './seedData';

export interface RAGChunk {
  content: string;
  documentName: string;
  score: number;
  pageNumber: number;
  confidence: number;
}

// Chunk text and calculate page markers based on word densities (average ~320 words/page) with 15-word overlap
export function chunkTextWithMetadata(
  text: string,
  maxWords: number = 60
): { content: string; pageNumber: number }[] {
  const paragraphs = text.split(/\n+/);
  const chunks: { content: string; pageNumber: number }[] = [];
  let cumulativeWordCount = 0;
  const overlap = 15;
  const stride = maxWords - overlap;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Check for raw page separator injections
    let pageMatch = trimmed.match(/page\s+(\d+)/i);
    let forcedPage: number | null = null;
    if (pageMatch && pageMatch[1]) {
      forcedPage = parseInt(pageMatch[1], 10);
    }

    const words = trimmed.split(/\s+/);
    
    if (words.length <= maxWords) {
      cumulativeWordCount += words.length;
      const estimatedPage = forcedPage || Math.max(1, Math.ceil(cumulativeWordCount / 320));
      chunks.push({ content: trimmed, pageNumber: estimatedPage });
    } else {
      // Split large paragraph into sub-chunks with 15-word overlap sliding window
      for (let i = 0; i < words.length; i += stride) {
        const subWords = words.slice(i, i + maxWords);
        if (subWords.length < 5 && chunks.length > 0) break;
        cumulativeWordCount += subWords.length;
        const estimatedPage = forcedPage || Math.max(1, Math.ceil(cumulativeWordCount / 320));
        chunks.push({
          content: subWords.join(' '),
          pageNumber: estimatedPage
        });
        if (i + maxWords >= words.length) break;
      }
    }
  }

  return chunks;
}

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
  'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt',
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'shannt', 'she', 'should', 'shouldnt', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'were', 'werent', 'what', 'when', 'where', 'which',
  'while', 'who', 'whom', 'why', 'with', 'wont', 'would', 'wouldnt', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

// Local text token similarity search with confidence scores and page numbers
export function localVectorSearch(
  query: string,
  documents: DocumentMeta[],
  topK: number = 3
): RAGChunk[] {
  const queryTokens = (query.toLowerCase().match(/\w+/g) || [])
    .filter(token => !STOPWORDS.has(token));
  if (queryTokens.length === 0) return [];

  const results: RAGChunk[] = [];

  for (const doc of documents) {
    const chunks = chunkTextWithMetadata(doc.content);
    for (const chunk of chunks) {
      const chunkTokens = (chunk.content.toLowerCase().match(/\w+/g) || [])
        .filter(token => !STOPWORDS.has(token));
      if (chunkTokens.length === 0) continue;

      // Jaccard Token Overlap
      const querySet = new Set(queryTokens);
      const chunkSet = new Set(chunkTokens);
      
      let intersectionCount = 0;
      querySet.forEach(token => {
        if (chunkSet.has(token)) {
          intersectionCount++;
        }
      });

      const unionCount = new Set([...queryTokens, ...chunkTokens]).size;
      const score = unionCount > 0 ? intersectionCount / unionCount : 0;

      if (score > 0) {
        // Square root / power scaling maps Jaccard decimal points to standard confidence ratios (e.g. 0.15 -> 50%)
        const confidence = Math.min(99, Math.round(Math.pow(score, 0.4) * 100));
        
        results.push({
          content: chunk.content,
          documentName: doc.name,
          score,
          pageNumber: chunk.pageNumber,
          confidence
        });
      }
    }
  }

  // Sort by similarity score descending
  return results.sort((a, b) => b.score - a.score).slice(0, topK);
}

// Retrieve relevant chunks with metadata (confidence, page numbers, and strict client isolation)
export async function retrieveRelevantChunks(
  query: string,
  clientId: string,
  documents: DocumentMeta[],
  topK: number = 3
): Promise<RAGChunk[]> {
  
  if (isSupabaseConfigured && isOpenAIConfigured && supabase) {
    try {
      const customBaseURL = process.env.BLUESMINDS_API_BASE || process.env.OPENAI_API_BASE || undefined;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: customBaseURL
      });
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });
      const embedding = embeddingResponse.data[0].embedding;

      // Strict organization isolation is enforced by the filter_client_id parameter in match_embeddings
      const { data, error } = await supabase.rpc('match_embeddings', {
        query_embedding: embedding,
        match_threshold: 0.2,
        match_count: topK,
        filter_client_id: clientId
      });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => {
          const similarity = item.similarity || 0.5;
          const confidence = Math.round(similarity * 100);
          // Estimate page number based on indexed offset or default
          const pageNumber = item.page_number || Math.max(1, Math.ceil((item.chunk_index * 60) / 320));
          
          return {
            content: item.content,
            documentName: item.document_name,
            score: similarity,
            pageNumber,
            confidence
          };
        });
      }
    } catch (e) {
      console.warn('Supabase embedding search failed, falling back to local indexing:', e);
    }
  }

  // Local RAG execution (guarantees strict multi-tenant isolation since documents passed represent the current client's scoped files)
  return localVectorSearch(query, documents, topK);
}
