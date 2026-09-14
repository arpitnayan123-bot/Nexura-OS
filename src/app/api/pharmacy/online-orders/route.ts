import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withProductAuth } from "@/lib/nx/product-auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
async function GET_impl(){try{return NextResponse.json({orders:[],message:"Online medicine ordering — patient uploads Rx, AI reads it, routes to nearest Nexura pharmacy"});}catch(e){return NextResponse.json({error:"failed"},{status:500});}}

export const GET = withProductAuth("pharmacy.online-orders.GET", GET_impl);
