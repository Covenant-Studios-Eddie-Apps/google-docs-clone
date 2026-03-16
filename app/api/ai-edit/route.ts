import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 500 });
  }

  const { instruction, selectedText, fullContent } = await req.json();

  const systemPrompt = `You are an AI writing assistant embedded in a doc editor.
The user is editing an article written in Ernesto Lopez's voice — a Miami founder, direct, punchy, short lines, real numbers, no fluff, no em dashes.

When given an instruction:
- If there is selected text: apply the instruction ONLY to that selected text, return ONLY the replacement text (no commentary, no explanation)
- If there is no selected text: return the FULL updated document as a Tiptap JSON object (same structure as input)

Rules:
- Keep Ernesto's voice always
- Short punchy lines
- No em dashes ever
- No "furthermore", "in conclusion", "leverage"
- Return ONLY the result, nothing else`;

  let userMessage = '';
  if (selectedText) {
    userMessage = `Instruction: ${instruction}\n\nSelected text to edit:\n${selectedText}\n\nReturn only the replacement text.`;
  } else {
    userMessage = `Instruction: ${instruction}\n\nFull document JSON:\n${JSON.stringify(fullContent, null, 2)}\n\nReturn only the updated Tiptap JSON object.`;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 });
  }

  const data = await response.json();
  const result = data.content?.[0]?.text ?? '';

  return NextResponse.json({ result });
}
