import React from "react";
import Claude from "@lobehub/icons/es/Claude";
import OpenAI from "@lobehub/icons/es/OpenAI";
import Gemini from "@lobehub/icons/es/Gemini";
import Antigravity from "@lobehub/icons/es/Antigravity";
import Google from "@lobehub/icons/es/Google";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LobehubIcon = Record<string, any> & React.ComponentType<any>;

function colorVariant(
  icon: LobehubIcon,
): React.ComponentType<{ size?: number }> {
  return (icon.Color || icon) as React.ComponentType<{ size?: number }>;
}

export {
  Claude,
  OpenAI,
  Gemini,
  Google,
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

// Wrapped/custom icons for providers
export const AntigravityIcon = ({ className }: { className?: string }) => (
  <Antigravity.Color className={className} />
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
    case "anthropic": {
      const ClaudeColor = colorVariant(Claude);
      return <ClaudeColor size={size} />;
    }
    case "codex":
    case "openai": {
      const OpenAIColor = colorVariant(OpenAI);
      return <OpenAIColor size={size} />;
    }
    case "gemini":
    case "google": {
      const GeminiColor = colorVariant(Gemini);
      return <GeminiColor size={size} />;
    }
    case "antigravity":
      return <AntigravityIcon className={className} />;
    case "qwen": {
      const QwenColor = colorVariant(Qwen);
      return <QwenColor size={size} />;
    }
    case "deepseek": {
      const DeepSeekColor = colorVariant(DeepSeek);
      return <DeepSeekColor size={size} />;
    }
    case "meta":
    case "llama": {
      const MetaColor = colorVariant(Meta);
      return <MetaColor size={size} />;
    }
    case "mistral": {
      const MistralColor = colorVariant(Mistral);
      return <MistralColor size={size} />;
    }
    case "perplexity": {
      const PerplexityColor = colorVariant(Perplexity);
      return <PerplexityColor size={size} />;
    }
    case "grok":
    case "xai": {
      const GrokColor = colorVariant(Grok);
      return <GrokColor size={size} />;
    }
    case "zhipu":
    case "glm":
    case "zai": {
      const ZAIColor = colorVariant(ZAI);
      return <ZAIColor size={size} />;
    }
    case "minimax": {
      const MinimaxColor = colorVariant(Minimax);
      return <MinimaxColor size={size} />;
    }
    case "huggingface":
    case "hf":
    case "hugging": {
      const HFColor = colorVariant(HuggingFace);
      return <HFColor size={size} />;
    }
    case "nvidia": {
      const NvidiaColor = colorVariant(Nvidia);
      return <NvidiaColor size={size} />;
    }
    case "amazon":
    case "bedrock": {
      const BedrockColor = colorVariant(Bedrock);
      return <BedrockColor size={size} />;
    }
    case "azure": {
      const AzureColor = colorVariant(Azure);
      return <AzureColor size={size} />;
    }
    case "siliconcloud":
    case "silicon": {
      const SiliconColor = colorVariant(SiliconCloud);
      return <SiliconColor size={size} />;
    }
    case "vercel": {
      const VercelColor = colorVariant(Vercel);
      return <VercelColor size={size} />;
    }
    case "kimi":
    case "kim": {
      const KimiColor = colorVariant(Kimi);
      return <KimiColor size={size} />;
    }
    case "moonshot": {
      const MoonshotColor = colorVariant(Moonshot);
      return <MoonshotColor size={size} />;
    }
    case "xiaomimimo":
    case "mimo":
      return <XiaomiMiMoIcon className={className} />;
    case "baichuan": {
      const BaichuanColor = colorVariant(Baichuan);
      return <BaichuanColor size={size} />;
    }
    case "spark":
    case "xfyun": {
      const SparkColor = colorVariant(Spark);
      return <SparkColor size={size} />;
    }
    case "stepfun":
    case "step": {
      const StepfunColor = colorVariant(Stepfun);
      return <StepfunColor size={size} />;
    }
    case "ollama": {
      const OllamaColor = colorVariant(Ollama);
      return <OllamaColor size={size} />;
    }
    case "zenmux": {
      const ZenMuxColor = colorVariant(ZenMux);
      return <ZenMuxColor size={size} />;
    }

    case "iflow":
      return <IFlowIcon className={className} />;
    case "custom":
      return <CustomIcon className={className} />;
    default: {
      const inferred = inferProviderFromLabel(providerId);
      if (inferred !== "custom") {
        return getProviderIcon(inferred, className, size);
      }
      return <CustomIcon className={className} />;
    }
  }
}

export function getCustomProviderIcon(
  type: string,
  className: string = "w-full h-full",
  size: number = 16,
): React.ReactNode {
  const protocol = (type || "").toLowerCase();

  switch (protocol) {
    case "openai": {
      const OpenAIIcon = colorVariant(OpenAI);
      return <OpenAIIcon size={size} />;
    }
    case "claude": {
      const ClaudeIcon = colorVariant(Claude);
      return <ClaudeIcon size={size} />;
    }
    case "gemini":
    case "google": {
      const GeminiIcon = colorVariant(Gemini);
      return <GeminiIcon size={size} />;
    }
    case "codex": {
      const CodexIcon = colorVariant(OpenAI);
      return <CodexIcon size={size} />;
    }
    case "ampcode":
      return <CustomIcon className={className} />;
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

  // Default fallback
  return "custom";
}
