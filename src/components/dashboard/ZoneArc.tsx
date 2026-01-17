import { HEART_RATE_ZONES } from '@/lib/heartRateUtils';

interface ZoneArcProps {
  currentZone: number;
  hrPercentage: number;
  size?: number;
}

export function ZoneArc({ currentZone, hrPercentage, size = 160 }: ZoneArcProps) {
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  // Arc spans from 180° (left) to 0° (right), going through bottom
  // Total arc: 180 degrees
  const startAngle = 180;
  const endAngle = 0;
  const totalAngle = 180;

  // Each zone spans a portion of the arc based on percentage range
  const getZoneAngles = (zone: typeof HEART_RATE_ZONES[0]) => {
    // Map percentage to angle (0% = 180°, 100% = 0°)
    const startPercent = Math.min(zone.minPercent, 100);
    const endPercent = Math.min(zone.maxPercent, 100);
    
    const zoneStartAngle = startAngle - (startPercent / 100) * totalAngle;
    const zoneEndAngle = startAngle - (endPercent / 100) * totalAngle;
    
    return { startAngle: zoneStartAngle, endAngle: zoneEndAngle };
  };

  // Convert angle to coordinates on the arc
  const polarToCartesian = (angle: number, r: number = radius) => {
    const angleRad = (angle * Math.PI) / 180;
    return {
      x: centerX + r * Math.cos(angleRad),
      y: centerY - r * Math.sin(angleRad),
    };
  };

  // Create arc path
  const createArc = (startAng: number, endAng: number, r: number = radius) => {
    const start = polarToCartesian(startAng, r);
    const end = polarToCartesian(endAng, r);
    const largeArcFlag = Math.abs(startAng - endAng) > 180 ? 1 : 0;
    const sweepFlag = startAng > endAng ? 1 : 0;
    
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
  };

  // Get marker position based on HR percentage
  const getMarkerPosition = () => {
    const clampedPercentage = Math.min(Math.max(hrPercentage, 0), 110);
    const angle = startAngle - (clampedPercentage / 100) * totalAngle;
    return polarToCartesian(angle, radius);
  };

  const markerPos = getMarkerPosition();

  // Zone colors matching the CSS
  const zoneColors = [
    'hsl(220 15% 45%)',   // Zone 1 - Gray
    'hsl(200 100% 50%)',  // Zone 2 - Blue
    'hsl(145 80% 45%)',   // Zone 3 - Green
    'hsl(45 100% 50%)',   // Zone 4 - Yellow
    'hsl(0 100% 55%)',    // Zone 5 - Red
  ];

  return (
    <svg width={size} height={size * 0.6} viewBox={`0 ${size * 0.35} ${size} ${size * 0.65}`}>
      {/* Zone arcs */}
      {HEART_RATE_ZONES.map((zone, index) => {
        const { startAngle: zStart, endAngle: zEnd } = getZoneAngles(zone);
        const isActive = zone.zone === currentZone;
        const activeStrokeWidth = isActive ? strokeWidth * 1.4 : strokeWidth;
        
        return (
          <path
            key={zone.zone}
            d={createArc(zStart, zEnd, radius - (isActive ? 0 : strokeWidth * 0.2))}
            fill="none"
            stroke={zoneColors[index]}
            strokeWidth={activeStrokeWidth}
            strokeLinecap="round"
            opacity={isActive ? 1 : 0.4}
            style={{
              filter: isActive ? `drop-shadow(0 0 8px ${zoneColors[index]})` : 'none',
              transition: 'all 0.3s ease-out',
            }}
          />
        );
      })}
      
      {/* Current position marker */}
      <circle
        cx={markerPos.x}
        cy={markerPos.y}
        r={strokeWidth * 0.6}
        fill="white"
        stroke="hsl(220 20% 8%)"
        strokeWidth={2}
        style={{
          filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8))',
        }}
      />
    </svg>
  );
}
