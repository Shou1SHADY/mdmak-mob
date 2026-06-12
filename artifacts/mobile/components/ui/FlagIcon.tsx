import React from "react";
import Svg, { Rect, Path, Line, Polygon, Text as SvgText, Defs, ClipPath } from "react-native-svg";

interface FlagProps {
  width?: number;
  height?: number;
}

export function SaudiArabiaFlag({ width = 56, height = 36 }: FlagProps) {
  const w = 56;
  const h = 36;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${w} ${h}`}>
      <Rect width={w} height={h} fill="#006C35" />
      <SvgText
        x={w / 2}
        y={15}
        fontSize={6.2}
        fill="#FFFFFF"
        textAnchor="middle"
        fontFamily="System"
      >
        لا إله إلا الله محمد رسول الله
      </SvgText>
      {/* Blade */}
      <Path d="M13 22.5 L44 21 L44 22 L13 24 Z" fill="#FFFFFF" />
      {/* Tip */}
      <Path d="M44 21 L47 21.5 L44 22 Z" fill="#FFFFFF" />
      {/* Cross-guard */}
      <Rect x="13" y="20.5" width="1.5" height="5" rx="0.5" fill="#FFFFFF" />
      {/* Handle */}
      <Rect x="10" y="21.5" width="4" height="2" rx="1" fill="#FFFFFF" />
      {/* Pommel */}
      <Rect x="9" y="21" width="1.5" height="3" rx="0.75" fill="#FFFFFF" />
    </Svg>
  );
}

export function UKFlag({ width = 56, height = 36 }: FlagProps) {
  const w = 60;
  const h = 36;
  const cx = w / 2; // 30
  const cy = h / 2; // 18

  // Perpendicular offset for the counterchanged St Patrick's Cross
  // Diagonal TL→BR direction: (w,h)/||(w,h)|| ; perp: (-h,w)/||(−h,w)||
  // For (60,36): length=69.97, perp unit=(−36,60)/69.97=(−0.514, 0.857)
  // Offset = 1.5 px perpendicular  →  (+0.77, -1.29) and (−0.77, +1.29)
  const ox = 0.77;
  const oy = -1.29;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${w} ${h}`}>
      {/* 1 — Blue field */}
      <Rect width={w} height={h} fill="#012169" />

      {/* 2 — White saltire (St Andrew's Cross, Scotland) */}
      <Line x1={0} y1={0} x2={w} y2={h} stroke="#FFFFFF" strokeWidth={10} />
      <Line x1={w} y1={0} x2={0} y2={h} stroke="#FFFFFF" strokeWidth={10} />

      {/* 3 — Red saltire counterchanged (St Patrick's Cross, Ireland) */}
      {/* TL→BR diagonal: upper-left half red runs BELOW white centre line */}
      <Line x1={0 + ox} y1={0 - oy} x2={cx + ox} y2={cy - oy} stroke="#C8102E" strokeWidth={3.5} />
      {/* TL→BR diagonal: lower-right half red runs ABOVE white centre line */}
      <Line x1={cx - ox} y1={cy + oy} x2={w - ox} y2={h + oy} stroke="#C8102E" strokeWidth={3.5} />
      {/* TR→BL diagonal: upper-right half red runs BELOW white centre line */}
      <Line x1={w - ox} y1={0 + oy} x2={cx - ox} y2={cy + oy} stroke="#C8102E" strokeWidth={3.5} />
      {/* TR→BL diagonal: lower-left half red runs ABOVE white centre line */}
      <Line x1={cx + ox} y1={cy - oy} x2={0 + ox} y2={h - oy} stroke="#C8102E" strokeWidth={3.5} />

      {/* 4 — White fimbriation cross (St George's white border) */}
      <Rect x={0} y={cy - 5.5} width={w} height={11} fill="#FFFFFF" />
      <Rect x={cx - 5.5} y={0} width={11} height={h} fill="#FFFFFF" />

      {/* 5 — Red cross (St George's Cross, England) */}
      <Rect x={0} y={cy - 3} width={w} height={6} fill="#C8102E" />
      <Rect x={cx - 3} y={0} width={6} height={h} fill="#C8102E" />
    </Svg>
  );
}
