import { NextResponse } from 'next/server';

export async function POST() {
  // Simulate exactly what process-llm should return for a phone theft report
  const mockLlmResponse = {
    success: true,
    result: {
      confirmation: {
        type: "Phone theft",
        location: "Road near Aga Khan Hospital, Westlands",
        description: "Phone stolen at 6:00 am. Thief on motorbike with plate number 647382, wearing a black shirt and carrying a knife.",
        timestamp: "6:00 am"
      },
      reply: "Let me make sure I have this right: Your phone was stolen at 6:00 am this morning on the road near Aga Khan Hospital in Westlands. The thief was on a motorbike with plate number 647382, wearing a black shirt, and carrying a knife. Should I record this incident in our safety system? Just say 'yes' if this looks correct, or 'no' if you want to change anything."
    },
    provider: "gemini"
  };

  // Now test what the WhatsApp route logic would do with this
  const llmData = mockLlmResponse;
  let replyMessage = 'Let me help you with safety-related questions or reporting. What specific incident would you like to report?';

  console.log('Mock LLM Data:', JSON.stringify(llmData, null, 2));
  console.log('llmData.result type:', typeof llmData.result);
  console.log('llmData.result is object:', typeof llmData.result === 'object');
  console.log('llmData.result is null:', llmData.result === null);

  if (llmData.result && typeof llmData.result === 'object') {
    console.log('✅ OBJECT PATH: Processing as object');
    if ((llmData.result as any).confirmation) {
      console.log('✅ CONFIRMATION: Found confirmation object');
      if ((llmData.result as any).reply) {
        replyMessage = (llmData.result as any).reply;
        console.log('✅ REPLY: Using confirmation reply:', replyMessage);
      }
    } else if ((llmData.result as any).event) {
      console.log('✅ EVENT: Found event object');
      replyMessage = (llmData.result as any).reply || 'Thank you! I have recorded this incident.';
    }
    
    if ((llmData.result as any).reply) {
      replyMessage = (llmData.result as any).reply;
      console.log('✅ FINAL REPLY: Using reply from object:', replyMessage);
    }
  } else if (typeof llmData.result === 'string' && (llmData.result as string).length > 0) {
    console.log('❌ STRING PATH: Processing as string - THIS IS THE PROBLEM!');
    replyMessage = 'ERROR: This should not happen with proper object response';
  } else {
    console.log('❌ NO RESULT: No valid result found');
  }

  return NextResponse.json({
    success: true,
    userWouldSee: replyMessage,
    mockResponse: mockLlmResponse,
    debug: {
      resultType: typeof llmData.result,
      isObject: typeof llmData.result === 'object',
      isNull: llmData.result === null,
      hasConfirmation: !!(llmData.result && llmData.result.confirmation),
      hasReply: !!(llmData.result && llmData.result.reply)
    }
  });
}
