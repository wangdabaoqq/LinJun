import React from "react";
import Claude from "@lobehub/icons/es/Claude";
import OpenAI from "@lobehub/icons/es/OpenAI";
import Gemini from "@lobehub/icons/es/Gemini";
import Google from "@lobehub/icons/es/Google";
import GithubCopilot from "@lobehub/icons/es/GithubCopilot";
import Qwen from "@lobehub/icons/es/Qwen";
import DeepSeek from "@lobehub/icons/es/DeepSeek";
import Meta from "@lobehub/icons/es/Meta";
import Mistral from "@lobehub/icons/es/Mistral";
import Perplexity from "@lobehub/icons/es/Perplexity";
import Grok from "@lobehub/icons/es/Grok";
import ZAI from "@lobehub/icons/es/ZAI";
import Minimax from "@lobehub/icons/es/Minimax";
import HuggingFace from "@lobehub/icons/es/HuggingFace";
import Nvidia from "@lobehub/icons/es/Nvidia";
import Azure from "@lobehub/icons/es/Azure";
import SiliconCloud from "@lobehub/icons/es/SiliconCloud";
import Vercel from "@lobehub/icons/es/Vercel";
import Moonshot from "@lobehub/icons/es/Moonshot";
import Kimi from "@lobehub/icons/es/Kimi";
import Baichuan from "@lobehub/icons/es/Baichuan";
import Bedrock from "@lobehub/icons/es/Bedrock";
import Spark from "@lobehub/icons/es/Spark";
import Stepfun from "@lobehub/icons/es/Stepfun";
import Ollama from "@lobehub/icons/es/Ollama";
import ZenMux from "@lobehub/icons/es/ZenMux";

export {
  Claude,
  OpenAI,
  Gemini,
  Google,
  GithubCopilot,
  Qwen,
  DeepSeek,
  Meta,
  Mistral,
  Perplexity,
  Grok,
  ZAI,
  Minimax,
  HuggingFace,
  Nvidia,
  Azure,
  SiliconCloud,
  Vercel,
  Moonshot,
  Baichuan,
  Bedrock,
  Spark,
  Stepfun,
  Ollama,
  ZenMux,
};

// Custom icons for providers not in @lobehub/icons
export const AntigravityIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    className={className}
  >
    <path d="M11.615 0l6.237 6.107c2.382 2.338 2.823 3.743 3.161 6.15-1.197-1.732-1.776-2.02-4.504-2.772C12.48 8.374 11.095 5.933 11.615 0z" />
    <path d="M9.32 2.122C4.771 6.367 2 9.182 2 13.08c0 5.76 4.288 9.788 9.745 9.918 5.457.13 9.441-5.284 9.095-8.403-.347-3.118-4.418-3.81-4.418-3.81 1.69 3.16-.13 8.098-4.894 8.098-5.154 0-6.8-6.02-4.2-9.008.82 1.617 1.879 2.563 2.674 3.273.717.64 1.219 1.09 1.136 1.664-.173 1.213-1.385.866-1.385.866.346.607 3.6 1.473 4.59-1.342.613-1.741-.423-2.789-1.714-4.096-1.632-1.651-3.672-3.717-3.31-8.118z" />
  </svg>
);

export const KiroIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    className={className}
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
  </svg>
);

export const IFlowIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    className={className}
  >
    <path d="M16.278 2c1.156 0 2.093.927 2.093 2.07v12.501a.74.74 0 00.744.709.74.74 0 00.743-.709V9.099a2.06 2.06 0 012.071-2.049A2.06 2.06 0 0124 9.1v6.561a.649.649 0 01-.652.645.649.649 0 01-.653-.645V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v7.472a2.037 2.037 0 01-2.048 2.026 2.037 2.037 0 01-2.048-2.026v-12.5a.785.785 0 00-.788-.753.785.785 0 00-.789.752l-.001 15.904A2.037 2.037 0 0113.441 22a2.037 2.037 0 01-2.048-2.026V18.04c0-.356.292-.645.652-.645.36 0 .652.289.652.645v1.934c0 .263.142.506.372.638.23.131.514.131.744 0a.734.734 0 00.372-.638V4.07c0-1.143.937-2.07 2.093-2.07zm-5.674 0c1.156 0 2.093.927 2.093 2.07v11.523a.648.648 0 01-.652.645.648.648 0 01-.652-.645V4.07a.785.785 0 00-.789-.78.785.785 0 00-.789.78v14.013a2.06 2.06 0 01-2.07 2.048 2.06 2.06 0 01-2.071-2.048V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v3.8a2.06 2.06 0 01-2.071 2.049A2.06 2.06 0 010 12.9v-1.378c0-.357.292-.646.652-.646.36 0 .653.29.653.646V12.9c0 .418.343.757.766.757s.766-.339.766-.757V9.099a2.06 2.06 0 012.07-2.048 2.06 2.06 0 012.071 2.048v8.984c0 .419.343.758.767.758.423 0 .766-.339.766-.758V4.07c0-1.143.937-2.07 2.093-2.07z" />
  </svg>
);

export const XiaomiMiMoIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    className={className}
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <text
      x="12"
      y="14"
      textAnchor="middle"
      fontSize="8"
      fontFamily="Arial, sans-serif"
      fill="currentColor"
    >
      Mi
    </text>
  </svg>
);

export const CustomIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    className={className}
  >
    <path
      d="M16 18L22 12L16 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 6L2 12L8 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function getProviderIcon(
  providerId: string,
  className: string = "w-full h-full",
  size: number = 16,
): React.ReactNode {
  const id = (providerId || "").toLowerCase();

  switch (id) {
    case "claude":
    case "anthropic":
      const ClaudeIcon = (Claude as any).Color || Claude;
      return <ClaudeIcon size={size} />;
    case "codex":
    case "openai":
      const OpenAIIcon = (OpenAI as any).Color || OpenAI;
      return <OpenAIIcon size={size} />;
    case "gemini":
    case "google":
      const GeminiIcon = (Gemini as any).Color || Gemini;
      return <GeminiIcon size={size} />;
    case "antigravity":
      return <AntigravityIcon className={className} />;
    case "copilot":
      const CopilotIcon = (GithubCopilot as any).Color || GithubCopilot;
      return <CopilotIcon size={size} />;
    case "qwen":
      const QwenIcon = (Qwen as any).Color || Qwen;
      return <QwenIcon size={size} />;
    case "deepseek":
      const DeepSeekIcon = (DeepSeek as any).Color || DeepSeek;
      return <DeepSeekIcon size={size} />;
    case "meta":
    case "llama":
      const MetaIcon = (Meta as any).Color || Meta;
      return <MetaIcon size={size} />;
    case "mistral":
      const MistralIcon = (Mistral as any).Color || Mistral;
      return <MistralIcon size={size} />;
    case "perplexity":
      const PerplexityIcon = (Perplexity as any).Color || Perplexity;
      return <PerplexityIcon size={size} />;
    case "grok":
    case "xai":
      const GrokIcon = (Grok as any).Color || Grok;
      return <GrokIcon size={size} />;
    case "zhipu":
    case "glm":
    case "zai":
      const ZAI_Icon = (ZAI as any).Color || ZAI;
      return <ZAI_Icon size={size} />;
    case "minimax":
      const MinimaxIcon = (Minimax as any).Color || Minimax;
      return <MinimaxIcon size={size} />;
    case "huggingface":
    case "hf":
    case "hugging":
      const HF_Icon = (HuggingFace as any).Color || HuggingFace;
      return <HF_Icon size={size} />;
    case "nvidia":
      const NvidiaIcon = (Nvidia as any).Color || Nvidia;
      return <NvidiaIcon size={size} />;
    case "amazon":
    case "bedrock":
      const BedrockIcon = (Bedrock as any).Color || Bedrock;
      return <BedrockIcon size={size} />;
    case "azure":
      const AzureIcon = (Azure as any).Color || Azure;
      return <AzureIcon size={size} />;
    case "siliconcloud":
    case "silicon":
      const SiliconIcon = (SiliconCloud as any).Color || SiliconCloud;
      return <SiliconIcon size={size} />;
    case "vercel":
      const VercelIcon = (Vercel as any).Color || Vercel;
      return <VercelIcon size={size} />;
    case "kimi":
    case "kim":
      const KimiIcon = (Kimi as any).Color || Kimi;
      return <KimiIcon size={size} />;
    case "moonshot":
      const MoonshotIcon = (Moonshot as any).Color || Moonshot;
      return <MoonshotIcon size={size} />;
    case "xiaomimimo":
    case "mimo":
      return <XiaomiMiMoIcon className={className} />;
    case "baichuan":
      const BaichuanIcon = (Baichuan as any).Color || Baichuan;
      return <BaichuanIcon size={size} />;
    case "spark":
    case "xfyun":
      const SparkIcon = (Spark as any).Color || Spark;
      return <SparkIcon size={size} />;
    case "stepfun":
    case "step":
      const StepfunIcon = (Stepfun as any).Color || Stepfun;
      return <StepfunIcon size={size} />;
    case "ollama":
      const OllamaIcon = (Ollama as any).Color || Ollama;
      return <OllamaIcon size={size} />;
    case "zenmux":
      const ZenMuxIcon = (ZenMux as any).Color || ZenMux;
      return <ZenMuxIcon size={size} />;

    case "kiro":
      return <KiroIcon className={className} />;
    case "iflow":
      return <IFlowIcon className={className} />;
    case "custom":
      return <CustomIcon className={className} />;
    default:
      const inferred = inferProviderFromLabel(providerId);
      if (inferred !== "custom") {
        return getProviderIcon(inferred, className, size);
      }
      return <CustomIcon className={className} />;
  }
}

export function getCustomProviderIcon(
  type: string,
  className: string = "w-full h-full",
  size: number = 16,
): React.ReactNode {
  const protocol = (type || "").toLowerCase();

  switch (protocol) {
    case "openai":
      const OpenAIIcon = (OpenAI as any).Color || OpenAI;
      return <OpenAIIcon size={size} />;
    case "claude":
      const ClaudeIcon = (Claude as any).Color || Claude;
      return <ClaudeIcon size={size} />;
    case "gemini":
    case "google":
      const GeminiIcon = (Gemini as any).Color || Gemini;
      return <GeminiIcon size={size} />;
    case "codex":
      const OpenAIIcon2 = (OpenAI as any).Color || OpenAI;
      return <OpenAIIcon2 size={size} />;
    default:
      return <CustomIcon className={className} />;
  }
}

/**
 * Infer provider type from quota label text
 * Used to show the correct icon for each model in quota bars
 */
export function inferProviderFromLabel(label: string): string {
  const lowerLabel = (label || "").toLowerCase();

  // Claude models
  if (
    lowerLabel.includes("claude") ||
    lowerLabel.includes("opus") ||
    lowerLabel.includes("sonnet") ||
    lowerLabel.includes("haiku") ||
    lowerLabel.includes("anthropic")
  ) {
    return "claude";
  }

  // Gemini models
  if (lowerLabel.includes("gemini") || lowerLabel.includes("google")) {
    return "google";
  }

  // OpenAI/GPT models
  if (
    lowerLabel.includes("gpt") ||
    lowerLabel.includes("o1") ||
    lowerLabel.includes("o3") ||
    lowerLabel.includes("chatgpt")
  ) {
    return "codex";
  }

  // Qwen models
  if (lowerLabel.includes("qwen") || lowerLabel.includes("tongyi")) {
    return "qwen";
  }

  if (lowerLabel.includes("copilot")) {
    return "copilot";
  }

  if (lowerLabel.includes("deepseek")) {
    return "deepseek";
  }

  if (lowerLabel.includes("minimax")) {
    return "minimax";
  }

  if (lowerLabel.includes("llama") || lowerLabel.includes("meta")) {
    return "llama";
  }

  if (lowerLabel.includes("mistral") || lowerLabel.includes("pixtral")) {
    return "mistral";
  }

  if (lowerLabel.includes("perplexity") || lowerLabel.includes("sonar")) {
    return "perplexity";
  }

  if (
    lowerLabel.includes("grok") ||
    lowerLabel.includes("xai") ||
    lowerLabel.includes("sus-")
  ) {
    return "grok";
  }

  if (
    lowerLabel.includes("glm") ||
    lowerLabel.includes("zhipu") ||
    lowerLabel.includes("chatglm")
  ) {
    return "zhipu";
  }

  if (lowerLabel.includes("minimax") || lowerLabel.includes("abab")) {
    return "minimax";
  }

  if (lowerLabel.includes("huggingface") || lowerLabel.includes("hf-")) {
    return "huggingface";
  }

  if (lowerLabel.includes("nvidia")) {
    return "nvidia";
  }

  if (lowerLabel.includes("bedrock") || lowerLabel.includes("amazon")) {
    return "bedrock";
  }

  if (lowerLabel.includes("azure")) {
    return "azure";
  }

  if (lowerLabel.includes("siliconcloud")) {
    return "siliconcloud";
  }

  if (lowerLabel.includes("/kimi") || lowerLabel.includes("kimi-")) {
    return "kimi";
  }

  if (lowerLabel.includes("moonshot")) {
    return "moonshot";
  }

  if (lowerLabel.includes("xiaomi") || lowerLabel.includes("mimo")) {
    return "xiaomimimo";
  }

  if (lowerLabel.includes("baichuan")) {
    return "baichuan";
  }

  if (lowerLabel.includes("spark") || lowerLabel.includes("xfyun")) {
    return "spark";
  }

  if (lowerLabel.includes("stepfun")) {
    return "stepfun";
  }

  if (lowerLabel.includes("ollama")) {
    return "ollama";
  }

  if (lowerLabel.includes("zenmux")) {
    return "zenmux";
  }

  if (lowerLabel.includes("kiro")) {
    return "kiro";
  }

  // Default fallback
  return "custom";
}
