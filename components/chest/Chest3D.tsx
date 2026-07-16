"use client";

/**
 * Chest3D renders the interactive 3D pull chest (react-three-fiber).
 *
 * Sequencing contract (see design.md > "3D chest" and Frontend/UX Design):
 *  - `tier === null` (idle): the chest sits closed with no rarity glow. This is the
 *    resting state before a pull is initiated.
 *  - `tier !== null` (charge-up): the chest immediately begins emitting the
 *    Rarity_Color for the awarded tier (silver/purple/gold) via an escalating
 *    point-light + emissive-material glow, communicating rarity BEFORE the
 *    reward is revealed. For a batch pull, the caller passes the HIGHEST tier
 *    among the ten results so the pre-reveal color reflects the best pull.
 *  - After the charge-up beat, the lid opens. When the opening animation
 *    finishes, `onOpenComplete` fires exactly once so the caller (ResultReveal /
 *    PullControls) can proceed to reveal idea content.
 *  - Changing `tier` back to `null` (e.g. after a completed pull, resetting for
 *    the next one) resets the chest to closed/idle with no glow.
 *
 * Tap target: `onTap` is optional. Per design.md, "users tap a 3D chest" to
 * pull, so this component can serve as the primary tap target itself. If
 * PullControls (task 9.3) owns the pull trigger instead, simply omit `onTap`
 * and the wrapping button becomes a non-interactive presentation frame
 * (no glow storytelling is lost either way). When provided, the whole canvas
 * wrapper is a >=44px button so it's comfortable to tap on mobile.
 *
 * Motion is motivated, not decorative: the glow communicates the rarity of an
 * already-determined result (feedback), and the lid opening communicates
 * completion of the reveal sequence (state transition). This component is
 * never mounted when the user prefers reduced motion -- see
 * ChestReducedMotion.tsx and the mount-time check in the consuming screen.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Mesh, PointLight } from "three";
import type { RarityTier } from "@/lib/pull/types";

/** Rarity color as a hex value usable by Three.js materials/lights. */
const RARITY_HEX: Record<RarityTier, string> = {
  common: "#c7cdd6",
  rare: "#a56cf0",
  super_rare: "#f2c14e",
};

/** Peak point-light intensity per tier during charge-up (gold is the biggest moment). */
const RARITY_GLOW_INTENSITY: Record<RarityTier, number> = {
  common: 1.2,
  rare: 2.2,
  super_rare: 4,
};

/** Idle-state glow: a faint, constant brand-tinted rim so the chest is
 * always clearly visible against the dark backdrop before any pull result
 * exists, rather than reading as an invisible dark shape until it glows. */
const IDLE_GLOW_COLOR = "#ff5fa8";
const IDLE_GLOW_INTENSITY = 0.5;

/** How long (ms) the chest glows before the lid opens. */
const CHARGE_UP_MS = 900;
/** How long (ms) the opening animation itself takes once it starts. */
const OPEN_ANIMATION_MS = 700;

export interface Chest3DProps {
  /** Awarded rarity tier driving the pre-open glow; null = idle/closed, no color yet. */
  tier: RarityTier | null;
  /** Fires exactly once when the opening animation finishes. */
  onOpenComplete: () => void;
  /**
   * Optional tap handler. When provided, the chest itself is the primary tap
   * target (per design.md) and the wrapper is rendered as a >=44px button.
   */
  onTap?: () => void;
  /** Disables tap handling while a pull is in flight or the chest is animating. */
  disabled?: boolean;
}

function ChestScene({
  tier,
  onOpenComplete,
}: {
  tier: RarityTier | null;
  onOpenComplete: () => void;
}) {
  const chestGroupRef = useRef<Group>(null);
  const lidRef = useRef<Mesh>(null);
  const glowLightRef = useRef<PointLight>(null);
  const idleLightRef = useRef<PointLight>(null);
  const [phase, setPhase] = useState<"idle" | "charging" | "opening" | "open">(
    "idle"
  );
  const openStartRef = useRef<number | null>(null);
  const chargeStartRef = useRef<number | null>(null);
  const firedCompleteRef = useRef(false);
  const idleStartRef = useRef(performance.now());

  // Drive the charge-up -> open sequence whenever a tier is awarded.
  useEffect(() => {
    if (tier === null) {
      setPhase("idle");
      chargeStartRef.current = null;
      openStartRef.current = null;
      firedCompleteRef.current = false;
      return;
    }

    firedCompleteRef.current = false;
    setPhase("charging");
    chargeStartRef.current = performance.now();

    const openTimer = setTimeout(() => {
      setPhase("opening");
      openStartRef.current = performance.now();
    }, CHARGE_UP_MS);

    return () => clearTimeout(openTimer);
  }, [tier]);

  // Fire onOpenComplete once the open animation duration elapses.
  useEffect(() => {
    if (phase !== "opening") return;
    const completeTimer = setTimeout(() => {
      setPhase("open");
      if (!firedCompleteRef.current) {
        firedCompleteRef.current = true;
        onOpenComplete();
      }
    }, OPEN_ANIMATION_MS);
    return () => clearTimeout(completeTimer);
  }, [phase, onOpenComplete]);

  const glowColor = tier ? RARITY_HEX[tier] : "#ffffff";
  const peakIntensity = tier ? RARITY_GLOW_INTENSITY[tier] : 0;

  useFrame(() => {
    const idleElapsed = performance.now() - idleStartRef.current;

    // Idle: gentle bob + a soft, constant brand-tinted rim light so the
    // chest is always clearly visible (and reads as "alive") before any
    // pull result exists, instead of sitting as a static dark shape.
    if (chestGroupRef.current) {
      const bob = phase === "idle" ? Math.sin(idleElapsed / 700) * 0.04 : 0;
      chestGroupRef.current.position.y = bob;
    }
    if (idleLightRef.current) {
      idleLightRef.current.intensity =
        phase === "idle"
          ? IDLE_GLOW_INTENSITY * (0.85 + 0.15 * Math.sin(idleElapsed / 500))
          : 0;
    }

    // Charge-up: pulse the glow intensity upward toward the tier's peak.
    if (phase === "charging" && chargeStartRef.current !== null) {
      const elapsed = performance.now() - chargeStartRef.current;
      const t = Math.min(elapsed / CHARGE_UP_MS, 1);
      // Ease-in pulse with a bit of flicker so it reads as "charging", not linear.
      const pulse = 0.6 + 0.4 * Math.sin(elapsed / 60);
      if (glowLightRef.current) {
        glowLightRef.current.intensity = peakIntensity * t * pulse;
      }
    } else if (phase === "opening" || phase === "open") {
      if (glowLightRef.current) {
        glowLightRef.current.intensity = peakIntensity;
      }
    } else if (glowLightRef.current) {
      glowLightRef.current.intensity = 0;
    }

    // Opening: animate the lid rotating open, then hold.
    if (lidRef.current) {
      const targetRotation =
        phase === "opening" || phase === "open" ? -Math.PI / 1.6 : 0;
      if (phase === "opening" && openStartRef.current !== null) {
        const elapsed = performance.now() - openStartRef.current;
        const t = Math.min(elapsed / OPEN_ANIMATION_MS, 1);
        // Ease-out so the lid decelerates into place.
        const eased = 1 - Math.pow(1 - t, 3);
        lidRef.current.rotation.x = targetRotation * eased;
      } else {
        lidRef.current.rotation.x = targetRotation;
      }
    }
  });

  return (
    <>
      {/* Brighter, warmer base lighting than before so the chest reads
       * clearly against the dark page even at idle (previously too dim:
       * ambient 0.35 + one weak directional light left it nearly invisible
       * until a glow fired). */}
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#8a7cff" />
      <pointLight
        ref={idleLightRef}
        position={[0, 1, 1.4]}
        color={IDLE_GLOW_COLOR}
        intensity={IDLE_GLOW_INTENSITY}
        distance={6}
      />
      <pointLight
        ref={glowLightRef}
        position={[0, 0.6, 0.6]}
        color={glowColor}
        intensity={0}
        distance={5}
      />

      <group ref={chestGroupRef}>
        {/* Pedestal: gives the chest a visible base/shadow-catcher so it
         * doesn't float as an ungrounded shape against the void backdrop. */
        }
        <mesh position={[0, -0.85, 0]} receiveShadow>
          <cylinderGeometry args={[1.15, 1.3, 0.18, 32]} />
          <meshStandardMaterial
            color="#211a2e"
            emissive={glowColor}
            emissiveIntensity={tier ? 0.15 * (RARITY_GLOW_INTENSITY[tier] / 4) : 0.05}
            roughness={0.7}
            metalness={0.3}
          />
        </mesh>

        {/* Chest base - lightened + more saturated than the original
         * near-black brown so it has real contrast against the dark page. */}
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[1.6, 1, 1]} />
          <meshStandardMaterial
            color="#6b4a2c"
            emissive={glowColor}
            emissiveIntensity={tier ? 0.18 * (RARITY_GLOW_INTENSITY[tier] / 4) : 0.04}
            roughness={0.5}
            metalness={0.25}
          />
        </mesh>

        {/* Gold trim bands for readability/detail at a glance. */}
        <mesh position={[0, -0.3, 0.501]}>
          <boxGeometry args={[1.62, 0.12, 0.02]} />
          <meshStandardMaterial color="#d9b25c" roughness={0.35} metalness={0.6} />
        </mesh>

        {/* Chest lid, pivoted at the back edge so it swings open. */}
        <group position={[0, 0.2, -0.5]}>
          <mesh ref={lidRef} position={[0, 0, 0.5]} castShadow>
            <boxGeometry args={[1.6, 0.5, 1]} />
            <meshStandardMaterial
              color="#7d5636"
              emissive={glowColor}
              emissiveIntensity={
                tier ? 0.3 * (RARITY_GLOW_INTENSITY[tier] / 4) : 0.05
              }
              roughness={0.45}
              metalness={0.3}
            />
          </mesh>
        </group>
      </group>
    </>
  );
}

export default function Chest3D({
  tier,
  onOpenComplete,
  onTap,
  disabled = false,
}: Chest3DProps) {
  const camera = useMemo(
    () => ({ position: [0, 0.55, 3.4] as [number, number, number], fov: 42 }),
    [],
  );

  const canvas = (
    <Canvas
      camera={camera}
      className="h-full w-full"
      aria-hidden="true"
      dpr={[1, 2]}
    >
      <ChestScene tier={tier} onOpenComplete={onOpenComplete} />
    </Canvas>
  );

  // Stage backdrop: a soft radial glow behind the canvas gives the chest a
  // visible "spotlight" ground plane, so it never reads as floating in an
  // undifferentiated void even before any Three.js lighting kicks in.
  const stage = (
    <div className="relative aspect-square w-full max-w-xs mx-auto overflow-hidden rounded-full">
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_58%,rgba(255,95,168,0.16),transparent_65%)]"
      />
      {canvas}
    </div>
  );

  if (!onTap) {
    return (
      <div className="relative w-full" role="img" aria-label="Gacha chest">
        {stage}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      aria-label="Tap to open the chest"
      className="relative w-full min-h-11 min-w-11 block rounded-full disabled:cursor-not-allowed disabled:opacity-70"
    >
      {stage}
    </button>
  );
}
