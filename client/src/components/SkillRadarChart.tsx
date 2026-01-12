import { useMemo } from "react";

interface SkillRadarChartProps {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  size?: number;
  showLabels?: boolean;
}

export function SkillRadarChart({
  pace,
  shooting,
  passing,
  dribbling,
  defense,
  physical,
  size = 120,
  showLabels = true
}: SkillRadarChartProps) {
  const stats = useMemo(() => [
    { name: "VEL", value: pace, fullName: "Velocidad" },
    { name: "TIR", value: shooting, fullName: "Tiro" },
    { name: "PAS", value: passing, fullName: "Pase" },
    { name: "REG", value: dribbling, fullName: "Regate" },
    { name: "DEF", value: defense, fullName: "Defensa" },
    { name: "FIS", value: physical, fullName: "Físico" },
  ], [pace, shooting, passing, dribbling, defense, physical]);

  const center = size / 2;
  const maxRadius = (size / 2) - (showLabels ? 20 : 10);

  const getPointCoordinates = (index: number, value: number) => {
    const angle = (index * 60 - 90) * (Math.PI / 180);
    const radius = (value / 100) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  };

  const getLabelCoordinates = (index: number) => {
    const angle = (index * 60 - 90) * (Math.PI / 180);
    const radius = maxRadius + 15;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  };

  const polygonPoints = stats.map((_, i) => {
    const point = getPointCoordinates(i, stats[i].value);
    return `${point.x},${point.y}`;
  }).join(" ");

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((level) => {
        const gridPoints = stats.map((_, i) => {
          const point = getPointCoordinates(i, level);
          return `${point.x},${point.y}`;
        }).join(" ");
        return (
          <polygon
            key={level}
            points={gridPoints}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        );
      })}

      {stats.map((_, i) => {
        const point = getPointCoordinates(i, 100);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        );
      })}

      <polygon
        points={polygonPoints}
        fill="rgba(245, 158, 11, 0.3)"
        stroke="rgb(245, 158, 11)"
        strokeWidth="2"
      />

      {stats.map((stat, i) => {
        const point = getPointCoordinates(i, stat.value);
        return (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="rgb(245, 158, 11)"
          />
        );
      })}

      {showLabels && stats.map((stat, i) => {
        const label = getLabelCoordinates(i);
        return (
          <text
            key={i}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-[8px] font-medium"
          >
            {stat.name}
          </text>
        );
      })}
    </svg>
  );
}
