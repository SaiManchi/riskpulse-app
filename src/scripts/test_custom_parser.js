const fs = require('fs');
const zlib = require('zlib');

function extractTextFromPDF(pdfBuffer) {
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
      
      // Extract Tj matches: (text) Tj
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(text)) !== null) {
        fullText += tjMatch[1] + ' ';
      }
      
      // Extract TJ matches: [(text) 100 (text)] TJ
      const tjBigRegex = /\[([^\]]*)\]\s*TJ/g;
      let tjBigMatch;
      while ((tjBigMatch = tjBigRegex.exec(text)) !== null) {
        const content = tjBigMatch[1];
        const innerRegex = /\(([^)]*)\)/g;
        let innerMatch;
        while ((innerMatch = innerRegex.exec(content)) !== null) {
          fullText += innerMatch[1];
        }
        fullText += ' ';
      }
    }
  }
  
  return fullText
    .replace(/\\([\(\)])/g, '$1')
    .replace(/\\/g, '')
    .trim();
}

try {
  const buffer = fs.readFileSync('test.pdf');
  const text = extractTextFromPDF(buffer);
  console.log('EXTRACTED TEXT SUCCESS:', text);
} catch (e) {
  console.error('FAILED TO RUN PARSER:', e);
}
