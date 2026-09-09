import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json({orders:[],message:"Online medicine ordering — patient uploads Rx, AI reads it, routes to nearest Nexura pharmacy"});}catch(e){return NextResponse.json({error:"failed"},{status:500});}}
