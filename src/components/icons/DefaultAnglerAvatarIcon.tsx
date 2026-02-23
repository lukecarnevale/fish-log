import React from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  Filter,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

interface DefaultAnglerAvatarProps {
  /** Diameter of the avatar. Defaults to 88 */
  size?: number;
}

/**
 * DefaultAnglerAvatarIcon
 *
 * Drop-in default profile avatar for Fish Log Co.
 * Teal silhouette angler with gold fish, B2 border (teal outer + gold inner ring).
 *
 * Usage:
 *   <DefaultAnglerAvatarIcon />
 *   <DefaultAnglerAvatarIcon size={120} />
 */
const DefaultAnglerAvatarIcon: React.FC<DefaultAnglerAvatarProps> = ({ size = 88 }) => {
  // All coordinates are authored in a 160×160 viewBox.
  // The component scales uniformly via width/height props on Svg.
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        {/* ── Background: deep teal radial gradient ── */}
        <RadialGradient id="avatarBg" cx="45%" cy="35%" r="70%" fx="45%" fy="35%">
          <Stop offset="0%"   stopColor="#1a7a86" />
          <Stop offset="55%"  stopColor="#0D5C63" />
          <Stop offset="100%" stopColor="#062e32" />
        </RadialGradient>

        {/* ── B2 Border: outer teal ring ── */}
        <LinearGradient id="outerRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#0D5C63" />
          <Stop offset="100%" stopColor="#0a4a50" />
        </LinearGradient>

        {/* ── B2 Border: inner gold ring ── */}
        <LinearGradient id="innerRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FFD166" />
          <Stop offset="50%"  stopColor="#F5A623" />
          <Stop offset="100%" stopColor="#c87820" />
        </LinearGradient>

        {/* ── Gold fish gradient ── */}
        <LinearGradient id="goldFish" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FFD166" />
          <Stop offset="100%" stopColor="#F5A623" />
        </LinearGradient>

        {/* ── Gold glow filter (for inner ring) ── */}
        <Filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
          <FeGaussianBlur stdDeviation="2" result="blur" />
          <FeMerge>
            <FeMergeNode in="blur" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>

        {/* ── Clip to avatar circle ── */}
        <ClipPath id="avatarClip">
          <Circle cx="80" cy="80" r="65" />
        </ClipPath>
      </Defs>

      {/* ════════════════════════════════
          B2 BORDER — outer teal band
      ════════════════════════════════ */}
      <Circle cx="80" cy="80" r="78" fill="none" stroke="url(#outerRing)" strokeWidth="3.5" />

      {/* Dark gap between outer teal and inner gold */}
      <Circle cx="80" cy="80" r="74.5" fill="#05080f" />

      {/* Inner gold ring */}
      <Circle
        cx="80" cy="80" r="73"
        fill="none"
        stroke="url(#innerRing)"
        strokeWidth="1.5"
        filter="url(#goldGlow)"
      />

      {/* Thin dark gap before avatar face */}
      <Circle cx="80" cy="80" r="71" fill="#05080f" />

      {/* ════════════════════════════════
          AVATAR FACE
      ════════════════════════════════ */}
      <Circle cx="80" cy="80" r="69" fill="url(#avatarBg)" />

      {/* ── Water layers ── */}
      <Path
        d="M0 108 Q40 100 80 108 Q120 116 160 108 L160 160 L0 160 Z"
        fill="#041e20"
        fillOpacity={0.65}
        clipPath="url(#avatarClip)"
      />
      <Path
        d="M0 120 Q40 113 80 120 Q120 127 160 120 L160 160 L0 160 Z"
        fill="#031518"
        fillOpacity={0.5}
        clipPath="url(#avatarClip)"
      />
      {/* Water surface line */}
      <Path
        d="M6 110 Q24 106 42 110 Q60 114 78 110 Q96 106 114 110 Q132 114 152 110"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
        clipPath="url(#avatarClip)"
      />

      {/* ── Silhouette ── */}

      {/* Head */}
      <Circle cx="80" cy="54" r="16" fill="rgba(255,255,255,0.20)" />

      {/* Neck */}
      <Rect x="76" y="69" width="8" height="7" fill="rgba(255,255,255,0.17)" />

      {/* Torso */}
      <Path
        d="M60 118 L62 78 Q64 70 80 70 Q96 70 98 78 L100 118 Z"
        fill="rgba(255,255,255,0.17)"
      />
      {/* Shoulder highlight */}
      <Path
        d="M62 78 Q71 74 80 74 Q89 74 98 78"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth={1}
        fill="none"
      />

      {/* Left arm */}
      <Path
        d="M63 80 Q52 90 50 102"
        stroke="rgba(255,255,255,0.17)"
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
      />
      {/* Left hand */}
      <Circle cx="50" cy="103" r="5" fill="rgba(255,255,255,0.15)" />

      {/* Right arm (rod side) */}
      <Path
        d="M97 80 Q106 72 112 66"
        stroke="rgba(255,255,255,0.20)"
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
      />
      {/* Right hand */}
      <Circle cx="113" cy="65" r="5" fill="rgba(255,255,255,0.18)" />

      {/* ── Fishing Rod ── */}
      {/* Main blank */}
      <Line
        x1="113" y1="65" x2="148" y2="12"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      {/* Taper overlay (mid → tip) */}
      <Line
        x1="130" y1="38" x2="148" y2="12"
        stroke="rgba(255,255,255,0.20)"
        strokeWidth={1}
        strokeLinecap="round"
      />
      {/* Reel seat ring */}
      <Circle
        cx="116" cy="62" r="4"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1.2}
      />

      {/* ── Fishing Line ── */}
      <Path
        d="M148 12 Q156 34 153 62 Q151 76 150 84"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
        strokeDasharray="3 4"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Fish (gold accent) ── */}
      {/* Body */}
      <Ellipse
        cx="151" cy="86" rx="8" ry="4.5"
        fill="url(#goldFish)"
        fillOpacity={0.92}
      />
      {/* Tail */}
      <Path
        d="M143 86 Q139 82 140 90 Q139 82 143 86"
        fill="url(#goldFish)"
        fillOpacity={0.92}
      />
      {/* Eye */}
      <Circle cx="149" cy="84.5" r="1.8" fill="#062e32" />
      {/* Eye specular */}
      <Circle cx="149.5" cy="84" r="0.7" fill="rgba(255,255,255,0.6)" />
      {/* Scale arc */}
      <Path
        d="M148 83 Q152 83 154 86"
        stroke="rgba(255,255,255,0.20)"
        strokeWidth={0.8}
        fill="none"
      />

      {/* Horizon ambient glow */}
      <Ellipse
        cx="80" cy="108" rx="60" ry="10"
        fill="#0D5C63"
        fillOpacity={0.15}
        clipPath="url(#avatarClip)"
      />
    </Svg>
  );
};

export default DefaultAnglerAvatarIcon;
