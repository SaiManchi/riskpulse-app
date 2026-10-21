import { NextResponse } from 'next/server';
import { addDocument } from '@/lib/db';
import mammoth from 'mammoth';
import zlib from 'zlib';

if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
  (global as any).DOMMatrix = class DOMMatrix {};
}
const pdf = require('pdf-parse');

async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    const PDFParseClass = pdf.PDFParse || (pdf.default && pdf.default.PDFParse) || pdf;
    const parser = new PDFParseClass(new Uint8Array(pdfBuffer));
    const data = await parser.getText();
    if (data && data.text && data.text.trim() && data.text.trim().length > 150) {
      return data.text;
    }
  } catch (err) {
    console.warn('pdf-parse failed, falling back to custom parser in upload:', err);
  }

  // Custom parser fallback
  const pdfString = pdfBuffer.toString('binary');
  let fullText = '';
  
  let searchIdx = 0;
  while (true) {
    const streamStartIdx = pdfString.indexOf('stream', searchIdx);
    if (streamStartIdx === -1) break;
    
    let binaryStart = streamStartIdx + 6;
    if (pdfBuffer[binaryStart] === 13) binaryStart++; // CR
    if (pdfBuffer[binaryStart] === 10) binaryStart++; // LF
    
    const streamEndIdx = pdfString.indexOf('endstream', binaryStart);
    if (streamEndIdx === -1) break;
    
    let trimmedEnd = streamEndIdx;
    while (trimmedEnd > binaryStart && (pdfBuffer[trimmedEnd - 1] === 10 || pdfBuffer[trimmedEnd - 1] === 13)) {
      trimmedEnd--;
    }
    
    const streamBuffer = pdfBuffer.slice(binaryStart, trimmedEnd);
    searchIdx = streamEndIdx + 9;
    
    let decompressed;
    try {
      decompressed = zlib.inflateSync(streamBuffer);
    } catch (e) {
      try {
        decompressed = zlib.unzipSync(streamBuffer);
      } catch (err) {
        // Use raw uncompressed stream directly
        decompressed = streamBuffer;
      }
    }
    
    if (decompressed) {
      const text = decompressed.toString('utf8');
      
      let foundText = '';
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(text)) !== null) {
        foundText += tjMatch[1] + ' ';
      }
      
      const tjBigRegex = /\[([^\]]*)\]\s*TJ/g;
      let tjBigMatch;
      while ((tjBigMatch = tjBigRegex.exec(text)) !== null) {
        const content = tjBigMatch[1];
        const innerRegex = /\(([^)]*)\)/g;
        let innerMatch;
        while ((innerMatch = innerRegex.exec(content)) !== null) {
          foundText += innerMatch[1];
        }
        foundText += ' ';
      }
      
      if (foundText.trim()) {
        fullText += foundText + ' ';
      } else {
        fullText += text + ' ';
      }
    }
  }
  
  return fullText
    .replace(/\\([\(\)])/g, '$1')
    .replace(/\\/g, '')
    .trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const clientId = formData.get('clientId') as string | null;

    if (!file || !clientId) {
      return NextResponse.json({ error: 'file and clientId are required' }, { status: 400 });
    }

    const filename = file.name;
    const fileType = filename.split('.').pop()?.toUpperCase() || 'TXT';
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    if (fileType === 'TXT') {
      extractedText = buffer.toString('utf8');
    } else if (fileType === 'PDF') {
      try {
        extractedText = await extractTextFromPDF(buffer);
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json({ error: 'Failed to parse PDF document structure.' }, { status: 500 });
      }
    } else if (fileType === 'DOCX') {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
      } catch (docxError) {
        console.error('DOCX parsing error:', docxError);
        return NextResponse.json({ error: 'Failed to parse DOCX document structure.' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Please upload PDF, DOCX, or TXT.' }, { status: 400 });
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Document appears to be empty or unreadable.' }, { status: 400 });
    }

    // Save document to db
    const saved = await addDocument(clientId, {
      name: filename,
      file_type: fileType,
      created_at: new Date().toISOString(),
      content: extractedText
    });

    return NextResponse.json({
      success: true,
      document: saved,
      characterCount: extractedText.length
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Failed to upload and process file' }, { status: 500 });
  }
}
