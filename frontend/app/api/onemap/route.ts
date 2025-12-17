import { NextResponse } from "next/server";

export async function GET() {
    //120b to chinese garden
  const url =
    "https://www.onemap.gov.sg/api/public/routingsvc/route?date=11-10-2025&mode=TRANSIT&maxWalkDistance=1000&numItineraries=3&routeType=bfa&time=11%3A19%3A47&start=1.3580523%2C103.7370989&end=1.3426070%2C103.7326410";



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
