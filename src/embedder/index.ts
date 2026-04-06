import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { CONFIG } from "../config.js";

let extractor: FeatureExtractionPipeline | null = null;
let initPromise: Promise<FeatureExtractionPipeline> | null = null;

async function initPipeline(): Promise<FeatureExtractionPipeline> {
  if (extractor) return extractor;
  if (initPromise) return initPromise;

  const device = process.env.EMBER_DEVICE || "auto";

  initPromise = (async () => {
    if (device === "auto") {
      try {
        const p = await pipeline("feature-extraction", CONFIG.embeddingModel, {
          dtype: "q8",
          device: "auto",
        });
        extractor = p as FeatureExtractionPipeline;
        return extractor;
      } catch (err) {
        const msg = String(err);
        const isCudaMissing = msg.includes("libcublasLt") || msg.includes("libcudart") ||
          msg.includes("providers_cuda") || msg.includes("CUDA");

        if (isCudaMissing) {
          console.error([
            "[ember] NVIDIA GPU detected but required CUDA libraries are missing.",
            "",
            "Quick fix (pip):",
            "  pip install nvidia-cublas-cu12 nvidia-cudnn-cu12",
            '  export LD_LIBRARY_PATH=$(python3 -c "import nvidia.cublas.lib, nvidia.cudnn.lib; print(nvidia.cublas.lib.__path__[0]+\\\":\\\"+nvidia.cudnn.lib.__path__[0])"):$LD_LIBRARY_PATH',
            "",
            "Or force CPU mode: EMBER_DEVICE=cpu",
            "Falling back to CPU for now...",
          ].join("\n"));
        } else {
          console.error("[ember] Auto device failed, falling back to CPU:", msg.slice(0, 200));
        }

        const p = await pipeline("feature-extraction", CONFIG.embeddingModel, {
          dtype: "q8",
          device: "cpu",
        });
        extractor = p as FeatureExtractionPipeline;
        return extractor;
      }
    }

    const p = await pipeline("feature-extraction", CONFIG.embeddingModel, {
      dtype: "q8",
      device: device as any,
    });
    extractor = p as FeatureExtractionPipeline;
    return extractor;
  })();

  return initPromise;
}

export interface Embedder {
  embed(text: string): Promise<Float32Array>;
}

export async function getEmbedder(): Promise<Embedder> {
  const pipe = await initPipeline();

  return {
    async embed(text: string): Promise<Float32Array> {
      const output = await pipe(text, { pooling: "mean", normalize: true });
      const nested = output.tolist() as number[][];
      const flat = nested[0] ?? (nested as unknown as number[]);
      return new Float32Array(flat);
    },
  };
}
