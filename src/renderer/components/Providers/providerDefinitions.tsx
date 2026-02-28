import React from "react";
import Claude from "@lobehub/icons/es/Claude";
import OpenAI from "@lobehub/icons/es/OpenAI";
import Gemini from "@lobehub/icons/es/Gemini";
import GithubCopilot from "@lobehub/icons/es/GithubCopilot";
import Qwen from "@lobehub/icons/es/Qwen";

import {
  AntigravityIcon,
  IFlowIcon,
  KiroIcon,
  CustomIcon,
} from "../icons/ProviderIcons";

import { Provider } from "./types";

export const allProviders: Omit<Provider, "accounts">[] = [
  {
    id: "claude",
    name: "Claude Code",
    icon: <Claude.Color size={24} />,
    color: "magenta",
    description: "Claude 4, Claude 3.5 Sonnet, Claude 3 Opus",
    authType: "oauth",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    icon: <Gemini.Color size={24} />,
    color: "indigo",
    description: "Gemini 2.5 Pro/Flash, Gemini 1.5",
    authType: "oauth",
  },
  {
    id: "codex",
    name: "Codex (OpenAI)",
    icon: <OpenAI size={24} />,
    color: "teal",
    description: "GPT-4o, o1, o3, ChatGPT Plus",
    authType: "oauth",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    icon: <AntigravityIcon className="w-6 h-6 object-contain" />,
    color: "magenta",
    description: "Claude 4 Sonnet, Gemini 2.5 Pro",
    authType: "oauth",
  },
  {
    id: "qwen",
    name: "Qwen Code",
    icon: <Qwen.Color size={24} />,
    color: "indigo",
    description: "Qwen 3, Qwen 2.5 Coder",
    authType: "oauth",
  },
  {
    id: "iflow",
    name: "iFlow",
    icon: <IFlowIcon />,
    color: "teal",
    description: "Claude 4 Sonnet, Gemini 2.5 Pro",
    authType: "oauth",
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    icon: <GithubCopilot size={24} />,
    color: "teal",
    description: "GPT-4o, Claude 3.5, Gemini 2.0",
    authType: "oauth",
  },
  {
    id: "kiro",
    name: "Kiro",
    icon: <KiroIcon className="w-6 h-6 object-contain" />,
    color: "indigo",
    description: "Claude Sonnet 4, Amazon Nova",
    authType: "oauth",
  },
  {
    id: "custom",
    name: "Custom Provider",
    icon: <CustomIcon />,
    color: "indigo",
    description: "Custom OpenAI-compatible endpoint",
    authType: "apikey",
  },
  {
    id: "ampcode",
    name: "AmpCode",
    icon: <CustomIcon />,
    color: "indigo",
    description: "AmpCode upstream and model-mapping settings",
    authType: "apikey",
  },
];
