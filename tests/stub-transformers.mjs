// Stand-in for @huggingface/transformers. Records every pipeline() attempt so
// tests can assert on the device/dtype ladder, and lets a test force specific
// steps to fail.
//
// This replaces the CDN module only. The app code under test is the real app.js.

export const attempts = [];

export const state = {
  failSteps: [],   // indices of pipeline() calls that should throw
  result: [],      // what the detector resolves to
  throwOnRun: null,
};

export const env = {
  allowLocalModels: true,
  backends: { onnx: { wasm: { proxy: false, wasmPaths: null, numThreads: 1 } } },
};

let callIndex = 0;

export async function pipeline(task, model, opts = {}) {
  const i = callIndex++;
  attempts.push({
    i,
    task,
    model,
    device: opts.device,
    dtype: opts.dtype,
    proxy: env.backends.onnx.wasm.proxy,
  });
  if (state.failSteps.includes(i)) throw new Error("stub: forced backend failure at step " + i);

  if (typeof opts.progress_callback === "function") {
    opts.progress_callback({ status: "initiate", file: "onnx/model_quantized.onnx" });
    opts.progress_callback({ status: "progress", file: "onnx/model_quantized.onnx", loaded: 21551265, total: 43102531, progress: 50 });
    opts.progress_callback({ status: "done", file: "onnx/model_quantized.onnx" });
  }

  return async function detector(_input, runOpts) {
    if (state.throwOnRun) throw new Error(state.throwOnRun);
    detector.lastRunOpts = runOpts;
    return state.result;
  };
}

export function __reset() {
  attempts.length = 0;
  callIndex = 0;
  state.failSteps = [];
  state.result = [];
  state.throwOnRun = null;
}

export function __set(o) { Object.assign(state, o); }
