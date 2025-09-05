import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userMessage } = await request.json();
  
  // Simulate the LLM API call to process-llm
  try {
    const llmResponse = await fetch('http://localhost:3000/api/process-llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: userMessage,
        conversation: [],
        from: 'test-user'
      })
    });
    
    const llmData = await llmResponse.json();
    
    // Now simulate what the WhatsApp route would do with this response
    let replyMessage = 'Let me help you with safety-related questions or reporting. What specific incident would you like to report?';
    
    if (llmData.success) {
      console.log('LLM Response:', llmData);
      
      if (typeof llmData.result === 'object' && llmData.result !== null) {
        if (llmData.result.confirmation) {
          replyMessage = llmData.result.reply || 'Please confirm if this information is correct by saying "yes" or "no".';
        } else if (llmData.result.event) {
          replyMessage = llmData.result.reply || 'Thank you! I have recorded this incident.';
        } else {
          replyMessage = llmData.result.reply || 'I understand. How can I help you with safety-related questions or reporting?';
        }
      } else if (typeof llmData.result === 'string' && llmData.result.length > 0) {
        const replyText = llmData.result;
        
        // Check if the string contains JSON that we need to parse
        if (replyText.includes('```json') || (replyText.includes('"confirmation"') && replyText.includes('"reply"'))) {
          try {
            // Clean up markdown formatting and extract JSON more robustly
            let cleanedText = replyText.trim();
            
            // Remove markdown code blocks
            if (cleanedText.includes('```json')) {
              const jsonMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
              if (jsonMatch) {
                cleanedText = jsonMatch[1];
              }
            } else if (cleanedText.includes('```')) {
              const codeMatch = cleanedText.match(/```\s*([\s\S]*?)\s*```/);
              if (codeMatch) {
                cleanedText = codeMatch[1];
              }
            }
            
            // Find JSON object boundaries more carefully
            const jsonStart = cleanedText.indexOf('{');
            const jsonEnd = cleanedText.lastIndexOf('}') + 1;
            if (jsonStart !== -1 && jsonEnd > jsonStart) {
              cleanedText = cleanedText.substring(jsonStart, jsonEnd);
            }
            
            // Remove any trailing commas or comments
            cleanedText = cleanedText.replace(/,(\s*[}\]])/g, '$1').replace(/\/\/.*$/gm, '');
            
            console.log('Original LLM response:', replyText);
            console.log('Cleaned text for parsing:', cleanedText);
            
            // Try to parse as JSON
            const parsedData = JSON.parse(cleanedText);
            
            if (parsedData.confirmation) {
              replyMessage = parsedData.reply || 'Please confirm if this information is correct by saying "yes" or "no".';
            } else if (parsedData.event) {
              replyMessage = parsedData.reply || 'Thank you! I have recorded this incident.';
            } else {
              replyMessage = parsedData.reply || 'I understand. How can I help you with safety-related questions or reporting?';
            }
          } catch (parseError) {
            console.log('Failed to parse JSON from string response:', parseError);
            
            // Try to extract just the reply field manually
            const replyMatch = replyText.match(/"reply"\s*:\s*"([^"]+)"/);
            if (replyMatch) {
              replyMessage = replyMatch[1];
              console.log('Extracted reply manually:', replyMessage);
            } else {
              console.log('Manual extraction failed, using fallback');
              replyMessage = 'I understand. How can I help you with safety-related questions or reporting?';
            }
          }
        } else {
          replyMessage = replyText;
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      userWouldSee: replyMessage,
      llmResponse: llmData,
      debug: {
        llmSuccess: llmData.success,
        resultType: typeof llmData.result,
        resultPreview: typeof llmData.result === 'string' ? llmData.result.substring(0, 200) + '...' : llmData.result
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userWouldSee: 'Let me help you with safety-related questions or reporting. What specific incident would you like to report?'
    });
  }
}
