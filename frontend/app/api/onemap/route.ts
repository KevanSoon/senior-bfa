import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Get start and end coordinates from query params
  const startLat = searchParams.get("startLat") || "1.3580523";
  const startLng = searchParams.get("startLng") || "103.7370989";
  const endLat = searchParams.get("endLat") || "1.3426070";
  const endLng = searchParams.get("endLng") || "103.7326410";
  
  // Get current date and time
  const now = new Date();
  const date = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
  const time = `${now.getHours().toString().padStart(2, '0')}%3A${now.getMinutes().toString().padStart(2, '0')}%3A${now.getSeconds().toString().padStart(2, '0')}`;
  
  const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?date=${date}&mode=TRANSIT&maxWalkDistance=1000&numItineraries=3&routeType=bfa&time=${time}&start=${startLat}%2C${startLng}&end=${endLat}%2C${endLng}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.ONEMAP_TOKEN}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "OneMap request failed" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
