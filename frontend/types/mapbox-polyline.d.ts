/**
 * Type declarations for @mapbox/polyline
 * Provides encoding/decoding of Google's polyline algorithm
 */
declare module "@mapbox/polyline" {
  /**
   * Decodes an encoded polyline string into an array of coordinates
   * @param str - Encoded polyline string
   * @param precision - Precision of coordinates (default: 5)
   * @returns Array of [latitude, longitude] tuples
   */
  export function decode(str: string, precision?: number): [number, number][]

  /**
   * Encodes an array of coordinates into a polyline string
   * @param coordinates - Array of [latitude, longitude] tuples
   * @param precision - Precision of coordinates (default: 5)
   * @returns Encoded polyline string
   */
  export function encode(coordinates: [number, number][], precision?: number): string

  /**
   * Decodes a polyline string into a GeoJSON LineString
   * @param str - Encoded polyline string
   * @param precision - Precision of coordinates (default: 5)
   * @returns GeoJSON geometry object
   */
  export function toGeoJSON(str: string, precision?: number): {
    type: "LineString"
    coordinates: [number, number][]
  }

  /**
   * Encodes a GeoJSON LineString into a polyline string
   * @param geojson - GeoJSON geometry object
   * @param precision - Precision of coordinates (default: 5)
   * @returns Encoded polyline string
   */
  export function fromGeoJSON(
    geojson: { type: "LineString"; coordinates: [number, number][] },
    precision?: number
  ): string

  const polyline: {
    decode: typeof decode
    encode: typeof encode
    toGeoJSON: typeof toGeoJSON
    fromGeoJSON: typeof fromGeoJSON
  }

  export default polyline
}
