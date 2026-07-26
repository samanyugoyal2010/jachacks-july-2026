import type { ComponentType, SVGProps } from "react";
import type { AgentId } from "~/lib/audit/types";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Arrow right</title>
      <path d="M4 12h13.5" />
      <path d="M13 6.5 19 12l-6 5.5" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Shield</title>
      <path d="M12 3.5 5 6v5.2c0 4.3 2.9 7.4 7 9.3 4.1-1.9 7-5 7-9.3V6l-7-2.5Z" />
      <path d="M9 12.2l2 2 4-4.4" />
    </svg>
  );
}

export function IconBan(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Blocked</title>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M6.5 17.5 17.5 6.5" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Check</title>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M8.3 12.3 11 15l5-5.5" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Alert</title>
      <path d="M12 3.75 21 19H3L12 3.75Z" strokeLinejoin="round" />
      <path d="M12 9.75v3.75" />
      <circle cx="12" cy="16.4" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconOctagonAlert(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Critical alert</title>
      <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5Z" />
      <path d="M12 8.5v4.5" />
      <circle cx="12" cy="16" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Info</title>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11v5.2" />
      <circle cx="12" cy="7.9" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Source</title>
      <circle cx="12" cy="8.3" r="3.3" />
      <path d="M5.5 19.5c1.4-3.2 4-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Close</title>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconFlow(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Flow view</title>
      <rect x="3.5" y="4.5" width="5" height="5" rx="1.2" />
      <rect x="15.5" y="4.5" width="5" height="5" rx="1.2" />
      <rect x="9.5" y="14.5" width="5" height="5" rx="1.2" />
      <path d="M8.5 7h4a3 3 0 0 1 3 3M12 14.5V10" />
    </svg>
  );
}

export function IconThoughtGraph(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Thought graph view</title>
      <circle cx="12" cy="12" r="2.1" />
      <circle cx="4.5" cy="6.5" r="1.4" />
      <circle cx="19.5" cy="7" r="1.4" />
      <circle cx="5" cy="18" r="1.4" />
      <circle cx="19" cy="18.5" r="1.4" />
      <path d="M10.3 10.6 5.7 7.3M13.9 10.4l4.6-3M10.2 13.5 6 17M14 13.4l4 4.3" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Run</title>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M10 8.3v7.4l6-3.7-6-3.7Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Reset</title>
      <path d="M19 6.5A8 8 0 1 0 20.5 12" />
      <path d="M19.5 3v4h-4" />
    </svg>
  );
}

export function IconSpinner(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Loading</title>
      <path d="M12 3.75a8.25 8.25 0 1 0 8.25 8.25" />
    </svg>
  );
}

export function IconDashedCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Pending</title>
      <circle cx="12" cy="12" r="8.25" strokeDasharray="3.2 3.2" />
    </svg>
  );
}

export function IconAgentIntake(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Intake Agent</title>
      <path d="M4 13h4l1.8 3h4.4l1.8-3h4" />
      <path d="M4 13 5.8 5.4A2 2 0 0 1 7.7 4h8.6a2 2 0 0 1 1.9 1.4L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z" />
    </svg>
  );
}

export function IconAgentAffordability(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Affordability Analyst</title>
      <path d="M3.5 8.5h17v10a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-10Z" />
      <path d="M3.5 8.5V6A1.5 1.5 0 0 1 5 4.5h11" />
      <circle cx="16.5" cy="13.5" r="1.4" />
    </svg>
  );
}

export function IconAgentRisk(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Risk Analyst</title>
      <path d="M3.5 16.5 8 10l3.2 3.4L15 8.5l5.5 8" />
      <path d="M3.5 20h17" />
    </svg>
  );
}

export function IconAgentPolicy(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Policy Verifier</title>
      <path d="M12 3v3" />
      <path d="M5 8h14" />
      <path d="M8 8 5 14a3 3 0 0 0 6 0L8 8Z" />
      <path d="M16 8l-3 6a3 3 0 0 0 6 0l-3-6Z" />
      <path d="M9 20h6" />
    </svg>
  );
}

export function IconAgentAdjudicator(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <title>Adjudicator</title>
      <path d="M12 3.5 4.5 7.2 12 11l7.5-3.8L12 3.5Z" strokeLinejoin="round" />
      <path d="M4.5 7.2v6.4l7.5 3.9 7.5-3.9V7.2" />
      <path d="M12 11v9.5" />
    </svg>
  );
}

export const AGENT_ICONS: Record<AgentId, ComponentType<IconProps>> = {
  intake: IconAgentIntake,
  affordability: IconAgentAffordability,
  risk: IconAgentRisk,
  policy: IconAgentPolicy,
  adjudicator: IconAgentAdjudicator,
};
