import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const shotsDir = path.join(process.cwd(), 'public', 'shots');
    console.log("Reading directory:", shotsDir);
    
    const files = fs.readdirSync(shotsDir);
    console.log("Found files:", files);
    
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error reading shots directory:', error);
    return NextResponse.json({ error: 'Failed to read shots directory' }, { status: 500 });
  }
} 