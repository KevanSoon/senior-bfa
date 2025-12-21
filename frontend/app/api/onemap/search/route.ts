import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  
  if (!query) {
    return NextResponse.json(
      { error: "Search query is required" },
      { status: 400 }
    );
  }
  
  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.ONEMAP_TOKEN}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "OneMap search request failed" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
